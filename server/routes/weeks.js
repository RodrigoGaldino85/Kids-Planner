const express = require('express');
const router = express.Router();
const db = require('../db');
const { getWeekStart, getWeekDays, addDays, todayStr, weekdayLabel } = require('../lib/week');

function buildWeekPayload(weekStart) {
  const weekDays = getWeekDays(weekStart);
  const weekEnd = weekDays[6];
  const activities = db.prepare('SELECT * FROM activities WHERE active = 1 ORDER BY sort_order, id').all();
  const completions = db.prepare('SELECT * FROM completions WHERE week_start = ?').all(weekStart);

  const dailyActs = activities.filter((a) => a.category === 'daily');
  const weeklyActs = activities.filter((a) => a.category === 'weekly');
  const extraActs = activities.filter((a) => a.category === 'extra');

  const daily = dailyActs.map((act) => ({
    ...act,
    days: weekDays.map((day) => {
      const c = completions.find((c) => c.activity_id === act.id && c.occurred_on === day);
      return { date: day, label: weekdayLabel(day), done: !!c, completion_id: c ? c.id : null };
    }),
  }));

  const weekly = weeklyActs.map((act) => {
    const c = completions.find((c) => c.activity_id === act.id);
    return { ...act, done: !!c, completion_id: c ? c.id : null };
  });

  const extra = extraActs.map((act) => {
    const items = completions.filter((c) => c.activity_id === act.id);
    return { ...act, count: items.length, completion_ids: items.map((c) => c.id) };
  });

  const total_cents = completions.reduce((sum, c) => sum + c.value_cents, 0);
  const payments = db.prepare('SELECT * FROM payments WHERE week_start = ? ORDER BY paid_at').all(weekStart);
  const paid_cents = payments.reduce((sum, p) => sum + p.amount_cents, 0);

  const fullDaysCount = weekDays.filter(
    (day) => dailyActs.length > 0 && dailyActs.every((act) => completions.some((c) => c.activity_id === act.id && c.occurred_on === day))
  ).length;

  return {
    week_start: weekStart,
    week_end: weekEnd,
    days: weekDays.map((d) => ({ date: d, label: weekdayLabel(d) })),
    daily,
    weekly,
    extra,
    total_cents,
    paid_cents,
    balance_cents: total_cents - paid_cents,
    payments,
    stars: fullDaysCount,
  };
}

router.get('/current', (req, res) => {
  res.json(buildWeekPayload(getWeekStart(todayStr())));
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT week_start, SUM(value_cents) as total_cents FROM completions GROUP BY week_start').all();
  const weeksMap = new Map(rows.map((r) => [r.week_start, r.total_cents]));

  const paymentRows = db.prepare('SELECT week_start, SUM(amount_cents) as paid_cents FROM payments GROUP BY week_start').all();
  paymentRows.forEach((p) => {
    if (!weeksMap.has(p.week_start)) weeksMap.set(p.week_start, 0);
  });

  const weeks = [...weeksMap.keys()]
    .sort()
    .reverse()
    .map((week_start) => {
      const total_cents = weeksMap.get(week_start) || 0;
      const paid_cents = paymentRows.find((p) => p.week_start === week_start)?.paid_cents || 0;
      return {
        week_start,
        week_end: addDays(week_start, 6),
        total_cents,
        paid_cents,
        balance_cents: total_cents - paid_cents,
      };
    });

  res.json(weeks);
});

router.get('/:weekStart', (req, res) => {
  res.json(buildWeekPayload(req.params.weekStart));
});

module.exports = router;
