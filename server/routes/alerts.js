const express = require('express');
const router = express.Router();
const db = require('../db');
const { getWeekStart, todayStr } = require('../lib/week');

router.get('/', (req, res) => {
  const alerts = [];
  const today = todayStr();
  const weekStart = getWeekStart(today);

  const lastCompletion = db.prepare('SELECT MAX(occurred_on) as d FROM completions').get().d;
  if (lastCompletion) {
    const diffDays = Math.round((new Date(today) - new Date(lastCompletion)) / 86400000);
    if (diffDays >= 2) {
      alerts.push({ type: 'warning', message: `Já se passaram ${diffDays} dias sem marcar nenhuma tarefa! Vamos lá? 💪` });
    }
  } else {
    alerts.push({ type: 'info', message: 'Ainda não há nenhuma tarefa marcada. Bora começar? ✨' });
  }

  const dailyActs = db.prepare("SELECT * FROM activities WHERE category='daily' AND active=1").all();
  const todayCompletions = db
    .prepare('SELECT activity_id FROM completions WHERE occurred_on = ?')
    .all(today)
    .map((c) => c.activity_id);
  const missingToday = dailyActs.filter((a) => !todayCompletions.includes(a.id));

  if (dailyActs.length > 0 && missingToday.length === 0) {
    alerts.push({ type: 'success', message: 'Você completou todas as tarefas de hoje! Parabéns! 🎉' });
  } else if (missingToday.length > 0 && missingToday.length < dailyActs.length) {
    alerts.push({ type: 'info', message: `Faltam ${missingToday.length} tarefa(s) de hoje.` });
  }

  const dayOfWeek = new Date().getDay(); // 0 Dom .. 6 Sáb
  if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
    const weekCompletions = db.prepare('SELECT id FROM completions WHERE week_start = ?').all(weekStart);
    const totalPossible = dailyActs.length * 5; // expectativa mínima Seg-Sex
    if (dailyActs.length > 0 && weekCompletions.length < totalPossible * 0.5) {
      alerts.push({ type: 'warning', message: 'A semana está quase acabando e o progresso está baixo. Ainda dá tempo! ⏰' });
    }
  }

  res.json(alerts);
});

module.exports = router;
