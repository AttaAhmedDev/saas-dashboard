// orders.js — all logic for orders.html

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  buildSidebar("orders");
  document
    .getElementById("status-select")
    .addEventListener("change", loadOrders);
  document.getElementById("search-input").addEventListener("input", loadOrders);
  // create order shortcut for users with permission
  if (hasPermission("manage_orders")) {
    const topbar = document.querySelector(".topbar");
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.style.marginLeft = "8px";
    btn.textContent = "New Order";
    btn.onclick = () => openOrderModal();
    topbar.appendChild(btn);
  }
  loadOrders();
});

async function loadOrders() {
  const status = document.getElementById("status-select").value;
  const search = document
    .getElementById("search-input")
    .value.trim()
    .toLowerCase();
  const query =
    status !== "all" ? `?status=${status}&limit=1000` : "?limit=1000";

  try {
    const res = await fetch(`${API}/dashboard/orders${query}`, {
      headers: authHeaders(),
    });
    if (res.status === 403) {
      showAccessDenied();
      return;
    }

    const data = await res.json();
    const orders = (data.orders || []).filter((order) => {
      if (!search) return true;
      return (
        order.customer.toLowerCase().includes(search) ||
        order.product.toLowerCase().includes(search)
      );
    });

    document.getElementById("orders-count").textContent =
      `${orders.length} orders`;
    renderOrders(orders);
  } catch (error) {
    console.error("Failed to load orders:", error);
    document.getElementById("orders-body").innerHTML =
      '<tr><td colspan="5" style="color:var(--error);padding:20px 0">Unable to load orders.</td></tr>';
  } finally {
    document.getElementById("loading").classList.remove("show");
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById("orders-body");
  if (!orders.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="color:var(--ink-muted);padding:20px 0">No orders found.</td></tr>';
    return;
  }

  tbody.innerHTML = orders
    .map(
      (order) => `
    <tr>
      <td>${order.customer}</td>
      <td style="color:var(--ink-muted)">${order.product}</td>
      <td style="font-family:'DM Mono',monospace">${fmtMoney(order.amount)}</td>
      <td><span class="pill ${order.status === "completed" ? "pill-success" : order.status === "pending" ? "pill-warning" : "pill-error"}">${order.status}</span></td>
      <td>${new Date(order.created_at).toLocaleDateString("en-US")}</td>
      <td>
        ${
          hasPermission("manage_orders")
            ? `
          <button class="btn btn-sm" onclick="openOrderModal(${order.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteOrder(${order.id})">Delete</button>
        `
            : ""
        }
      </td>
    </tr>
  `,
    )
    .join("");
}

function showAccessDenied() {
  document.getElementById("loading").classList.remove("show");
  document.querySelector(".main").innerHTML = `
    <div class="empty-state" style="margin-top:120px">
      <i class="ti ti-lock"></i>
      <p style="margin-top:12px;font-size:15px">You don't have permission to view orders.</p>
      <p style="margin-top:6px;font-size:13px;color:var(--ink-muted)">Contact your admin to request access.</p>
    </div>
  `;
}

// Order modal + CRUD helpers
let editingOrderId = null;
function openOrderModal(orderId) {
  editingOrderId = orderId || null;
  document.getElementById("order-error").style.display = "none";
  document.getElementById("order-submit-btn").disabled = false;

  if (editingOrderId) {
    // fetch order and fill
    fetch(`${API}/dashboard/orders/${editingOrderId}`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        const o = data.order;
        document.getElementById("order-customer").value = o.customer;
        document.getElementById("order-product").value = o.product;
        document.getElementById("order-amount").value = o.amount;
        document.getElementById("order-status").value = o.status;
        document.getElementById("order-modal-title").textContent = "Edit Order";
        document.getElementById("order-modal-sub").textContent =
          "Update order details";
        document.getElementById("order-modal").classList.add("open");
      })
      .catch((err) => {
        toast("Failed to load order for edit", "error");
      });
  } else {
    document.getElementById("order-customer").value = "";
    document.getElementById("order-product").value = "";
    document.getElementById("order-amount").value = "";
    document.getElementById("order-status").value = "pending";
    document.getElementById("order-modal-title").textContent = "New Order";
    document.getElementById("order-modal-sub").textContent =
      "Create a new order";
    document.getElementById("order-modal").classList.add("open");
  }
}

async function submitOrder() {
  const btn = document.getElementById("order-submit-btn");
  const err = document.getElementById("order-error");
  err.style.display = "none";
  btn.disabled = true;

  const payload = {
    customer: document.getElementById("order-customer").value.trim(),
    product: document.getElementById("order-product").value.trim(),
    amount: Number(document.getElementById("order-amount").value) || 0,
    status: document.getElementById("order-status").value,
  };

  if (!payload.customer || !payload.product || !payload.amount) {
    err.textContent = "Please fill customer, product and amount.";
    err.style.display = "block";
    btn.disabled = false;
    return;
  }

  try {
    let res;
    if (editingOrderId) {
      res = await fetch(`${API}/dashboard/orders/${editingOrderId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API}/dashboard/orders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
    }

    const data = await parseApiResponse(res);
    if (!res.ok) {
      err.textContent = data.error || "Failed to save order.";
      err.style.display = "block";
      return;
    }

    closeModal("order-modal");
    toast(editingOrderId ? "Order updated" : "Order created");
    loadOrders();
  } catch (e) {
    console.error("Order save failed", e);
    err.textContent = "Unable to save order.";
    err.style.display = "block";
  } finally {
    btn.disabled = false;
  }
}

function confirmDeleteOrder(id) {
  if (!confirm("Delete this order?")) return;
  deleteOrder(id);
}

async function deleteOrder(id) {
  try {
    const res = await fetch(`${API}/dashboard/orders/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await parseApiResponse(res);
    if (!res.ok) {
      toast(data.error || "Failed to delete order", "error");
      return;
    }
    toast("Order deleted");
    loadOrders();
  } catch (e) {
    console.error("Delete failed", e);
    toast("Unable to delete order", "error");
  }
}
