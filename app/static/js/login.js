const API = "http://flowdesk-saas.up.railway.app/api";

    function showLogin() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("register-form").style.display = "none";
    document.getElementById("btn-login").classList.add("active");
    document.getElementById("btn-register").classList.remove("active");
    clearError();
    }

    function showRegister() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
    document.getElementById("btn-register").classList.add("active");
    document.getElementById("btn-login").classList.remove("active");
    clearError();
    }

    function showError(msg) {
    const el = document.getElementById("error-msg");
    el.textContent = msg;
    el.classList.add("show");
    }

    function clearError() {
    document.getElementById("error-msg").classList.remove("show");
    }

    // circule that show when click to sign in button and -----prevent user from send another request to login -----
    function setLoading(btnId, spinnerId, labelId, loading) {
    document.getElementById(btnId).disabled = loading;
    document.getElementById(spinnerId).style.display = loading
        ? "block"
        : "none";
    document.getElementById(labelId).style.display = loading
        ? "none"
        : "inline";
    }

    async function login() {
    clearError();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) return showError("Please fill in all fields.");

    setLoading("login-btn", "login-spinner", "login-label", true);

    try {
        const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) return showError(data.error || "Login failed.");

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("company", JSON.stringify(data.company));
        window.location.href = "/dashboard";
    } catch (e) {
        showError("Cannot reach server. Is Flask running?");
    } finally {
        setLoading("login-btn", "login-spinner", "login-label", false);
    }
    }

    async function register() {
    clearError();
    const company_name = document
        .getElementById("reg-company")
        .value.trim();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!company_name || !name || !email || !password)
        return showError("Please fill in all fields.");

    setLoading("reg-btn", "reg-spinner", "reg-label", true);

    try {
        const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name, name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) return showError(data.error || "Registration failed.");

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("company", JSON.stringify(data.company));
        window.location.href = "/dashboard";
    } catch (e) {
        showError("Cannot reach server. Is Flask running?");
    } finally {
        setLoading("reg-btn", "reg-spinner", "reg-label", false);
    }
    }

    /*
    allow Enter key to submit ..we use getelementbyid to prevent user press enter on any where in page ,so i link button with form  
    */
    document.getElementById("login-form").addEventListener("keydown", handleEnter);
    document.getElementById("register-form").addEventListener("keydown", handleEnter);

    function handleEnter(e) {
        if (e.key !== "Enter") return;

        e.preventDefault(); // Prevent the browser's default form submission

        if (document.getElementById("login-form").style.display !== "none") {
            login();
        } else {
            register();
        }
    }

    // redirect if already logged in
    if (localStorage.getItem("token")) {
    window.location.href = "/dashboard";
    }