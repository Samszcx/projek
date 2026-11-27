/**
 * INFORYZE26 - Main Frontend Application Logic
 * Mendukung hosting statis (GitHub Pages / Vercel / Netlify) & mode backend API.
 */

(() => {
  const CLASS_NAMES = ["A", "B", "C", "D", "E", "F", "G"];
  const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // DOM Elements
  const appShell = document.querySelector("#app-shell");
  const roleIndicator = document.querySelector("#role-indicator");
  const classSelect = document.querySelector("#class-select");
  const periodSelect = document.querySelector("#period-select");
  const duesInput = document.querySelector("#monthly-dues");
  const searchInput = document.querySelector("#search-input");
  const filterSelect = document.querySelector("#filter-select");
  const exportButton = document.querySelector("#export-button");
  const logoutButton = document.querySelector("#logout-button");

  // Dialogs
  const paymentDialog = document.querySelector("#payment-dialog");
  const expenseDialog = document.querySelector("#expense-dialog");
  const expenseForm = document.querySelector("#expense-form");

  // Views
  const mobileMenuView = document.querySelector("#mobile-menu-view");
  const studentDashView = document.querySelector("#student-dash-view");
  const topupView = document.querySelector("#topup-view");
  const historyView = document.querySelector("#history-view");
  const profileView = document.querySelector("#profile-view");
  const dashboardView = document.querySelector("#dashboard-view");
  const expenseView = document.querySelector("#expense-view");
  const overallView = document.querySelector("#overall-view");

  // Navigation Tabs
  const studentDashTab = document.querySelector("#student-dash-tab");
  const topupTab = document.querySelector("#topup-tab");
  const historyTab = document.querySelector("#history-tab");
  const profileTab = document.querySelector("#profile-tab");
  const dashboardTab = document.querySelector("#dashboard-tab");
  const expenseTab = document.querySelector("#expense-tab");
  const overallTab = document.querySelector("#overall-tab");
  const mobileMenuBtn = document.querySelector("#mobile-menu-btn");
  const mobileLogoutBtn = document.querySelector("#mobile-logout-btn");

  // Topup Form & Synced Selectors
  const topupForm = document.querySelector("#topup-form");
  const topupStudentInput = document.querySelector("#topup-student");
  const topupClassSelect = document.querySelector("#topup-class-select");
  const histClassSelect = document.querySelector("#hist-class-select");
  const histStudentInput = document.querySelector("#hist-student-input");
  const qrisPreviewBox = document.querySelector("#qris-preview-box");
  const autocompleteList = document.querySelector("#autocomplete-list");
  const customAmountWrap = document.querySelector("#custom-amount-wrap");
  const topupAmountInput = document.querySelector("#topup-amount");
  const topupTotalDisplay = document.querySelector("#topup-total");
  const summaryClassDisplay = document.querySelector("#summary-class");
  const summaryStudentDisplay = document.querySelector("#summary-student");
  const checkoutResult = document.querySelector("#checkout-result");

  // State
  let currentRole = null;
  let activeStudentId = null;
  let selectedTopupAmount = 10000;
  let pendingInvoice = null;
  let toastTimer = null;

  let state = {
    monthlyDues: 10000,
    selectedClass: "A",
    classes: {},
    expenses: {}
  };

  // Utilities
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const escapeHTML = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  };

  const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const periodText = (key) => {
    if (!key) return "-";
    const [year, month] = key.split("-").map(Number);
    return `${MONTH_NAMES[month - 1]} ${year}`;
  };

  const showToast = (message) => {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  };

  // API Client (dengan path relatif tanpa leading slash agar kompatibel di GitHub Pages)
  const apiRequest = async (url, options = {}) => {
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    const response = await fetch(cleanUrl, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Gagal menghubungi server.");
    }
    return payload;
  };

  // Theme Management
  const initTheme = () => {
    const themeButtons = document.querySelectorAll("[data-theme-toggle]");
    const applyTheme = (theme) => {
      document.documentElement.dataset.theme = theme;
      themeButtons.forEach((btn) => {
        const isDark = theme === "dark";
        btn.innerHTML = isDark ? "☀" : "☾";
        btn.setAttribute("aria-label", isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap");
        btn.title = isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap";
      });
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = theme === "dark" ? "#0e1622" : "#1f5fbf";
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
  };

  // Populate Period Dropdown (last 12 months)
  const initPeriods = () => {
    const now = new Date();
    periodSelect.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = periodText(key);
      periodSelect.appendChild(opt);
    }
  };

  // Populate Class Dropdowns
  const initClasses = () => {
    [classSelect, topupClassSelect, histClassSelect].forEach((sel) => {
      if (!sel) return;
      sel.innerHTML = "";
      CLASS_NAMES.forEach((cls) => {
        const opt = document.createElement("option");
        opt.value = cls;
        opt.textContent = `Kelas ${cls}`;
        sel.appendChild(opt);
      });
    });
  };

  const syncClassSelectors = (cls) => {
    [classSelect, topupClassSelect, histClassSelect].forEach((sel) => {
      if (sel && sel.value !== cls) sel.value = cls;
    });
  };

  // State Persistence (Dual Mode: localStorage + API bila ada)
  const saveState = async () => {
    try {
      localStorage.setItem("kaskita_state", JSON.stringify(state));
    } catch (e) {}

    if (currentRole === "pengelola") {
      try {
        await apiRequest("api/state", {
          method: "PUT",
          body: JSON.stringify({ state })
        });
      } catch (err) {}
    }
  };

  // Data Selectors
  const currentStudents = () => state.classes[classSelect.value] || [];

  const paymentsFor = (student, key = periodSelect.value) => {
    return student.payments?.[key] || [];
  };

  const studentTotalPaid = (student, key = periodSelect.value) => {
    return paymentsFor(student, key).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  };

  const studentStatus = (student, key = periodSelect.value) => {
    const paid = studentTotalPaid(student, key);
    if (paid >= state.monthlyDues && state.monthlyDues > 0) return "paid";
    if (paid > 0) return "partial";
    return "unpaid";
  };

  const expensesForClass = (className = classSelect.value, key = periodSelect.value) => {
    return state.expenses?.[className]?.[key] || [];
  };

  const allIncomesAcrossClasses = (key = periodSelect.value) => {
    return CLASS_NAMES.flatMap((cls) => {
      const students = state.classes[cls] || [];
      return students.flatMap((s) => {
        return paymentsFor(s, key).map((p) => ({
          ...p,
          className: cls,
          studentName: s.name
        }));
      });
    });
  };

  const allExpensesAcrossClasses = (key = periodSelect.value) => {
    return CLASS_NAMES.flatMap((cls) => {
      return expensesForClass(cls, key).map((exp) => ({
        ...exp,
        className: cls
      }));
    });
  };

  // Switch Active View
  const switchTab = (tabName) => {
    if (studentDashTab) studentDashTab.classList.toggle("active", tabName === "student-dash");
    topupTab.classList.toggle("active", tabName === "topup");
    if (historyTab) historyTab.classList.toggle("active", tabName === "history");
    if (profileTab) profileTab.classList.toggle("active", tabName === "profile");
    dashboardTab.classList.toggle("active", tabName === "dashboard");
    expenseTab.classList.toggle("active", tabName === "expense");
    overallTab.classList.toggle("active", tabName === "overall");

    if (mobileMenuView) mobileMenuView.hidden = tabName !== "mobile-menu";
    if (studentDashView) studentDashView.hidden = tabName !== "student-dash";
    topupView.hidden = tabName !== "topup";
    if (historyView) historyView.hidden = tabName !== "history";
    if (profileView) profileView.hidden = tabName !== "profile";
    dashboardView.hidden = tabName !== "dashboard";
    expenseView.hidden = tabName !== "expense";
    overallView.hidden = tabName !== "overall";

    const contextBar = document.querySelector("#context-bar");
    const classWrap = document.querySelector("#class-wrap");
    const periodWrap = document.querySelector("#period-wrap");

    if (currentRole === "pengelola" && contextBar) {
      contextBar.hidden = tabName === "mobile-menu";
      if (classWrap) classWrap.hidden = tabName === "overall";
      if (periodWrap) periodWrap.hidden = false;
    }

    render();
  };

  // Main Render Function
  const render = () => {
    const key = periodSelect.value;
    const currentClass = classSelect.value;
    const students = currentStudents();
    const query = (searchInput.value || "").trim().toLocaleLowerCase("id-ID");
    const filter = filterSelect.value;

    // Filter Students
    const filtered = students.filter((s) => {
      const matches = s.name.toLocaleLowerCase("id-ID").includes(query) || (s.npm || "").includes(query);
      if (!matches) return false;
      if (filter === "all") return true;
      return studentStatus(s, key) === filter;
    }).sort((a, b) => a.name.localeCompare(b.name, "id-ID"));

    // Render Student Table
    const tableBody = document.querySelector("#student-rows");
    const emptyState = document.querySelector("#empty-state");
    const visibleCount = document.querySelector("#visible-count");
    const shownTotal = document.querySelector("#shown-total");

    visibleCount.textContent = `${filtered.length} mahasiswa`;
    shownTotal.textContent = `${filtered.length} mahasiswa`;

    if (filtered.length) {
      emptyState.hidden = true;
      tableBody.innerHTML = filtered.map((s) => {
        const paid = studentTotalPaid(s, key);
        const due = Math.max(0, state.monthlyDues - paid);
        const status = studentStatus(s, key);
        const statusLabel = status === "paid" ? "Lunas" : status === "partial" ? "Cicilan" : "Belum bayar";
        const initials = s.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
        const avatarColor = ChartEngine.getAvatarColor(s.name);

        return `
          <tr>
            <td>
              <div class="student-info">
                <div class="avatar" style="background:${avatarColor};">${escapeHTML(initials)}</div>
                <div>
                  <div class="student-name">${escapeHTML(s.name)}</div>
                  <div class="student-sub">${s.npm ? `NPM ${escapeHTML(s.npm)}` : `Iuran ${escapeHTML(periodText(key))}`}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="status-badge status-${status}">${statusLabel}</span>
            </td>
            <td>
              <div class="amount-main">${formatRupiah(paid)} <span style="font-weight:400;color:var(--text-subtle)">/ ${formatRupiah(state.monthlyDues)}</span></div>
              <div class="amount-sub">${status === "paid" ? "Iuran terpenuhi" : `Kurang ${formatRupiah(due)}`}</div>
            </td>
            <td style="text-align: right;">
              <button class="button button-small button-light history-btn" type="button" data-student="${escapeHTML(s.id)}">
                Riwayat
              </button>
            </td>
          </tr>
        `;
      }).join("");
    } else {
      tableBody.innerHTML = "";
      emptyState.hidden = false;
    }

    // Dashboard Metrics
    const collected = students.reduce((sum, s) => sum + studentTotalPaid(s, key), 0);
    const target = students.length * state.monthlyDues;
    const paidCount = students.filter((s) => studentStatus(s, key) === "paid").length;
    const remaining = Math.max(0, target - collected);
    const rate = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;

    document.querySelector("#collected-total").textContent = formatRupiah(collected);
    document.querySelector("#target-total").textContent = formatRupiah(target);
    document.querySelector("#remaining-total").textContent = formatRupiah(remaining);
    document.querySelector("#paid-count").textContent = `${paidCount} dari ${students.length} lunas`;
    document.querySelector("#rate-label").textContent = `${rate}% tercapai`;
    document.querySelector("#student-count").textContent = `${students.length} mahasiswa`;
    document.querySelector("#outstanding-count").textContent = `${students.length - paidCount} mahasiswa`;
    document.querySelector("#collection-progress").style.width = `${rate}%`;
    document.querySelector("#dashboard-class-title").textContent = `Kas Kelas ${currentClass}`;
    document.querySelector("#period-label").textContent = periodText(key);

    // Dynamic Circular Progress Ring
    const gaugeContainer = document.querySelector("#target-gauge-box");
    if (gaugeContainer && window.ChartEngine) {
      ChartEngine.renderCircularGauge(gaugeContainer, rate);
    }

    // Expense View Data
    const classExpenses = expensesForClass(currentClass, key);
    const classExpenseTotal = classExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    document.querySelector("#class-expense-total").textContent = formatRupiah(classExpenseTotal);
    document.querySelector("#class-expense-count").textContent = `${classExpenses.length} catatan`;
    document.querySelector("#class-income-total").textContent = formatRupiah(collected);
    document.querySelector("#class-cash-balance").textContent = formatRupiah(collected - classExpenseTotal);

    const expenseTable = document.querySelector("#expense-rows");
    if (classExpenses.length) {
      expenseTable.innerHTML = classExpenses.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")).map((exp) => {
        const dateStr = new Date(`${exp.date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        return `
          <tr>
            <td>
              <time datetime="${escapeHTML(exp.date)}">${dateStr}</time>
              ${exp.time ? `<div class="student-sub">${escapeHTML(exp.time)}</div>` : ""}
            </td>
            <td>${escapeHTML(exp.note)}</td>
            <td style="text-align: right;"><strong>${formatRupiah(exp.amount)}</strong></td>
            <td style="text-align: right;">
              <button class="btn-delete" type="button" data-delete-expense="${escapeHTML(exp.id)}">Hapus</button>
            </td>
          </tr>
        `;
      }).join("");
    } else {
      expenseTable.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada catatan pengeluaran pada periode ini.</td></tr>`;
    }

    // Overall View Data
    const allIncomes = allIncomesAcrossClasses(key);
    const allExpenses = allExpensesAcrossClasses(key);
    const overallIncomeTotal = allIncomes.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const overallExpenseTotal = allExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const overallBalanceTotal = overallIncomeTotal - overallExpenseTotal;

    document.querySelector("#overall-balance-total").textContent = formatRupiah(overallBalanceTotal);
    document.querySelector("#overall-income-total").textContent = formatRupiah(overallIncomeTotal);
    document.querySelector("#overall-income-count").textContent = `${allIncomes.length} transaksi`;
    document.querySelector("#overall-expense-total").textContent = formatRupiah(overallExpenseTotal);
    document.querySelector("#overall-expense-count").textContent = `${allExpenses.length} catatan`;

    // Render Class Comparison Chart
    const comparisonContainer = document.querySelector("#class-comparison-chart");
    if (comparisonContainer && window.ChartEngine) {
      const classMetrics = CLASS_NAMES.map((cls) => {
        const cStudents = state.classes[cls] || [];
        const cCollected = cStudents.reduce((sum, s) => sum + studentTotalPaid(s, key), 0);
        const cTarget = cStudents.length * state.monthlyDues;
        const cRate = cTarget > 0 ? Math.round((cCollected / cTarget) * 100) : 0;
        return {
          className: cls,
          collected: cCollected,
          target: cTarget,
          rate: cRate,
          studentCount: cStudents.length
        };
      });

      ChartEngine.renderClassComparison(comparisonContainer, classMetrics, currentClass, (selectedClass) => {
        classSelect.value = selectedClass;
        state.selectedClass = selectedClass;
        saveState();
        switchTab("dashboard");
      });
    }

    // Overall Tables
    const overallIncomeRows = document.querySelector("#overall-income-rows");
    if (allIncomes.length) {
      overallIncomeRows.innerHTML = allIncomes.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")).map((inc) => {
        const dateStr = new Date(`${inc.date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        return `
          <tr>
            <td><time>${dateStr}</time>${inc.time ? `<div class="student-sub">${escapeHTML(inc.time)}</div>` : ""}</td>
            <td>Kelas ${escapeHTML(inc.className)}</td>
            <td><strong>${escapeHTML(inc.studentName)}</strong></td>
            <td style="text-align: right;"><strong>${formatRupiah(inc.amount)}</strong></td>
          </tr>
        `;
      }).join("");
    } else {
      overallIncomeRows.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada pemasukan pada periode ini.</td></tr>`;
    }

    const overallExpenseRows = document.querySelector("#overall-expense-rows");
    if (allExpenses.length) {
      overallExpenseRows.innerHTML = allExpenses.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")).map((exp) => {
        const dateStr = new Date(`${exp.date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        return `
          <tr>
            <td><time>${dateStr}</time>${exp.time ? `<div class="student-sub">${escapeHTML(exp.time)}</div>` : ""}</td>
            <td>Kelas ${escapeHTML(exp.className)}</td>
            <td>${escapeHTML(exp.note)}</td>
            <td style="text-align: right;"><strong>${formatRupiah(exp.amount)}</strong></td>
          </tr>
        `;
      }).join("");
    } else {
      overallExpenseRows.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada pengeluaran pada periode ini.</td></tr>`;
    }

    renderStudentViews();
  };

  // Find active student for Student Dashboard / History / Profile
  const findActiveStudent = (preferredName) => {
    const raw = (preferredName ?? topupStudentInput?.value ?? localStorage.getItem("kaskita_login_name") ?? "").trim().toLocaleLowerCase("id-ID");
    if (!raw) return null;
    const inCurrent = currentStudents().find((s) => s.name.trim().toLocaleLowerCase("id-ID") === raw || s.name.toLocaleLowerCase("id-ID").includes(raw));
    if (inCurrent) return { student: inCurrent, className: classSelect.value };
    for (const cls of CLASS_NAMES) {
      const found = (state.classes[cls] || []).find((s) => s.name.trim().toLocaleLowerCase("id-ID") === raw || s.name.toLocaleLowerCase("id-ID").includes(raw));
      if (found) return { student: found, className: cls };
    }
    return null;
  };

  // Render Student Dashboard, History & Profile Views
  const renderStudentViews = () => {
    const key = periodSelect.value;
    const currentClass = classSelect.value;
    const match = findActiveStudent();
    const activeStudent = match?.student || null;
    const activeClass = match?.className || currentClass;
    const displayName = activeStudent?.name || localStorage.getItem("kaskita_login_name") || "Mahasiswa";

    // Collect all payments for active student (or active class if no student selected yet)
    const now = new Date();
    const monthKeys = [];
    const rangeCount = Number(document.querySelector("#sd-chart-range")?.value || 6);
    for (let i = rangeCount - 1; i >= 0; i--) {
      monthKeys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }

    const collectStudentPayments = (s) => {
      if (!s?.payments) return [];
      return Object.entries(s.payments).flatMap(([mKey, list]) =>
        (list || []).map((p) => ({ ...p, periodKey: mKey, studentName: s.name }))
      );
    };

    const classStudents = state.classes[activeClass] || [];
    const txList = (activeStudent ? collectStudentPayments(activeStudent) : classStudents.flatMap(collectStudentPayments))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.time || "").localeCompare(a.time || ""));

    const totalPaidAll = txList.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paidThisMonth = activeStudent
      ? studentTotalPaid(activeStudent, key)
      : classStudents.reduce((sum, s) => sum + studentTotalPaid(s, key), 0);
    const targetThisMonth = activeStudent ? state.monthlyDues : classStudents.length * state.monthlyDues;
    const activeBill = activeStudent
      ? Math.max(0, state.monthlyDues - paidThisMonth)
      : state.monthlyDues;

    // Dashboard KPIs
    const greetingEl = document.querySelector("#sd-greeting");
    if (greetingEl) greetingEl.textContent = `Halo, ${displayName}`;
    const sdTotalPaid = document.querySelector("#sd-total-paid");
    if (sdTotalPaid) sdTotalPaid.textContent = formatRupiah(totalPaidAll);
    const sdTxCount = document.querySelector("#sd-tx-count");
    if (sdTxCount) sdTxCount.textContent = `${txList.length} Transaksi Berhasil`;

    const sdActiveBill = document.querySelector("#sd-active-bill");
    if (sdActiveBill) sdActiveBill.textContent = formatRupiah(activeBill);
    const sdBillStatus = document.querySelector("#sd-bill-status");
    if (sdBillStatus) sdBillStatus.textContent = activeBill === 0 ? "Sudah Lunas" : "Menunggu Pembayaran";

    const paidMonthsCount = activeStudent
      ? monthKeys.filter((mk) => studentTotalPaid(activeStudent, mk) >= state.monthlyDues && state.monthlyDues > 0).length
      : classStudents.filter((s) => studentStatus(s, key) === "paid").length;
    const totalUnitCount = activeStudent ? rangeCount : Math.max(1, classStudents.length);
    const ratioPct = Math.min(100, Math.round((paidMonthsCount / totalUnitCount) * 100));

    const sdMonthRatio = document.querySelector("#sd-month-ratio");
    if (sdMonthRatio) {
      sdMonthRatio.textContent = activeStudent
        ? `${paidMonthsCount} / ${rangeCount} Bulan`
        : `${paidMonthsCount} / ${classStudents.length} Lunas`;
    }
    const sdStatusText = document.querySelector("#sd-status-text");
    if (sdStatusText) {
      sdStatusText.textContent = ratioPct >= 100 ? "Lunas" : ratioPct > 0 ? "Lunas Sebagian" : "Belum Lunas";
    }
    const sdProgressBar = document.querySelector("#sd-progress-bar");
    if (sdProgressBar) sdProgressBar.style.width = `${ratioPct}%`;

    const sdInfoDues = document.querySelector("#sd-info-dues");
    if (sdInfoDues) sdInfoDues.textContent = formatRupiah(state.monthlyDues);

    // Donut Ring & Legend
    const sdDonutBox = document.querySelector("#sd-donut-box");
    if (sdDonutBox) {
      const r = 46;
      const c = 2 * Math.PI * r;
      const offset = c - (ratioPct / 100) * c;
      sdDonutBox.innerHTML = `
        <svg width="120" height="120" viewBox="0 0 120 120" aria-label="Status Pembayaran ${ratioPct}%">
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(15,46,89,0.14)" stroke-width="11"></circle>
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="#285eb0" stroke-width="11"
            stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
            transform="rotate(-90 60 60)"></circle>
          <text x="60" y="65" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${ratioPct}%</text>
        </svg>
      `;
    }

    const sdDonutLegend = document.querySelector("#sd-donut-legend");
    if (sdDonutLegend) {
      const unpaidUnits = Math.max(0, totalUnitCount - paidMonthsCount);
      const remainingVal = Math.max(0, targetThisMonth - paidThisMonth);
      sdDonutLegend.innerHTML = `
        <div class="sd-legend-row">
          <span class="sd-dot" style="background:#56c22b;"></span>
          <span>Sudah Bayar</span>
          <strong>${paidMonthsCount} ${activeStudent ? "Bulan" : "Mhs"}</strong>
          <span>${formatRupiah(paidThisMonth)}</span>
        </div>
        <div class="sd-legend-row">
          <span class="sd-dot" style="background:#0f2e59;"></span>
          <span>Belum Bayar</span>
          <strong>${unpaidUnits} ${activeStudent ? "Bulan" : "Mhs"}</strong>
          <span>${formatRupiah(remainingVal)}</span>
        </div>
      `;
    }

    // Recent Payments List
    const sdRecentList = document.querySelector("#sd-recent-list");
    if (sdRecentList) {
      const recent = txList.slice(0, 7);
      sdRecentList.innerHTML = recent.length
        ? recent.map((tx) => `
          <div class="sd-tx-row">
            <div>
              <div class="sd-tx-title">${escapeHTML(activeStudent ? "Kas Angkatan" : tx.studentName)}</div>
              <div class="sd-tx-date">${escapeHTML(tx.date || "-")}${tx.time ? ` · ${escapeHTML(tx.time)}` : ""}</div>
            </div>
            <div class="sd-tx-right">
              <span class="sd-tx-amount">${formatRupiah(tx.amount)}</span>
              <span class="badge-berhasil">Berhasil</span>
            </div>
          </div>
        `).join("")
        : `<div class="empty-state" style="padding:18px;">Belum ada transaksi tercatat.</div>`;
    }

    // 6/12-Month Bar Chart
    const sdBarChart = document.querySelector("#sd-bar-chart");
    if (sdBarChart) {
      const monthlyTotals = monthKeys.map((mk) => {
        const sum = activeStudent
          ? studentTotalPaid(activeStudent, mk)
          : classStudents.reduce((acc, s) => acc + studentTotalPaid(s, mk), 0);
        const [, mNum] = mk.split("-").map(Number);
        return { label: MONTH_NAMES[mNum - 1].slice(0, 3), total: sum };
      });
      const maxVal = Math.max(1, ...monthlyTotals.map((m) => m.total));
      sdBarChart.innerHTML = monthlyTotals.map((m) => {
        const hPct = Math.round((m.total / maxVal) * 100);
        const shortAmt = m.total >= 1000 ? `${Math.round(m.total / 1000)}rb` : m.total;
        return `
          <div class="sd-bar-col">
            <div class="sd-bar-val">${m.total > 0 ? shortAmt : "-"}</div>
            <div class="sd-bar-track">
              <div class="sd-bar-fill" style="height: ${hPct}%;"></div>
            </div>
            <div class="sd-bar-label">${m.label}</div>
          </div>
        `;
      }).join("");
    }

    const sdClassSummary = document.querySelector("#sd-class-summary");
    if (sdClassSummary) {
      sdClassSummary.textContent = activeStudent
        ? `Menampilkan ringkasan pribadi untuk ${activeStudent.name} (Kelas ${activeClass}).`
        : `Menampilkan ringkasan Kelas ${activeClass}. Ketik nama Anda di menu Pembayaran atau Riwayat untuk melihat detail pribadi.`;
    }

    // History View
    const histQuery = (histStudentInput?.value || "").trim();
    const histMatch = histQuery ? findActiveStudent(histQuery) : match;
    const histClass = histClassSelect?.value || currentClass;
    const histStudents = state.classes[histClass] || [];
    const histTx = (histMatch?.student
      ? collectStudentPayments(histMatch.student)
      : histStudents.flatMap(collectStudentPayments)
    ).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.time || "").localeCompare(a.time || ""));

    const histCountEl = document.querySelector("#hist-total-count");
    if (histCountEl) histCountEl.textContent = String(histTx.length);
    const histPaidEl = document.querySelector("#hist-total-paid");
    if (histPaidEl) histPaidEl.textContent = formatRupiah(histTx.reduce((s, p) => s + Number(p.amount || 0), 0));

    const histListEl = document.querySelector("#hist-tx-list");
    if (histListEl) {
      histListEl.innerHTML = histTx.length
        ? histTx.slice(0, 30).map((tx) => `
          <div class="hist-tx-item">
            <div>
              <div class="sd-tx-title" style="font-size:15px;">${escapeHTML(histMatch?.student ? "Kas Angkatan" : tx.studentName)}</div>
              <div class="sd-tx-date" style="font-size:12px;">${escapeHTML(tx.date || "-")}${tx.time ? ` · ${escapeHTML(tx.time)}` : ""}</div>
            </div>
            <div class="hist-tx-right">
              <strong style="font-size:16px;">${formatRupiah(tx.amount)}</strong>
              <span class="badge-berhasil">Berhasil</span>
            </div>
          </div>
        `).join("")
        : `<div class="empty-state">Belum ada riwayat transaksi untuk filter ini.</div>`;
    }

    // Profile View
    const profNameBanner = document.querySelector("#prof-name-banner");
    const profRoleBanner = document.querySelector("#prof-role-banner");
    const profName = document.querySelector("#prof-name");
    const profNpm = document.querySelector("#prof-npm");
    const profClass = document.querySelector("#prof-class");
    if (profNameBanner) profNameBanner.textContent = displayName;
    if (profRoleBanner) profRoleBanner.textContent = currentRole === "pengelola" ? "Pengelola INFORYZE'26" : "Mahasiswa INFORYZE'26";
    if (profName) profName.textContent = displayName;
    if (profNpm) profNpm.textContent = activeStudent?.npm || "-";
    if (profClass) profClass.textContent = `Kelas ${activeClass}`;
  };

  // Payment History Modal
  const openPaymentHistory = (studentId) => {
    const student = currentStudents().find((s) => s.id === studentId);
    if (!student) return;

    activeStudentId = studentId;
    const key = periodSelect.value;
    const payments = paymentsFor(student, key).slice().sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));
    const totalPaid = studentTotalPaid(student, key);

    document.querySelector("#payment-subtitle").textContent = `${student.name} · ${periodText(key)}`;
    document.querySelector("#history-total").textContent = `Total: ${formatRupiah(totalPaid)}`;

    const historyContainer = document.querySelector("#payment-history");
    if (payments.length) {
      historyContainer.innerHTML = payments.map((p) => {
        const dateStr = new Date(`${p.date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        return `
          <div class="history-item">
            <div>
              <strong>${formatRupiah(p.amount)}</strong>
              <time>${dateStr}${p.time ? ` · ${escapeHTML(p.time)}` : ""}</time>
            </div>
            ${currentRole === "pengelola" ? `<button class="btn-delete" type="button" data-delete-payment="${escapeHTML(p.id)}">Hapus</button>` : ""}
          </div>
        `;
      }).join("");
    } else {
      historyContainer.innerHTML = `<div class="empty-state">Belum ada pembayaran pada periode ini.</div>`;
    }

    paymentDialog.showModal();
  };

  // Autocomplete in Topup Form
  const findTopupStudent = () => {
    const val = (topupStudentInput.value || "").trim().toLocaleLowerCase("id-ID");
    if (!val) return null;
    return currentStudents().find((s) => s.name.trim().toLocaleLowerCase("id-ID") === val);
  };

  const updateAutocomplete = () => {
    const val = (topupStudentInput.value || "").trim().toLocaleLowerCase("id-ID");
    summaryClassDisplay.textContent = `Kelas ${classSelect.value}`;
    summaryStudentDisplay.textContent = topupStudentInput.value.trim() || "Belum dipilih";

    if (!val) {
      autocompleteList.hidden = true;
      autocompleteList.innerHTML = "";
      return;
    }

    const matches = currentStudents().filter((s) => s.name.toLocaleLowerCase("id-ID").includes(val)).slice(0, 5);
    if (!matches.length) {
      autocompleteList.hidden = true;
      autocompleteList.innerHTML = "";
      return;
    }

    autocompleteList.innerHTML = matches.map((s) => {
      const status = studentStatus(s);
      const statusLabel = status === "paid" ? "Lunas" : status === "partial" ? "Cicilan" : "Belum bayar";
      return `
        <div class="autocomplete-item" data-name="${escapeHTML(s.name)}">
          <strong>${escapeHTML(s.name)}</strong>
          <span class="status-badge status-${status}">${statusLabel}</span>
        </div>
      `;
    }).join("");
    autocompleteList.hidden = false;
  };

  const updateTopupSummary = () => {
    const amount = selectedTopupAmount === "custom" ? Number(topupAmountInput.value) || 0 : selectedTopupAmount;
    topupTotalDisplay.textContent = formatRupiah(amount);
  };

  // CSV Export
  const exportCSV = () => {
    const key = periodSelect.value;
    const rows = [["Nama Mahasiswa", "NPM", "Kelas", "Periode", "Target Iuran", "Sudah Dibayar", "Kekurangan", "Status"]];
    const students = currentStudents().slice().sort((a, b) => a.name.localeCompare(b.name, "id-ID"));

    students.forEach((s) => {
      const paid = studentTotalPaid(s, key);
      const due = Math.max(0, state.monthlyDues - paid);
      const status = studentStatus(s, key);
      const statusText = status === "paid" ? "Lunas" : status === "partial" ? "Cicilan" : "Belum bayar";
      rows.push([s.name, s.npm || "-", classSelect.value, periodText(key), state.monthlyDues, paid, due, statusText]);
    });

    const csvContent = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kas-Kelas-${classSelect.value}-${key}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("File CSV berhasil diunduh.");
  };

  // Event Listeners
  const bindEvents = () => {
    if (studentDashTab) studentDashTab.addEventListener("click", () => switchTab("student-dash"));
    topupTab.addEventListener("click", () => switchTab("topup"));
    if (historyTab) historyTab.addEventListener("click", () => switchTab("history"));
    if (profileTab) profileTab.addEventListener("click", () => switchTab("profile"));
    dashboardTab.addEventListener("click", () => switchTab("dashboard"));
    expenseTab.addEventListener("click", () => switchTab("expense"));
    overallTab.addEventListener("click", () => switchTab("overall"));

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        const isMenuOpen = mobileMenuView && !mobileMenuView.hidden;
        if (isMenuOpen) {
          switchTab(currentRole === "pengelola" ? "dashboard" : "student-dash");
        } else {
          switchTab("mobile-menu");
        }
      });
    }

    document.querySelectorAll(".menu-drawer-item[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.nav));
    });

    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener("click", () => logoutButton.click());
    }

    const sdGoPayBtn = document.querySelector("#sd-go-pay-btn");
    if (sdGoPayBtn) sdGoPayBtn.addEventListener("click", () => switchTab("topup"));

    const sdChartRange = document.querySelector("#sd-chart-range");
    if (sdChartRange) sdChartRange.addEventListener("change", renderStudentViews);

    const handleClassChange = (newClass) => {
      syncClassSelectors(newClass);
      state.selectedClass = newClass;
      saveState();
      updateAutocomplete();
      render();
    };

    classSelect.addEventListener("change", () => handleClassChange(classSelect.value));
    if (topupClassSelect) topupClassSelect.addEventListener("change", () => handleClassChange(topupClassSelect.value));
    if (histClassSelect) histClassSelect.addEventListener("change", () => handleClassChange(histClassSelect.value));
    if (histStudentInput) histStudentInput.addEventListener("input", renderStudentViews);

    periodSelect.addEventListener("change", render);
    searchInput.addEventListener("input", render);
    filterSelect.addEventListener("change", render);
    exportButton.addEventListener("click", exportCSV);

    duesInput.addEventListener("change", () => {
      const val = Math.max(0, Number(duesInput.value) || 0);
      state.monthlyDues = val;
      duesInput.value = val;
      saveState();
      render();
      showToast("Nominal iuran berhasil diperbarui.");
    });

    document.querySelector("#student-rows").addEventListener("click", (e) => {
      const btn = e.target.closest(".history-btn");
      if (btn) openPaymentHistory(btn.dataset.student);
    });

    document.querySelector("#payment-history").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-payment]");
      if (!btn) return;
      const student = currentStudents().find((s) => s.id === activeStudentId);
      if (!student) return;

      const key = periodSelect.value;
      student.payments[key] = paymentsFor(student, key).filter((p) => p.id !== btn.dataset.deletePayment);
      if (!student.payments[key].length) delete student.payments[key];

      saveState();
      render();
      openPaymentHistory(activeStudentId);
      showToast("Catatan pembayaran berhasil dihapus.");
    });

    document.querySelector("#add-expense-btn").addEventListener("click", () => {
      expenseForm.reset();
      expenseDialog.showModal();
      document.querySelector("#expense-amount").focus();
    });

    expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = Number(document.querySelector("#expense-amount").value);
      const note = document.querySelector("#expense-note").value.trim();
      if (!amount || amount <= 0 || !note) return;

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5);
      const cls = classSelect.value;
      const period = periodSelect.value;

      state.expenses ||= {};
      state.expenses[cls] ||= {};
      state.expenses[cls][period] ||= [];
      state.expenses[cls][period].push({
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
        amount,
        note,
        date: dateStr,
        time: timeStr
      });

      saveState();
      render();
      expenseDialog.close();
      showToast("Pengeluaran berhasil dicatat.");
    });

    document.querySelector("#expense-rows").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-expense]");
      if (!btn) return;
      const cls = classSelect.value;
      const period = periodSelect.value;
      const classExpenses = state.expenses?.[cls]?.[period];
      if (!classExpenses) return;

      state.expenses[cls][period] = classExpenses.filter((item) => item.id !== btn.dataset.deleteExpense);
      if (!state.expenses[cls][period].length) delete state.expenses[cls][period];

      saveState();
      render();
      showToast("Catatan pengeluaran dihapus.");
    });

    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => btn.closest("dialog").close());
    });
    [paymentDialog, expenseDialog].forEach((d) => {
      d.addEventListener("click", (e) => {
        if (e.target === d) d.close();
      });
    });

    topupStudentInput.addEventListener("input", updateAutocomplete);

    autocompleteList.addEventListener("click", (e) => {
      const item = e.target.closest(".autocomplete-item");
      if (item) {
        topupStudentInput.value = item.dataset.name;
        autocompleteList.hidden = true;
        updateTopupSummary();
      }
    });

    document.addEventListener("click", (e) => {
      if (!topupStudentInput.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.hidden = true;
      }
    });

    document.querySelectorAll(".chip-button").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip-button").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        const val = chip.dataset.amount;
        selectedTopupAmount = val === "custom" ? "custom" : Number(val);
        customAmountWrap.hidden = selectedTopupAmount !== "custom";
        updateTopupSummary();
      });
    });

    topupAmountInput.addEventListener("input", updateTopupSummary);

    // Create Invoice (Mendukung backend API & fallback static)
    topupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const student = findTopupStudent();
      const amount = selectedTopupAmount === "custom" ? Number(topupAmountInput.value) : selectedTopupAmount;

      if (!student) {
        showToast("Nama mahasiswa tidak ditemukan di kelas ini.");
        topupStudentInput.focus();
        return;
      }

      if (!amount || amount < 1000) {
        showToast("Nominal minimal adalah Rp1.000.");
        return;
      }

      let invoice = null;
      try {
        const response = await apiRequest("api/invoices", {
          method: "POST",
          body: JSON.stringify({
            className: classSelect.value,
            studentId: student.id,
            amount,
            period: monthKey(new Date())
          })
        });
        invoice = response.invoice;
      } catch (err) {
        // Fallback untuk hosting statis (GitHub Pages / Vercel)
        invoice = {
          id: "KAS" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          className: classSelect.value,
          studentId: student.id,
          studentName: student.name,
          period: monthKey(new Date()),
          amount: amount,
          method: "QRIS",
          status: "pending"
        };
      }

      pendingInvoice = { ...invoice, paid: false };

      checkoutResult.innerHTML = `
        <div class="qris-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong>Tagihan Dibuat</strong>
            <span class="status-badge status-partial">Menunggu Pembayaran</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
            ID Transaksi: <strong>${escapeHTML(pendingInvoice.id)}</strong>
          </div>
          <div class="qris-img-wrap">
            <img src="qris.jpeg" alt="QRIS INFORYZE26" loading="lazy">
          </div>
          <div style="font-size:12px; font-weight:700; margin-top:8px;">
            Total: ${formatRupiah(pendingInvoice.amount)}
          </div>
          <div class="demo-box">
            Ini adalah simulasi pembayaran kas. Setelah memindai QRIS, klik tombol di bawah untuk mencatat konfirmasi secara instan.
          </div>
          <button class="button button-primary" style="width:100%; margin-top:10px;" id="confirm-payment-btn" type="button">
            Konfirmasi Pembayaran (Simulasi)
          </button>
        </div>
      `;
      checkoutResult.hidden = false;
      if (qrisPreviewBox) qrisPreviewBox.hidden = true;
      showToast("Tagihan QRIS berhasil dibuat.");
    });

    // Confirm Payment
    checkoutResult.addEventListener("click", async (e) => {
      if (e.target.id !== "confirm-payment-btn" && !e.target.closest("#confirm-payment-btn")) return;
      if (!pendingInvoice || pendingInvoice.paid) return;

      try {
        const response = await apiRequest(`api/invoices/${encodeURIComponent(pendingInvoice.id)}/confirm`, {
          method: "POST",
          body: "{}"
        });
        state = response.state;
      } catch (err) {
        // Fallback untuk hosting statis: catat pembayaran langsung ke data kelas
        const paidAt = new Date();
        const dateStr = paidAt.toISOString().slice(0, 10);
        const timeStr = paidAt.toTimeString().slice(0, 5);
        const student = currentStudents().find((s) => s.id === pendingInvoice.studentId);
        if (student) {
          student.payments ||= {};
          student.payments[pendingInvoice.period] ||= [];
          student.payments[pendingInvoice.period].push({
            id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
            amount: pendingInvoice.amount,
            date: dateStr,
            time: timeStr,
            method: "QRIS",
            invoiceId: pendingInvoice.id
          });
        }
        saveState();
      }

      pendingInvoice.paid = true;

      checkoutResult.innerHTML = `
        <div style="padding:16px; border:1px solid var(--success-border); border-radius:var(--radius-md); background:var(--success-bg); text-align:center;">
          <div style="font-size:22px; margin-bottom:4px;">✔</div>
          <strong style="color:var(--success); font-size:15px;">Pembayaran Berhasil Dicatat</strong>
          <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">
            ${formatRupiah(pendingInvoice.amount)} tercatat untuk <strong>${escapeHTML(pendingInvoice.studentName)}</strong>.
          </p>
        </div>
      `;
      render();
      showToast("Pembayaran simulasi berhasil diverifikasi.");
    });

    // Logout
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Keluar...";
      try {
        await apiRequest("api/logout", {
          method: "POST",
          body: JSON.stringify({})
        });
      } catch (err) {
        try {
          await apiRequest("api/session", { method: "DELETE" });
        } catch (e) {}
      }
      localStorage.removeItem("kaskita_role");
      sessionStorage.removeItem("kaskita_role");
      document.cookie = "kaskita_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.replace("login.html?logout=1");
    });
  };

  // Initialization (Dual Mode: Server API + Static Fallback)
  const init = async () => {
    initTheme();
    initClasses();
    initPeriods();
    bindEvents();

    let sessionRole = null;

    // 1. Cek sesi dari server jika ada backend yang berjalan
    try {
      const session = await apiRequest("api/session");
      if (session && session.role) {
        sessionRole = session.role;
      }
    } catch (err) {}

    // 2. Jika tidak ada backend (misal GitHub Pages), ambil dari browser storage
    if (!sessionRole) {
      sessionRole = sessionStorage.getItem("kaskita_role") || localStorage.getItem("kaskita_role");
    }

    // 3. Jika belum login, alihkan ke login.html
    if (!sessionRole) {
      window.location.replace("login.html");
      return;
    }

    currentRole = sessionRole;
    roleIndicator.textContent = currentRole === "pengelola" ? "Pengelola" : "Mahasiswa";

    // Toggle tampilan berdasarkan hak akses
    document.querySelectorAll(".manager-only").forEach((el) => {
      el.hidden = currentRole !== "pengelola";
    });
    document.querySelectorAll(".student-only").forEach((el) => {
      el.hidden = currentRole === "pengelola";
    });
    duesInput.disabled = currentRole !== "pengelola";

    // Muat data state (Prioritas: Server -> LocalStorage -> default_state.json)
    let loadedState = null;
    try {
      const stateResponse = await apiRequest("api/state");
      if (stateResponse && stateResponse.state) {
        loadedState = stateResponse.state;
      }
    } catch (err) {}

    if (!loadedState) {
      try {
        const local = localStorage.getItem("kaskita_state");
        if (local) loadedState = JSON.parse(local);
      } catch (e) {}
    }

    if (!loadedState) {
      try {
        const defRes = await fetch("data/default_state.json");
        if (defRes.ok) {
          const defData = await defRes.json();
          if (defData && defData.state) loadedState = defData.state;
        }
      } catch (e) {}
    } else {
      // Lengkapi data NPM dari default_state.json jika state lama belum memiliki field npm
      const missingNpm = CLASS_NAMES.some((cls) => (loadedState.classes?.[cls] || []).some((s) => !s.npm));
      if (missingNpm) {
        try {
          const defRes = await fetch("data/default_state.json");
          if (defRes.ok) {
            const defData = await defRes.json();
            const defClasses = defData?.state?.classes || {};
            CLASS_NAMES.forEach((cls) => {
              const npmById = new Map((defClasses[cls] || []).map((s) => [s.id, s.npm]));
              const npmByName = new Map((defClasses[cls] || []).map((s) => [s.name.toLowerCase(), s.npm]));
              (loadedState.classes?.[cls] || []).forEach((s) => {
                if (!s.npm) {
                  s.npm = npmById.get(s.id) || npmByName.get(s.name.toLowerCase()) || "";
                }
              });
            });
          }
        } catch (e) {}
      }
    }

    if (loadedState) {
      state = loadedState;
      try { localStorage.setItem("kaskita_state", JSON.stringify(state)); } catch (e) {}
    }

    classSelect.value = state.selectedClass || "A";
    duesInput.value = state.monthlyDues || 10000;
    updateAutocomplete();
    updateTopupSummary();

    appShell.hidden = false;
    switchTab(currentRole === "pengelola" ? "dashboard" : "topup");
  };

  document.addEventListener("DOMContentLoaded", init);
})();
