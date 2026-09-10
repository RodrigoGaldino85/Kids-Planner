const db = require('./db');

// Atividades baseadas no planner impresso. Os valores são apenas sugestões
// iniciais — ajuste tudo pela tela de Admin.
const DEFAULT_ACTIVITIES = [
  // Tarefas diárias (Seg a Dom)
  { name: 'Arrumar a cama', emoji: '🛏️', category: 'daily', value_cents: 100 },
  { name: 'Dobrar e guardar o uniforme', emoji: '👕', category: 'daily', value_cents: 100 },
  { name: 'Guardar potes com tampa', emoji: '🥡', category: 'daily', value_cents: 100 },
  { name: 'Fazer lição de casa (sem reclamar)', emoji: '📚', category: 'daily', value_cents: 150 },
  { name: 'Recolher a roupa do varal', emoji: '🧺', category: 'daily', value_cents: 100 },
  { name: 'Fazer leitura do livro', emoji: '📖', category: 'daily', value_cents: 150 },
  // Tarefas da semana (1x por semana)
  { name: 'Passar aspirador na casa', emoji: '🧹', category: 'weekly', value_cents: 300 },
  { name: 'Manter guarda-roupa arrumado', emoji: '👗', category: 'weekly', value_cents: 300 },
  // Ideias de tarefas extras (rendem valor bônus)
  { name: 'Regar as plantas', emoji: '🌱', category: 'extra', value_cents: 150 },
  { name: 'Ajudar a colocar/tirar a mesa', emoji: '🍽️', category: 'extra', value_cents: 150 },
  { name: 'Levar o lixo para fora', emoji: '🗑️', category: 'extra', value_cents: 150 },
  { name: 'Cuidar do pet', emoji: '🐾', category: 'extra', value_cents: 150 },
  { name: 'Organizar a mochila', emoji: '🎒', category: 'extra', value_cents: 150 },
  { name: 'Fazer lista do mercado', emoji: '📝', category: 'extra', value_cents: 150 },
];

function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM activities').get().c;
  if (count > 0) return;
  const insert = db.prepare(
    'INSERT INTO activities (name, emoji, category, value_cents, sort_order) VALUES (?,?,?,?,?)'
  );
  const insertMany = db.transaction((rows) => {
    rows.forEach((a, i) => insert.run(a.name, a.emoji, a.category, a.value_cents, i));
  });
  insertMany(DEFAULT_ACTIVITIES);
  console.log(`Seed: ${DEFAULT_ACTIVITIES.length} atividades padrão criadas.`);
}

module.exports = seed;
