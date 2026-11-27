/**
 * INFORYZE26 - Login Page Logic
 * Mendukung hosting statis (GitHub Pages / Vercel) dan mode server backend.
 */

(() => {
  const nameInput = document.querySelector("#login-name");
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

  // Check URL params for error or logout
  const params = new URLSearchParams(window.location.search);
  const queryError = params.get("error");
  if (queryError) {
    errorMessage.textContent = queryError;
  }
  if (params.get("logout")) {
    try {
      localStorage.removeItem("kaskita_role");
      localStorage.removeItem("kaskita_login_name");
      sessionStorage.removeItem("kaskita_role");
    } catch (e) {}
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = "Memproses...";
    errorMessage.textContent = "";

    const displayName = nameInput ? nameInput.value.trim() : "";
    const role = roleSelect.value;
    const password = passwordInput.value.trim();

    if (role === "pengelola" && !password) {
      errorMessage.textContent = "Masukkan kata sandi pengelola.";
      submitButton.disabled = false;
      submitButton.textContent = "Masuk Ke Dashboard";
      passwordInput.focus();
      return;
    }

    try {
      // 1. Jika Supabase sudah dikonfigurasi, gunakan Supabase Auth
      if (window.sb) {
        if (role === "pengelola") {
          const { error } = await window.sb.auth.signInWithPassword({
            email: window.SUPABASE_MANAGER_EMAIL || "pengurus@inforyze26.id",
            password
          });
          if (error) {
            throw new Error("Password tidak sesuai.");
          }
        } else {
          await window.sb.auth.signOut().catch(() => {});
        }
      } else {
        // 2. Fallback: coba login ke API backend Python (jika aktif) atau validasi statis
        try {
          const res = await fetch("api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role, ...(role === "pengelola" ? { password } : {}) })
          });

          if (!res.ok && res.status === 401) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload.error || "Password tidak sesuai.");
          }
        } catch (networkErr) {
          if (networkErr.message && networkErr.message.includes("Password")) {
            throw networkErr;
          }
          if (role === "pengelola" && password !== "INFORYZE26_PENGURUS") {
            throw new Error("Password tidak sesuai.");
          }
        }
      }

      // Simpan role dan nama di penyimpanan lokal agar langsung aktif
      localStorage.setItem("kaskita_role", role);
      sessionStorage.setItem("kaskita_role", role);
      if (displayName) {
        localStorage.setItem("kaskita_login_name", displayName);
      } else {
        localStorage.removeItem("kaskita_login_name");
      }

      // Arahkan ke halaman utama aplikasi
      window.location.replace("index.html");
    } catch (err) {
      errorMessage.textContent = err.message || "Gagal masuk.";
      if (role === "pengelola") {
        passwordInput.focus();
      }
      submitButton.disabled = false;
      submitButton.textContent = "Masuk Ke Dashboard";
    }
  });
})();
