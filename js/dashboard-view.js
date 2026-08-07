(typeof window !== "undefined" ? window : globalThis).DashboardView = (() => {
  function create({ state = {}, byId, escapeHtml, formatMoney, formatPercent, calculationService }) {
    const currency = window.AppConstants.DASHBOARD_CURRENCY;

    function renderDashboard() {
      calculationService.invalidate();
      const dashboard = calculationService.getDashboardSummary();
      const assets = dashboard.assets;
      const liabilities = dashboard.liabilities;

      byId("dashboard-net-worth").textContent = formatMoney(dashboard.netWorth.total, currency);
      byId("dashboard-net-worth-note").textContent = `${formatMoney(assets.total, currency)} - ${formatMoney(liabilities.total, currency)}`;
      byId("dashboard-total-assets").textContent = formatMoney(assets.total, currency);
      byId("dashboard-total-liabilities").textContent = formatMoney(liabilities.total, currency);
      byId("dashboard-liability-note").textContent = `${liabilities.items.length} 筆有效負債`;
      renderMobileSummary(assets);

      renderAllocation(dashboard.allocation, assets);
      renderLatestActivity(dashboard.latestActivity);
      renderWarnings(dashboard.warnings);
    }

    function renderMobileSummary(assets) {
      const cashFlow = getThisMonthCashFlow();
      byId("dashboard-this-month-cash-flow").textContent = formatMoney(cashFlow.net, currency);
      byId("dashboard-cash-flow-note").textContent = `${formatMoney(cashFlow.income, currency)} - ${formatMoney(cashFlow.expense, currency)}`;
      byId("dashboard-portfolio-summary").textContent = formatMoney(assets.investments.total, currency);
      byId("dashboard-portfolio-note").textContent = `${assets.investments.items.length} positions`;
      const reminder = getUpcomingReminder();
      byId("dashboard-upcoming-reminder").textContent = reminder.title;
      byId("dashboard-upcoming-note").textContent = reminder.note;
    }

    function getThisMonthCashFlow() {
      const month = new Date().toISOString().slice(0, 7);
      return (state.cashFlowEntries || [])
        .filter((entry) => String(entry.date || "").slice(0, 7) === month)
        .reduce((summary, entry) => {
          const amount = Number(entry.amount) * Number(entry.exchangeRate || 1);
          if (!Number.isFinite(amount)) return summary;
          if (entry.type === "income") summary.income += amount;
          if (entry.type === "expense") summary.expense += amount;
          summary.net = summary.income - summary.expense;
          return summary;
        }, { income: 0, expense: 0, net: 0 });
    }

    function getUpcomingReminder() {
      const today = new Date().toISOString().slice(0, 10);
      const recurring = (state.recurringCashFlows || [])
        .filter((item) => !item.isArchived && item.nextDueDate)
        .map((item) => ({ date: item.nextDueDate, title: item.title || "Recurring", note: item.type || "Cash Flow" }));
      const reviews = (state.investmentReviews || [])
        .filter((item) => !item.isArchived && item.reminderDate)
        .map((item) => ({ date: item.reminderDate, title: item.ticker || "Review", note: item.reviewType || "Review" }));
      const research = (state.watchlistStocks || [])
        .filter((item) => item.nextReviewDate)
        .map((item) => ({ date: item.nextReviewDate, title: item.ticker || item.companyName || "Research", note: "Next Review" }));
      const next = [...recurring, ...reviews, ...research]
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
      if (!next) return { title: "No reminder", note: "All clear" };
      return { title: next.title, note: `${next.date}${next.date < today ? " due" : ""} · ${next.note}` };
    }

    function renderAllocation(allocation, assets) {
      byId("dashboard-allocation-total").textContent = formatMoney(allocation.totalAssets, currency);
      if (allocation.totalAssets <= 0) {
        byId("dashboard-allocation-summary").textContent = "尚未有可計入的資產。";
        byId("dashboard-allocation-bar").hidden = true;
        setBar("allocation-cash-bar", 0, "");
        setBar("allocation-investment-bar", 0, "");
        setBar("allocation-insurance-bar", 0, "");
        byId("dashboard-allocation-cards").innerHTML = `<p class="empty-state">Total Assets 為 0，暫時沒有資產配置比例。</p>`;
        return;
      }

      byId("dashboard-allocation-bar").hidden = false;
      byId("dashboard-allocation-summary").textContent = "Cash / Investments / Insurance 占 Total Assets 的比例，負債不放入 Allocation。";
      setBar("allocation-cash-bar", allocation.cashPercent, `Cash ${formatPercent(allocation.cashPercent)}`);
      setBar("allocation-investment-bar", allocation.investmentPercent, `Investments ${formatPercent(allocation.investmentPercent)}`);
      setBar("allocation-insurance-bar", allocation.insurancePercent, `Insurance ${formatPercent(allocation.insurancePercent)}`);
      byId("dashboard-allocation-cards").innerHTML = [
        ["Cash", assets.cash.total, allocation.cashPercent],
        ["Investments", assets.investments.total, allocation.investmentPercent],
        ["Insurance", assets.insurance.total, allocation.insurancePercent]
      ].map(([label, value, percent]) => `<div><span>${label}</span><strong>${formatMoney(value, currency)}</strong><span>${formatPercent(percent)}</span></div>`).join("");
    }

    function renderLatestActivity(activities) {
      byId("dashboard-latest-activity").innerHTML = activities.length
        ? activities.map((activity) => `<div class="activity-item"><div><span class="activity-type">${escapeHtml(activity.type)}</span><small>${formatDateTime(activity.updatedAt)}</small></div><div><strong>${escapeHtml(activity.title)}</strong><small>${escapeHtml(activity.detail || "尚未設定")}</small></div></div>`).join("")
        : `<p class="empty-state">目前沒有更新紀錄。</p>`;
    }

    function renderWarnings(warnings) {
      byId("dashboard-warnings").innerHTML = warnings.length
        ? warnings.map((warning) => `<div class="alert-box"><span class="alert-icon">!</span><div><strong>${escapeHtml(warning.sourceType)} · ${escapeHtml(warning.sourceName)}</strong><p>${escapeHtml(warning.message)}</p></div></div>`).join("")
        : `<p class="empty-state">目前沒有資料提醒。</p>`;
    }

    function formatDateTime(value) {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return "尚未設定";
      return date.toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
    }

    function setBar(id, width, label) {
      const element = byId(id);
      element.style.width = `${width}%`;
      element.textContent = width >= 12 ? label : "";
    }

    return { renderDashboard };
  }

  return { create };
})();
