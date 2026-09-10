require('dotenv').config();
const express = require('express');
const path = require('path');

const seed = require('./seed');
seed();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/activities', require('./routes/activities'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api/weeks', require('./routes/weeks'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Planner de Tarefas rodando em http://localhost:${PORT}`);
});
