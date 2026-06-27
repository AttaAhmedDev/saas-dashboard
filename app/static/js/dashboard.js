const API = "https://flowdesk-saas.up.railway.app/api";
    const token = localStorage.getItem("token");

    // redirect if not logged in
    if (!token) window.location.href = "/";

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const company = JSON.parse(localStorage.getItem("company") || "{}");

    // populate sidebar
    document.getElementById("sidebar-name").textContent = user.name || "—";
    document.getElementById("sidebar-role").textContent = user.role || "—";
    document.getElementById("sidebar-avatar").textContent = (user.name ||
    "?")[0].toUpperCase();
    document.getElementById("company-name").textContent = company.name || "—";

    const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    };

    function fmt(n) {
    return (
        "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })
    );
    }

    async function loadSummary() {
    const res = await fetch(`${API}/dashboard/summary`, { headers });
    const data = await res.json();
    document.getElementById("stat-revenue").textContent = fmt(
        data.total_revenue,
    );
    document.getElementById("stat-month").textContent = fmt(
        data.month_revenue,
    );
    document.getElementById("stat-orders").textContent = data.total_orders;
    document.getElementById("stat-users").textContent = data.total_users;
    document.getElementById("stat-completed-tag").textContent =
        `${data.completed_orders} completed`;
    }

    async function loadRevenue() {
    const res = await fetch(`${API}/dashboard/revenue`, { headers });
    const data = await res.json();
    const records = data.revenue;

    const labels = records.map((r) => {
        const [y, m] = r.month.split("-");
        return new Date(y, m - 1).toLocaleString("en", {
        month: "short",
        year: "2-digit",
        });
    });
    const amounts = records.map((r) => r.amount);

    new Chart(document.getElementById("revenue-chart"), {
        type: "bar",
        data: {
        labels,
        datasets: [
            {
            label: "Revenue",
            data: amounts,
            backgroundColor: "rgba(46,91,255,0.12)",
            borderColor: "#2e5bff",
            borderWidth: 2,
            borderRadius: 6,
            hoverBackgroundColor: "rgba(46,91,255,0.22)",
            },
        ],
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
            callbacks: {
                label: (ctx) => " " + fmt(ctx.parsed.y),
            },
            },
        },
        scales: {
            x: {
            grid: { display: false },
            ticks: {
                font: { family: "DM Sans", size: 12 },
                color: "#9299a8",
            },
            },
            y: {
            grid: { color: "#f0f0f3" },
            ticks: {
                font: { family: "DM Mono", size: 11 },
                color: "#9299a8",
                callback: (v) => "$" + (v / 1000).toFixed(0) + "k",
            },
            },
        },
        },
    });
    }

    async function loadOrders() {
    const res = await fetch(`${API}/dashboard/orders`, { headers });
    const data = await res.json();
    const tbody = document.getElementById("orders-body");

    if (!data.orders.length) {
        tbody.innerHTML =
        '<tr><td colspan="4" style="color:var(--ink-muted);padding:20px 0">No orders yet.</td></tr>';
        return;
    }

    tbody.innerHTML = data.orders
        .map(
        (o) => `
    <tr>
    <td>${o.customer}</td>
    <td style="color:var(--ink-muted)">${o.product}</td>
    <td style="font-family:'DM Mono',monospace">${fmt(o.amount)}</td>
    <td><span class="status-pill status-${o.status}">${o.status}</span></td>
    </tr>
`,
        )
        .join("");
    }

    async function loadUsers() {
    const res = await fetch(`${API}/dashboard/users`, { headers });
    const data = await res.json();
    const list = document.getElementById("users-list");

    if (!data.users.length) {
        list.innerHTML =
        '<div style="color:var(--ink-muted);font-size:14px">No team members yet.</div>';
        return;
    }

    list.innerHTML = data.users
        .map(
        (u) => `
    <div class="user-row">
    <div class="user-av">${u.name[0].toUpperCase()}</div>
    <div class="user-meta">
        <div class="user-meta-name">${u.name}</div>
        <div class="user-meta-email">${u.email}</div>
    </div>
    <span class="role-pill role-${u.role}">${u.role}</span>
    </div>
`,
        )
        .join("");
    }

    async function init() {
    try {
        await Promise.all([
        loadSummary(),
        loadRevenue(),
        loadOrders(),
        loadUsers(),
        ]);
    } catch (e) {
        console.error(e);
    } finally {
        document.getElementById("loading").classList.remove("show");
    }
    }

    function logout() {
    localStorage.clear();
    window.location.href = "/";
    }

    init();