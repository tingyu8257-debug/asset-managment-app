(typeof window !== "undefined" ? window : globalThis).CashFlowFormController = (() => {
  const ADD_CATEGORY_VALUE = "__add_category__";
  const methodLabels = {
    cash: "Cash",
    bank: "Bank Account",
    debitCard: "Debit Card",
    creditCard: "Credit Card"
  };
  const frequencyLabels = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly"
  };

  function create({ state, repo, byId, escapeHtml, today, openDialog, closeDialog, renderAll }) {
    let pendingCategoryTarget = null;

    function showError(form, error) {
      form.querySelector(".form-error").textContent = error.message || String(error);
    }

    function activeAccounts() {
      return state.financialAccounts.filter((account) => !account.isArchived);
    }

    function creditCardLiabilities() {
      return state.liabilities.filter((liability) => !liability.isArchived && liability.type === "creditCard");
    }

    function activeCategories(type) {
      return (type === "income" ? state.incomeCategories : state.expenseCategories).filter((category) => !category.isArchived);
    }

    function fillSelect(select, rows, selected = "", empty = "請選擇", includeAddCategory = false) {
      select.innerHTML = `<option value="">${empty}</option>`
        + rows.map((row) => `<option value="${row.id}" ${row.id === selected ? "selected" : ""}>${escapeHtml(row.name)}</option>`).join("")
        + (includeAddCategory ? `<option value="${ADD_CATEGORY_VALUE}">＋ 新增分類</option>` : "");
    }

    function fillNamedSelects(form, name, rows, selected = "", empty = "請選擇", includeAddCategory = false) {
      form.querySelectorAll(`select[name="${name}"]`).forEach((select) => fillSelect(select, rows, selected, empty, includeAddCategory));
    }

    function fillCommonOptions(form, selected = {}) {
      const selectedType = selected.type || form.elements.type?.value || "expense";
      fillNamedSelects(form, "categoryId", activeCategories(selectedType), selected.categoryId, "請選擇分類", selectedType === "income" || selectedType === "expense");
      fillNamedSelects(form, "accountId", activeAccounts(), selected.accountId);
      fillNamedSelects(form, "toAccountId", activeAccounts(), selected.toAccountId);
      fillNamedSelects(form, "liabilityId", creditCardLiabilities(), selected.liabilityId, "請選擇信用卡負債");
      form.querySelectorAll('select[name="paymentMethod"]').forEach((select) => {
        select.innerHTML = `<option value="">請選擇</option>` + Object.entries(methodLabels).map(([value, label]) => `<option value="${value}" ${value === selected.paymentMethod ? "selected" : ""}>${label}</option>`).join("");
      });
    }

    function openEntryDialog(type = "expense", entryId = "") {
      const form = byId("cash-flow-entry-form");
      const entry = entryId ? state.cashFlowEntries.find((item) => item.id === entryId) : null;
      const nextType = entry?.type || type;
      form.reset();
      form.elements.entryId.value = entry?.id || "";
      form.elements.type.value = nextType;
      form.elements.date.value = entry?.date || today();
      form.elements.amount.value = entry?.amount || "";
      form.elements.currency.value = entry?.currency || "TWD";
      form.elements.exchangeRate.value = entry?.exchangeRate || 1;
      form.elements.transferType.value = entry?.transferType || "assetToAsset";
      form.elements.title.value = entry?.title || "";
      form.elements.tags.value = Array.isArray(entry?.tags) ? entry.tags.join(", ") : "";
      form.elements.note.value = entry?.note || "";
      fillCommonOptions(form, entry || { type: nextType });
      updateEntryFields(form, entry?.categoryId || "");
      byId("cash-flow-entry-title").textContent = entry ? "編輯 Cash Flow Entry" : `新增 ${nextType === "income" ? "Income" : nextType === "expense" ? "Expense" : "Transfer"}`;
      form.querySelector(".form-error").textContent = "";
      openDialog("cash-flow-entry-dialog");
    }

    function updateEntryFields(form, selectedCategoryId = "") {
      const type = form.elements.type.value;
      form.querySelectorAll("[data-entry-field]").forEach((field) => {
        const group = field.dataset.entryField;
        const shouldShow = group === "common" || group === type;
        field.hidden = !shouldShow;
        field.querySelectorAll("input, select, textarea").forEach((input) => { input.disabled = !shouldShow; });
      });
      fillNamedSelects(form, "categoryId", activeCategories(type), selectedCategoryId, "請選擇分類", type === "income" || type === "expense");
    }

    function openCategoryDialog(type = "expense", id = "", options = {}) {
      const form = byId("cash-flow-category-form");
      const rows = type === "income" ? state.incomeCategories : state.expenseCategories;
      const category = id ? rows.find((item) => item.id === id) : null;
      pendingCategoryTarget = options.selectAfterCreate ? options.selectAfterCreate : null;
      form.reset();
      form.elements.categoryType.value = type;
      form.elements.categoryId.value = category?.id || "";
      form.elements.name.value = category?.name || "";
      form.elements.displayOrder.value = category?.displayOrder ?? "";
      byId("cash-flow-category-title").textContent = `${category ? "編輯" : "新增"} ${type === "income" ? "Income" : "Expense"} Category`;
      form.querySelector(".form-error").textContent = "";
      openDialog("cash-flow-category-dialog");
    }

    function openRecurringDialog(id = "") {
      const form = byId("recurring-form");
      const recurring = id ? state.recurringCashFlows.find((item) => item.id === id) : null;
      form.reset();
      form.elements.recurringId.value = recurring?.id || "";
      form.elements.type.value = recurring?.type || "expense";
      form.elements.title.value = recurring?.title || "";
      form.elements.amount.value = recurring?.amount || "";
      form.elements.currency.value = recurring?.currency || "TWD";
      form.elements.exchangeRate.value = recurring?.exchangeRate || 1;
      form.elements.frequency.innerHTML = Object.entries(frequencyLabels).map(([value, label]) => `<option value="${value}" ${value === recurring?.frequency ? "selected" : ""}>${label}</option>`).join("");
      form.elements.nextDueDate.value = recurring?.nextDueDate || today();
      form.elements.note.value = recurring?.note || "";
      fillCommonOptions(form, recurring || { type: form.elements.type.value });
      updateRecurringFields(form, recurring?.categoryId || "");
      form.querySelector(".form-error").textContent = "";
      openDialog("recurring-dialog");
    }

    function updateRecurringFields(form, selectedCategoryId = "") {
      const type = form.elements.type.value;
      form.querySelectorAll("[data-recurring-field]").forEach((field) => {
        const group = field.dataset.recurringField;
        const shouldShow = group === "common" || group === type;
        field.hidden = !shouldShow;
        field.querySelectorAll("input, select, textarea").forEach((input) => { input.disabled = !shouldShow; });
      });
      fillNamedSelects(form, "categoryId", activeCategories(type), selectedCategoryId, "請選擇分類", type === "income" || type === "expense");
    }

    function openBudgetDialog() {
      const form = byId("budget-form");
      form.reset();
      form.elements.month.value = new Date().toISOString().slice(0, 7);
      form.elements.currency.value = "TWD";
      form.elements.exchangeRate.value = 1;
      fillSelect(form.elements.categoryId, activeCategories("expense"), "", "請選擇分類", true);
      form.querySelector(".form-error").textContent = "";
      openDialog("budget-dialog");
    }

    function applyNewCategorySelection(category) {
      if (!pendingCategoryTarget) return;
      const targetForm = byId(pendingCategoryTarget.formId);
      if (targetForm?.id === "cash-flow-entry-form") updateEntryFields(targetForm, category.id);
      if (targetForm?.id === "recurring-form") updateRecurringFields(targetForm, category.id);
      if (targetForm?.id === "budget-form") fillSelect(targetForm.elements.categoryId, activeCategories("expense"), category.id, "請選擇分類", true);
      pendingCategoryTarget = null;
    }

    function handleCategoryAddOption(select) {
      if (select.value !== ADD_CATEGORY_VALUE) return false;
      const form = select.form;
      const type = form.id === "budget-form" ? "expense" : form.elements.type.value;
      select.value = "";
      openCategoryDialog(type, "", { selectAfterCreate: { formId: form.id, selectName: select.name } });
      return true;
    }

    function handleEntrySubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        if (values.categoryId === ADD_CATEGORY_VALUE) throw new Error("請先完成新增分類。");
        if (values.entryId) repo.updateEntry(values.entryId, values);
        else repo.createEntry(values);
        closeDialog("cash-flow-entry-dialog");
        renderAll();
      } catch (error) {
        showError(form, error);
      }
    }

    function handleCategorySubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        const payload = { name: values.name, displayOrder: values.displayOrder };
        const category = values.categoryId
          ? repo.updateCategory(values.categoryType, values.categoryId, payload)
          : repo.createCategory(values.categoryType, payload);
        closeDialog("cash-flow-category-dialog");
        applyNewCategorySelection(category);
        renderAll();
      } catch (error) {
        showError(form, error);
      }
    }

    function handleRecurringSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        if (values.categoryId === ADD_CATEGORY_VALUE) throw new Error("請先完成新增分類。");
        if (values.recurringId) repo.updateRecurring(values.recurringId, values);
        else repo.createRecurring(values);
        closeDialog("recurring-dialog");
        renderAll();
      } catch (error) {
        showError(form, error);
      }
    }

    function handleBudgetSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        if (values.categoryId === ADD_CATEGORY_VALUE) throw new Error("請先完成新增分類。");
        repo.upsertBudget(values);
        closeDialog("budget-dialog");
        renderAll();
      } catch (error) {
        showError(form, error);
      }
    }

    function bindFieldEvents() {
      byId("cash-flow-entry-form").elements.type.addEventListener("change", (event) => updateEntryFields(event.currentTarget.form));
      byId("cash-flow-entry-form").elements.currency.addEventListener("change", (event) => { event.currentTarget.form.elements.exchangeRate.value = event.currentTarget.value === "TWD" ? 1 : ""; });
      byId("recurring-form").elements.type.addEventListener("change", (event) => updateRecurringFields(event.currentTarget.form));
      byId("recurring-form").elements.currency.addEventListener("change", (event) => { event.currentTarget.form.elements.exchangeRate.value = event.currentTarget.value === "TWD" ? 1 : ""; });
      byId("budget-form").elements.currency.addEventListener("change", (event) => { event.currentTarget.form.elements.exchangeRate.value = event.currentTarget.value === "TWD" ? 1 : ""; });
      ["cash-flow-entry-form", "recurring-form", "budget-form"].forEach((id) => {
        byId(id).addEventListener("change", (event) => {
          if (event.target.matches('select[name="categoryId"]')) handleCategoryAddOption(event.target);
        });
      });
    }

    return {
      openEntryDialog,
      openCategoryDialog,
      openRecurringDialog,
      openBudgetDialog,
      handleEntrySubmit,
      handleCategorySubmit,
      handleRecurringSubmit,
      handleBudgetSubmit,
      bindFieldEvents
    };
  }

  return { create };
})();
