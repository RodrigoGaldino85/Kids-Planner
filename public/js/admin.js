const CATEGORY_LABELS = { daily: 'Diárias', weekly: 'Semanais', extra: 'Extras/bônus' };

function getPin() {
  return sessionStorage.getItem('admin_pin');
}

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDayLabel(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

async function adminFetch(url, options = {}) {
  const headers = Object.assign({}, options.headers, { 'x-admin-pin': getPin() });
  const res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    sessionStorage.removeItem('admin_pin');
    showPinGate('PIN inválido ou expirado. Digite novamente.');
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

function showPinGate(errorMessage) {
  document.getElementById('pin-gate').hidden = false;
  document.getElementById('admin-app').hidden = true;
  document.getElementById('pin-error').textContent = errorMessage || '';
}

function showAdminApp() {
  document.getElementById('pin-gate').hidden = true;
  document.getElementById('admin-app').hidden = false;
  initAdminApp();
}

async function tryPin(pin) {
  sessionStorage.setItem('admin_pin', pin);
  try {
    await adminFetch('/api/admin/verify');
    showAdminApp();
  } catch (e) {
    // showPinGate já foi chamado pelo adminFetch em caso de 401
  }
}

document.getElementById('pin-submit').addEventListener('click', () => {
  const pin = document.getElementById('pin-input').value.trim();
  if (pin) tryPin(pin);
});
document.getElementById('pin-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('pin-submit').click();
});

// Tenta reaproveitar PIN salvo nesta aba
if (getPin()) {
  tryPin(getPin());
}

let adminInitialized = false;

function initAdminApp() {
  if (adminInitialized) return;
  adminInitialized = true;

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((b) => b.classList.remove('selected'));
      document.querySelectorAll('.admin-panel').forEach((p) => (p.hidden = true));
      btn.classList.add('selected');
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      panel.hidden = false;
      if (btn.dataset.tab === 'weeks') loadWeeksTab();
      if (btn.dataset.tab === 'performance') loadPerformanceTab();
    });
  });

  document.getElementById('activity-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('act-name').value.trim();
    const emoji = document.getElementById('act-emoji').value.trim() || '⭐';
    const category = document.getElementById('act-category').value;
    const valueReais = parseFloat(document.getElementById('act-value').value);
    if (!name || Number.isNaN(valueReais)) return;
    await adminFetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji, category, value_cents: Math.round(valueReais * 100) }),
    });
    document.getElementById('activity-form').reset();
    document.getElementById('act-emoji').value = '⭐';
    loadActivitiesTab();
  });

  loadActivitiesTab();
}

async function loadActivitiesTab() {
  const activities = await adminFetch('/api/activities');
  const container = document.getElementById('activities-list');
  container.innerHTML = '';

  ['daily', 'weekly', 'extra'].forEach((category) => {
    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<h3>${CATEGORY_LABELS[category]}</h3>`;
    const items = activities.filter((a) => a.category === category);
    items.forEach((act) => {
      const row = document.createElement('div');
      row.className = `admin-row ${act.active ? '' : 'inactive'}`;
      row.innerHTML = `
        <span class="row-emoji">${act.emoji}</span>
        <span class="row-name">${act.name}</span>
        <input class="row-value-input" type="number" step="0.01" min="0" value="${(act.value_cents / 100).toFixed(2)}" />
        <button class="btn btn-undo btn-toggle">${act.active ? 'Desativar' : 'Ativar'}</button>
        <button class="btn btn-add btn-save">Salvar</button>
        <button class="btn btn-undo btn-delete">Excluir</button>
      `;
      row.querySelector('.btn-save').addEventListener('click', async () => {
        const newValue = parseFloat(row.querySelector('.row-value-input').value);
        if (Number.isNaN(newValue)) return;
        await adminFetch(`/api/activities/${act.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value_cents: Math.round(newValue * 100) }),
        });
        loadActivitiesTab();
      });
      row.querySelector('.btn-toggle').addEventListener('click', async () => {
        await adminFetch(`/api/activities/${act.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: act.active ? 0 : 1 }),
        });
        loadActivitiesTab();
      });
      row.querySelector('.btn-delete').addEventListener('click', async () => {
        if (!confirm(`Excluir "${act.name}"? Se já houver histórico, ela será apenas arquivada.`)) return;
        await adminFetch(`/api/activities/${act.id}`, { method: 'DELETE' });
        loadActivitiesTab();
      });
      group.appendChild(row);
    });
    container.appendChild(group);
  });
}

async function loadWeeksTab() {
  const weeks = await adminFetch('/api/weeks');
  const container = document.getElementById('weeks-list');
  container.innerHTML = '';

  if (weeks.length === 0) {
    container.innerHTML = '<p>Nenhuma atividade marcada ainda.</p>';
    return;
  }

  for (const w of weeks) {
    const card = document.createElement('div');
    card.className = 'week-card';
    const isPaid = w.balance_cents <= 0 && w.total_cents > 0;
    card.innerHTML = `
      <div class="week-card-header">
        <span class="week-title">Semana de ${formatDayLabel(w.week_start)} a ${formatDayLabel(w.week_end)}</span>
        <span class="balance-tag ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'Pago' : 'Pendente'}</span>
      </div>
      <div class="week-figures">
        <span>Ganho: <b>${formatBRL(w.total_cents)}</b></span>
        <span>Pago: <b>${formatBRL(w.paid_cents)}</b></span>
        <span>Saldo: <b>${formatBRL(w.balance_cents)}</b></span>
      </div>
      <form class="pay-form">
        <input type="number" step="0.01" min="0" placeholder="Valor (R$)" class="pay-amount" value="${(Math.max(w.balance_cents, 0) / 100).toFixed(2)}" />
        <input type="text" placeholder="Observação (opcional)" class="pay-notes" />
        <button type="submit" class="btn btn-add">Registrar pagamento</button>
      </form>
      <div class="payments-history"></div>
    `;
    const history = card.querySelector('.payments-history');
    const payments = await adminFetch(`/api/payments?week_start=${w.week_start}`);
    if (payments.length > 0) {
      history.innerHTML = payments
        .map((p) => `• ${formatBRL(p.amount_cents)} em ${new Date(p.paid_at).toLocaleDateString('pt-BR')}${p.notes ? ' — ' + p.notes : ''}`)
        .join('<br/>');
    }
    card.querySelector('.pay-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(card.querySelector('.pay-amount').value);
      const notes = card.querySelector('.pay-notes').value.trim();
      if (Number.isNaN(amount) || amount <= 0) return;
      await adminFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: w.week_start, amount_cents: Math.round(amount * 100), notes: notes || null }),
      });
      loadWeeksTab();
    });
    container.appendChild(card);
  }
}

let performanceChart = null;

async function loadPerformanceTab() {
  const weeks = (await adminFetch('/api/weeks')).slice(0, 10).reverse();
  const ctx = document.getElementById('performance-chart');
  const labels = weeks.map((w) => `${formatDayLabel(w.week_start)}`);
  const data = weeks.map((w) => (w.total_cents / 100).toFixed(2));

  if (performanceChart) performanceChart.destroy();
  performanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ganho por semana (R$)',
          data,
          backgroundColor: '#9b6bf2',
          borderRadius: 8,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}
