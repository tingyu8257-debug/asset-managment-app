(typeof window !== "undefined" ? window : globalThis).InvestmentView = (() => {
  function create({
    state,
    byId,
    escapeHtml,
    typeLabels,
    journalTypeLabels = {},
    executionStatusLabels = {},
    thesisStatusLabels,
    getStock,
    getTransactions,
    calculatePosition,
    getPortfolioSummary,
    formatMoney,
    formatPrice,
    formatPercent,
    researchSystem,
    openDialog
  }) {
    const UNKNOWN_TEXT = "尚未設定";
    const SEPARATOR = " · ";

    const unknown = (value) => {
      if (value === null || value === undefined) return UNKNOWN_TEXT;
      const text = String(value).trim();
      return text ? text : UNKNOWN_TEXT;
    };

    const dateText = (value) => unknown(value ? String(value).slice(0, 10) : "");
    const decisionDomain = window.DecisionDomain;

    function latestJournal(stockId) {
      if (decisionDomain) return decisionDomain.getLatestDecisionForStock(state.journalEntries, state, stockId);
      return state.journalEntries
        .filter((entry) => !entry.isDeleted && entry.stockId === stockId)
        .sort((a, b) => String(b.date || b.updatedAt || "").localeCompare(String(a.date || a.updatedAt || "")))[0] || null;
    }

    function renderWatchlist() {
      const grid = byId("watchlist-grid");
      const search = byId("watchlist-search").value.trim().toLowerCase();
      const stage = byId("watchlist-stage-filter").value;
      const market = byId("watchlist-market-filter").value;
      const industry = byId("watchlist-industry-filter").value;
      const filteredStocks = state.watchlistStocks.filter((stock) => {
        const matchesSearch = !search || String(stock.ticker).toLowerCase().includes(search) || String(stock.companyName).toLowerCase().includes(search);
        return matchesSearch && (stage === "全部階段" || stock.stage === stage) && (market === "全部市場" || stock.market === market) && (industry === "全部產業" || stock.industry === industry);
      });
      grid.innerHTML = filteredStocks.length
        ? filteredStocks.map(renderResearchCard).join("")
        : `<p class="empty-state">目前沒有符合條件的公司，請清除篩選或新增研究標的。</p>`;
    }

    function renderResearchCard(stock) {
      const position = calculatePosition(stock.id);
      const held = position?.shares > 0;
      const status = researchSystem.getResearchStatus({ state, stock, calculatePosition, currentDate: new Date().toISOString().slice(0, 10) });
      const latestDecision = latestJournal(stock.id);
      const latestDecisionText = latestDecision ? `${journalTypeLabels[latestDecision.decisionType] || latestDecision.decisionType}${SEPARATOR}${latestDecision.decisionDate || UNKNOWN_TEXT}${SEPARATOR}${executionStatusLabels[latestDecision.executionStatus] || latestDecision.executionStatus}` : UNKNOWN_TEXT;
      return `<article class="research-card">
        <div class="card-top">
          <div><span class="ticker">${escapeHtml(stock.ticker)}</span><h3>${escapeHtml(stock.companyName)}</h3><p>${escapeHtml(unknown(stock.market))}${SEPARATOR}${escapeHtml(unknown(stock.industry))}${SEPARATOR}${escapeHtml(stock.currency || "TWD")}</p></div>
          <div class="card-status-actions"><span class="badge ${held ? "badge-green" : "badge-blue"}">${escapeHtml(unknown(stock.stage))}</span><span class="badge ${status.severity ? "badge-warning" : "badge-green"}">${escapeHtml(status.statusLabel)}</span></div>
        </div>
        <div class="tag-row">${stock.tags?.length ? stock.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : `<span>尚未設定</span>`}</div>
        <dl class="price-range"><div><dt>Fair Price Range</dt><dd>${escapeHtml(unknown(stock.fairPriceRange))}</dd></div><div><dt>Next Review</dt><dd>${escapeHtml(unknown(stock.nextReviewDate))}</dd></div></dl>
        <div class="research-notes">
          <p><strong>Current Thesis ${SEPARATOR}${escapeHtml(thesisStatusLabels[stock.thesisStatus] || UNKNOWN_TEXT)}</strong>${escapeHtml(unknown(stock.thesisSummary || stock.thesis))}</p>
          <p><strong>Main Risks</strong>${escapeHtml(unknown(stock.mainRisks || stock.risk))}</p>
          <p><strong>Invalidation Conditions</strong>${escapeHtml(unknown(stock.invalidationConditions || stock.invalidation))}</p>
          <p><strong>Research</strong>${status.hasResearch ? "Has research" : "Missing research"}</p>
          <p><strong>Confidence</strong>${escapeHtml(status.confidence ? `${status.confidence}/10` : UNKNOWN_TEXT)}</p>
          <p><strong>Latest Decision</strong>${escapeHtml(latestDecisionText)}</p>
        </div>
        ${renderThesisHistory(stock)}
        <div class="card-footer"><small>Last updated ${escapeHtml(unknown(status.lastUpdated || stock.lastReviewedAt || stock.lastUpdatedDate))}</small><div class="card-actions"><button class="secondary-button" type="button" data-open-company-workspace="${stock.id}">Workspace</button><button class="secondary-button" type="button" data-create-decision="${stock.id}">Create Decision</button><button class="secondary-button" type="button" data-edit-stock="${stock.id}">Edit</button><button class="secondary-button" type="button" data-review-thesis="${stock.id}">Review Thesis</button>${held ? `<span class="badge badge-green">Held ${formatPrice(position?.shares)} shares</span>` : `<button class="secondary-button" type="button" data-initial-position="${stock.id}">Create Position</button>`}<button class="secondary-button danger-button" type="button" data-request-delete-stock="${stock.id}">Delete</button></div></div>
      </article>`;
    }

    function renderThesisHistory(stock) {
      if (!stock.thesisHistory.length) return "";
      return `<details class="history-details"><summary>View Thesis History (${stock.thesisHistory.length})</summary>${stock.thesisHistory.slice().reverse().map((item, reverseIndex) => `<div><strong>Version ${escapeHtml(item.version || stock.thesisHistory.length - reverseIndex)} ? ${escapeHtml(dateText(item.savedAt))} ? ${escapeHtml(thesisStatusLabels[item.thesisStatus] || item.thesisStatus || UNKNOWN_TEXT)}</strong><p>${escapeHtml(unknown(item.thesisSummary))}</p><small>Change reason: ${escapeHtml(unknown(item.changeReason))}</small></div>`).join("")}</details>`;
    }

    function openDeleteStockDialog(stockId) {
      const stock = getStock(stockId);
      const form = byId("delete-stock-form");
      form.reset();
      form.elements.stockId.value = stock.id;
      const relatedTransactions = state.transactions.filter((item) => item.stockId === stockId).length;
      const relatedJournals = state.journalEntries.filter((item) => item.stockId === stockId).length;
      byId("delete-stock-message").textContent = `Delete ${stock.ticker} ? ${stock.companyName}? This will remove ${relatedTransactions} transactions and ${relatedJournals} decision records. Please confirm you have a backup.`;
      form.querySelector(".form-error").textContent = "";
      openDialog("delete-stock-dialog");
    }

    function renderPositions() {
      const summary = getPortfolioSummary();
      const body = byId("positions-body");
      if (!summary.positions.length) {
        body.innerHTML = `<tr><td colspan="10"><p class="empty-state">目前還沒有 Satellite 持倉，請從 Watchlist 建立初始部位。</p></td></tr>`;
        renderTransactionLog();
        return;
      }
      body.innerHTML = summary.positions.map((position) => renderPositionRow(position, summary)).join("");
      renderTransactionLog();
    }

    function renderPositionRow(position, summary) {
      const stock = getStock(position.stockId);
      const latest = latestJournal(position.stockId);
      const plannedDecisions = decisionDomain ? decisionDomain.getPlannedDecisionsForStock(state.journalEntries, state, position.stockId) : [];
      const satelliteWeight = summary.satelliteMarketValue > 0 && position.marketValueBase !== null ? position.marketValueBase / summary.satelliteMarketValue * 100 : null;
      const totalWeight = state.settings.totalPortfolioValue > 0 && position.marketValueBase !== null ? position.marketValueBase / state.settings.totalPortfolioValue * 100 : null;
      const alerts = [];
      if (satelliteWeight > state.settings.maxSingleStockSatellitePercent) alerts.push("集中度偏高");
      if (totalWeight > state.settings.maxSingleStockTotalPercent) alerts.push("需要重新檢查");
      return `<tr>
        <td><span class="ticker">${escapeHtml(stock.ticker)}</span><small>${escapeHtml(stock.companyName)}</small><small>${escapeHtml(position?.currency)} ? ${stock.tags.map(escapeHtml).join(" ? ")}</small><small>Thesis:${escapeHtml(unknown(stock.thesisSummary || stock.thesis))}</small><small>Review Status:${escapeHtml(thesisStatusLabels[stock.thesisStatus] || stock.thesisStatus || UNKNOWN_TEXT)}</small><small>Invalidation:${escapeHtml(unknown(stock.invalidationConditions || stock.invalidation))}</small><small>Latest Decision:${escapeHtml(latest?.title || UNKNOWN_TEXT)}</small><small>Planned Decisions:${plannedDecisions.length}</small></td>
        <td>${formatPrice(position?.shares)}<small>${position.status}</small></td>
        <td>${position?.shares > 0 ? formatMoney(position.averageCostLocal, position?.currency) : UNKNOWN_TEXT}</td>
        <td>${position.currentPriceLocal ? formatMoney(position.currentPriceLocal, position?.currency) : UNKNOWN_TEXT}</td>
        <td>${formatMoney(position.totalCostLocal, position?.currency)}<small>Base:${position.totalCostBase === null ? UNKNOWN_TEXT : formatMoney(position.totalCostBase)}</small></td>
        <td>${position?.marketValueLocal === null ? UNKNOWN_TEXT : formatMoney(position?.marketValueLocal, position?.currency)}<small>Base:${position.marketValueBase === null ? UNKNOWN_TEXT : formatMoney(position.marketValueBase)}</small></td>
        <td class="${position.unrealizedProfitLossLocal >= 0 ? "positive" : "negative"}">${position.unrealizedProfitLossLocal === null ? UNKNOWN_TEXT : formatMoney(position.unrealizedProfitLossLocal, position?.currency)}<small>Base:${position.unrealizedProfitLossBase === null ? UNKNOWN_TEXT : formatMoney(position.unrealizedProfitLossBase)}</small><small>${formatPercent(position.unrealizedReturnPercent)}</small></td>
        <td>${formatPercent(satelliteWeight)}<small>${formatPercent(totalWeight)}</small>${alerts.map((alert) => `<span class="badge badge-warning">${alert}</span>`).join("")}</td>
        <td>${escapeHtml(position.lastTransactionDate || UNKNOWN_TEXT)}</td>
        <td><div class="row-actions"><button class="small-button" data-open-company-workspace="${stock.id}">Workspace</button><button class="small-button" data-create-decision="${stock.id}">Create Decision</button><button class="small-button" data-create-review-for-company="${stock.id}">Add Review</button><button class="small-button" data-add-transaction="${stock.id}">Add Transaction</button><button class="small-button" data-sell-position="${stock.id}">Sell</button><button class="small-button" data-view-transactions="${stock.id}">Transactions</button><button class="small-button" data-edit-price="${stock.id}">Edit Price</button><button class="small-button danger-button" data-delete-position="${stock.id}">Delete</button></div></td>
      </tr>`;
    }

    function renderTransactionLog(stockId) {
      const showDeleted = byId("show-deleted-transactions").checked;
      const transactions = (stockId ? getTransactions(stockId, showDeleted) : state.transactions.filter((transaction) => showDeleted || !transaction.isDeleted)).sort((a, b) => b.date.localeCompare(a.date));
      const stock = stockId ? getStock(stockId) : null;
      byId("transaction-log-title").textContent = stock ? `${stock.ticker} Transaction Log` : "All Transactions";
      byId("transaction-log").innerHTML = transactions.length ? transactions.map(renderTransactionItem).join("") : `<p class="empty-state">目前沒有紀錄。</p>`;
    }

    function renderTransactionItem(transaction) {
      const transactionStock = getStock(transaction.stockId);
      const position = calculatePosition(transaction.stockId);
      const result = position.transactionResults[transaction.id];
      const hasJournal = transaction.journalEntryId && state.journalEntries.some((entry) => entry.id === transaction.journalEntryId && !entry.isDeleted);
      const realized = result?.realizedProfitLossLocal === null || !result ? "尚未實現" : `Realized:${formatMoney(result.realizedProfitLossLocal, transaction.currency)} / Base ${formatMoney(result.realizedProfitLossBase)} / ${formatPercent(result.realizedReturnPercent)}`;
      const exchangeRate = transaction.exchangeRate ?? transaction.fxRateAtTrade;
      return `<div class="${transaction.isDeleted ? "deleted-record" : ""}"><span>${escapeHtml(transaction.date)} ? ${escapeHtml(transactionStock?.ticker || transaction.ticker || UNKNOWN_TEXT)} ? ${escapeHtml(transaction.currency)} ${transaction.isDeleted ? "? Deleted" : ""}</span><strong>${escapeHtml(typeLabels[transaction.type] || transaction.type)} ${formatPrice(transaction.shares)} shares</strong><small>${formatMoney(transaction.price, transaction.currency)} ? Exchange Rate ${Number.isFinite(Number(exchangeRate)) ? formatPrice(Number(exchangeRate)) : UNKNOWN_TEXT} ? ${escapeHtml(transaction.reason)}</small><p>${realized}</p>${transaction.fxRateWasMissing ? `<p class="danger-text">Legacy data is missing exchangeRate. Please edit the transaction to add it.</p>` : ""}${transaction.checkingCondition ? `<p>Checking condition: ${escapeHtml(transaction.checkingCondition)}</p>` : ""}${transaction.note ? `<p>Note: ${escapeHtml(transaction.note)}</p>` : ""}<div class="record-actions">${hasJournal ? `<span class="badge badge-green">Has Decision</span>` : ""}<button class="small-button" data-edit-transaction="${transaction.id}">Edit</button><button class="small-button danger-button" data-delete-transaction="${transaction.id}">Delete</button></div></div>`;
    }

    function getResearchDashboardQuery() {
      return {
        keyword: byId("research-dashboard-search").value,
        status: byId("research-dashboard-status-filter").value,
        position: byId("research-dashboard-position-filter").value,
        tag: byId("research-dashboard-tag-filter").value,
        confidenceMin: byId("research-dashboard-confidence-filter").value,
        nextReviewFrom: byId("research-dashboard-review-from").value,
        nextReviewTo: byId("research-dashboard-review-to").value,
        sortBy: byId("research-dashboard-sort-by").value,
        sortDirection: byId("research-dashboard-sort-direction").value
      };
    }

    function renderResearchDashboard() {
      const container = byId("research-dashboard-content");
      if (!container) return;
      const dashboard = researchSystem.buildResearchDashboard({ state, calculatePosition, currentDate: new Date().toISOString().slice(0, 10), query: getResearchDashboardQuery() });
      const decisionSummary = decisionDomain ? decisionDomain.buildSummary(state, calculatePosition) : null;
      const reviewSummary = window.ReviewDomain ? window.ReviewDomain.buildDashboard(state, new Date().toISOString().slice(0, 10)) : null;
      renderResearchDashboardSummary(dashboard);
      container.innerHTML = `
        ${renderResearchQualityPanel(dashboard)}
        ${decisionSummary ? renderDecisionSummaryPanel(decisionSummary) : ""}
        ${reviewSummary ? renderReviewLearningPanel(reviewSummary) : ""}
        <article class="panel"><div class="panel-heading"><div><p class="panel-label">RESEARCH LIST</p><h2>Companies (${dashboard.filteredStatuses.length}/${dashboard.statuses.length})</h2></div></div>${renderResearchStatusList(dashboard.filteredStatuses)}</article>
        <div class="dashboard-grid dashboard-lower-grid">
          ${renderDecisionPanel("Recent Decisions", dashboard.recentDecisions)}
          ${renderThesisUpdatePanel("Recent Thesis Updates", dashboard.recentThesisUpdates)}
        </div>`;
    }

    function renderResearchDashboardSummary(dashboard) {
      const query = getResearchDashboardQuery();
      const active = [
        query.keyword && `Search: ${query.keyword.trim()}`,
        query.status !== "all" && `Status: ${query.status}`,
        query.position !== "all" && `Position: ${query.position}`,
        query.tag && `Tag: ${query.tag.trim()}`,
        query.confidenceMin && `Confidence = ${query.confidenceMin}`,
        query.nextReviewFrom && `From ${query.nextReviewFrom}`,
        query.nextReviewTo && `To ${query.nextReviewTo}`
      ].filter(Boolean);
      byId("research-dashboard-filter-summary").innerHTML = `<span>${dashboard.filteredStatuses.length} results</span>${active.length ? active.map((item) => `<span class="badge badge-blue">${escapeHtml(item)}</span>`).join("") : `<span class="badge">No filters</span>`}`;
    }

    function renderResearchQualityPanel(dashboard) {
      const issues = [
        ...dashboard.duplicateSymbols.map((item) => `Duplicate symbol: ${item.symbol} (${item.items.length})`),
        ...dashboard.orphanReferences.map((item) => item.message)
      ];
      return `<article class="panel"><div class="panel-heading"><div><p class="panel-label">DATA QUALITY</p><h2>Data Quality Check</h2></div></div>${issues.length ? `<div class="alert-list">${issues.map((issue) => `<div class="alert-box"><span class="alert-icon">!</span><p>${escapeHtml(issue)}</p></div>`).join("")}</div>` : `<p class="empty-state">No duplicate symbol or broken reference found.</p>`}</article>`;
    }

    function renderDecisionSummaryPanel(summary) {
      const stat = (label, count) => `<article class="stat-card"><p>${escapeHtml(label)}</p><strong>${count}</strong><span>Decision Log</span></article>`;
      const warningItems = [
        ...summary.positionsWithoutRecentDecision.map((position) => {
          const stock = getStock(position.stockId);
          return `${stock?.ticker || position.stockId} ? Position without recent decision`;
        }),
        ...summary.watchlistWithoutThesis.map((stock) => `${stock.ticker} ? Watchlist without thesis`)
      ];
      return `<article class="panel">
        <div class="panel-heading"><div><p class="panel-label">DECISION SYSTEM</p><h2>Investment Decision Summary</h2></div></div>
        <div class="stat-grid dashboard-row-three">
          ${stat("Recent", summary.recent.length)}
          ${stat("Planned", summary.planned.length)}
          ${stat("Awaiting Execution", summary.awaitingExecution.length)}
          ${stat("Executed", summary.executed.length)}
          ${stat("Thesis Updates", summary.thesisUpdates.length)}
        </div>
        ${warningItems.length ? `<div class="alert-list">${warningItems.slice(0, 8).map((item) => `<div class="alert-box"><span class="alert-icon">!</span><p>${escapeHtml(item)}</p></div>`).join("")}</div>` : `<p class="empty-state">目前沒有紀錄。</p>`}
      </article>`;
    }

    function renderReviewLearningPanel(summary) {
      const itemList = (items, emptyText, renderer) => items.length
        ? items.slice(0, 6).map(renderer).join("")
        : `<p class="empty-state">${escapeHtml(emptyText)}</p>`;
      const common = (items) => itemList(items, "目前沒有紀錄。", (item) => `<div class="balance-row"><strong>${escapeHtml(item.label)}</strong><small>${item.count} times</small></div>`);
      return `<article class="panel">
        <div class="panel-heading"><div><p class="panel-label">REVIEW & LESSONS</p><h2>Review & Lessons Summary</h2></div><a class="small-button" href="#reviews">Open Reviews</a></div>
        <div class="stat-grid dashboard-row-three">
          <article class="stat-card"><p>Pending Reviews</p><strong>${summary.pendingReviews.length}</strong><span>Decisions waiting for review</span></article>
          <article class="stat-card"><p>Recent Reviews</p><strong>${summary.recentReviews.length}</strong><span>Latest reviews</span></article>
          <article class="stat-card"><p>Recent Lessons</p><strong>${summary.recentLessons.length}</strong><span>Latest lessons</span></article>
        </div>
        <div class="dashboard-grid dashboard-lower-grid">
          <div><h3>Pending Reviews</h3>${itemList(summary.pendingReviews, "No pending Decision reviews.", (entry) => `<div class="balance-row"><strong>${escapeHtml(entry.ticker || "Unlinked")} ? ${escapeHtml(entry.title || "Decision")}</strong><small>${escapeHtml(entry.nextReviewDate || entry.decisionDate || UNKNOWN_TEXT)}</small><div class="record-actions"><button class="small-button" data-create-review-for-decision="${entry.id}">Create Review</button></div></div>`)}</div>
          <div><h3>Due Reminders</h3>${itemList(summary.dueReviewReminders, "No due review reminders.", (review) => `<div class="balance-row"><strong>${escapeHtml(review.ticker || "Unlinked")} ? ${escapeHtml(review.reviewType)}</strong><small>${escapeHtml(review.reminderDate)}</small><div class="record-actions"><button class="small-button" data-edit-review="${review.id}">Open Review</button></div></div>`)}</div>
          <div><h3>Most Common Mistakes</h3>${common(summary.mostCommonMistakes)}</div>
          <div><h3>Most Common Successes</h3>${common(summary.mostCommonSuccesses)}</div>
        </div>
      </article>`;
    }

    function renderResearchStatusList(items) {
      if (!items.length) return `<p class="empty-state">No matching Company. Try Clear All Filters.</p>`;
      return `<div class="research-list-strip">${items.map((item) => {
        const stock = item.stock;
        const positionText = Number(item.position?.shares) > 0 ? `Has Position ? ${formatPrice(item.position?.shares)} shares` : "No Position";
        const days = item.daysSinceLastUpdate === Infinity ? UNKNOWN_TEXT : `${item.daysSinceLastUpdate} days`;
        return `<div class="asset-card research-result-card">
          <div class="asset-card-header"><div><span class="ticker">${escapeHtml(stock.ticker)}</span><h3>${escapeHtml(stock.companyName)}</h3><p>${escapeHtml(unknown(stock.stage))} ? ${escapeHtml(positionText)}</p></div><span class="badge ${item.severity ? "badge-warning" : "badge-green"}">${escapeHtml(item.statusLabel)}</span></div>
          <dl class="asset-facts"><div><dt>Last Updated</dt><dd>${escapeHtml(dateText(item.lastUpdated))}</dd></div><div><dt>Next Review</dt><dd>${escapeHtml(unknown(item.nextReviewDate))}</dd></div><div><dt>Days Since</dt><dd>${escapeHtml(days)}</dd></div><div><dt>Confidence</dt><dd>${escapeHtml(item.confidence ? `${item.confidence}/10` : UNKNOWN_TEXT)}</dd></div></dl>
          <p>${escapeHtml(unknown(stock.thesisSummary || stock.thesis))}</p>
          ${stock.tags?.length ? `<div class="tag-row">${stock.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
          ${item.reviewStatus.length ? `<p class="danger-text">${escapeHtml(item.reviewStatus.join(";"))}</p>` : ""}
          <div class="record-actions"><button class="small-button" data-open-company-workspace="${stock.id}">Open Workspace</button><button class="small-button" data-create-decision="${stock.id}">Create Decision</button><button class="small-button" data-create-review-for-company="${stock.id}">Add Review</button></div>
        </div>`;
      }).join("")}</div>`;
    }

    function renderDecisionPanel(title, entries) {
      return `<article class="panel"><div class="panel-heading"><div><p class="panel-label">${escapeHtml(title)}</p><h2>Recent Decisions</h2></div></div><div class="asset-list">${entries.length ? entries.map((entry) => `<details class="timeline-item"><summary><strong>${escapeHtml(entry.date || UNKNOWN_TEXT)} ? ${escapeHtml(entry.ticker || UNKNOWN_TEXT)} ? ${escapeHtml(entry.entryType || "review")}</strong><span>${escapeHtml(entry.title || UNKNOWN_TEXT)}</span></summary><p>${escapeHtml(entry.investmentThesis || entry.thesis || entry.summary || UNKNOWN_TEXT)}</p>${entry.stockId ? `<div class="record-actions"><button class="small-button" data-open-company-workspace="${entry.stockId}">Workspace</button></div>` : ""}</details>`).join("") : `<p class="empty-state">尚未設定</p>`}</div></article>`;
    }

    function renderThesisUpdatePanel(title, updates) {
      return `<article class="panel"><div class="panel-heading"><div><p class="panel-label">${escapeHtml(title)}</p><h2>Thesis Versions</h2></div></div><div class="asset-list">${updates.length ? updates.map((item) => `<div class="asset-card"><strong>${escapeHtml(item.stock.ticker)}  ? Version ${escapeHtml(item.version)}</strong><p>${escapeHtml(dateText(item.savedAt))} ? ${escapeHtml(unknown(item.changeReason))}</p><div class="record-actions"><button class="small-button" data-open-company-workspace="${item.stock.id}">Workspace</button></div></div>`).join("") : `<p class="empty-state">No Thesis updates yet.</p>`}</div></article>`;
    }

    function openCompanyWorkspace(stockId, mode = "view", message = "") {
      const workspace = researchSystem.buildCompanyWorkspace({ state, stockId, calculatePosition });
      if (!workspace) {
        byId("company-workspace-title").textContent = "Company not found";
        byId("company-workspace-content").innerHTML = `<p class="empty-state">找不到對應的研究資料。</p>`;
        openDialog("company-workspace-dialog");
        return;
      }
      const { stock, position, journals, transactions, thesisHistory, status } = workspace;
      byId("company-workspace-title").textContent = `${stock.ticker}${SEPARATOR}${stock.companyName}`;
      byId("company-workspace-message").textContent = message || "";
      byId("company-workspace-content").innerHTML = `
        <div class="workspace-mode-bar">
          <div><span class="badge ${status.severity ? "badge-warning" : "badge-green"}">${escapeHtml(status.statusLabel)}</span><span class="badge">${Number(position?.shares) > 0 ? "Has Position" : "No Position"}</span><span class="badge">On Watchlist</span></div>
          <div class="record-actions"><a class="small-button" href="#research-dashboard">Research Dashboard</a><button class="small-button" type="button" data-workspace-edit="${stock.id}">Edit</button></div>
        </div>
        <div data-workspace-view ${mode === "edit" ? "hidden" : ""}>${renderWorkspaceView(workspace)}</div>
        <form class="workspace-edit-form" data-workspace-form ${mode === "edit" ? "" : "hidden"}>
          <input name="stockId" type="hidden" value="${escapeHtml(stock.id)}">
          <div class="form-grid">
            ${workspaceInput("ticker", "Symbol *", stock.ticker, "input")}
            ${workspaceInput("companyName", "Company Name *", stock.companyName, "input")}
            ${workspaceInput("market", "Market", stock.market, "input")}
            ${workspaceInput("industry", "Industry", stock.industry, "input")}
            ${workspaceInput("stage", "Watchlist Status", stock.stage, "input")}
            ${workspaceInput("tags", "Tags", (stock.tags || []).join(", "), "input", "field-wide")}
            ${workspaceInput("businessOverview", "Business Overview", stock.businessOverview, "textarea", "field-wide")}
            ${workspaceInput("thesis", "Investment Thesis *", stock.thesisSummary || stock.thesis, "textarea", "field-wide")}
            ${workspaceInput("growthDrivers", "Growth Drivers", stock.growthDrivers, "textarea", "field-wide")}
            ${workspaceInput("competitiveAdvantages", "Competitive Advantages", stock.competitiveAdvantages, "textarea", "field-wide")}
            ${workspaceInput("catalysts", "Catalysts", stock.catalysts, "textarea", "field-wide")}
            ${workspaceInput("risk", "Main Risks *", stock.mainRisks || stock.risk, "textarea", "field-wide")}
            ${workspaceInput("invalidation", "Invalidation Conditions *", stock.invalidationConditions || stock.invalidation, "textarea", "field-wide")}
            ${workspaceInput("valuationNotes", "Valuation Notes", stock.valuationNotes, "textarea", "field-wide")}
            ${workspaceInput("sources", "Sources", Array.isArray(stock.sources) ? stock.sources.join("\\n") : stock.sources, "textarea", "field-wide")}
            ${workspaceInput("researchNotes", "Notes", stock.researchNotes, "textarea", "field-wide")}
            ${workspaceInput("fairPriceRange", "Fair Price Range", stock.fairPriceRange, "input")}
            ${workspaceInput("nextReviewDate", "Next Review Date", stock.nextReviewDate, "date")}
            ${workspaceInput("lastUpdatedDate", "Last Updated Date", stock.lastUpdatedDate, "date")}
          </div>
          <p class="form-error" aria-live="polite"></p>
          <div class="dialog-actions"><button class="text-button" type="button" data-workspace-cancel="${stock.id}">Cancel</button><button class="primary-button" type="button" data-workspace-save="${stock.id}">Save</button></div>
        </form>`;
      openDialog("company-workspace-dialog");
    }

    function workspaceInput(name, label, value, type, extraClass = "") {
      if (type === "textarea") return `<label class="field ${extraClass}"><span>${escapeHtml(label)}</span><textarea name="${name}">${escapeHtml(value || "")}</textarea></label>`;
      return `<label class="field ${extraClass}"><span>${escapeHtml(label)}</span><input name="${name}" type="${type}" value="${escapeHtml(value || "")}"></label>`;
    }

    function renderWorkspaceView(workspace) {
      const { stock, position, journals, transactions, thesisHistory, status } = workspace;
      return `
        <div class="workspace-grid">
          <article class="asset-card"><p class="panel-label">OVERVIEW</p><h3>${escapeHtml(stock.companyName)}</h3><p>${escapeHtml(unknown(stock.market))} ? ${escapeHtml(unknown(stock.industry))} ? ${escapeHtml(stock.currency || "TWD")}</p><div class="tag-row">${stock.tags?.length ? stock.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : `<span>尚未設定</span>`}</div></article>
          <article class="asset-card"><p class="panel-label">POSITION</p><h3>${formatPrice(position?.shares || 0)} shares</h3><p>Market Value:${position?.marketValueLocal === null ? UNKNOWN_TEXT : formatMoney(position?.marketValueLocal || 0, position?.currency || stock.currency)}</p></article>
        </div>
        <article class="asset-card"><p class="panel-label">RESEARCH</p><h3>Investment Research</h3>${renderWorkspaceText("Business Overview", stock.businessOverview)}${renderWorkspaceText("Investment Thesis", stock.thesisSummary || stock.thesis)}${renderWorkspaceText("Growth Drivers", stock.growthDrivers)}${renderWorkspaceText("Competitive Advantages", stock.competitiveAdvantages)}${renderWorkspaceText("Risks", stock.mainRisks || stock.risk)}${renderWorkspaceText("Catalysts", stock.catalysts)}${renderWorkspaceText("Valuation Notes", stock.valuationNotes)}${renderWorkspaceText("Sources", Array.isArray(stock.sources) ? stock.sources.join("\\n") : stock.sources)}${renderWorkspaceText("Notes", stock.researchNotes)}</article>
        <article class="asset-card"><p class="panel-label">CURRENT THESIS</p><h3>${escapeHtml(thesisStatusLabels[stock.thesisStatus] || stock.thesisStatus || UNKNOWN_TEXT)}</h3><p>${escapeHtml(unknown(stock.thesisSummary || stock.thesis))}</p><p><strong>Invalidation Conditions:</strong>${escapeHtml(unknown(stock.invalidationConditions || stock.invalidation))}</p><p><strong>Next Review:</strong>${escapeHtml(unknown(stock.nextReviewDate))}</p><p><strong>Days Since Last Update:</strong>${status.daysSinceLastUpdate === Infinity ? UNKNOWN_TEXT : status.daysSinceLastUpdate}</p>${status.isOutdated ? `<p class="danger-text">Research may be outdated. Please review and update it manually.</p>` : ""}<div class="record-actions"><button class="small-button" data-review-thesis="${stock.id}">Review Thesis</button><button class="small-button" data-create-decision="${stock.id}">Create Decision</button><button class="small-button" data-create-review-for-company="${stock.id}">Add Review</button></div></article>
        <article class="asset-card"><p class="panel-label">DECISION TIMELINE</p><h3>Decision History</h3>${renderWorkspaceDecisionTimeline(journals)}</article>
        <article class="asset-card"><p class="panel-label">DECISION REVIEWS</p><h3>Review History</h3>${renderWorkspaceInvestmentReviews(stock.id)}</article>
        <article class="asset-card"><p class="panel-label">LESSONS LEARNED</p><h3>Lessons / Mistakes / Successes</h3>${renderWorkspaceLessons(stock.id)}</article>
        <article class="asset-card"><p class="panel-label">LEGACY REVIEW NOTES</p><h3>Journal Review Notes</h3>${workspace.reviews.length ? workspace.reviews.map((entry) => `<div class="balance-row"><strong>${escapeHtml(entry.date || UNKNOWN_TEXT)} ? ${escapeHtml(entry.title || "Review")}</strong><small>${escapeHtml(entry.reviewType || UNKNOWN_TEXT)} ? Thesis Valid ${escapeHtml(entry.thesisStillValid || UNKNOWN_TEXT)}</small><p>${escapeHtml(entry.reviewNotes || entry.followUpReview || UNKNOWN_TEXT)}</p></div>`).join("") : `<p class="empty-state">No legacy review notes yet.</p>`}</article>
        <article class="asset-card"><p class="panel-label">TRANSACTIONS</p><h3>Transactions</h3>${transactions.length ? transactions.map((transaction) => `<div class="balance-row"><strong>${escapeHtml(transaction.date)} ? ${escapeHtml(typeLabels[transaction.type] || transaction.type)}</strong><small>${formatPrice(transaction.shares)} shares ? ${formatMoney(transaction.price, transaction.currency)}</small><p>${escapeHtml(transaction.reason || UNKNOWN_TEXT)}</p></div>`).join("") : `<p class="empty-state">No transactions yet. Decisions do not change Position; only Transactions do.</p>`}</article>
        <article class="asset-card"><p class="panel-label">THESIS HISTORY</p><h3>Thesis Versions</h3>${thesisHistory.length ? thesisHistory.slice().reverse().map((item) => `<div class="balance-row"><strong>Version ${escapeHtml(item.version)} ? ${escapeHtml(dateText(item.savedAt))}</strong><small>${escapeHtml(unknown(item.changeReason))}</small><p>${escapeHtml(unknown(item.thesisSummary))}</p></div>`).join("") : `<p class="empty-state">No Thesis history yet.</p>`}</article>`;
    }

    function renderWorkspaceText(label, value) {
      return `<p><strong>${escapeHtml(label)}:</strong>${escapeHtml(unknown(value))}</p>`;
    }

    function renderWorkspaceInvestmentReviews(stockId) {
      const reviews = window.ReviewDomain
        ? window.ReviewDomain.filterReviews(state.investmentReviews || [], state, { companyId: stockId })
        : [];
      return reviews.length ? reviews.map((review) => `<div class="balance-row">
        <strong>${escapeHtml(review.reviewDate)} ? ${escapeHtml(review.reviewType)}</strong>
        <small>Outcome ${escapeHtml(review.outcome)} ? Reminder ${escapeHtml(review.reminderDate || UNKNOWN_TEXT)}</small>
        <p>${escapeHtml(review.lessonsLearned || review.nextImprovement || review.notes || UNKNOWN_TEXT)}</p>
        <div class="record-actions"><button class="small-button" data-edit-review="${review.id}">Open Review</button><button class="small-button" data-create-lesson-from-review="${review.id}">Create Lesson</button></div>
      </div>`).join("") : `<p class="empty-state">No Decision Reviews yet.</p>`;
    }

    function renderWorkspaceLessons(stockId) {
      const lessons = window.ReviewDomain
        ? window.ReviewDomain.filterLessons(state.investmentLessons || [], state, { companyId: stockId })
        : [];
      return lessons.length ? lessons.map((lesson) => `<div class="balance-row">
        <strong>${escapeHtml(lesson.title || "Lesson")}</strong>
        <small>${escapeHtml(lesson.kind)} ? ${escapeHtml(lesson.category)} ? ${escapeHtml(lesson.importance)}</small>
        <p>${escapeHtml(lesson.description || UNKNOWN_TEXT)}</p>
      </div>`).join("") : `<p class="empty-state">No Lessons yet.</p>`;
    }

    function renderWorkspaceDecisionTimeline(journals) {
      const entries = decisionDomain
        ? journals.map((entry) => decisionDomain.normalizeDecision(entry, state)).filter((entry) => !entry.isArchived)
        : journals;
      return entries.length ? entries.map((entry) => {
        const transaction = entry.transactionId ? state.transactions.find((item) => item.id === entry.transactionId) : null;
        return `<details class="timeline-item">
          <summary><strong>${escapeHtml(entry.decisionDate || entry.date || UNKNOWN_TEXT)} ? ${escapeHtml(journalTypeLabels[entry.decisionType || entry.entryType] || entry.decisionType || entry.entryType || "review")}</strong><span>${escapeHtml(entry.title || UNKNOWN_TEXT)} ? ${escapeHtml(executionStatusLabels[entry.executionStatus] || entry.executionStatus || UNKNOWN_TEXT)}</span></summary>
          <p>${escapeHtml(entry.reason || entry.investmentThesis || entry.thesis || entry.summary || UNKNOWN_TEXT)}</p>
          <p>Risks:${escapeHtml(entry.risks || UNKNOWN_TEXT)}</p>
          <p>Transaction:${escapeHtml(transaction ? `${transaction.date} ? ${typeLabels[transaction.type] || transaction.type}` : UNKNOWN_TEXT)}</p>
        </details>`;
      }).join("") : `<p class="empty-state">尚未設定 Decision Journal?</p>`;
    }

    return {
      renderResearchDashboard,
      renderWatchlist,
      openDeleteStockDialog,
      openCompanyWorkspace,
      renderPositions,
      renderTransactionLog
    };
  }

  return { create };
})();

