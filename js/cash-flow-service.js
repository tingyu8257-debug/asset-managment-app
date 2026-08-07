(typeof window !== "undefined" ? window : globalThis).CashFlowService = (() => {
  function create({ state }) {
    const core = window.AssetCalculationCore;

    function monthOf(dateString) {
      return String(dateString || "").slice(0, 7);
    }

    function currentMonth() {
      return new Date().toISOString().slice(0, 7);
    }

    function toTwd(value) {
      return core.round(core.numberOrZero(value.amount) * core.numberOrZero(value.exchangeRate || 1));
    }

    function getCategoryName(categoryId) {
      const category = [...(state.incomeCategories || []), ...(state.expenseCategories || [])].find((item) => item.id === categoryId);
      return category?.name || "尚未設定";
    }

    function entriesForMonth(month = currentMonth()) {
      return (state.cashFlowEntries || []).filter((entry) => monthOf(entry.date) === month);
    }

    function calculateMonth(month = currentMonth()) {
      const entries = entriesForMonth(month);
      const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + toTwd(entry), 0);
      const expense = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + toTwd(entry), 0);
      const netCashFlow = core.round(income - expense);
      return {
        month,
        income: core.round(income),
        expense: core.round(expense),
        netCashFlow,
        savingsRate: income > 0 ? core.round(netCashFlow / income * 100) : 0,
        entries
      };
    }

    function budgetOverview(month = currentMonth()) {
      const monthEntries = entriesForMonth(month).filter((entry) => entry.type === "expense");
      return (state.monthlyBudgets || []).filter((budget) => budget.month === month).map((budget) => {
        const spent = monthEntries
          .filter((entry) => entry.categoryId === budget.categoryId)
          .reduce((sum, entry) => sum + toTwd(entry), 0);
        const budgetTwd = toTwd(budget);
        return {
          ...budget,
          categoryName: getCategoryName(budget.categoryId),
          budget: budgetTwd,
          spent: core.round(spent),
          remaining: core.round(budgetTwd - spent),
          usagePercent: budgetTwd > 0 ? core.round(spent / budgetTwd * 100) : 0
        };
      });
    }

    function upcomingRecurring(today = new Date().toISOString().slice(0, 10)) {
      return (state.recurringCashFlows || [])
        .filter((item) => !item.isArchived && item.nextDueDate <= today)
        .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)));
    }

    function recentCashFlow(limit = 10) {
      return [...(state.cashFlowEntries || [])]
        .sort((a, b) => `${b.date}-${b.updatedAt}-${b.id}`.localeCompare(`${a.date}-${a.updatedAt}-${a.id}`))
        .slice(0, limit);
    }

    function monthlyReport(month = currentMonth()) {
      const summary = calculateMonth(month);
      const byCategory = summary.entries.reduce((rows, entry) => {
        if (entry.type === "transfer") return rows;
        const key = entry.categoryId || "uncategorized";
        if (!rows[key]) rows[key] = { categoryId: key, categoryName: getCategoryName(key), income: 0, expense: 0 };
        rows[key][entry.type] += toTwd(entry);
        return rows;
      }, {});
      return {
        ...summary,
        budget: budgetOverview(month),
        byCategory: Object.values(byCategory)
      };
    }

    return {
      currentMonth,
      calculateMonth,
      budgetOverview,
      upcomingRecurring,
      recentCashFlow,
      monthlyReport,
      getCategoryName
    };
  }

  return { create };
})();
