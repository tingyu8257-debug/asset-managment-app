(typeof window !== "undefined" ? window : globalThis).InvestmentFormController = (() => {
  function create({
    state,
    byId,
    escapeHtml,
    today,
    typeLabels,
    getStock,
    validateAndNormalizeTransactions,
    calculatePosition,
    investmentRepo,
    fillTransactionSelect,
    fillThesisVersionSelect = () => {},
    openJournalDialog,
    openDialog,
    closeDialog,
    save,
    renderAll
  }) {
    function fillSettingsForm() {
      const form = byId("settings-form");
      ["totalPortfolioValue", "coreValue", "satelliteTargetPercent", "maxSingleStockSatellitePercent", "maxSingleStockTotalPercent", "maxThemeSatellitePercent", "researchOutdatedDays"].forEach((key) => { form.elements[key].value = state.settings[key] ?? 90; });
      form.elements.baseCurrency.value = "TWD";
      byId("fx-updated-at").textContent = "Dashboard 固定以 TWD 顯示；USD 資料請在各帳戶、保單、負債或持倉中輸入目前估值匯率。";
      form.querySelector(".form-error").textContent = "";
    }

    function fillTransactionStockOptions(selectedStockId) {
      const select = byId("transaction-form").elements.stockId;
      select.innerHTML = state.watchlistStocks.map((stock) => `<option value="${stock.id}">${escapeHtml(stock.ticker)} · ${escapeHtml(stock.companyName)}</option>`).join("");
      if (selectedStockId) select.value = selectedStockId;
    }

    function openStockDialog(stockId) {
      const form = byId("stock-form");
      form.reset();
      const stock = stockId ? getStock(stockId) : null;
      form.elements.stockId.value = stock?.id || "";
      form.elements.ticker.value = stock?.ticker || "";
      form.elements.companyName.value = stock?.companyName || "";
      form.elements.market.value = stock?.market || "";
      form.elements.industry.value = stock?.industry || "";
      form.elements.currency.value = stock?.currency === "USD" ? "USD" : "TWD";
      form.elements.tags.value = stock?.tags.join(", ") || "";
      form.elements.stage.value = stock?.stage || "初步發現";
      form.elements.fairPriceRange.value = stock?.fairPriceRange === "尚未設定" ? "" : stock?.fairPriceRange || "";
      ["targetBuyPriceLow", "targetBuyPriceHigh", "reviewPrice", "priceAlertNote"].forEach((key) => { form.elements[key].value = stock?.[key] || ""; });
      form.elements.nextReviewDate.value = stock?.nextReviewDate || "";
      form.elements.lastUpdatedDate.value = stock?.lastUpdatedDate || today();
      form.elements.thesis.value = stock?.thesis === "尚未設定" ? "" : stock?.thesis || "";
      form.elements.risk.value = stock?.risk === "尚未設定" ? "" : stock?.risk || "";
      form.elements.invalidation.value = stock?.invalidation === "尚未設定" ? "" : stock?.invalidation || "";
      ["businessOverview", "growthDrivers", "competitiveAdvantages", "valuationNotes", "researchNotes"].forEach((key) => { form.elements[key].value = stock?.[key] || ""; });
      form.elements.sources.value = Array.isArray(stock?.sources) ? stock.sources.join("\n") : stock?.sources || "";
      byId("stock-dialog-title").textContent = stock ? `編輯 ${stock.ticker}` : "新增研究標的";
      byId("stock-submit-button").textContent = stock ? "儲存修改" : "加入 Watchlist";
      form.querySelector(".form-error").textContent = "";
      openDialog("stock-dialog");
    }

    function openTransactionDialog(stockId, initial = false) {
      const form = byId("transaction-form");
      form.reset();
      fillTransactionStockOptions(stockId);
      form.elements.date.value = today();
      form.elements.type.value = initial ? "buy" : "add";
      form.elements.transactionId.value = "";
      form.elements.stockId.disabled = Boolean(stockId);
      updateTransactionCurrency(form);
      byId("transaction-dialog-title").textContent = "新增交易紀錄";
      updateExitShares(form);
      form.querySelector(".form-error").textContent = "";
      openDialog("transaction-dialog");
    }

    function openQuickTransaction(type) {
      openTransactionDialog("", type === "buy");
      const form = byId("transaction-form");
      form.elements.type.value = type === "sell" ? "reduce" : "buy";
      updateExitShares(form);
    }

    function openSellPosition(stockId) {
      const position = calculatePosition(stockId);
      openTransactionDialog(stockId);
      const form = byId("transaction-form");
      form.elements.type.value = "reduce";
      form.elements.shares.value = position.shares > 0 ? position.shares : "";
      byId("transaction-dialog-title").textContent = "賣出衛星部位";
      updateExitShares(form);
    }

    function openEditTransaction(transactionId) {
      const transaction = state.transactions.find((item) => item.id === transactionId);
      const form = byId("transaction-form");
      form.reset();
      fillTransactionStockOptions(transaction.stockId);
      form.elements.stockId.disabled = true;
      form.elements.transactionId.value = transaction.id;
      ["date", "type", "shares", "price", "currency", "reason", "checkingCondition", "note"].forEach((name) => { form.elements[name].value = transaction[name] || ""; });
      form.elements.exchangeRate.value = transaction.exchangeRate ?? transaction.fxRateAtTrade ?? "";
      form.elements.createJournal.checked = false;
      byId("transaction-dialog-title").textContent = `編輯 ${transaction.ticker} 交易`;
      updateExitShares(form);
      form.querySelector(".form-error").textContent = "";
      openDialog("transaction-dialog");
    }

    function openThesisDialog(stockId) {
      const stock = getStock(stockId);
      const form = byId("thesis-form");
      form.reset();
      form.elements.stockId.value = stock.id;
      form.elements.thesisStatus.value = stock.thesisStatus;
      form.elements.expectedTimeHorizon.value = stock.expectedTimeHorizon === "尚未設定" ? "" : stock.expectedTimeHorizon;
      form.elements.nextReviewDate.value = stock.nextReviewDate || "";
      form.elements.thesisSummary.value = stock.thesisSummary === "尚未設定" ? "" : stock.thesisSummary;
      form.elements.catalysts.value = stock.catalysts === "尚未設定" ? "" : stock.catalysts;
      form.elements.mainRisks.value = stock.mainRisks === "尚未設定" ? "" : stock.mainRisks;
      form.elements.invalidationConditions.value = stock.invalidationConditions === "尚未設定" ? "" : stock.invalidationConditions;
      form.elements.fairPriceRange.value = stock.fairPriceRange === "尚未設定" ? "" : stock.fairPriceRange;
      byId("thesis-dialog-title").textContent = `重新檢查 ${stock.ticker} Thesis`;
      form.querySelector(".form-error").textContent = "";
      openDialog("thesis-dialog");
    }

    function updateTransactionCurrency(form) {
      const stock = getStock(form.elements.stockId.value);
      const currency = stock?.currency === "USD" ? "USD" : "TWD";
      form.elements.currency.value = currency;
      form.elements.exchangeRate.value = currency === "TWD" ? 1 : "";
    }

    function updateExitShares(form) {
      const isExit = form.elements.type.value === "exit";
      const current = calculatePosition(form.elements.stockId.value);
      form.elements.shares.readOnly = isExit;
      const existing = form.elements.transactionId.value ? state.transactions.find((item) => item.id === form.elements.transactionId.value) : null;
      if (isExit) form.elements.shares.value = existing?.type === "exit" ? existing.shares : current.shares || "";
    }

    function addOrUpdatePosition(stockId, currentPrice, currency, currentFx) {
      let position = state.positions.find((item) => item.stockId === stockId);
      const updatedAt = new Date().toISOString();
      const nextCurrency = currency === "USD" ? "USD" : "TWD";
      const nextFx = nextCurrency === "TWD" ? 1 : Number(currentFx);
      if (!position) {
        position = { stockId, currentPrice: currentPrice || null, currency: nextCurrency, currentFx: Number.isFinite(nextFx) && nextFx > 0 ? nextFx : 1, createdAt: updatedAt, updatedAt };
        state.positions.push(position);
      } else if (currentPrice !== undefined) {
        position.currentPrice = currentPrice;
        position.updatedAt = updatedAt;
      }
      position.isArchived = false;
      if (currency) {
        position.currency = nextCurrency;
        position.updatedAt = updatedAt;
      }
      if (Number.isFinite(nextFx) && nextFx > 0) position.currentFx = nextFx;
      else if (!position.currentFx) position.currentFx = 1;
      save("positions");
    }

    function handleSettingsSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const error = form.querySelector(".form-error");
      const numericKeys = ["totalPortfolioValue", "coreValue", "satelliteTargetPercent", "maxSingleStockSatellitePercent", "maxThemeSatellitePercent", "researchOutdatedDays", "maxSingleStockTotalPercent"];
      const nextNumbers = Object.fromEntries(numericKeys.map((key) => [key, Number(values[key])]));
      if (Object.values(nextNumbers).some((value) => !Number.isFinite(value) || value < 0)) {
        error.textContent = "請輸入有效且不小於 0 的數字。";
        return;
      }
      Object.assign(state.settings, nextNumbers, { baseCurrency: "TWD", supportedCurrencies: ["TWD", "USD"], exchangeRates: { TWD: 1, USD: 1 } });
      save("settings");
      closeDialog("settings-dialog");
      renderAll();
    }

    function handleStockSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const error = form.querySelector(".form-error");
      const researchSystem = window.StockResearchSystem;
      const ticker = researchSystem ? researchSystem.normalizeSymbol(values.ticker) : values.ticker.trim().toUpperCase();
      const existingStock = values.stockId ? getStock(values.stockId) : null;

      if (!ticker || !values.companyName.trim() || !values.market.trim() || !values.industry.trim()) {
        error.textContent = "股票代號、公司名稱、市場與產業分類為必填欄位。";
        return;
      }
      if (!values.thesis.trim() || !values.risk.trim() || !values.invalidation.trim()) {
        error.textContent = "請填寫投資理由、最大風險與反證條件。";
        return;
      }
      if (!["TWD", "USD"].includes(values.currency)) {
        error.textContent = "幣別目前只能選 TWD 或 USD。";
        return;
      }
      if (researchSystem) {
        const validation = researchSystem.validateResearchInput(values, state.watchlistStocks, values.stockId);
        if (!validation.valid) {
          error.textContent = validation.errors.join(" ");
          return;
        }
      }
      if (state.watchlistStocks.some((stock) => stock.id !== values.stockId && String(stock.ticker).trim().toUpperCase() === ticker)) {
        error.textContent = `${ticker} 已經存在於 Watchlist。`;
        return;
      }

      const stockData = {
        id: existingStock?.id || `stock-${ticker.toLowerCase()}-${Date.now()}`,
        ticker,
        companyName: values.companyName.trim(),
        currency: values.currency,
        market: values.market.trim(),
        industry: values.industry.trim(),
        tags: researchSystem ? researchSystem.normalizeTags(values.tags) : values.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
        stage: values.stage,
        thesis: values.thesis.trim(),
        risk: values.risk.trim(),
        invalidation: values.invalidation.trim(),
        businessOverview: values.businessOverview.trim(),
        growthDrivers: values.growthDrivers.trim(),
        competitiveAdvantages: values.competitiveAdvantages.trim(),
        valuationNotes: values.valuationNotes.trim(),
        sources: String(values.sources || "").split(/[\n,，]/).map((source) => source.trim()).filter(Boolean),
        researchNotes: values.researchNotes.trim(),
        thesisSummary: values.thesis.trim(),
        expectedTimeHorizon: existingStock?.expectedTimeHorizon || "尚未設定",
        catalysts: existingStock?.catalysts || "尚未設定",
        mainRisks: values.risk.trim(),
        invalidationConditions: values.invalidation.trim(),
        thesisStatus: existingStock?.thesisStatus || "active",
        lastReviewedAt: existingStock?.lastReviewedAt || values.lastUpdatedDate || today(),
        thesisHistory: existingStock?.thesisHistory || [],
        fairPriceRange: values.fairPriceRange.trim() || "尚未設定",
        targetBuyPriceLow: Number(values.targetBuyPriceLow) > 0 ? Number(values.targetBuyPriceLow) : null,
        targetBuyPriceHigh: Number(values.targetBuyPriceHigh) > 0 ? Number(values.targetBuyPriceHigh) : null,
        reviewPrice: Number(values.reviewPrice) > 0 ? Number(values.reviewPrice) : null,
        priceAlertNote: values.priceAlertNote.trim(),
        nextReviewDate: researchSystem ? researchSystem.normalizeDate(values.nextReviewDate) : values.nextReviewDate || "",
        lastUpdatedDate: (researchSystem ? researchSystem.normalizeDate(values.lastUpdatedDate) : values.lastUpdatedDate) || today()
      };
      if (existingStock) Object.assign(existingStock, stockData);
      else state.watchlistStocks.push(stockData);
      const linkedPosition = state.positions.find((position) => position.stockId === stockData.id);
      if (linkedPosition) {
        linkedPosition.currency = stockData.currency;
        if (!linkedPosition.currentFx) linkedPosition.currentFx = 1;
        linkedPosition.updatedAt = new Date().toISOString();
        save("positions");
      }
      save("watchlistStocks");
      closeDialog("stock-dialog");
      renderAll();
    }

    function handleDeleteStockSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const deleted = investmentRepo.watchlistRepository.deleteStock(form.elements.stockId.value);
      if (!deleted) {
        form.querySelector(".form-error").textContent = "找不到要刪除的研究標的。";
        return;
      }
      closeDialog("delete-stock-dialog");
      renderAll();
    }

    function handleTransactionSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      values.stockId = form.elements.stockId.value;
      const shares = Number(values.shares);
      const price = Number(values.price);
      const exchangeRate = Number(values.exchangeRate);
      const error = form.querySelector(".form-error");
      const existing = values.transactionId ? state.transactions.find((item) => item.id === values.transactionId) : null;

      if (!values.date || !values.reason.trim()) return error.textContent = "日期與交易理由為必填欄位。";
      if (!Number.isFinite(price) || price <= 0) return error.textContent = "價格必須大於 0。";
      if (!["TWD", "USD"].includes(values.currency)) return error.textContent = "幣別目前只能選 TWD 或 USD。";
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return error.textContent = "交易時匯率必須大於 0。";
      if (!Number.isFinite(shares) || shares <= 0) return error.textContent = "股數必須大於 0。";

      const stock = getStock(values.stockId);
      if (!stock) return error.textContent = "找不到對應的股票。";
      const transactionData = {
        id: existing?.id || `transaction-${Date.now()}`,
        stockId: values.stockId,
        ticker: stock.ticker,
        date: values.date,
        type: values.type,
        shares: Number(values.shares),
        price,
        currency: values.currency,
        exchangeRate,
        fxRateAtTrade: exchangeRate,
        fxRateWasMissing: false,
        reason: values.reason.trim(),
        checkingCondition: values.checkingCondition.trim(),
        note: values.note.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        deletedAt: existing?.deletedAt || "",
        editHistory: existing?.editHistory || [],
        journalEntryId: existing?.journalEntryId || ""
      };
      const candidates = state.transactions.filter((item) => item.stockId === values.stockId && item.id !== existing?.id).concat(transactionData);
      const validation = validateAndNormalizeTransactions(candidates);
      if (!validation.valid) return error.textContent = validation.message;
      const normalizedTransaction = validation.normalized.find((item) => item.id === transactionData.id);
      transactionData.shares = normalizedTransaction.shares;
      if (existing) {
        existing.editHistory.push({ updatedAt: transactionData.updatedAt, previousValues: { date: existing.date, type: existing.type, shares: existing.shares, price: existing.price, currency: existing.currency, exchangeRate: existing.exchangeRate, fxRateAtTrade: existing.fxRateAtTrade, reason: existing.reason, note: existing.note }, newValues: { date: transactionData.date, type: transactionData.type, shares: transactionData.shares, price: transactionData.price, currency: transactionData.currency, exchangeRate: transactionData.exchangeRate, fxRateAtTrade: transactionData.fxRateAtTrade, reason: transactionData.reason, note: transactionData.note } });
        Object.assign(existing, transactionData);
      } else state.transactions.push(transactionData);
      addOrUpdatePosition(values.stockId, price, values.currency);
      stock.currency = values.currency;
      if (values.type === "buy") stock.stage = "小額建立部位";
      if (values.type === "exit") stock.stage = "退出";
      stock.lastUpdatedDate = today();
      save("transactions");
      save("watchlistStocks");
      const postTradePosition = calculatePosition(values.stockId);
      const shouldRemoveEmptyPosition = (values.type === "reduce" || values.type === "exit") && postTradePosition.shares <= 0;
      if (shouldRemoveEmptyPosition) {
        investmentRepo.positionRepository.deletePosition(values.stockId);
        save("watchlistStocks");
      }
      closeDialog("transaction-dialog");
      renderAll();
      if (values.createJournal === "on") {
        const savedTransaction = existing || transactionData;
        const entryTypeMap = { buy: "buy", add: "add", reduce: "reduce", exit: "sell" };
        openJournalDialog("", {
          stockId: values.stockId,
          transactionId: shouldRemoveEmptyPosition ? "" : savedTransaction.id,
          date: values.date,
          entryType: entryTypeMap[values.type],
          executionStatus: shouldRemoveEmptyPosition ? "planned" : "executed",
          price,
          quantity: savedTransaction.shares,
          title: `${typeLabels[values.type]}：${values.reason.trim()}`,
          investmentThesis: values.reason.trim() || stock.thesisSummary,
          expectedOutcome: stock.thesisSummary,
          risks: stock.mainRisks,
          invalidationConditions: stock.invalidationConditions || stock.invalidation || "",
          confidence: "",
          followUpReview: values.note.trim()
        });
      }
    }

    function handlePriceSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const price = Number(form.elements.currentPrice.value);
      const currentFx = Number(form.elements.currentFx.value);
      if (!Number.isFinite(price) || price <= 0) {
        form.querySelector(".form-error").textContent = "目前價格必須大於 0。";
        return;
      }
      const stockId = form.elements.stockId.value;
      const stock = getStock(stockId);
      const currency = stock.currency === "USD" ? "USD" : "TWD";
      if (currency === "USD" && (!Number.isFinite(currentFx) || currentFx <= 0)) {
        form.querySelector(".form-error").textContent = "USD 持倉目前估值匯率必須大於 0。";
        return;
      }
      addOrUpdatePosition(stockId, price, currency, currentFx || 1);
      closeDialog("price-dialog");
      renderAll();
    }

    function handleThesisSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const error = form.querySelector(".form-error");
      if (!values.thesisSummary.trim() || !values.changeReason.trim()) return error.textContent = "Current Thesis 與變更原因為必填欄位。";
      const stock = getStock(values.stockId);
      window.ResearchDomain.applyThesisReview(stock, {
        thesisSummary: values.thesisSummary.trim(), thesis: values.thesisSummary.trim(),
        expectedTimeHorizon: values.expectedTimeHorizon.trim() || "尚未設定", catalysts: values.catalysts.trim() || "尚未設定",
        mainRisks: values.mainRisks.trim() || "尚未設定", risk: values.mainRisks.trim() || "尚未設定",
        invalidationConditions: values.invalidationConditions.trim() || "尚未設定", invalidation: values.invalidationConditions.trim() || "尚未設定",
        nextReviewDate: values.nextReviewDate || "", fairPriceRange: values.fairPriceRange.trim() || stock.fairPriceRange,
        thesisStatus: values.thesisStatus, changeReason: values.changeReason.trim(),
        stillValid: values.stillValid, newInformation: values.newInformation.trim()
      }, new Date().toISOString());
      save("watchlistStocks");
      closeDialog("thesis-dialog");
      renderAll();
    }

    function bindFieldEvents() {
      byId("transaction-form").elements.type.addEventListener("change", (event) => updateExitShares(event.currentTarget.form));
      byId("transaction-form").elements.stockId.addEventListener("change", (event) => { updateTransactionCurrency(event.currentTarget.form); updateExitShares(event.currentTarget.form); });
      byId("transaction-form").elements.currency.addEventListener("change", (event) => { event.currentTarget.form.elements.exchangeRate.value = event.currentTarget.value === "TWD" ? 1 : ""; });
      byId("journal-form").elements.stockId.addEventListener("change", (event) => {
        const form = event.currentTarget.form;
        fillTransactionSelect(form.elements.transactionId, form.elements.transactionId.value, event.currentTarget.value);
        fillThesisVersionSelect(form.elements.thesisVersionId, form.elements.thesisVersionId.value, event.currentTarget.value);
      });
    }

    return {
      fillSettingsForm,
      openStockDialog,
      openTransactionDialog,
      openQuickTransaction,
      openSellPosition,
      openEditTransaction,
      openThesisDialog,
      handleSettingsSubmit,
      handleStockSubmit,
      handleDeleteStockSubmit,
      handleTransactionSubmit,
      handlePriceSubmit,
      handleThesisSubmit,
      bindFieldEvents
    };
  }

  return { create };
})();
