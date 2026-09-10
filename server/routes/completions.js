const express = require('express');
const router = express.Router();
const db = require('../db');
const { getWeekStart, todayStr } = require('../lib/week');

// Marca/desmarca uma tarefa diária em um dia específico da semana atual.
router.post('/toggle-daily', (req, res) => {
  const { activity_id, date } = req.body;
  const activity = db.prepare("SELECT * FROM activities WHERE id = ? AND category = 'daily'").get(activity_id);
  if (!activity) return res.status(404).json({ error: 'Atividade diária não encontrada' });

  const occurred_on = date || todayStr();
  const existing = db
    .prepare('SELECT * FROM completions WHERE activity_id = ? AND occurred_on = ?')
    .get(activity_id, occurred_on);

  if (existing) {
    db.prepare('DELETE FROM completions WHERE id = ?').run(existing.id);
    return res.json({ done: false });
  }

  const week_start = getWeekStart(occurred_on);
  db.prepare('INSERT INTO completions (activity_id, occurred_on, week_start, value_cents) VALUES (?,?,?,?)').run(
    activity_id,
    occurred_on,
    week_start,
    activity.value_cents
  );
  res.json({ done: true });
});

// Marca/desmarca uma tarefa semanal (1x por semana).
router.post('/toggle-weekly', (req, res) => {
  const { activity_id, week_start } = req.body;
  const activity = db.prepare("SELECT * FROM activities WHERE id = ? AND category = 'weekly'").get(activity_id);
  if (!activity) return res.status(404).json({ error: 'Atividade semanal não encontrada' });

  const ws = week_start || getWeekStart(todayStr());
  const existing = db
    .prepare('SELECT * FROM completions WHERE activity_id = ? AND week_start = ?')
    .get(activity_id, ws);

  if (existing) {
    db.prepare('DELETE FROM completions WHERE id = ?').run(existing.id);
    return res.json({ done: false });
  }

  db.prepare('INSERT INTO completions (activity_id, occurred_on, week_start, value_cents) VALUES (?,?,?,?)').run(
    activity_id,
    todayStr(),
    ws,
    activity.value_cents
  );
  res.json({ done: true });
});

// Registra uma ocorrência de tarefa extra/bônus (pode acontecer várias vezes na semana).
router.post('/extra', (req, res) => {
  const { activity_id, week_start } = req.body;
  const activity = db.prepare("SELECT * FROM activities WHERE id = ? AND category = 'extra'").get(activity_id);
  if (!activity) return res.status(404).json({ error: 'Atividade extra não encontrada' });

  const ws = week_start || getWeekStart(todayStr());
  const info = db
    .prepare('INSERT INTO completions (activity_id, occurred_on, week_start, value_cents) VALUES (?,?,?,?)')
    .run(activity_id, todayStr(), ws, activity.value_cents);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Desfaz uma marcação específica (usado por diária/semanal/extra).
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM completions WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
