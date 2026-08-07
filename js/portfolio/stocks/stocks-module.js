window.StocksPortfolioModule = (() => {
  function create(deps) {
    const {
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
      selectors,
      openDialog,
      closeDialog,
      save,
      requestRenderAll
    } = deps;

    const {
      getStock,
      getTransactions,
      validateAndNormalizeTransactions,
      calculatePosition,
      getPortfolioSummary
    } = selectors;

    const repository = window.InvestmentRepositories.create({ state, savePart: save });
    repository.cleanupDeletedRecords();
    const researchSystem = window.StockResearchSystem;

    const view = window.InvestmentView.create({
      state,
      byId,
      escapeHtml,
      typeLabels,
      thesisStatusLabels,
      journalTypeLabels,
      executionStatusLabels,
      getStock,
      getTransactions,
      calculatePosition,
      getPortfolioSummary,
      formatMoney,
      formatPrice,
      formatPercent,
      researchSystem,
      openDialog
    });

    const journal = window.JournalView.create({
      state,
      byId,
      journalTypeLabels,
      executionStatusLabels,
      escapeHtml,
      today,
      openDialog
    });

    const form = window.InvestmentFormController.create({
      state,
      byId,
      escapeHtml,
      today,
      typeLabels,
      getStock,
      validateAndNormalizeTransactions,
      calculatePosition,
      investmentRepo: repository,
      fillTransactionSelect: journal.fillTransactionSelect,
      fillThesisVersionSelect: journal.fillThesisVersionSelect,
      openJournalDialog: journal.openJournalDialog,
      openDialog,
      closeDialog,
      save,
      renderAll: requestRenderAll
    });

    function renderWatchlist() {
      view.renderWatchlist();
    }

    function renderPositions() {
      view.renderPositions();
    }

    function renderJournal() {
      journal.renderJournal();
    }

    function renderResearchDashboard() {
      view.renderResearchDashboard();
    }

    function renderAll() {
      renderResearchDashboard();
      renderWatchlist();
      renderPositions();
      renderJournal();
    }

    function deletePosition(stockId) {
      const stock = getStock(stockId);
      if (!stock) return;
      if (!window.confirm(`確定要刪除 ${stock.ticker} 的衛星部位嗎？這會永久移除該部位與相關交易紀錄，並同步更新 localStorage。`)) return;
      repository.positionRepository.deletePosition(stockId);
      requestRenderAll();
    }

    function closeWorkspaceIfOpen() {
      const dialog = byId("company-workspace-dialog");
      if (dialog?.open) closeDialog("company-workspace-dialog");
    }

    function getWorkspaceForm() {
      return byId("company-workspace-dialog").querySelector("[data-workspace-form]");
    }

    function isWorkspaceDirty() {
      return getWorkspaceForm()?.dataset.dirty === "true";
    }

    function confirmDiscardWorkspaceChanges() {
      return !isWorkspaceDirty() || window.confirm("Workspace 有尚未儲存的修改，確定要離開編輯模式嗎？");
    }

    function readWorkspaceValues(formElement) {
      const values = Object.fromEntries(new FormData(formElement));
      return {
        ...values,
        ticker: researchSystem.normalizeSymbol(values.ticker),
        companyName: String(values.companyName || "").trim(),
        market: String(values.market || "").trim(),
        industry: String(values.industry || "").trim(),
        stage: String(values.stage || "").trim() || "初步發現",
        tags: researchSystem.normalizeTags(values.tags),
        businessOverview: String(values.businessOverview || "").trim(),
        thesis: String(values.thesis || "").trim(),
        growthDrivers: String(values.growthDrivers || "").trim(),
        competitiveAdvantages: String(values.competitiveAdvantages || "").trim(),
        catalysts: String(values.catalysts || "").trim(),
        risk: String(values.risk || "").trim(),
        invalidation: String(values.invalidation || "").trim(),
        valuationNotes: String(values.valuationNotes || "").trim(),
        sources: String(values.sources || "").split(/[\n,，]/).map((source) => source.trim()).filter(Boolean),
        researchNotes: String(values.researchNotes || "").trim(),
        fairPriceRange: String(values.fairPriceRange || "").trim() || "尚未設定",
        nextReviewDate: researchSystem.normalizeDate(values.nextReviewDate),
        lastUpdatedDate: researchSystem.normalizeDate(values.lastUpdatedDate) || today()
      };
    }

    function saveWorkspace(stockId) {
      const formElement = getWorkspaceForm();
      const error = formElement.querySelector(".form-error");
      const stock = getStock(stockId);
      if (!formElement || !stock) return;
      const rawValues = Object.fromEntries(new FormData(formElement));
      const validation = researchSystem.validateResearchInput(rawValues, state.watchlistStocks, stockId);
      if (!validation.valid) {
        error.textContent = validation.errors.join(" ");
        return;
      }
      const values = readWorkspaceValues(formElement);
      if (!values.thesis || !values.risk || !values.invalidation) {
        error.textContent = "Investment Thesis、Main Risks 與 Invalidation Conditions 為必填欄位。";
        return;
      }
      Object.assign(stock, {
        ticker: values.ticker,
        companyName: values.companyName,
        market: values.market || "尚未設定",
        industry: values.industry || "尚未設定",
        stage: values.stage,
        tags: values.tags,
        businessOverview: values.businessOverview,
        thesis: values.thesis,
        thesisSummary: values.thesis,
        growthDrivers: values.growthDrivers,
        competitiveAdvantages: values.competitiveAdvantages,
        catalysts: values.catalysts || "尚未設定",
        risk: values.risk,
        mainRisks: values.risk,
        invalidation: values.invalidation,
        invalidationConditions: values.invalidation,
        valuationNotes: values.valuationNotes,
        sources: values.sources,
        researchNotes: values.researchNotes,
        fairPriceRange: values.fairPriceRange,
        nextReviewDate: values.nextReviewDate,
        lastUpdatedDate: values.lastUpdatedDate,
        lastReviewedAt: values.lastUpdatedDate,
        updatedAt: new Date().toISOString()
      });
      const linkedPosition = state.positions.find((position) => position.stockId === stockId);
      if (linkedPosition) {
        linkedPosition.updatedAt = new Date().toISOString();
        save("positions");
      }
      save("watchlistStocks");
      view.openCompanyWorkspace(stockId, "view", "Workspace 已儲存。");
      requestRenderAll();
    }

    function handleJournalSubmit(event) {
      event.preventDefault();
      const formElement = event.currentTarget;
      const values = Object.fromEntries(new FormData(formElement));
      const error = formElement.querySelector(".form-error");
      const decisionDomain = window.DecisionDomain;
      const validation = decisionDomain.validateDecision(values);
      if (!validation.valid) {
        error.textContent = validation.errors.join(" ");
        return;
      }
      const stock = values.stockId ? getStock(values.stockId) : null;
      const existing = values.journalId ? state.journalEntries.find((entry) => entry.id === values.journalId) : null;
      const decisionType = decisionDomain.normalizeDecisionType(values.entryType);
      const transactionId = values.transactionId || "";
      const title = values.title.trim() || `${journalTypeLabels[decisionType] || decisionType} Decision`;
      const price = Number(values.price);
      const quantity = Number(values.quantity);
      const entry = {
        id: existing?.id || `journal-${Date.now()}`,
        companyId: stock?.id || "",
        stockId: stock?.id || "",
        ticker: stock?.ticker || "",
        companyName: stock?.companyName || "",
        date: values.date,
        decisionDate: values.date,
        entryType: decisionType,
        decisionType,
        title,
        tags: decisionDomain.splitTags(values.tags),
        reason: values.investmentThesis.trim(),
        investmentThesis: values.investmentThesis.trim(),
        supportingEvidence: values.supportingEvidence.trim(),
        expectedOutcome: values.expectedOutcome.trim(),
        risks: values.risks.trim(),
        price: Number.isFinite(price) && price > 0 ? price : null,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
        expectedReturn: values.expectedReturn.trim(),
        expectedHoldingPeriod: values.holdingPeriod.trim(),
        holdingPeriod: values.holdingPeriod.trim(),
        confidence: Number(values.confidence),
        plannedAction: values.plannedAction.trim(),
        executionStatus: decisionDomain.normalizeExecutionStatus(values.executionStatus, transactionId),
        followUpReview: values.followUpReview.trim(),
        reviewType: values.reviewType || "",
        thesisStillValid: values.thesisStillValid || "",
        whatWentRight: values.whatWentRight.trim(),
        whatWentWrong: values.whatWentWrong.trim(),
        lessonsLearned: decisionDomain.splitTags(values.lessonsLearned),
        positionAdjustment: values.positionAdjustment.trim(),
        reviewNotes: values.reviewNotes.trim(),
        transactionId,
        summary: values.investmentThesis.trim(),
        thesis: values.investmentThesis.trim(),
        catalysts: values.expectedOutcome.trim(),
        invalidationConditions: values.invalidationConditions.trim(),
        nextReviewDate: values.nextReviewDate || "",
        researchId: values.researchId || "",
        thesisVersionId: values.thesisVersionId || "",
        notes: values.followUpReview.trim(),
        note: values.followUpReview.trim(),
        isArchived: existing?.isArchived || false,
        archivedAt: existing?.archivedAt || "",
        isDeleted: existing?.isDeleted || false,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (existing?.transactionId && existing.transactionId !== entry.transactionId) {
        const oldTransaction = state.transactions.find((item) => item.id === existing.transactionId);
        if (oldTransaction?.journalEntryId === entry.id) oldTransaction.journalEntryId = "";
      }
      if (existing) Object.assign(existing, entry);
      else state.journalEntries.push(entry);
      if (entry.transactionId) {
        const transaction = state.transactions.find((item) => item.id === entry.transactionId);
        if (transaction) transaction.journalEntryId = entry.id;
        save("transactions");
      }
      save("journalEntries");
      closeDialog("journal-dialog");
      requestRenderAll();
    }

    function handleClick(target) {
      if (target.matches(".open-stock-dialog-button")) {
        closeWorkspaceIfOpen();
        form.openStockDialog();
        return true;
      }
      if (target.dataset.editStock) {
        closeWorkspaceIfOpen();
        form.openStockDialog(target.dataset.editStock);
        return true;
      }
      if (target.dataset.requestDeleteStock) {
        view.openDeleteStockDialog(target.dataset.requestDeleteStock);
        return true;
      }
      if (target.dataset.openCompanyWorkspace) {
        if (!confirmDiscardWorkspaceChanges()) return true;
        view.openCompanyWorkspace(target.dataset.openCompanyWorkspace);
        return true;
      }
      if (target.dataset.workspaceEdit) {
        view.openCompanyWorkspace(target.dataset.workspaceEdit, "edit");
        return true;
      }
      if (target.dataset.workspaceSave) {
        saveWorkspace(target.dataset.workspaceSave);
        return true;
      }
      if (target.dataset.workspaceCancel) {
        if (!confirmDiscardWorkspaceChanges()) return true;
        view.openCompanyWorkspace(target.dataset.workspaceCancel, "view", "已取消編輯，未覆蓋原資料。");
        return true;
      }
      if (target.dataset.addReview) {
        closeWorkspaceIfOpen();
        const stock = getStock(target.dataset.addReview);
        journal.openJournalDialog("", {
          stockId: stock?.id || "",
          ticker: stock?.ticker || "",
          entryType: "review",
          title: stock ? `${stock.ticker} Review` : "Review",
          investmentThesis: stock?.thesisSummary || stock?.thesis || "",
          expectedOutcome: stock?.catalysts || "",
          risks: stock?.mainRisks || stock?.risk || "",
          invalidationConditions: stock?.invalidationConditions || stock?.invalidation || ""
        });
        return true;
      }
      if (target.dataset.createDecision) {
        closeWorkspaceIfOpen();
        const stock = getStock(target.dataset.createDecision);
        journal.openJournalDialog("", {
          stockId: stock?.id || "",
          companyId: stock?.id || "",
          ticker: stock?.ticker || "",
          entryType: "hold",
          decisionType: "hold",
          title: stock ? `${stock.ticker} Decision` : "Decision",
          investmentThesis: stock?.thesisSummary || stock?.thesis || "",
          expectedOutcome: stock?.catalysts || "",
          risks: stock?.mainRisks || stock?.risk || "",
          invalidationConditions: stock?.invalidationConditions || stock?.invalidation || "",
          thesisVersionId: window.DecisionDomain.getThesisVersionOptions(stock || {})[0]?.id || ""
        });
        return true;
      }
      if (target.dataset.initialPosition) {
        closeWorkspaceIfOpen();
        form.openTransactionDialog(target.dataset.initialPosition, true);
        return true;
      }
      if (target.dataset.addTransaction) {
        closeWorkspaceIfOpen();
        form.openTransactionDialog(target.dataset.addTransaction);
        return true;
      }
      if (target.dataset.sellPosition) {
        closeWorkspaceIfOpen();
        form.openSellPosition(target.dataset.sellPosition);
        return true;
      }
      if (target.dataset.viewTransactions) {
        view.renderTransactionLog(target.dataset.viewTransactions);
        return true;
      }
      if (target.dataset.editTransaction) {
        form.openEditTransaction(target.dataset.editTransaction);
        return true;
      }
      if (target.dataset.deletePosition) {
        deletePosition(target.dataset.deletePosition);
        return true;
      }
      if (target.dataset.deleteTransaction) {
        if (!window.confirm("確定要永久移除此交易紀錄嗎？這會同步更新 localStorage。")) return true;
        const transaction = state.transactions.find((item) => item.id === target.dataset.deleteTransaction);
        if (!transaction) return true;
        const candidates = state.transactions.filter((item) => item.id !== transaction.id && item.stockId === transaction.stockId);
        const result = validateAndNormalizeTransactions(candidates);
        if (!result.valid) {
          window.alert(`無法移除：${result.message}`);
          return true;
        }
        repository.transactionRepository.deleteTransaction(transaction.id);
        requestRenderAll();
        return true;
      }
      if (target.dataset.reviewThesis) {
        closeWorkspaceIfOpen();
        form.openThesisDialog(target.dataset.reviewThesis);
        return true;
      }
      if (target.dataset.editJournal) {
        journal.openJournalDialog(target.dataset.editJournal);
        return true;
      }
      if (target.dataset.deleteJournal) {
        target.dataset.archiveJournal = target.dataset.deleteJournal;
      }
      if (target.dataset.archiveJournal) {
        if (!window.confirm("確定要封存此決策紀錄嗎？封存不會影響交易或持倉。")) return true;
        const entry = state.journalEntries.find((item) => item.id === target.dataset.archiveJournal);
        if (!entry) return true;
        entry.isArchived = true;
        entry.archivedAt = new Date().toISOString();
        entry.updatedAt = new Date().toISOString();
        save("journalEntries");
        requestRenderAll();
        return true;
      }
      if (target.dataset.restoreJournal) {
        const entry = state.journalEntries.find((item) => item.id === target.dataset.restoreJournal);
        if (!entry) return true;
        entry.isArchived = false;
        entry.isDeleted = false;
        entry.archivedAt = "";
        entry.updatedAt = new Date().toISOString();
        save("journalEntries");
        requestRenderAll();
        return true;
      }
      if (target.dataset.unlinkDecisionTransaction) {
        const entry = state.journalEntries.find((item) => item.id === target.dataset.unlinkDecisionTransaction);
        if (!entry) return true;
        const transaction = state.transactions.find((item) => item.id === entry.transactionId);
        if (transaction?.journalEntryId === entry.id) transaction.journalEntryId = "";
        entry.transactionId = "";
        if (entry.executionStatus === "executed") entry.executionStatus = "planned";
        entry.updatedAt = new Date().toISOString();
        save("journalEntries");
        save("transactions");
        requestRenderAll();
        return true;
      }
      if (target.id === "open-general-transaction-button") {
        form.openTransactionDialog();
        return true;
      }
      if (target.id === "open-journal-button") {
        journal.openJournalDialog();
        return true;
      }
      if (target.dataset.closeDialog === "company-workspace-dialog" && !confirmDiscardWorkspaceChanges()) return true;
      return false;
    }

    function handlePriceEdit(target) {
      const priceForm = byId("price-form");
      const position = state.positions.find((item) => item.stockId === target.dataset.editPrice);
      const currency = (position?.currency || getStock(target.dataset.editPrice)?.currency) === "USD" ? "USD" : "TWD";
      priceForm.elements.stockId.value = target.dataset.editPrice;
      priceForm.elements.currentPrice.value = position?.currentPrice || "";
      priceForm.elements.currentFx.value = position?.currentFx || 1;
      byId("price-currency-label").textContent = `目前價格 (${currency}) *`;
      priceForm.querySelector(".form-error").textContent = "";
      openDialog("price-dialog");
    }

    function bindEvents() {
      byId("stock-form").addEventListener("submit", form.handleStockSubmit);
      byId("delete-stock-form").addEventListener("submit", form.handleDeleteStockSubmit);
      byId("transaction-form").addEventListener("submit", form.handleTransactionSubmit);
      byId("price-form").addEventListener("submit", form.handlePriceSubmit);
      byId("journal-form").addEventListener("submit", handleJournalSubmit);
      byId("journal-form").elements.entryType.addEventListener("change", (event) => {
        journal.applyDecisionTemplate(event.currentTarget.form, { applyDefaults: true });
      });
      byId("thesis-form").addEventListener("submit", form.handleThesisSubmit);
      ["watchlist-search", "watchlist-stage-filter", "watchlist-market-filter", "watchlist-industry-filter"].forEach((id) => {
        byId(id).addEventListener(id === "watchlist-search" ? "input" : "change", renderWatchlist);
      });
      ["journal-search", "journal-stock-filter", "journal-type-filter", "journal-execution-filter", "journal-tag-filter", "journal-transaction-filter", "journal-date-from", "journal-date-to", "journal-sort", "journal-show-archived"].forEach((id) => {
        byId(id).addEventListener(["journal-search", "journal-tag-filter"].includes(id) ? "input" : "change", renderJournal);
      });
      ["research-dashboard-search", "research-dashboard-status-filter", "research-dashboard-position-filter", "research-dashboard-tag-filter", "research-dashboard-confidence-filter", "research-dashboard-review-from", "research-dashboard-review-to", "research-dashboard-sort-by", "research-dashboard-sort-direction"].forEach((id) => {
        byId(id).addEventListener(["research-dashboard-search", "research-dashboard-tag-filter", "research-dashboard-confidence-filter"].includes(id) ? "input" : "change", renderResearchDashboard);
      });
      byId("research-dashboard-clear-filters").addEventListener("click", () => {
        ["research-dashboard-search", "research-dashboard-tag-filter", "research-dashboard-confidence-filter", "research-dashboard-review-from", "research-dashboard-review-to"].forEach((id) => { byId(id).value = ""; });
        byId("research-dashboard-status-filter").value = "all";
        byId("research-dashboard-position-filter").value = "all";
        byId("research-dashboard-sort-by").value = "severity";
        byId("research-dashboard-sort-direction").value = "desc";
        renderResearchDashboard();
      });
      byId("company-workspace-dialog").addEventListener("input", (event) => {
        if (event.target.closest("[data-workspace-form]")) event.target.closest("[data-workspace-form]").dataset.dirty = "true";
      });
      byId("show-deleted-transactions").addEventListener("change", () => view.renderTransactionLog());
      form.bindFieldEvents();
    }

    return {
      id: "stocks",
      displayName: "Stocks",
      routes: ["research-dashboard", "watchlist", "positions", "journal", "reviews"],
      navigationItems: [
        { label: "Research Dashboard", route: "research-dashboard" },
        { label: "Watchlist", route: "watchlist" },
        { label: "Positions", route: "positions" },
        { label: "Research Journal", route: "journal" },
        { label: "Reviews & Lessons", route: "reviews" }
      ],
      repository,
      form,
      renderAll,
      bindEvents,
      handleClick,
      handlePriceEdit,
      openJournalDialog: journal.openJournalDialog,
      openQuickTransaction: form.openQuickTransaction,
      fillSettingsForm: form.fillSettingsForm
    };
  }

  return { create };
})();
