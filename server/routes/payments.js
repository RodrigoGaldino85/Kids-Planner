const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

router.get('/', (req, res) => {
  const { week_start } = req.query;
  if (week_start) {
    return res.json(db.prepare('SELECT * FROM payments WHERE week_start = ? ORDER BY paid_at').all(week_start));
  }
  res.json(db.prepare('SELECT * FROM payments ORDER BY paid_at DESC').all());
});

router.post('/', requireAdmin, (req, res) => {
  const { week_start, amount_cents, notes } = req.body;
  if (!week_start || !amount_cents || amount_cents <= 0) {
    return res.status(400).json({ error: 'week_start e amount_cents (>0) são obrigatórios' });
  }
  const info = db
    .prepare('INSERT INTO payments (week_start, amount_cents, notes) VALUES (?,?,?)')
    .run(week_start, amount_cents, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM payments WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
