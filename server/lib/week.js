function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return formatDate(new Date());
}

function addDays(dateStr, n) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + n);
  return formatDate(date);
}

// Semana começa na segunda-feira (SEG), termina no domingo (DOM), igual ao planner impresso.
function getWeekStart(dateStr) {
  const date = parseDate(dateStr);
  const day = date.getDay(); // 0=Dom .. 6=Sáb
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDate(date);
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function weekdayLabel(dateStr) {
  return WEEKDAY_LABELS[parseDate(dateStr).getDay()];
}

module.exports = { parseDate, formatDate, todayStr, addDays, getWeekStart, getWeekDays, weekdayLabel };
