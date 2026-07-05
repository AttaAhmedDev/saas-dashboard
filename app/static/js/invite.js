// invite.js — accept invite page

async function acceptInvite() {
  const password = document.getElementById("invite-password").value;
  const errorEl = document.getElementById("error-msg");
  const btn = document.getElementById("invite-submit-btn");
  const label = document.getElementById("invite-label");

  errorEl.classList.remove("show");
  errorEl.textContent = "";

  if (!password || password.length < 6) {
    errorEl.textContent = "Password must be at least 6 characters.";
    errorEl.classList.add("show");
    return;
  }

  btn.disabled = true;
  label.textContent = "Accepting…";

  try {
    const res = await fetch(`${API}/auth/invite/${INVITE_TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password }),
    });
    const data = await parseApiResponse(res);

    if (!res.ok) {
      errorEl.textContent = data.error || "Failed to accept invite.";
      errorEl.classList.add("show");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("company", JSON.stringify(data.company));
    window.location.href = "/dashboard";
  } catch (error) {
    console.error("Invite acceptance failed:", error);
    errorEl.textContent = "Unable to accept invite. Try again later.";
    errorEl.classList.add("show");
  } finally {
    btn.disabled = false;
    label.textContent = "Accept invite";
  }
}
