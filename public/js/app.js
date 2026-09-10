const state = {
  week: null,
  selectedDate: null,
};

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDayLabel(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

async function loadWeek() {
  state.week = await fetchJSON('/api/weeks/current');
  if (!state.selectedDate) {
    state.selectedDate = todayISO();
  }
  render();
}

async function loadAlerts() {
  const alerts = await fetchJSON('/api/alerts');
  const container = document.getElementById('alerts');
  container.innerHTML = '';
  alerts.forEach((a) => {
    const div = document.createElement('div');
    div.className = `alert ${a.type}`;
    div.textContent = a.message;
    container.appendChild(div);
  });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function celebrate() {
  if (window.confetti) {
    window.confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
  }
}

function render() {
  const w = state.week;
  document.getElementById('week-range-label').textContent = `Semana de ${formatDayLabel(w.week_start)} a ${formatDayLabel(w.week_end)}`;
  document.getElementById('stat-total').textContent = formatBRL(w.total_cents);
  document.getElementById('stat-balance').textContent = formatBRL(w.balance_cents);
  document.getElementById('stat-stars').textContent = `⭐ ${w.stars}/7`;

  renderDayTabs();
  renderDaily();
  renderWeekly();
  renderExtra();
}

function renderDayTabs() {
  const nav = document.getElementById('day-tabs');
  nav.innerHTML = '';
  const today = todayISO();
  state.week.days.forEach((day) => {
    const btn = document.createElement('div');
    btn.className = 'day-tab';
    if (day.date === today) btn.classList.add('today');
    if (day.date === state.selectedDate) btn.classList.add('selected');
    btn.innerHTML = `${day.label}<span class="day-date">${formatDayLabel(day.date)}</span>`;
    btn.addEventListener('click', () => {
      state.selectedDate = day.date;
      render();
    });
    nav.appendChild(btn);
  });
}

function renderDaily() {
  const grid = document.getElementById('daily-grid');
  grid.innerHTML = '';
  state.week.daily.forEach((act) => {
    const dayEntry = act.days.find((d) => d.date === state.selectedDate);
    const card = document.createElement('div');
    card.className = `task-card ${dayEntry.done ? 'done' : ''}`;
    card.innerHTML = `
      <div class="task-emoji">${act.emoji}</div>
      <div class="task-info">
        <div class="task-name">${act.name}</div>
        <div class="task-value">${formatBRL(act.value_cents)}</div>
      </div>
      <div class="task-check">${dayEntry.done ? '✅' : '⬜'}</div>
    `;
    card.addEventListener('click', async () => {
      const wasDone = dayEntry.done;
      await fetchJSON('/api/completions/toggle-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: act.id, date: state.selectedDate }),
      });
      if (!wasDone) celebrate();
      await Promise.all([loadWeek(), loadAlerts()]);
    });
    grid.appendChild(card);
  });
}

function renderWeekly() {
  const grid = document.getElementById('weekly-grid');
  grid.innerHTML = '';
  state.week.weekly.forEach((act) => {
    const card = document.createElement('div');
    card.className = `task-card ${act.done ? 'done' : ''}`;
    card.innerHTML = `
      <div class="task-emoji">${act.emoji}</div>
      <div class="task-info">
        <div class="task-name">${act.name}</div>
        <div class="task-value">${formatBRL(act.value_cents)}</div>
      </div>
      <div class="task-check">${act.done ? '✅' : '⬜'}</div>
    `;
    card.addEventListener('click', async () => {
      const wasDone = act.done;
      await fetchJSON('/api/completions/toggle-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: act.id, week_start: state.week.week_start }),
      });
      if (!wasDone) celebrate();
      await Promise.all([loadWeek(), loadAlerts()]);
    });
    grid.appendChild(card);
  });
}

function renderExtra() {
  const grid = document.getElementById('extra-grid');
  grid.innerHTML = '';
  state.week.extra.forEach((act) => {
    const card = document.createElement('div');
    card.className = 'task-card extra-card';
    card.innerHTML = `
      <div class="task-emoji">${act.emoji}</div>
      <div class="task-info">
        <div class="task-name">${act.name}</div>
        <div class="task-value">${formatBRL(act.value_cents)} cada vez</div>
      </div>
      <div class="extra-actions">
        <button class="btn btn-undo" ${act.count === 0 ? 'disabled style="opacity:.4"' : ''}>Desfazer</button>
        <span class="extra-count">${act.count}x</span>
        <button class="btn btn-add">+1</button>
      </div>
    `;
    card.querySelector('.btn-add').addEventListener('click', async () => {
      await fetchJSON('/api/completions/extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: act.id, week_start: state.week.week_start }),
      });
      celebrate();
      await Promise.all([loadWeek(), loadAlerts()]);
    });
    card.querySelector('.btn-undo').addEventListener('click', async () => {
      const lastId = act.completion_ids[act.completion_ids.length - 1];
      if (!lastId) return;
      await fetchJSON(`/api/completions/${lastId}`, { method: 'DELETE' });
      await Promise.all([loadWeek(), loadAlerts()]);
    });
    grid.appendChild(card);
  });
}

Promise.all([loadWeek(), loadAlerts()]);
