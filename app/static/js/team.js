// ── team.js — all logic for team.html ───────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  buildSidebar("team");
  setupModalBackdropClose();
  loadUsers();
});

async function loadUsers() {
  try {
    const res = await fetch(`${API}/dashboard/users`, {
      headers: authHeaders(),
    });
    if (res.status === 403) {
      showAccessDenied();
      return;
    }

    const data = await res.json();
    const users = data.users || [];
    renderUsers(users);
    renderCounts(users);
  } catch (error) {
    console.error("Failed to load users:", error);
    document.getElementById("users-body").innerHTML =
      '<tr><td colspan="4" style="color:var(--error);padding:20px 0">Unable to load team members.</td></tr>';
  } finally {
    document.getElementById("loading").classList.remove("show");
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("users-body");
  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="color:var(--ink-muted);padding:20px 0">No team members yet.</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (user) => `
    <tr>
      <td>${user.name}</td>
      <td style="color:var(--ink-muted)">${user.email}</td>
      <td><span class="role-pill role-${user.role}">${user.role}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString("en-US")}</td>
      <td style="text-align: center;">
        <button class="btn btn-icon" title="Edit role" onclick="openEditRoleModal(${user.id}, '${user.name}', '${user.role}')">
          <i class="ti ti-edit"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderCounts(users) {
  const counts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  document.getElementById("member-count").textContent = users.length;
  document.getElementById("owner-count").textContent = counts.owner || 0;
  document.getElementById("admin-count").textContent = counts.admin || 0;

  const summary = Object.entries(counts)
    .map(([role, count]) => `${count} ${role}`)
    .join(", ");
  document.getElementById("role-summary").textContent = summary || "No members";
}

function showAccessDenied() {
  document.getElementById("loading").classList.remove("show");
  document.querySelector(".main").innerHTML = `
    <div class="empty-state" style="margin-top:120px">
      <i class="ti ti-lock"></i>
      <p style="margin-top:12px;font-size:15px">You don't have permission to manage team members.</p>
      <p style="margin-top:6px;font-size:13px;color:var(--ink-muted)">Contact your admin to request access.</p>
    </div>
  `;
}

function openInviteModal() {
  document.getElementById("invite-name").value = "";
  document.getElementById("invite-email").value = "";
  document.getElementById("invite-role").value = "employee";
  document.getElementById("invite-error").style.display = "none";
  document.getElementById("invite-modal").classList.add("open");
}

async function submitInvite() {
  const name = document.getElementById("invite-name").value.trim();
  const email = document.getElementById("invite-email").value.trim();
  const role = document.getElementById("invite-role").value;
  const errorEl = document.getElementById("invite-error");
  const btn = document.getElementById("invite-submit-btn");

  errorEl.style.display = "none";

  if (!name || !email || !role) {
    errorEl.textContent = "Please fill in all invite fields.";
    errorEl.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    const res = await fetch(`${API}/dashboard/invite`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, email, role }),
    });
    const data = await parseApiResponse(res);

    if (!res.ok) {
      errorEl.textContent = data.error || "Invite failed.";
      errorEl.style.display = "block";
      return;
    }

    closeModal("invite-modal");
    if (data.email_sent) {
      toast("Invite email sent successfully.");
    } else if (data.email_error) {
      if (data.invite_url) {
        copyToClipboard(data.invite_url);
      }
      toast(
        `Invite created, but email delivery failed. Invite link copied to clipboard.`,
        "warning",
      );
    } else {
      if (data.invite_url) {
        copyToClipboard(data.invite_url);
      }
      toast(
        "Invite created. Email service is not configured, invite link copied to clipboard.",
        "warning",
      );
    }
    loadUsers();
  } catch (error) {
    console.error("Invite failed:", error);
    errorEl.textContent = "Unable to send invite. Try again later.";
    errorEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Send invite";
  }
}

// ── Role editing ─────────────────────────────────────────────────────

function openEditRoleModal(userId, userName, currentRole) {
  const currentUser = getUser();
  const roleSelect = document.getElementById("edit-role-select");

  document.getElementById("edit-role-modal").dataset.userId = userId;
  document.getElementById("edit-role-user-name").textContent =
    `Editing role for ${userName}`;

  // Hide owner option for admins (only owners can assign owner role)
  const ownerOption = roleSelect.querySelector('option[value="owner"]');
  if (currentUser.role === "admin") {
    if (ownerOption) ownerOption.style.display = "none";
  } else {
    if (ownerOption) ownerOption.style.display = "";
  }

  roleSelect.value = currentRole;
  document.getElementById("edit-role-error").style.display = "none";
  document.getElementById("edit-role-modal").classList.add("open");
}

async function submitEditRole() {
  const userId = document.getElementById("edit-role-modal").dataset.userId;
  const newRole = document.getElementById("edit-role-select").value;
  const errorEl = document.getElementById("edit-role-error");
  const btn = document.getElementById("edit-role-submit-btn");

  errorEl.style.display = "none";

  if (!newRole) {
    errorEl.textContent = "Please select a role.";
    errorEl.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Updating…";

  try {
    const res = await fetch(`${API}/dashboard/users/${userId}/role`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ role: newRole }),
    });
    const data = await parseApiResponse(res);

    if (!res.ok) {
      errorEl.textContent = data.error || "Failed to update role.";
      errorEl.style.display = "block";
      return;
    }

    closeModal("edit-role-modal");
    toast(`Role updated to ${newRole}.`);
    loadUsers();
  } catch (error) {
    console.error("Failed to update role:", error);
    errorEl.textContent = "Unable to update role. Try again later.";
    errorEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Update role";
  }
}
