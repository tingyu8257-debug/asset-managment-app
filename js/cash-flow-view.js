(typeof window !== "undefined" ? window : globalThis).CashFlowView = (() => {
  const typeLabels = { income: "Income", expense: "Expense", transfer: "Transfer" };

  function create({ state, service, byId, escapeHtml, formatMoney }) {
    function renderCashFlow() {
      const month = service.currentMonth();
      const summary = service.calculateMonth(month);
      byId("cash-flow-income").textContent = formatMoney(summary.income, "TWD");
      byId("cash-flow-expense").textContent = formatMoney(summary.expense, "TWD");
      byId("cash-flow-net").textContent = formatMoney(summary.netCashFlow, "TWD");
      byId("cash-flow-savings-rate").textContent = `${summary.savingsRate}%`;
      renderBudgetOverview(month);
      renderUpcomingRecurring();
      renderRecentCashFlow();
      renderCategories();
      renderRecurringList();
      renderMonthlyReport(month);
    }

    function renderBudgetOverview(month) {
      const rows = service.budgetOverview(month);
      byId("budget-overview-list").innerHTML = rows.length
        ? rows.map((row) => `<div class="budget-row"><div><strong>${escapeHtml(row.categoryName)}</strong><small>Budget ${formatMoney(row.budget, "TWD")} · Spent ${formatMoney(row.spent, "TWD")}</small></div><div><span>${formatMoney(row.remaining, "TWD")}</span><small>${row.usagePercent}%</small></div></div>`).join("")
        : `<p class="empty-state">本月尚未設定 Budget。</p>`;
    }

    function renderUpcomingRecurring() {
      const rows = service.upcomingRecurring();
      byId("upcoming-recurring-list").innerHTML = rows.length
        ? rows.map((item) => `<div class="balance-row"><span>${escapeHtml(item.nextDueDate)} · ${escapeHtml(item.title)} · ${formatMoney(item.amount, item.currency)}</span><small>${escapeHtml(typeLabels[item.type] || item.type)} · ${escapeHtml(item.frequency)}</small><div class="record-actions"><button class="small-button" data-confirm-recurring="${item.id}">確認建立 Entry</button><button class="small-button danger-button" data-archive-recurring="${item.id}">封存</button></div></div>`).join("")
        : `<p class="empty-state">目前沒有到期的 Recurring。</p>`;
    }

    function renderRecentCashFlow() {
      const rows = service.recentCashFlow();
      byId("recent-cash-flow-list").innerHTML = rows.length
        ? rows.map((entry) => `<div class="balance-row"><span>${escapeHtml(entry.date)} · ${escapeHtml(typeLabels[entry.type] || entry.type)} · ${formatMoney(entry.amount, entry.currency)}</span><small>${escapeHtml(entry.title || service.getCategoryName(entry.categoryId))} · Exchange Rate ${entry.exchangeRate}</small><div class="record-actions"><button class="small-button" data-edit-cash-flow="${entry.id}">編輯</button><button class="small-button danger-button" data-delete-cash-flow="${entry.id}">刪除紀錄</button></div></div>`).join("")
        : `<p class="empty-state">尚未建立 Income / Expense / Transfer。</p>`;
    }

    function renderCategories() {
      const incomeList = byId("income-category-list");
      const expenseList = byId("expense-category-list");
      if (incomeList) incomeList.innerHTML = renderCategoryList(state.incomeCategories, "income");
      if (expenseList) expenseList.innerHTML = renderCategoryList(state.expenseCategories, "expense");
    }

    function renderCategoryList(categories, type) {
      const rows = (categories || []).slice().sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
      return rows.length
        ? rows.map((category) => `<div class="balance-row ${category.isArchived ? "deleted-record" : ""}"><span>${escapeHtml(category.name)}</span><small>${category.isArchived ? "已封存" : "使用中"}</small><div class="record-actions"><button class="small-button" data-edit-category="${category.id}" data-category-type="${type}">編輯</button>${category.isArchived ? `<button class="small-button" data-restore-category="${category.id}" data-category-type="${type}">恢復</button>` : `<button class="small-button danger-button" data-archive-category="${category.id}" data-category-type="${type}">封存</button>`}</div></div>`).join("")
        : `<p class="empty-state">尚未建立分類。</p>`;
    }

    function renderRecurringList() {
      const rows = (state.recurringCashFlows || []).slice().sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)));
      byId("recurring-list").innerHTML = rows.length
        ? rows.map((item) => `<div class="balance-row ${item.isArchived ? "deleted-record" : ""}"><span>${escapeHtml(item.title)} · ${formatMoney(item.amount, item.currency)}</span><small>${escapeHtml(item.frequency)} · next ${escapeHtml(item.nextDueDate)}</small><div class="record-actions"><button class="small-button" data-edit-recurring="${item.id}">編輯</button>${item.isArchived ? `<button class="small-button" data-restore-recurring="${item.id}">恢復</button>` : `<button class="small-button danger-button" data-archive-recurring="${item.id}">封存</button>`}</div></div>`).join("")
        : `<p class="empty-state">尚未建立 Recurring Income / Expense。</p>`;
    }

    function renderMonthlyReport(month) {
      const report = service.monthlyReport(month);
      byId("monthly-report-list").innerHTML = report.byCategory.length
        ? report.byCategory.map((row) => `<div class="budget-row"><div><strong>${escapeHtml(row.categoryName)}</strong><small>Income ${formatMoney(row.income, "TWD")} · Expense ${formatMoney(row.expense, "TWD")}</small></div></div>`).join("")
        : `<p class="empty-state">本月尚無可彙整資料。</p>`;
    }

    return { renderCashFlow };
  }

  return { create };
})();
