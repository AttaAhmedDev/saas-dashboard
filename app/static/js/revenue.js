// ── revenue.js — all logic for revenue.html ──────────────────────────────────

// ── state ─────────────────────────────────────────────────────────────────────
let revenueData      = [];
let mainChart        = null;
let donutChart       = null;
let currentChartType = 'bar';
let deletingId       = null;

// ── chart colours ─────────────────────────────────────────────────────────────
const ACCENT  = '#2e5bff';
const GREEN   = '#1db97a';
const PALETTE = [
'#2e5bff','#1db97a','#f59e0b','#e0394a',
'#8b5cf6','#06b6d4','#f97316','#ec4899',
'#14b8a6','#a78bfa','#84cc16','#fb923c'
];

const AXIS_STYLE = {
x: {
grid: { display: false },
ticks: { font: { family: 'DM Sans', size: 12 }, color: '#9299a8' }
},
y: {
grid: { color: '#f0f0f3' },
border: { dash: [4, 4] },
ticks: {
    font: { family: 'DM Mono', size: 11 },
    color: '#9299a8',
    callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
}
}
};

// ── boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
requireAuth();
buildSidebar('revenue');
setupModalBackdropClose();
setupKeyboardShortcuts();
load();
});

// ── load data from API ────────────────────────────────────────────────────────
async function load() {
try {
const res = await fetch(`${API}/dashboard/revenue`, { headers: authHeaders() });

if (res.status === 403) {
    showAccessDenied();
    return;
}

const data = await res.json();
revenueData = data.revenue || [];

renderStats();
renderMainChart(currentChartType);
renderDonut();
renderTable();

} catch (e) {
console.error('Failed to load revenue:', e);
toast('Failed to load revenue data', 'error');
} finally {
document.getElementById('loading').classList.remove('show');
}
}

function showAccessDenied() {
document.getElementById('loading').classList.remove('show');
document.querySelector('.main').innerHTML = `
<div class="empty-state" style="margin-top:120px">
    <i class="ti ti-lock"></i>
    <p style="margin-top:12px;font-size:15px">You don't have permission to view revenue data.</p>
    <p style="margin-top:6px;font-size:13px;color:var(--ink-muted)">Contact your admin to request access.</p>
</div>`;
}

// ── stat cards ────────────────────────────────────────────────────────────────
function renderStats() {
if (!revenueData.length) return;

const amounts = revenueData.map(r => r.amount);
const total   = amounts.reduce((a, b) => a + b, 0);
const best    = Math.max(...amounts);
const bestRec = revenueData.find(r => r.amount === best);
const avg     = total / amounts.length;

// month-over-month growth (last two months)
const chrono = [...revenueData].sort((a, b) => a.month.localeCompare(b.month));
let growthHtml = '';
if (chrono.length >= 2) {
const last = chrono[chrono.length - 1];
const prev = chrono[chrono.length - 2];
const pct  = ((last.amount - prev.amount) / prev.amount * 100).toFixed(1);
const up   = parseFloat(pct) >= 0;
growthHtml = `<span class="card-tag ${up ? 'pill-success' : 'pill-error'}">${up ? '▲' : '▼'} ${Math.abs(pct)}% last month</span>`;
}

document.getElementById('stat-total').textContent      = fmtMoney(total);
document.getElementById('stat-best').textContent       = fmtMoney(best);
document.getElementById('stat-best-label').textContent = bestRec ? fmtMonth(bestRec.month) : '—';
document.getElementById('stat-avg').textContent        = fmtMoney(Math.round(avg));
document.getElementById('stat-count').textContent      = revenueData.length;
document.getElementById('donut-center-val').textContent = fmtMoney(total);

if (growthHtml) {
document.getElementById('stat-growth-tag').innerHTML = growthHtml;
}
}

// ── main chart (bar / line toggle) ────────────────────────────────────────────
function renderMainChart(type) {
const labels  = revenueData.map(r => fmtMonth(r.month));
const amounts = revenueData.map(r => r.amount);
const isLine  = type === 'line';

if (mainChart) mainChart.destroy();

mainChart = new Chart(document.getElementById('main-chart'), {
type,
data: {
    labels,
    datasets: [{
    label: 'Revenue',
    data: amounts,
    backgroundColor:      isLine ? 'rgba(29,185,122,0.08)' : 'rgba(46,91,255,0.12)',
    borderColor:          isLine ? GREEN : ACCENT,
    borderWidth:          2,
    borderRadius:         isLine ? 0 : 6,
    tension:              0.4,
    fill:                 isLine,
    pointBackgroundColor: isLine ? GREEN : undefined,
    pointRadius:          isLine ? 4 : undefined,
    hoverBackgroundColor: isLine ? 'rgba(29,185,122,0.18)' : 'rgba(46,91,255,0.22)',
    }]
},
options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.parsed.y) } }
    },
    scales: AXIS_STYLE
}
});

// update toggle button styles
document.getElementById('btn-bar').classList.toggle('active-chart-btn',  type === 'bar');
document.getElementById('btn-line').classList.toggle('active-chart-btn', type === 'line');
}

function setChartType(type) {
currentChartType = type;
renderMainChart(type);
}

// ── donut chart ───────────────────────────────────────────────────────────────
function renderDonut() {
const top6    = [...revenueData].sort((a, b) => b.amount - a.amount).slice(0, 6);
const labels  = top6.map(r => fmtMonth(r.month));
const amounts = top6.map(r => r.amount);

if (donutChart) donutChart.destroy();

donutChart = new Chart(document.getElementById('donut-chart'), {
type: 'doughnut',
data: {
    labels,
    datasets: [{
    data: amounts,
    backgroundColor: PALETTE.slice(0, top6.length),
    borderWidth: 0,
    hoverOffset: 6,
    }]
},
options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
    legend: {
        position: 'bottom',
        labels: {
        font:     { family: 'DM Sans', size: 11 },
        color:    '#9299a8',
        boxWidth: 10,
        padding:  10
        }
    },
    tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.parsed) } }
    }
}
});
}

// ── breakdown table ───────────────────────────────────────────────────────────
function renderTable() {
const sort  = document.getElementById('sort-select').value;
const total = revenueData.reduce((a, r) => a + r.amount, 0);

let sorted = [...revenueData];
if      (sort === 'newest')  sorted.sort((a, b) => b.month.localeCompare(a.month));
else if (sort === 'oldest')  sorted.sort((a, b) => a.month.localeCompare(b.month));
else if (sort === 'highest') sorted.sort((a, b) => b.amount - a.amount);
else if (sort === 'lowest')  sorted.sort((a, b) => a.amount - b.amount);

const tbody     = document.getElementById('revenue-body');
const canDelete = hasPermission(Perms.MANAGE_ROLES);

if (!sorted.length) {
tbody.innerHTML = `
    <tr><td colspan="5">
    <div class="empty-state">
        <i class="ti ti-chart-bar-off"></i>
        <p style="margin-top:8px">No revenue records yet. Add your first one!</p>
    </div>
    </td></tr>`;
return;
}

// chronological list for prev-month comparison
const chrono = [...revenueData].sort((a, b) => a.month.localeCompare(b.month));

tbody.innerHTML = sorted.map(r => {
const idx   = chrono.findIndex(x => x.id === r.id);
const prev  = chrono[idx - 1];
const share = total > 0 ? ((r.amount / total) * 100).toFixed(1) : 0;

let changeHtml = '<span style="color:var(--ink-muted)">—</span>';
if (prev) {
    const pct  = ((r.amount - prev.amount) / prev.amount * 100);
    const cls  = pct >= 0 ? 'pill-success' : 'pill-error';
    const icon = pct >= 0 ? '▲' : '▼';
    changeHtml = `<span class="pill ${cls}">${icon} ${Math.abs(pct).toFixed(1)}%</span>`;
}

return `
    <tr>
    <td style="font-family:'DM Mono',monospace;font-weight:500;color:var(--ink)">
        ${fmtMonth(r.month)}
    </td>
    <td style="font-family:'DM Mono',monospace;font-size:15px;color:var(--ink)">
        ${fmtMoney(r.amount)}
    </td>
    <td>${changeHtml}</td>
    <td>
        <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;height:6px;background:var(--surface);border-radius:99px;overflow:hidden">
            <div style="width:${share}%;height:100%;background:var(--accent);border-radius:99px;transition:width 0.4s ease"></div>
        </div>
        <span style="font-size:12px;color:var(--ink-muted);min-width:36px;text-align:right">${share}%</span>
        </div>
    </td>
    <td style="text-align:right">
        ${canDelete ? `
        <button
            class="btn btn-secondary"
            style="padding:5px 10px;font-size:12px;color:var(--error);border-color:var(--error-lt)"
            onclick="openDeleteModal(${r.id}, '${fmtMonth(r.month)}')"
            title="Delete record">
            <i class="ti ti-trash"></i>
        </button>` : ''}
    </td>
    </tr>`;
}).join('');
}

// ── modals ────────────────────────────────────────────────────────────────────
function openAddModal() {
const now = new Date();
document.getElementById('add-month').value  = now.toISOString().slice(0, 7);
document.getElementById('add-amount').value = '';
document.getElementById('add-error').style.display = 'none';
document.getElementById('add-modal').classList.add('open');
setTimeout(() => document.getElementById('add-amount').focus(), 120);
}

function openDeleteModal(id, label) {
deletingId = id;
document.getElementById('delete-modal-sub').textContent =
`Delete revenue record for ${label}? This cannot be undone.`;
document.getElementById('delete-modal').classList.add('open');
}

function closeModal(id) {
document.getElementById(id).classList.remove('open');
deletingId = null;
}

function setupModalBackdropClose() {
document.querySelectorAll('.modal-backdrop').forEach(el => {
el.addEventListener('click', e => {
    if (e.target === el) el.classList.remove('open');
});
});
}

function setupKeyboardShortcuts() {
document.addEventListener('keydown', e => {
if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open')
            .forEach(el => el.classList.remove('open'));
}
// 'N' to open add modal (when not typing in an input)
if (e.key === 'n' && document.activeElement.tagName !== 'INPUT') {
    openAddModal();
}
});
}

// ── submit: add revenue ───────────────────────────────────────────────────────
async function submitRevenue() {
const month  = document.getElementById('add-month').value;
const amount = parseFloat(document.getElementById('add-amount').value);
const errEl  = document.getElementById('add-error');
const btn    = document.getElementById('add-submit-btn');

errEl.style.display = 'none';

if (!month) {
errEl.textContent = 'Please select a month.';
errEl.style.display = 'block'; return;
}
if (!amount || amount <= 0) {
errEl.textContent = 'Please enter a valid amount greater than 0.';
errEl.style.display = 'block'; return;
}

// check duplicate month
const exists = revenueData.find(r => r.month === month);
if (exists) {
errEl.textContent = `A record for ${fmtMonth(month)} already exists ($${exists.amount.toLocaleString()}).`;
errEl.style.display = 'block'; return;
}

btn.disabled = true;
btn.innerHTML = '<i class="ti ti-loader"></i> Saving…';

try {
const res  = await fetch(`${API}/dashboard/revenue`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ month, amount })
});
const data = await res.json();

if (!res.ok) {
    errEl.textContent = data.error || 'Failed to save.';
    errEl.style.display = 'block'; return;
}

closeModal('add-modal');
toast('Revenue record added!', 'success');
load();

} catch (e) {
errEl.textContent = 'Network error. Is Flask running?';
errEl.style.display = 'block';
} finally {
btn.disabled = false;
btn.innerHTML = '<i class="ti ti-check"></i> Save record';
}
}

// ── submit: delete revenue ────────────────────────────────────────────────────
async function confirmDelete() {
if (!deletingId) return;

try {
const res = await fetch(`${API}/dashboard/revenue/${deletingId}`, {
    method:  'DELETE',
    headers: authHeaders()
});

closeModal('delete-modal');

if (!res.ok) { toast('Failed to delete record', 'error'); return; }
toast('Record deleted', 'warning');
load();

} catch (e) {
toast('Network error', 'error');
}
}