window.PersonalFinanceView = (() => {
  const accountTypeLabels = {
    cash: "現金",
    bank: "銀行存款",
    brokerageCash: "券商現金",
    eWallet: "電子錢包",
    cryptoCash: "加密資產現金",
    other: "其他"
  };
  const purposeLabels = {
    daily: "日常使用",
    emergencyFund: "緊急預備金",
    savings: "儲蓄",
    coreInvestment: "Core 投資",
    satelliteInvestment: "Satellite 投資",
    trading: "交易備用",
    retirement: "退休",
    settlement: "交割",
    overseas: "海外",
    other: "其他"
  };
  const policyLabels = {
    medical: "醫療",
    cancer: "癌症",
    longTermCare: "長照",
    life: "壽險",
    accident: "意外",
    savings: "儲蓄險",
    annuity: "年金",
    other: "其他"
  };
  const liabilityLabels = {
    mortgage: "房貸",
    personalLoan: "個人貸款",
    creditCard: "信用卡",
    studentLoan: "學貸",
    marginLoan: "融資",
    familyLoan: "親友借款",
    other: "其他"
  };

  function create({ state, repo, byId, escapeHtml, formatMoney, today, openDialog }) {
    function missing(value) {
      return value === "" || value === null || value === undefined ? "尚未設定" : value;
    }

    function labelWithCustom(labels, key, customValue) {
      return customValue || labels[key] || key;
    }

    function renderAssets() {
      renderAccountSummary();
      renderAccounts();
      renderPolicies();
      renderLiabilities();
    }

    function renderAccountSummary() {
      const groups = repo.getLatestBalancesGroupedByCurrency(false);
      const rows = Object.keys(groups).sort().map((currency) => `<div><span>${escapeHtml(currency)}</span><strong>${formatMoney(groups[currency], currency)}</strong></div>`);
      byId("asset-currency-subtotals").innerHTML = rows.length ? rows.join("") : `<p class="empty-state">尚未輸入任何帳戶最新餘額。</p>`;
    }

    function renderAccounts() {
      const accounts = repo.getAllAccounts(true);
      byId("accounts-list").innerHTML = accounts.length ? accounts.map((account) => {
        const latest = repo.getLatestBalanceByAccountId(account.id);
        const balances = repo.getBalancesByAccountId(account.id);
        return `<article class="asset-card ${account.isArchived ? "deleted-record" : ""}">
          <div class="asset-card-header">
            <div><span class="ticker">${escapeHtml(account.name)}</span><h3>${escapeHtml(labelWithCustom(accountTypeLabels, account.type, account.customTypeName))}</h3><p>${escapeHtml(account.institution)} · ${escapeHtml(account.currency)} · ${escapeHtml(labelWithCustom(purposeLabels, account.purpose, account.customPurposeName))}</p></div>
            <span class="badge ${account.isArchived ? "badge-warning" : "badge-green"}">${account.isArchived ? "已封存" : "使用中"}</span>
          </div>
          <dl class="asset-facts"><div><dt>最新餘額</dt><dd>${latest ? formatMoney(latest.amount, account.currency) : "尚未設定"}</dd></div><div><dt>餘額日期</dt><dd>${escapeHtml(latest?.balanceDate || "尚未設定")}</dd></div><div><dt>地區</dt><dd>${escapeHtml(missing(account.countryOrRegion))}</dd></div><div><dt>餘額筆數</dt><dd>${balances.length}</dd></div></dl>
          ${account.type === "brokerageCash" ? `<p class="form-help">券商現金只輸入真的留在券商帳戶的現金，避免與股票持倉重複計算。</p>` : ""}
          ${account.note ? `<p>${escapeHtml(account.note)}</p>` : ""}
          <div class="record-actions">
            <button class="small-button" data-edit-account="${account.id}">編輯帳戶</button>
            ${account.isArchived ? `<button class="small-button" data-restore-account="${account.id}">還原</button>` : `<button class="small-button" data-archive-account="${account.id}">封存</button><button class="small-button" data-add-balance="${account.id}">新增餘額</button>`}
            <button class="small-button" data-view-balances="${account.id}">查看餘額</button>
            <button class="small-button danger-button" data-delete-account="${account.id}">永久刪除</button>
          </div>
          <div class="balance-history" id="balances-${account.id}"></div>
        </article>`;
      }).join("") : `<p class="empty-state">尚未建立現金、銀行或券商現金帳戶。</p>`;
    }

    function renderBalanceHistory(accountId) {
      const account = repo.getAccountById(accountId);
      const target = byId(`balances-${accountId}`);
      if (!target || !account) return;
      const balances = repo.getBalancesByAccountId(accountId);
      target.innerHTML = balances.length ? balances.map((balance) => `<div class="balance-row"><span>${escapeHtml(balance.balanceDate)} · ${formatMoney(balance.amount, account.currency)}</span><small>${escapeHtml(balance.note || "尚未設定")}</small><div class="record-actions"><button class="small-button" data-edit-balance="${balance.id}">編輯</button><button class="small-button danger-button" data-delete-balance="${balance.id}">刪除</button></div></div>`).join("") : `<p class="empty-state">這個帳戶尚未輸入餘額。</p>`;
    }

    function renderPolicies() {
      const policies = state.insurancePolicies.slice().sort((a, b) => a.name.localeCompare(b.name));
      byId("policies-list").innerHTML = policies.length ? policies.map((policy) => `<article class="asset-card ${policy.isArchived ? "deleted-record" : ""}">
        <div class="asset-card-header"><div><span class="ticker">${escapeHtml(policy.name)}</span><h3>${escapeHtml(labelWithCustom(policyLabels, policy.category, policy.customCategoryName))}</h3><p>${escapeHtml(policy.insurer)} · ${escapeHtml(policy.status)}</p></div><span class="badge ${policy.includeInNetWorth ? "badge-blue" : "badge-warning"}">${policy.includeInNetWorth ? "計入淨資產" : "不計入淨資產"}</span></div>
        <dl class="asset-facts"><div><dt>保障金額</dt><dd>${formatMoney(policy.coverageAmount, policy.cashValueCurrency)}</dd></div><div><dt>目前保單價值</dt><dd>${formatMoney(policy.currentCashValue, policy.cashValueCurrency)}</dd></div><div><dt>價值日期</dt><dd>${escapeHtml(policy.cashValueDate || "尚未設定")}</dd></div><div><dt>下次繳費</dt><dd>${escapeHtml(policy.nextPaymentDate || "尚未設定")}</dd></div></dl>
        <p>${escapeHtml(policy.coverageSummary || "尚未設定")}</p>
        <div class="record-actions"><button class="small-button" data-edit-policy="${policy.id}">編輯</button>${policy.isArchived ? `<button class="small-button" data-restore-policy="${policy.id}">還原</button>` : `<button class="small-button" data-archive-policy="${policy.id}">封存</button>`}<button class="small-button danger-button" data-delete-policy="${policy.id}">刪除</button></div>
      </article>`).join("") : `<p class="empty-state">尚未建立保單資料。</p>`;
    }

    function renderLiabilities() {
      const liabilities = state.liabilities.slice().sort((a, b) => a.name.localeCompare(b.name));
      byId("liabilities-list").innerHTML = liabilities.length ? liabilities.map((liability) => `<article class="asset-card ${liability.isArchived ? "deleted-record" : ""}">
        <div class="asset-card-header"><div><span class="ticker">${escapeHtml(liability.name)}</span><h3>${escapeHtml(labelWithCustom(liabilityLabels, liability.type, liability.customTypeName))}</h3><p>${escapeHtml(liability.lender)} · ${escapeHtml(liability.currency)}</p></div><span class="badge ${liability.status === "paidOff" ? "badge-green" : "badge-warning"}">${liability.status === "paidOff" ? "已清償" : "尚未清償"}</span></div>
        <dl class="asset-facts"><div><dt>目前餘額</dt><dd>${formatMoney(liability.currentBalance, liability.currency)}</dd></div><div><dt>原始金額</dt><dd>${formatMoney(liability.originalAmount, liability.currency)}</dd></div><div><dt>利率</dt><dd>${Number.isFinite(liability.interestRate) ? `${liability.interestRate}%` : "尚未設定"}</dd></div><div><dt>下次付款</dt><dd>${escapeHtml(liability.nextPaymentDate || "尚未設定")}</dd></div></dl>
        ${liability.note ? `<p>${escapeHtml(liability.note)}</p>` : ""}
        <div class="record-actions"><button class="small-button" data-edit-liability="${liability.id}">編輯</button><button class="small-button" data-payoff-liability="${liability.id}">標記清償</button>${liability.isArchived ? `<button class="small-button" data-restore-liability="${liability.id}">還原</button>` : `<button class="small-button" data-archive-liability="${liability.id}">封存</button>`}<button class="small-button danger-button" data-delete-liability="${liability.id}">刪除</button></div>
      </article>`).join("") : `<p class="empty-state">尚未建立負債資料。</p>`;
    }

    function fillChoiceInput(input, labels, selected = "", customValue = "") {
      input.value = customValue || labels[selected] || selected || "";
    }

    function renderChoiceButtons(input, labels) {
      const field = input.closest(".field");
      if (!field) return;
      let toggle = field.querySelector(".choice-toggle");
      if (!toggle) {
        toggle = document.createElement("button");
        toggle.className = "choice-toggle";
        toggle.type = "button";
        toggle.dataset.choiceToggle = "true";
        toggle.textContent = "▼";
        toggle.setAttribute("aria-label", "顯示預選項");
        input.insertAdjacentElement("afterend", toggle);
      }
      let choices = field.querySelector(".choice-presets");
      if (!choices) {
        choices = document.createElement("div");
        choices.className = "choice-presets";
        field.appendChild(choices);
      }
      field.classList.remove("choices-open");
      toggle.textContent = "▼";
      choices.innerHTML = Object.values(labels).map((label) => `<button class="choice-button" type="button" data-choice-value="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("");
    }

    function fillCurrencySelect(select, selected = state.settings.baseCurrency) {
      select.innerHTML = ["TWD", "USD"].map((currency) => `<option value="${currency}" ${currency === selected ? "selected" : ""}>${currency}</option>`).join("");
    }

    function openAccountDialog(accountId = "") {
      const form = byId("account-form");
      const account = accountId ? repo.getAccountById(accountId) : null;
      form.reset();
      form.elements.accountId.value = account?.id || "";
      fillChoiceInput(form.elements.type, accountTypeLabels, account?.type || "bank", account?.customTypeName);
      fillChoiceInput(form.elements.purpose, purposeLabels, account?.purpose || "daily", account?.customPurposeName);
      renderChoiceButtons(form.elements.type, accountTypeLabels);
      renderChoiceButtons(form.elements.purpose, purposeLabels);
      fillCurrencySelect(form.elements.currency, account?.currency || state.settings.baseCurrency);
      form.elements.linkedAccountId.innerHTML = `<option value="">不連結</option>` + state.financialAccounts.filter((item) => item.id !== account?.id).map((item) => `<option value="${item.id}" ${item.id === account?.linkedAccountId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
      ["name", "subtype", "institution", "countryOrRegion", "displayOrder", "note"].forEach((name) => { form.elements[name].value = account?.[name] || ""; });
      form.elements.currentFx.value = account?.currentFx || 1;
      byId("account-dialog-title").textContent = account ? "編輯帳戶" : "新增帳戶";
      form.querySelector(".form-error").textContent = "";
      openDialog("account-dialog");
    }

    function openBalanceDialog(accountId = "", balanceId = "") {
      const form = byId("balance-form");
      const balance = balanceId ? state.accountBalances.find((item) => item.id === balanceId) : null;
      form.reset();
      form.elements.balanceId.value = balance?.id || "";
      form.elements.accountId.value = balance?.accountId || accountId;
      form.elements.amount.value = balance?.amount ?? "";
      form.elements.balanceDate.value = balance?.balanceDate || today();
      form.elements.note.value = balance?.note || "";
      form.querySelector(".form-error").textContent = "";
      openDialog("balance-dialog");
    }

    function openPolicyDialog(policyId = "") {
      const form = byId("policy-form");
      const policy = policyId ? state.insurancePolicies.find((item) => item.id === policyId) : null;
      form.reset();
      form.elements.policyId.value = policy?.id || "";
      fillChoiceInput(form.elements.category, policyLabels, policy?.category || "medical", policy?.customCategoryName);
      fillChoiceInput(form.elements.paymentFrequency, { monthly: "每月", quarterly: "每季", semiannual: "半年", annual: "每年", single: "躉繳", other: "其他" }, policy?.paymentFrequency || "annual", policy?.customPaymentFrequencyName);
      fillChoiceInput(form.elements.status, { active: "有效", paidUp: "繳清", expired: "到期", cancelled: "取消", unknown: "未知" }, policy?.status || "active", policy?.customPolicyStatusName);
      renderChoiceButtons(form.elements.category, policyLabels);
      renderChoiceButtons(form.elements.paymentFrequency, { monthly: "每月", quarterly: "每季", semiannual: "半年", annual: "每年", single: "躉繳", other: "其他" });
      renderChoiceButtons(form.elements.status, { active: "有效", paidUp: "繳清", expired: "到期", cancelled: "取消", unknown: "未知" });
      fillCurrencySelect(form.elements.cashValueCurrency, policy?.cashValueCurrency || state.settings.baseCurrency);
      ["name", "insurer", "insuredPerson", "policyholder", "beneficiaryNote", "premiumAmount", "nextPaymentDate", "paymentEndDate", "coverageSummary", "coverageAmount", "currentCashValue", "cashValueDate", "note"].forEach((name) => { form.elements[name].value = policy?.[name] || ""; });
      form.elements.currentFx.value = policy?.currentFx || 1;
      form.elements.includeInNetWorth.checked = Boolean(policy?.includeInNetWorth);
      form.querySelector(".form-error").textContent = "";
      openDialog("policy-dialog");
    }

    function openLiabilityDialog(liabilityId = "") {
      const form = byId("liability-form");
      const liability = liabilityId ? state.liabilities.find((item) => item.id === liabilityId) : null;
      form.reset();
      form.elements.liabilityId.value = liability?.id || "";
      fillChoiceInput(form.elements.type, liabilityLabels, liability?.type || "personalLoan", liability?.customTypeName);
      fillCurrencySelect(form.elements.currency, liability?.currency || state.settings.baseCurrency);
      fillChoiceInput(form.elements.status, { active: "尚未清償", paidOff: "已清償", unknown: "未知" }, liability?.status || "active", liability?.customLiabilityStatusName);
      renderChoiceButtons(form.elements.type, liabilityLabels);
      renderChoiceButtons(form.elements.status, { active: "尚未清償", paidOff: "已清償", unknown: "未知" });
      ["name", "lender", "currentBalance", "originalAmount", "interestRate", "minimumPayment", "nextPaymentDate", "dueDate", "note"].forEach((name) => { form.elements[name].value = liability?.[name] ?? ""; });
      form.elements.currentFx.value = liability?.currentFx || 1;
      form.querySelector(".form-error").textContent = "";
      openDialog("liability-dialog");
    }

    return { renderAssets, renderBalanceHistory, openAccountDialog, openBalanceDialog, openPolicyDialog, openLiabilityDialog };
  }

  return { create };
})();

