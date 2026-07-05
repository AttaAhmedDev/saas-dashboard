// ── settings.js — all logic for settings.html ───────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  buildSidebar('settings');
  renderSettings();
  document.getElementById('loading').classList.remove('show');
});

function renderSettings() {
  const user = getUser();
  const company = getCompany();

  document.getElementById('company-name').textContent = company.name || '—';
  document.getElementById('company-slug').textContent = company.slug || '—';
  document.getElementById('company-id').textContent = company.id || '—';
  document.getElementById('user-name').textContent = user.name || '—';
  document.getElementById('user-email').textContent = user.email || '—';
  document.getElementById('user-role').textContent = user.role || '—';
}
