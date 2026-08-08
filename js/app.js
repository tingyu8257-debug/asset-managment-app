(() => {
  const state = window.AppStorage.load();
  const { typeLabels, journalTypeLabels, thesisStatusLabels, executionStatusLabels } = window.AppLabels;
  const { byId, escapeHtml, today } = window.AppUtils;
  const { formatMoney, formatPrice, formatPercent } = window.AppUtils.createFormatters(state);
  const portfolioSelectors = window.PortfolioSelectors.create({ state, formatPercent });
  const { getStock, getAllCalculatedPositions } = portfolioSelectors;
  const portfolioRegistry = window.PortfolioRegistry.create();
  const portfolioRouter = window.PortfolioRouter.create({ registry: portfolioRegistry });
  const calculationService = window.CalculationService.create({ state, getAllCalculatedPositions, getStock });
  const dashboardView = window.DashboardView.create({
    state,
    byId,
    escapeHtml,
    formatMoney,
    formatPercent,
    calculationService
  });
  const stocksModule = portfolioRegistry.register(window.StocksPortfolioModule.create({
    state,
    byId,
    escapeHtml,
    today,
    typeLabels,
    journalTypeLabels,
    executionStatusLabels,
    thesisStatusLabels,
    formatMoney,
    formatPrice,
    formatPercent,
    openDialog,
    closeDialog,
    save,
    selectors: portfolioSelectors,
    requestRenderAll: renderAll
  }));
  const investmentForm = stocksModule.form;
  const personalFinanceRepo = window.PersonalFinanceDomain.createRepository(state, save);
  const cashFlowRepo = window.CashFlowDomain.createRepository(state, save);
  const cashFlowService = window.CashFlowService.create({ state });
  const personalFinanceForm = window.PersonalFinanceFormController.create({
    repo: personalFinanceRepo,
    closeDialog,
    renderAll
  });
  const personalFinanceView = window.PersonalFinanceView.create({
    state,
    repo: personalFinanceRepo,
    byId,
    escapeHtml,
    formatMoney,
    today,
    openDialog
  });
  const cashFlowView = window.CashFlowView.create({
    state,
    service: cashFlowService,
    byId,
    escapeHtml,
    formatMoney
  });
  const cashFlowForm = window.CashFlowFormController.create({
    state,
    repo: cashFlowRepo,
    byId,
    escapeHtml,
    today,
    openDialog,
    closeDialog,
    renderAll
  });
  const reviewView = window.ReviewView.create({
    state,
    byId,
    escapeHtml,
    today,
    openDialog,
    closeDialog,
    save,
    requestRenderAll: renderAll
  });
  const dataManagement = window.DataManagementService.create({
    state,
    storage: window.AppStorage,
    savePart: save,
    today
  });
  dataManagement.ensureMetadata();
  function renderDashboard() {
    dashboardView.renderDashboard();
  }

  function renderAll() {
    renderDashboard();
    stocksModule.renderAll();
    reviewView.render();
    personalFinanceView.renderAssets();
    cashFlowView.renderCashFlow();
  }

  function save(name) {
    window.AppStorage.savePart(name, state[name]);
  }

  function openDialog(dialogId) {
    const dialog = byId(dialogId);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    updateCustomFields(dialog);
  }

  function closeDialog(dialogId) {
    const dialog = byId(dialogId);
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function updateCustomFields(scope = document) {
    scope.querySelectorAll(".js-custom-field").forEach((field) => {
      const controller = field.dataset.customFor ? field.form?.elements[field.dataset.customFor] : null;
      const input = field.querySelector("input");
      const shouldShow = controller && (controller.value === "other" || controller.value === "unknown");
      field.hidden = !shouldShow;
      if (input) {
        input.required = controller?.value === "other";
        if (!shouldShow) input.value = "";
      }
    });
  }

  function confirmAndRun(message, action) {
    if (!window.confirm(message)) return;
    try {
      action();
      renderAll();
    } catch (error) {
      window.alert(error.message || String(error));
    }
  }

  function closeNavMenus(exceptGroup = null) {
    document.querySelectorAll("[data-nav-group]").forEach((group) => {
      if (group === exceptGroup) return;
      group.classList.remove("nav-open");
      group.querySelector("[data-nav-menu]")?.setAttribute("aria-expanded", "false");
    });
  }

  function closeMobileNavigation() {
    document.body.classList.remove("mobile-nav-open");
    document.querySelector("[data-mobile-nav-toggle]")?.setAttribute("aria-expanded", "false");
  }

  function toggleMobileNavigation() {
    const isOpen = document.body.classList.toggle("mobile-nav-open");
    document.querySelector("[data-mobile-nav-toggle]")?.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) closeHeaderQuickActions();
    if (!isOpen) closeNavMenus();
  }

  function closeHeaderQuickActions() {
    document.body.classList.remove("header-quick-actions-open");
    document.querySelector("[data-header-quick-actions-toggle]")?.setAttribute("aria-expanded", "false");
    const menu = byId("header-quick-action-menu");
    if (menu) menu.hidden = true;
  }

  function toggleHeaderQuickActions() {
    const isOpen = !document.body.classList.contains("header-quick-actions-open");
    document.body.classList.toggle("header-quick-actions-open", isOpen);
    document.querySelector("[data-header-quick-actions-toggle]")?.setAttribute("aria-expanded", String(isOpen));
    const menu = byId("header-quick-action-menu");
    if (menu) menu.hidden = !isOpen;
    if (isOpen) closeMobileNavigation();
  }

  function closeWorkspaceMenu() {
    document.body.classList.remove("workspace-menu-open");
    document.querySelector("[data-workspace-menu-toggle]")?.setAttribute("aria-expanded", "false");
    byId("mobile-workspace-menu").hidden = true;
    document.querySelector(".sheet-backdrop").hidden = true;
  }

  function toggleWorkspaceMenu() {
    const isOpen = !document.body.classList.contains("workspace-menu-open");
    document.body.classList.toggle("workspace-menu-open", isOpen);
    document.querySelector("[data-workspace-menu-toggle]")?.setAttribute("aria-expanded", String(isOpen));
    byId("mobile-workspace-menu").hidden = !isOpen;
    document.querySelector(".sheet-backdrop").hidden = !isOpen;
    if (isOpen) document.body.classList.remove("mobile-filters-open");
  }

  function closeMobileFilters() {
    document.body.classList.remove("mobile-filters-open");
    document.querySelector(".sheet-backdrop").hidden = !document.body.classList.contains("workspace-menu-open");
  }

  function toggleMobileFilters() {
    const isOpen = !document.body.classList.contains("mobile-filters-open");
    if (isOpen) closeWorkspaceMenu();
    document.body.classList.toggle("mobile-filters-open", isOpen);
    document.querySelector(".sheet-backdrop").hidden = !isOpen;
  }

  function bindWorkspaceSheetDrag() {
    const sheet = byId("mobile-workspace-menu");
    let startY = 0;
    let dragging = false;
    sheet.addEventListener("pointerdown", (event) => {
      startY = event.clientY;
      dragging = true;
    });
    sheet.addEventListener("pointerup", (event) => {
      if (!dragging) return;
      dragging = false;
      if (event.clientY - startY > 48) closeWorkspaceMenu();
    });
    sheet.addEventListener("pointercancel", () => { dragging = false; });
  }

  function updateActiveNavigation() {
    const hash = portfolioRouter.syncHash();
    document.body.dataset.route = hash;
    const routeMeta = getRouteHeaderMeta(hash);
    const routeKicker = document.querySelector(".route-kicker");
    const mobileTitle = document.querySelector(".mobile-route-title");
    const routeDescription = document.querySelector(".route-description");
    if (routeKicker) routeKicker.textContent = routeMeta.kicker;
    if (mobileTitle) mobileTitle.textContent = routeMeta.title;
    if (routeDescription) routeDescription.textContent = routeMeta.description;
    syncWorkspaceTabs(hash);
    document.querySelectorAll("[data-nav-group]").forEach((group) => group.classList.remove("nav-has-active"));
    document.querySelectorAll(".main-nav .nav-link").forEach((link) => {
      const isActive = link.getAttribute("href") === `#${hash}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.closest("[data-nav-group]")?.classList.add("nav-has-active");
    });
  }

  function getMobileRouteTitle(route) {
    return getRouteHeaderMeta(route).title;
  }

  function getRouteHeaderMeta(route) {
    const routes = {
      dashboard: ["NET WORTH", "Net Worth Dashboard", "Portfolio overview, cash movement, and alerts"],
      "research-dashboard": ["INVESTMENT", "Companies", "Research quality, thesis status, and review priority"],
      watchlist: ["INVESTMENT", "Watchlist", "Candidates, review timing, and decision entry points"],
      positions: ["INVESTMENT", "Positions", "Holdings, cost basis, P&L, and transaction history"],
      journal: ["INVESTMENT", "Decisions", "Investment rationale, execution status, and context"],
      reviews: ["INVESTMENT", "Reviews", "Post-decision reviews, mistakes, and reusable lessons"],
      assets: ["ASSET CORE", "Accounts", "Accounts, policies, liabilities, and offline asset records"],
      accounts: ["ASSET CORE", "Accounts", "Accounts, policies, liabilities, and offline asset records"],
      insurance: ["ASSET CORE", "Insurance", "Policy values, premium status, and coverage records"],
      liabilities: ["ASSET CORE", "Liabilities", "Debt balances, interest rates, and payment reminders"],
      "cash-flow": ["CASH FLOW", "Cash Flow", "Income, expenses, budgets, and recurring items"],
      records: ["RECORDS", "Records", "Decision records, reviews, and backups"],
      settings: ["SETTINGS", "Settings", "Preferences, categories, backups, and data tools"]
    };
    const [kicker, title, description] = routes[route] || routes.dashboard;
    return { kicker, title, description };
  }

  function syncWorkspaceTabs(route) {
    document.querySelectorAll(".workspace-tabs").forEach((tabs) => {
      const links = [...tabs.querySelectorAll("a")];
      links.forEach((link) => {
        const targetRoute = (link.getAttribute("href") || "").replace(/^#/, "");
        link.classList.toggle("active", targetRoute === route);
      });
      const active = links.find((link) => link.classList.contains("active"));
      if (!active || tabs.offsetParent === null) return;
      window.requestAnimationFrame(() => {
        const left = active.offsetLeft - Math.max(12, (tabs.clientWidth - active.offsetWidth) / 2);
        tabs.scrollTo({ left, behavior: "auto" });
      });
    });
  }

  function renderImportSummary(summary) {
    const container = byId("import-summary");
    const rows = Object.entries(summary.summary)
      .filter(([name]) => name !== "settings")
      .map(([name, count]) => `<li>${escapeHtml(name)}：${count}</li>`)
      .join("");
    container.classList.remove("empty-state");
    container.innerHTML = `<strong>備份可匯入</strong><p>Schema ${summary.schemaVersion} · App ${escapeHtml(summary.appVersion)} · ${escapeHtml(summary.exportedAt || "未提供匯出時間")}</p><ul>${rows}</ul>`;
    document.querySelectorAll("[data-apply-import]").forEach((button) => { button.disabled = false; });
  }

  function showDataMessage(message, isError = false) {
    const element = byId("data-management-message");
    element.textContent = message;
    element.classList.toggle("danger-text", isError);
  }

  function runIntegrityCheck() {
    const errors = dataManagement.validateCurrent();
    byId("integrity-result").innerHTML = errors.length
      ? errors.slice(0, 20).map((error) => `<div class="alert-box"><span class="alert-icon">!</span><p>${escapeHtml(error)}</p></div>`).join("")
      : `<p class="empty-state">目前沒有發現資料完整性問題。</p>`;
  }

  function refreshRecoveryState() {
    const summary = dataManagement.recoverySummary();
    const button = byId("restore-previous-state-button");
    button.disabled = !summary;
    byId("recovery-backup-status").textContent = summary
      ? `可回復版本：${summary.createdAt || "時間未記錄"}（${summary.reason}）`
      : "目前沒有可回復的版本。";
  }

  function renderGlobalSearch(keyword) {
    const box = byId("global-search-results");
    const results = dataManagement.search(keyword);
    box.hidden = !keyword;
    box.innerHTML = results.length
      ? results.map((item) => `<a class="search-result-item" href="#${item.route}"><strong>${escapeHtml(item.title || "尚未設定")}</strong><small>${escapeHtml(item.type)} · ${escapeHtml(item.detail || "")}</small></a>`).join("")
      : `<p class="empty-state">沒有找到符合的資料。</p>`;
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-nav-group]")) closeNavMenus();
    if (!event.target.closest(".site-header")) closeMobileNavigation();
    if (!event.target.closest(".header-action-toggle, .header-quick-action-menu")) closeHeaderQuickActions();
    if (event.target.closest("[data-sheet-close]")) {
      closeWorkspaceMenu();
      closeMobileFilters();
      return;
    }
    const cardMenuToggle = event.target.closest("[data-card-action-menu-toggle]");
    const openCardMenus = document.querySelectorAll("[data-research-card].card-actions-open");
    if (cardMenuToggle && window.matchMedia("(max-width: 640px)").matches) {
      const card = cardMenuToggle.closest("[data-research-card]");
      const willOpen = !card?.classList.contains("card-actions-open");
      openCardMenus.forEach((openCard) => {
        if (openCard !== card) {
          openCard.classList.remove("card-actions-open");
          openCard.querySelector("[data-card-action-menu-toggle]")?.setAttribute("aria-expanded", "false");
        }
      });
      card?.classList.toggle("card-actions-open", willOpen);
      cardMenuToggle.setAttribute("aria-expanded", String(willOpen));
      return;
    }
    if (!event.target.closest("[data-research-card].card-actions-open")) {
      openCardMenus.forEach((card) => {
        card.classList.remove("card-actions-open");
        card.querySelector("[data-card-action-menu-toggle]")?.setAttribute("aria-expanded", "false");
      });
    } else if (event.target.closest("[data-card-action-menu] button")) {
      const card = event.target.closest("[data-research-card]");
      card?.classList.remove("card-actions-open");
      card?.querySelector("[data-card-action-menu-toggle]")?.setAttribute("aria-expanded", "false");
    }
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.dataset.mobileNavToggle !== undefined) {
      toggleMobileNavigation();
      return;
    }
    if (target.dataset.headerQuickActionsToggle !== undefined) {
      toggleHeaderQuickActions();
      return;
    }
    if (target.closest(".header-quick-action-menu")) closeHeaderQuickActions();
    if (target.dataset.workspaceMenuToggle !== undefined) {
      toggleWorkspaceMenu();
      return;
    }
    if (target.dataset.filterToggle !== undefined) {
      toggleMobileFilters();
      return;
    }
    if (target.dataset.workspaceLink !== undefined) {
      closeWorkspaceMenu();
      closeMobileFilters();
    }
    if (target.closest(".workspace-tabs")) {
      const href = target.getAttribute("href");
      if (href?.startsWith("#") && window.location.hash !== href) {
        event.preventDefault();
        window.location.hash = href;
      }
    }
    if (target.dataset.navMenu) {
      const group = target.closest("[data-nav-group]");
      const isOpen = group.classList.toggle("nav-open");
      target.setAttribute("aria-expanded", String(isOpen));
      closeNavMenus(group);
      return;
    }
    if (target.classList.contains("nav-link") || target.classList.contains("nav-menu-button")) {
      closeNavMenus();
      closeMobileNavigation();
      closeWorkspaceMenu();
      closeMobileFilters();
      updateActiveNavigation();
    }
    if (target.classList.contains("search-result-item")) {
      byId("global-search-results").hidden = true;
      byId("global-search-input").value = "";
    }
    if (target.dataset.choiceToggle) {
      const field = target.closest(".field");
      const isOpen = field?.classList.toggle("choices-open");
      target.textContent = isOpen ? "▲" : "▼";
    }
    if (target.dataset.choiceValue) {
      const field = target.closest(".field");
      const input = field?.querySelector("input");
      if (input) {
        input.value = target.dataset.choiceValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      field?.classList.remove("choices-open");
      const toggle = field?.querySelector(".choice-toggle");
      if (toggle) toggle.textContent = "▼";
    }
    if (target.matches("#open-settings-button, .open-settings-button")) {
      investmentForm.fillSettingsForm();
      openDialog("settings-dialog");
    }
    if (target.dataset.quickAction === "buy") investmentForm.openQuickTransaction("buy");
    if (target.dataset.quickAction === "sell") investmentForm.openQuickTransaction("sell");
    if (target.dataset.quickAction === "income") cashFlowForm.openEntryDialog("income");
    if (target.dataset.quickAction === "account") personalFinanceView.openAccountDialog();
    if (target.dataset.quickAction === "insurance") personalFinanceView.openPolicyDialog();
    if (target.dataset.quickAction === "liability") personalFinanceView.openLiabilityDialog();
    if (target.dataset.quickAction === "expense") cashFlowForm.openEntryDialog("expense");
    if (target.dataset.quickAction === "journal") stocksModule.openJournalDialog();
    if (target.dataset.quickAction === "review") reviewView.openReviewDialog();
    if (target.dataset.quickAction) {
      closeHeaderQuickActions();
    }
    if (target.dataset.openCashFlowEntry) {
      closeHeaderQuickActions();
      cashFlowForm.openEntryDialog(target.dataset.openCashFlowEntry);
    }
    if (target.dataset.openDataManagement !== undefined) {
      refreshRecoveryState();
      openDialog("data-management-dialog");
    }
    if (target.dataset.exportBackup !== undefined) {
      dataManagement.downloadBackup();
      showDataMessage("Backup JSON 已匯出。");
    }
    if (target.dataset.applyImport) {
      const mode = target.dataset.applyImport;
      const confirmText = mode === "replace"
        ? "Replace 會先建立暫時 Backup，然後用匯入檔取代目前資料。確定要執行嗎？"
        : "Merge 會用相同 id 的匯入資料覆蓋目前資料，其他資料保留。確定要執行嗎？";
      if (window.confirm(confirmText)) {
        try {
          const result = dataManagement.applyImport(mode);
          showDataMessage(`${mode === "replace" ? "Replace" : "Merge"} 完成，已建立 Recovery Backup。`);
          document.querySelectorAll("[data-apply-import]").forEach((button) => { button.disabled = true; });
          byId("import-summary").classList.add("empty-state");
          byId("import-summary").textContent = "尚未選擇備份檔。";
          refreshRecoveryState();
          renderAll();
        } catch (error) {
          showDataMessage(error.message || String(error), true);
        }
      }
    }
    if (target.dataset.restorePreviousState !== undefined) {
      if (!dataManagement.hasRecoveryBackup()) {
        showDataMessage("目前沒有可回復的版本。", true);
      } else if (window.confirm("確定要回復到最近一次重大操作前的狀態嗎？目前狀態也會先保存成新的 Recovery Backup。")) {
        try {
          dataManagement.restorePreviousState();
          showDataMessage("已回復到上一個狀態。");
          refreshRecoveryState();
          renderAll();
        } catch (error) {
          showDataMessage(error.message || String(error), true);
        }
      }
    }
    if (target.dataset.runIntegrityCheck !== undefined) runIntegrityCheck();
    if (target.dataset.openCategoryManagement !== undefined) openDialog("category-management-dialog");
    if (target.dataset.openCategory) cashFlowForm.openCategoryDialog(target.dataset.openCategory);
    if (target.dataset.openRecurring !== undefined) {
      closeHeaderQuickActions();
      cashFlowForm.openRecurringDialog();
    }
    if (target.dataset.openBudget !== undefined) {
      closeHeaderQuickActions();
      cashFlowForm.openBudgetDialog();
    }
    if (target.dataset.editCategory) cashFlowForm.openCategoryDialog(target.dataset.categoryType, target.dataset.editCategory);
    if (target.dataset.archiveCategory) confirmAndRun("確定要封存這個分類嗎？", () => cashFlowRepo.archiveCategory(target.dataset.categoryType, target.dataset.archiveCategory));
    if (target.dataset.restoreCategory) confirmAndRun("確定要還原這個分類嗎？", () => cashFlowRepo.restoreCategory(target.dataset.categoryType, target.dataset.restoreCategory));
    if (target.dataset.editRecurring) cashFlowForm.openRecurringDialog(target.dataset.editRecurring);
    if (target.dataset.archiveRecurring) confirmAndRun("確定要封存這個 Recurring 嗎？", () => cashFlowRepo.archiveRecurring(target.dataset.archiveRecurring));
    if (target.dataset.restoreRecurring) confirmAndRun("確定要還原這個 Recurring 嗎？", () => cashFlowRepo.restoreRecurring(target.dataset.restoreRecurring));
    if (target.dataset.confirmRecurring) confirmAndRun("確認建立這筆到期 Recurring Entry 嗎？", () => cashFlowRepo.confirmRecurring(target.dataset.confirmRecurring));
    if (target.dataset.editCashFlow) cashFlowForm.openEntryDialog("expense", target.dataset.editCashFlow);
    if (target.dataset.deleteCashFlow) confirmAndRun("確定要刪除這筆 Cash Flow 紀錄嗎？注意：已同步產生的帳戶餘額或信用卡負債不會自動回復。", () => cashFlowRepo.deleteEntry(target.dataset.deleteCashFlow));
    if (reviewView.handleClick(target)) return;
    if (stocksModule.handleClick(target)) return;
    if (target.dataset.closeDialog) closeDialog(target.dataset.closeDialog);
    if (target.id === "open-account-button") personalFinanceView.openAccountDialog();
    if (target.id === "open-policy-button") personalFinanceView.openPolicyDialog();
    if (target.id === "open-liability-button") personalFinanceView.openLiabilityDialog();
    if (target.dataset.editAccount) personalFinanceView.openAccountDialog(target.dataset.editAccount);
    if (target.dataset.archiveAccount) confirmAndRun("確定要封存這個帳戶嗎？", () => personalFinanceRepo.archiveAccount(target.dataset.archiveAccount));
    if (target.dataset.restoreAccount) confirmAndRun("確定要還原這個帳戶嗎？", () => personalFinanceRepo.restoreAccount(target.dataset.restoreAccount));
    if (target.dataset.deleteAccount) confirmAndRun("確定要永久刪除這個帳戶嗎？相關餘額也會刪除，其他帳戶的連結會被清空。", () => personalFinanceRepo.deleteAccount(target.dataset.deleteAccount));
    if (target.dataset.addBalance) personalFinanceView.openBalanceDialog(target.dataset.addBalance);
    if (target.dataset.editBalance) personalFinanceView.openBalanceDialog("", target.dataset.editBalance);
    if (target.dataset.deleteBalance) confirmAndRun("確定要刪除這筆餘額紀錄嗎？", () => personalFinanceRepo.deleteBalance(target.dataset.deleteBalance));
    if (target.dataset.viewBalances) personalFinanceView.renderBalanceHistory(target.dataset.viewBalances);
    if (target.dataset.editPolicy) personalFinanceView.openPolicyDialog(target.dataset.editPolicy);
    if (target.dataset.archivePolicy) confirmAndRun("確定要封存這張保單嗎？", () => personalFinanceRepo.archivePolicy(target.dataset.archivePolicy));
    if (target.dataset.restorePolicy) confirmAndRun("確定要還原這張保單嗎？", () => personalFinanceRepo.restorePolicy(target.dataset.restorePolicy));
    if (target.dataset.deletePolicy) confirmAndRun("確定要刪除這張保單嗎？", () => personalFinanceRepo.deletePolicy(target.dataset.deletePolicy));
    if (target.dataset.editLiability) personalFinanceView.openLiabilityDialog(target.dataset.editLiability);
    if (target.dataset.archiveLiability) confirmAndRun("確定要封存這筆負債嗎？", () => personalFinanceRepo.archiveLiability(target.dataset.archiveLiability));
    if (target.dataset.restoreLiability) confirmAndRun("確定要還原這筆負債嗎？", () => personalFinanceRepo.restoreLiability(target.dataset.restoreLiability));
    if (target.dataset.payoffLiability) confirmAndRun("確定要將這筆負債標記為已清償嗎？", () => personalFinanceRepo.markLiabilityPaidOff(target.dataset.payoffLiability));
    if (target.dataset.deleteLiability) confirmAndRun("確定要刪除這筆負債嗎？", () => personalFinanceRepo.deleteLiability(target.dataset.deleteLiability));
    if (target.dataset.editPrice) stocksModule.handlePriceEdit(target);
  });

  byId("backup-file-input").addEventListener("change", (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const summary = dataManagement.prepareImport(String(reader.result || ""));
        renderImportSummary(summary);
        showDataMessage("備份檔驗證通過，請選擇 Merge 或 Replace。");
      } catch (error) {
        document.querySelectorAll("[data-apply-import]").forEach((button) => { button.disabled = true; });
        showDataMessage(error.message || String(error), true);
      }
    };
    reader.readAsText(file, "utf-8");
  });

  byId("global-search-input").addEventListener("input", (event) => renderGlobalSearch(event.currentTarget.value.trim()));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavMenus();
      closeMobileNavigation();
      closeQuickActions();
      closeWorkspaceMenu();
      closeMobileFilters();
    }
  });
  window.addEventListener("hashchange", () => {
    portfolioRouter.getCurrentPortfolioModule();
    closeWorkspaceMenu();
    closeMobileFilters();
    updateActiveNavigation();
  });

  byId("settings-form").addEventListener("submit", investmentForm.handleSettingsSubmit);

  byId("account-form").addEventListener("submit", personalFinanceForm.handleAccountSubmit);
  byId("balance-form").addEventListener("submit", personalFinanceForm.handleBalanceSubmit);
  byId("policy-form").addEventListener("submit", personalFinanceForm.handlePolicySubmit);
  byId("liability-form").addEventListener("submit", personalFinanceForm.handleLiabilitySubmit);
  byId("cash-flow-entry-form").addEventListener("submit", cashFlowForm.handleEntrySubmit);
  byId("cash-flow-category-form").addEventListener("submit", cashFlowForm.handleCategorySubmit);
  byId("recurring-form").addEventListener("submit", cashFlowForm.handleRecurringSubmit);
  byId("budget-form").addEventListener("submit", cashFlowForm.handleBudgetSubmit);
  reviewView.bindEvents();

  stocksModule.bindEvents();
  ["account-form", "policy-form", "liability-form"].forEach((id) => {
    byId(id).addEventListener("change", (event) => {
      if (event.target.matches("select")) updateCustomFields(event.currentTarget);
    });
  });
  cashFlowForm.bindFieldEvents();
  bindWorkspaceSheetDrag();

  renderAll();
  updateActiveNavigation();
})();

