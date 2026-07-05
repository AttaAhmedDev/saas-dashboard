// ── shared.js — loaded by every page ─────────────────────────────────────────
// Use production API by default, override for development if needed
const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "https://flowdesk-saas.up.railway.app/api";

// ── auth helpers ──────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token");
}
function getUser() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}
function getCompany() {
  return JSON.parse(localStorage.getItem("company") || "{}");
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login";
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch (err) {
      return { error: body || err.message };
    }
  }

  return { error: body || response.statusText || "Unexpected server response" };
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

function setupModalBackdropClose() {
  document.querySelectorAll(".modal-backdrop").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target === el) el.classList.remove("open");
    });
  });
}

// ── permission helpers ────────────────────────────────────────────────────────
function hasPermission(perm) {
  const user = getUser();
  return (user.permissions || []).includes(perm);
}

const Perms = {
  VIEW_DASHBOARD: "view_dashboard",
  MANAGE_ORDERS: "manage_orders",
  VIEW_REVENUE: "view_revenue",
  MANAGE_USERS: "manage_users",
  MANAGE_ROLES: "manage_roles",
  COMPANY_SETTINGS: "company_settings",
};

// ── sidebar builder ───────────────────────────────────────────────────────────
function buildSidebar(activePage) {
  const user = getUser();
  const company = getCompany();

  const navItems = [
    {
      page: "dashboard",
      href: "dashboard",
      icon: "ti-layout-dashboard",
      label: "Dashboard",
      perm: Perms.VIEW_DASHBOARD,
    },
    {
      page: "revenue",
      href: "revenue",
      icon: "ti-chart-line",
      label: "Revenue",
      perm: Perms.VIEW_REVENUE,
    },
    {
      page: "orders",
      href: "orders",
      icon: "ti-shopping-cart",
      label: "Orders",
      perm: Perms.VIEW_DASHBOARD,
    },
    {
      page: "team",
      href: "team",
      icon: "ti-users",
      label: "Team",
      perm: Perms.MANAGE_USERS,
    },
    {
      page: "settings",
      href: "settings",
      icon: "ti-settings",
      label: "Settings",
      perm: Perms.COMPANY_SETTINGS,
    },
  ];

  const visibleItems = navItems.filter((item) => hasPermission(item.perm));

  const avatar = (user.name || "?")[0].toUpperCase();
  const roleColors = {
    owner: "#a78bfa",
    admin: "#60a5fa",
    manager: "#34d399",
    sales: "#fbbf24",
    accountant: "#4ade80",
    hr: "#f87171",
    employee: "#9ca3af",
  };
  const roleColor = roleColors[user.role] || "#9ca3af";

  const sidebarEl = document.getElementById("sidebar");
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon">
        <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill="white"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="white"/></svg>
      </div>
      <span class="brand-name">FlowDesk</span>
    </div>

    <div class="nav-section">Menu</div>
    ${visibleItems
      .map(
        (item) => `
      <a class="nav-item ${item.page === activePage ? "active" : ""}" href="${item.href}">
        <i class="ti ${item.icon}" aria-hidden="true"></i>
        ${item.label}
      </a>
    `,
      )
      .join("")}

    <div class="sidebar-footer">
      <div class="user-pill">
        <div class="avatar">${avatar}</div>
        <div class="user-info">
          <div class="user-name">${user.name || "—"}</div>
          <div class="user-role" style="color:${roleColor}">${user.role || "—"}</div>
        </div>
      </div>
      <div class="company-pill">
        <i class="ti ti-building" aria-hidden="true"></i>
        ${company.name || "—"}
      </div>
      <button class="logout-btn" onclick="logout()">
        <i class="ti ti-logout" aria-hidden="true"></i> Sign out
      </button>
    </div>
  `;
}

// ── toast notifications ───────────────────────────────────────────────────────
function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function copyToClipboard(text) {
  if (!navigator.clipboard) {
    return false;
  }
  navigator.clipboard.writeText(text).catch(() => {});
  return true;
}

// ── format helpers ────────────────────────────────────────────────────────────
function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 });
}
function fmtDate(str) {
  return new Date(str).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function fmtMonth(str) {
  const [y, m] = str.split("-");
  return new Date(y, m - 1).toLocaleString("en", {
    month: "short",
    year: "2-digit",
  });
}
