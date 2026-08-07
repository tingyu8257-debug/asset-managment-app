(typeof window !== "undefined" ? window : globalThis).PersonalFinanceFormController = (() => {
  function create({ repo, closeDialog, renderAll }) {
    function normalizeChoice(rawValue, choices, customFallback) {
      const input = String(rawValue || "").trim();
      const match = choices.find((choice) => choice.value === input || choice.label === input);
      if (match) return { value: match.value, customName: match.value === customFallback && customFallback === "other" ? input : "" };
      return { value: customFallback, customName: input };
    }

    function showFormError(form, error) {
      form.querySelector(".form-error").textContent = error.message || String(error);
    }

    function handleAccountSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        const accountType = normalizeChoice(values.type, [
          { value: "cash", label: "現金" }, { value: "bank", label: "銀行存款" }, { value: "brokerageCash", label: "券商現金" },
          { value: "eWallet", label: "電子錢包" }, { value: "cryptoCash", label: "加密資產現金" }, { value: "other", label: "其他" }
        ], "other");
        const accountPurpose = normalizeChoice(values.purpose, [
          { value: "daily", label: "日常使用" }, { value: "emergencyFund", label: "緊急預備金" }, { value: "savings", label: "儲蓄" },
          { value: "coreInvestment", label: "Core 投資" }, { value: "satelliteInvestment", label: "Satellite 投資" }, { value: "trading", label: "交易備用" },
          { value: "retirement", label: "退休" }, { value: "settlement", label: "交割" }, { value: "overseas", label: "海外" }, { value: "other", label: "其他" }
        ], "other");
        const payload = {
          name: values.name,
          type: accountType.value,
          customTypeName: accountType.customName,
          subtype: values.subtype,
          institution: values.institution,
          countryOrRegion: values.countryOrRegion,
          currency: values.currency,
          currentFx: values.currentFx,
          purpose: accountPurpose.value,
          customPurposeName: accountPurpose.customName,
          linkedAccountId: values.linkedAccountId,
          displayOrder: values.displayOrder,
          note: values.note
        };
        if (values.accountId) repo.updateAccount(values.accountId, payload);
        else repo.createAccount(payload);
        closeDialog("account-dialog");
        renderAll();
      } catch (error) {
        showFormError(form, error);
      }
    }

    function handleBalanceSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        const payload = {
          accountId: values.accountId,
          amount: values.amount,
          balanceDate: values.balanceDate,
          note: values.note
        };
        if (values.balanceId) repo.updateBalance(values.balanceId, payload);
        else repo.createBalance(payload);
        closeDialog("balance-dialog");
        renderAll();
      } catch (error) {
        showFormError(form, error);
      }
    }

    function handlePolicySubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        const policyCategory = normalizeChoice(values.category, [
          { value: "medical", label: "醫療" }, { value: "cancer", label: "癌症" }, { value: "longTermCare", label: "長照" },
          { value: "life", label: "壽險" }, { value: "accident", label: "意外" }, { value: "savings", label: "儲蓄險" },
          { value: "annuity", label: "年金" }, { value: "other", label: "其他" }
        ], "other");
        const paymentFrequency = normalizeChoice(values.paymentFrequency, [
          { value: "monthly", label: "每月" }, { value: "quarterly", label: "每季" }, { value: "semiannual", label: "半年" },
          { value: "annual", label: "每年" }, { value: "single", label: "躉繳" }, { value: "other", label: "其他" }
        ], "other");
        const policyStatus = normalizeChoice(values.status, [
          { value: "active", label: "有效" }, { value: "paidUp", label: "繳清" }, { value: "expired", label: "到期" },
          { value: "cancelled", label: "取消" }, { value: "unknown", label: "未知" }
        ], "unknown");
        const payload = {
          name: values.name,
          insurer: values.insurer,
          category: policyCategory.value,
          customCategoryName: policyCategory.customName,
          insuredPerson: values.insuredPerson,
          policyholder: values.policyholder,
          beneficiaryNote: values.beneficiaryNote,
          paymentFrequency: paymentFrequency.value,
          customPaymentFrequencyName: paymentFrequency.customName,
          premiumAmount: values.premiumAmount,
          nextPaymentDate: values.nextPaymentDate,
          paymentEndDate: values.paymentEndDate,
          coverageSummary: values.coverageSummary,
          coverageAmount: values.coverageAmount,
          currentCashValue: values.currentCashValue,
          cashValueCurrency: values.cashValueCurrency,
          currentFx: values.currentFx,
          cashValueDate: values.cashValueDate,
          includeInNetWorth: values.includeInNetWorth === "on",
          status: policyStatus.value,
          customPolicyStatusName: policyStatus.customName,
          note: values.note
        };
        if (values.policyId) repo.updatePolicy(values.policyId, payload);
        else repo.createPolicy(payload);
        closeDialog("policy-dialog");
        renderAll();
      } catch (error) {
        showFormError(form, error);
      }
    }

    function handleLiabilitySubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      try {
        const liabilityType = normalizeChoice(values.type, [
          { value: "mortgage", label: "房貸" }, { value: "personalLoan", label: "個人貸款" }, { value: "creditCard", label: "信用卡" },
          { value: "studentLoan", label: "學貸" }, { value: "marginLoan", label: "融資" }, { value: "familyLoan", label: "親友借款" }, { value: "other", label: "其他" }
        ], "other");
        const liabilityStatus = normalizeChoice(values.status, [
          { value: "active", label: "尚未清償" }, { value: "paidOff", label: "已清償" }, { value: "unknown", label: "未知" }
        ], "unknown");
        const payload = {
          name: values.name,
          type: liabilityType.value,
          customTypeName: liabilityType.customName,
          lender: values.lender,
          currency: values.currency,
          currentFx: values.currentFx,
          currentBalance: values.currentBalance,
          originalAmount: values.originalAmount,
          interestRate: values.interestRate,
          minimumPayment: values.minimumPayment,
          nextPaymentDate: values.nextPaymentDate,
          dueDate: values.dueDate,
          status: liabilityStatus.value,
          customLiabilityStatusName: liabilityStatus.customName,
          note: values.note
        };
        if (values.liabilityId) repo.updateLiability(values.liabilityId, payload);
        else repo.createLiability(payload);
        closeDialog("liability-dialog");
        renderAll();
      } catch (error) {
        showFormError(form, error);
      }
    }

    return {
      handleAccountSubmit,
      handleBalanceSubmit,
      handlePolicySubmit,
      handleLiabilitySubmit
    };
  }

  return { create };
})();
