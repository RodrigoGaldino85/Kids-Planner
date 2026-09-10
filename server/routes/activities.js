const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const CATEGORIES = ['daily', 'weekly', 'extra'];

router.get('/', (req, res) => {
  const { category, active } = req.query;
  let query = 'SELECT * FROM activities WHERE 1=1';
  const params = [];
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (active !== undefined) {
    query += ' AND active = ?';
    params.push(active === 'true' || active === '1' ? 1 : 0);
  }
  query += ' ORDER BY sort_order ASC, id ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', requireAdmin, (req, res) => {
  const { name, emoji, category, value_cents, sort_order } = req.body;
  if (!name || !CATEGORIES.includes(category) || value_cents == null || value_cents < 0) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, category (daily/weekly/extra), value_cents (>=0)' });
  }
  const info = db
    .prepare('INSERT INTO activities (name, emoji, category, value_cents, sort_order) VALUES (?,?,?,?,?)')
    .run(name, emoji || '⭐', category, value_cents, sort_order || 0);
  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Atividade não encontrada' });

  const { name, emoji, category, value_cents, sort_order, active } = req.body;
  if (category !== undefined && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'category deve ser daily, weekly ou extra' });
  }
  db.prepare(
    'UPDATE activities SET name=?, emoji=?, category=?, value_cents=?, sort_order=?, active=? WHERE id=?'
  ).run(
    name ?? existing.name,
    emoji ?? existing.emoji,
    category ?? existing.category,
    value_cents ?? existing.value_cents,
    sort_order ?? existing.sort_order,
    active ?? existing.active,
    id
  );
  res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Atividade não encontrada' });

  const hasCompletions = db.prepare('SELECT COUNT(*) c FROM completions WHERE activity_id = ?').get(id).c;
  if (hasCompletions > 0) {
    // Nunca apaga histórico: só arquiva para preservar os valores já registrados.
    db.prepare('UPDATE activities SET active = 0 WHERE id = ?').run(id);
    return res.json({ archived: true });
  }
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  res.json({ deleted: true });
});

module.exports = router;
