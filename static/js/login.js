/**
 * INFORYZE26 - Login Page Logic
 */

(() => {
  const roleSelect = document.querySelector("#role");
  const passwordField = document.querySelector("#password-field");
  const passwordInput = document.querySelector("#password");
  const loginForm = document.querySelector("#login-form");
  const submitButton = document.querySelector("#submit-btn");
  const errorMessage = document.querySelector("#error-message");

  // Theme support
  const themeButtons = document.querySelectorAll("[data-theme-toggle]");
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeButtons.forEach((btn) => {
      const isDark = theme === "dark";
      btn.innerHTML = isDark ? "☀" : "☾";
      btn.setAttribute("aria-label", isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap");
      btn.title = isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap";
    });
  };

  const savedTheme = localStorage.getItem("kaskita-theme") || "light";
  applyTheme(savedTheme);

  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      try { localStorage.setItem("kaskita-theme", nextTheme); } catch (e) {}
    });
  });

  const updateFields = () => {
    const isManager = roleSelect.value === "pengelola";
    passwordField.hidden = !isManager;
    passwordInput.required = isManager;
    if (!isManager) passwordInput.value = "";
    errorMessage.textContent = "";
  };

  roleSelect.addEventListener("change", updateFields);
  updateFields();

  // Check URL params for error
  const queryError = new URLSearchParams(window.location.search).get("error");
  if (queryError) {
    errorMessage.textContent = queryError;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = "Memproses...";
    errorMessage.textContent = "";

    try {
      const role = roleSelect.value;
      const body = { role };
      if (role === "pengelola") {
        body.password = passwordInput.value;
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Gagal masuk. Periksa kembali data Anda.");
      }

      window.location.replace("/");
    } catch (err) {
      errorMessage.textContent = err.message || "Gagal menghubungi server.";
      if (roleSelect.value === "pengelola") {
        passwordInput.focus();
      }
      submitButton.disabled = false;
      submitButton.textContent = "Masuk";
    }
  });
})();
