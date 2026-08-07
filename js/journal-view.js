(function (root) {
  root.JournalView = (() => {
    function create(ctx) {
      const { state, byId, journalTypeLabels, executionStatusLabels, escapeHtml, today, openDialog } = ctx;
      const decisionDomain = root.DecisionDomain;

      function unknown(value) {
        if (value === null || value === undefined) return "尚未設定";
        const text = String(value).trim();
        return text ? text : "尚未設定";
      }

      function fillStockSelect(select, selectedStockId, allowEmpty = true) {
        const emptyOption = allowEmpty ? `<option value="">不連結股票</option>` : "";
        select.innerHTML = emptyOption + state.watchlistStocks
          .map((stock) => `<option value="${stock.id}">${escapeHtml(stock.ticker)} · ${escapeHtml(stock.companyName)}</option>`)
          .join("");
        select.value = selectedStockId || "";
      }

      function mapTransactionType(type) {
        if (type === "add") return "add";
        if (type === "reduce") return "reduce";
        if (type === "exit") return "sell";
        return "buy";
      }

      function fillTransactionSelect(select, selectedTransactionId, stockId = "") {
        const transactions = state.transactions
          .filter((transaction) => !transaction.isDeleted)
          .filter((transaction) => !stockId || transaction.stockId === stockId)
          .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
        select.innerHTML = `<option value="">不連結交易</option>${transactions.map((transaction) => {
          const stock = state.watchlistStocks.find((item) => item.id === transaction.stockId);
          const typeLabel = journalTypeLabels[mapTransactionType(transaction.type)] || transaction.type;
          return `<option value="${transaction.id}">${escapeHtml(transaction.date || "尚未設定")} · ${escapeHtml(stock?.ticker || transaction.ticker || "尚未設定")} · ${escapeHtml(typeLabel)}</option>`;
        }).join("")}`;
        select.value = selectedTransactionId || "";
      }

      function fillThesisVersionSelect(select, selectedVersionId, stockId = "") {
        const stock = state.watchlistStocks.find((item) => item.id === stockId);
        const options = stock ? decisionDomain.getThesisVersionOptions(stock) : [];
        select.innerHTML = `<option value="">不連結 Thesis 版本</option>${options.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}`;
        select.value = selectedVersionId || "";
      }

      function applyDecisionTemplate(form, options = {}) {
        const template = decisionDomain.getDecisionTemplate(form.elements.entryType.value);
        const visibleFields = new Set(template.fields || []);
        const description = byId("decision-template-description");
        if (description) description.textContent = template.description || "";
        Array.from(form.elements).forEach((element) => {
          if (!element.name || ["journalId", "researchId"].includes(element.name)) return;
          const wrapper = element.closest(".field");
          if (!wrapper) return;
          const shouldShow = visibleFields.has(element.name);
          wrapper.hidden = !shouldShow;
          element.required = shouldShow && (template.required || []).includes(element.name);
          const label = wrapper.querySelector("span");
          if (label) {
            if (!label.dataset.defaultLabel) label.dataset.defaultLabel = label.textContent;
            label.textContent = template.labels?.[element.name] || label.dataset.defaultLabel;
          }
          if ("placeholder" in element) {
            if (!element.dataset.defaultPlaceholder) element.dataset.defaultPlaceholder = element.getAttribute("placeholder") || "";
            element.setAttribute("placeholder", template.placeholders?.[element.name] || element.dataset.defaultPlaceholder);
          }
          if (options.applyDefaults && !element.value && template.defaults?.[element.name] !== undefined) {
            element.value = template.defaults[element.name];
          }
        });
      }
      function renderJournalFilters() {
        const stockFilter = byId("journal-stock-filter");
        const selectedStock = stockFilter.value;
        stockFilter.innerHTML = `<option value="">全部股票</option>${state.watchlistStocks.map((stock) => `<option value="${stock.id}">${escapeHtml(stock.ticker)}</option>`).join("")}`;
        stockFilter.value = selectedStock;

        const typeFilter = byId("journal-type-filter");
        const selectedType = typeFilter.value;
        typeFilter.innerHTML = `<option value="">全部類型</option>${decisionDomain.DECISION_TYPES.map((type) => `<option value="${type}">${escapeHtml(journalTypeLabels[type] || type)}</option>`).join("")}`;
        typeFilter.value = selectedType;

        const statusFilter = byId("journal-execution-filter");
        const selectedStatus = statusFilter.value;
        statusFilter.innerHTML = `<option value="">全部狀態</option>${decisionDomain.EXECUTION_STATUSES.map((status) => `<option value="${status}">${escapeHtml(executionStatusLabels[status] || status)}</option>`).join("")}`;
        statusFilter.value = selectedStatus;
      }

      function getJournalQuery() {
        return {
          keyword: byId("journal-search").value,
          companyId: byId("journal-stock-filter").value,
          type: byId("journal-type-filter").value,
          executionStatus: byId("journal-execution-filter").value,
          tag: byId("journal-tag-filter").value,
          hasTransaction: byId("journal-transaction-filter").value,
          dateFrom: byId("journal-date-from").value,
          dateTo: byId("journal-date-to").value,
          sortBy: byId("journal-sort").value,
          includeArchived: byId("journal-show-archived").checked
        };
      }

      function renderJournal() {
        renderJournalFilters();
        const entries = decisionDomain.filterAndSortDecisions(state.journalEntries, state, getJournalQuery());
        byId("journal-list").innerHTML = entries.length
          ? entries.map(renderDecisionEntry).join("")
          : `<p class="empty-state">目前沒有符合條件的投資決策紀錄。</p>`;
      }

      function renderDecisionEntry(entry) {
        const relatedTransaction = entry.transactionId ? state.transactions.find((transaction) => transaction.id === entry.transactionId) : null;
        const comparison = decisionDomain.comparePlannedExecuted(entry, relatedTransaction);
        const thesisLabel = getThesisLabel(entry);
        return `<article class="journal-entry ${entry.isArchived ? "deleted-record" : ""}">
          <div class="journal-date"><strong>${escapeHtml(entry.ticker || "未連結")}</strong><span>${escapeHtml(entry.decisionDate || "尚未設定")}</span></div>
          <div class="journal-content">
            <div class="entry-heading">
              <div>
                <span class="badge badge-blue">${escapeHtml(journalTypeLabels[entry.decisionType] || entry.decisionType)}</span>
                <span class="badge ${entry.executionStatus === "executed" ? "badge-green" : "badge-warning"}">${escapeHtml(executionStatusLabels[entry.executionStatus] || entry.executionStatus)}</span>
                ${entry.transactionId ? `<span class="badge badge-green">已連結交易</span>` : ""}
                ${entry.isArchived ? `<span class="badge badge-warning">已封存</span>` : ""}
              </div>
              <span>Confidence ${entry.confidence ? `${entry.confidence}/10` : "尚未設定"}</span>
            </div>
            <h3>${escapeHtml(entry.title)}</h3>
            <p><strong>Company：</strong>${escapeHtml(entry.companyName || entry.ticker || "未連結股票")}</p>
            <p><strong>Investment Thesis / Why：</strong>${escapeHtml(unknown(entry.reason || entry.investmentThesis))}</p>
            <p><strong>Supporting Evidence：</strong>${escapeHtml(unknown(entry.supportingEvidence))}</p>
            <p><strong>Expected Outcome：</strong>${escapeHtml(unknown(entry.expectedOutcome))}</p>
            <p><strong>Risks：</strong>${escapeHtml(unknown(entry.risks))}</p>
            <p><strong>Invalidation Conditions：</strong>${escapeHtml(unknown(entry.invalidationConditions))}</p>
            <p><strong>Planned Action：</strong>${escapeHtml(unknown(entry.plannedAction))}</p>
            <p><strong>Thesis Version：</strong>${escapeHtml(thesisLabel)}</p>
            <div class="comparison-grid">
              <div><strong>Planned</strong><span>Price ${escapeHtml(unknown(entry.price))}</span><span>Quantity ${escapeHtml(unknown(entry.quantity))}</span><span>Holding ${escapeHtml(unknown(entry.expectedHoldingPeriod))}</span></div>
              <div><strong>Executed</strong><span>${escapeHtml(comparison.statusText)}</span><span>Price ${escapeHtml(unknown(comparison.executedPrice))}</span><span>Quantity ${escapeHtml(unknown(comparison.executedQuantity))}</span></div>
            </div>
            ${entry.expectedReturn ? `<p><strong>Expected Return：</strong>${escapeHtml(entry.expectedReturn)}</p>` : ""}
            ${entry.notes ? `<p><strong>Notes：</strong>${escapeHtml(entry.notes)}</p>` : ""}
            ${entry.tags.length ? `<div class="tag-row">${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
            <div class="record-actions">
              ${entry.companyId ? `<button class="small-button" data-open-company-workspace="${entry.companyId}">Company Workspace</button>` : ""}
              <button class="small-button" data-create-review-for-decision="${entry.id}">Create Review</button>
              <button class="small-button" data-edit-journal="${entry.id}">編輯</button>
              ${entry.transactionId ? `<button class="small-button" data-unlink-decision-transaction="${entry.id}">取消交易連結</button>` : ""}
              ${entry.isArchived ? `<button class="small-button" data-restore-journal="${entry.id}">還原</button>` : `<button class="small-button danger-button" data-archive-journal="${entry.id}">封存</button>`}
            </div>
          </div>
        </article>`;
      }

      function getThesisLabel(entry) {
        if (!entry.thesisVersionId) return "尚未連結";
        const stock = state.watchlistStocks.find((item) => item.id === entry.companyId);
        return decisionDomain.getThesisVersionOptions(stock).find((item) => item.id === entry.thesisVersionId)?.label || entry.thesisVersionId;
      }

      function openJournalDialog(entryId, preset = {}) {
        const form = byId("journal-form");
        form.reset();
        const entry = state.journalEntries.find((item) => item.id === entryId);
        const values = decisionDomain.normalizeDecision(entry || preset, state);
        fillStockSelect(form.elements.stockId, values.companyId, true);
        fillTransactionSelect(form.elements.transactionId, values.transactionId, values.companyId);
        fillThesisVersionSelect(form.elements.thesisVersionId, values.thesisVersionId, values.companyId);
        form.elements.entryType.innerHTML = decisionDomain.DECISION_TYPES.map((type) => `<option value="${type}">${escapeHtml(journalTypeLabels[type] || type)}</option>`).join("");
        form.elements.executionStatus.innerHTML = decisionDomain.EXECUTION_STATUSES.map((status) => `<option value="${status}">${escapeHtml(executionStatusLabels[status] || status)}</option>`).join("");
        form.elements.journalId.value = entry?.id || "";
        form.elements.stockId.value = values.companyId || "";
        form.elements.date.value = values.decisionDate || today();
        form.elements.entryType.value = values.decisionType || "review";
        form.elements.executionStatus.value = values.executionStatus || (values.transactionId ? "executed" : "planned");
        form.elements.transactionId.value = values.transactionId || "";
        form.elements.thesisVersionId.value = values.thesisVersionId || "";
        form.elements.researchId.value = values.researchId || "";
        form.elements.title.value = values.title || "";
        form.elements.tags.value = (values.tags || []).join(", ");
        form.elements.price.value = values.price || "";
        form.elements.quantity.value = values.quantity || "";
        form.elements.expectedReturn.value = values.expectedReturn || "";
        form.elements.holdingPeriod.value = values.expectedHoldingPeriod || values.holdingPeriod || "";
        form.elements.nextReviewDate.value = values.nextReviewDate || "";
        form.elements.plannedAction.value = values.plannedAction || "";
        form.elements.supportingEvidence.value = values.supportingEvidence || "";
        form.elements.investmentThesis.value = values.reason || values.investmentThesis || "";
        form.elements.expectedOutcome.value = values.expectedOutcome || "";
        form.elements.risks.value = values.risks || "";
        form.elements.invalidationConditions.value = values.invalidationConditions || "";
        form.elements.confidence.value = values.confidence ?? "";
        form.elements.reviewType.value = values.reviewType || "";
        form.elements.thesisStillValid.value = values.thesisStillValid || "";
        form.elements.whatWentRight.value = values.whatWentRight || "";
        form.elements.whatWentWrong.value = values.whatWentWrong || "";
        form.elements.lessonsLearned.value = (values.lessonsLearned || []).join(", ");
        form.elements.positionAdjustment.value = values.positionAdjustment || "";
        form.elements.reviewNotes.value = values.reviewNotes || "";
        form.elements.followUpReview.value = values.notes || values.followUpReview || "";
        byId("journal-dialog-title").textContent = entry ? "編輯投資決策紀錄" : "新增投資決策紀錄";
        applyDecisionTemplate(form, { applyDefaults: !entry });
        form.querySelector(".form-error").textContent = "";
        openDialog("journal-dialog");
      }

      return {
        fillStockSelect,
        fillTransactionSelect,
        fillThesisVersionSelect,
        applyDecisionTemplate,
        renderJournal,
        openJournalDialog,
        normalizeDecisionType: decisionDomain.normalizeDecisionType,
        readDecisionEntry: decisionDomain.normalizeDecision
      };
    }

    return {
      create,
      normalizeDecisionType: root.DecisionDomain.normalizeDecisionType,
      readDecisionEntry: root.DecisionDomain.normalizeDecision
    };
  })();
})(typeof window !== "undefined" ? window : globalThis);
