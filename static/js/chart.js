/**
 * INFORYZE26 - Dynamic JavaScript Visualization & Design Engine
 * Renders interactive visual components, charts, and progress gauges.
 */

const ChartEngine = (() => {
  // Deterministic color generator for student avatars
  const getAvatarColor = (name) => {
    let hash = 0;
    const str = name || "Mahasiswa";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    // Saturation and lightness tuned for high contrast and pleasant colors
    return `hsl(${hue}, 65%, 45%)`;
  };

  // Formatter helper
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  /**
   * Renders the comparative visual bar chart for all classes (A through G).
   * @param {HTMLElement} container
   * @param {Array} classMetrics - Array of { className, collected, target, rate, studentCount }
   * @param {string} activeClass - Currently active class
   * @param {Function} onClassClick - Callback when user clicks a class row
   */
  const renderClassComparison = (container, classMetrics, activeClass, onClassClick) => {
    if (!container) return;

    if (!classMetrics || !classMetrics.length) {
      container.innerHTML = `<div class="empty-state">Data kelas belum tersedia.</div>`;
      return;
    }

    container.innerHTML = classMetrics.map((item) => {
      const isActive = item.className === activeClass;
      const rateClamped = Math.min(100, Math.max(0, item.rate || 0));
      return `
        <div class="class-bar-row ${isActive ? 'active' : ''}" data-class="${item.className}" title="Klik untuk membuka Kelas ${item.className}">
          <div class="class-bar-name">Kelas ${item.className}</div>
          <div class="class-bar-track">
            <div class="class-bar-fill" style="width: ${rateClamped}%;"></div>
          </div>
          <div class="class-bar-stats">
            <strong>${rateClamped}%</strong> (${formatRupiah(item.collected)})
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".class-bar-row").forEach((row) => {
      row.addEventListener("click", () => {
        const selected = row.dataset.class;
        if (typeof onClassClick === "function") {
          onClassClick(selected);
        }
      });
    });
  };

  /**
   * Renders a Cashflow Breakdown visual bar (Income vs Expenses vs Saldo).
   * @param {HTMLElement} container
   * @param {number} income
   * @param {number} expense
   */
  const renderCashflowVisual = (container, income, expense) => {
    if (!container) return;

    const total = Math.max(income, expense, 1);
    const expensePercent = Math.min(100, Math.round((expense / (income || 1)) * 100));
    const incomePercent = 100;
    const balance = Math.max(0, income - expense);

    container.innerHTML = `
      <div class="cashflow-bar-track" aria-label="Visualisasi Pengeluaran terhadap Pemasukan">
        <div class="cashflow-bar-segment expense" style="width: ${Math.min(100, (expense / total) * 100)}%;" title="Pengeluaran: ${formatRupiah(expense)}"></div>
        <div class="cashflow-bar-segment income" style="width: ${Math.max(0, (balance / total) * 100)}%;" title="Sisa Saldo: ${formatRupiah(balance)}"></div>
      </div>
      <div class="cashflow-legend">
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--danger);"></span>
          <span>Pengeluaran (${expensePercent}% dari pemasukan)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--success);"></span>
          <span>Sisa Kas (${formatRupiah(balance)})</span>
        </div>
      </div>
    `;
  };

  /**
   * Renders an SVG Circular Progress Ring Gauge.
   * @param {HTMLElement} container
   * @param {number} rate
   */
  const renderCircularGauge = (container, rate) => {
    if (!container) return;

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, rate || 0));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px;">
        <svg width="104" height="104" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
          <circle cx="50" cy="50" r="${radius}" stroke="var(--border)" stroke-width="9" fill="none" />
          <circle cx="50" cy="50" r="${radius}" stroke="var(--primary)" stroke-width="9" fill="none"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
            stroke-linecap="round"
            style="transition: stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1);" />
        </svg>
        <div>
          <div style="font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text-main);">${percentage}%</div>
          <div style="font-size: 12px; color: var(--text-muted);">Target Terpenuhi</div>
        </div>
      </div>
    `;
  };

  return {
    getAvatarColor,
    formatRupiah,
    renderClassComparison,
    renderCashflowVisual,
    renderCircularGauge
  };
})();

// Export globally
window.ChartEngine = ChartEngine;
