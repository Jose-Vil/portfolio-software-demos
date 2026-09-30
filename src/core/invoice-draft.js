const DRAFT_STATUS = Object.freeze({
  NEEDS_REVIEW: "NEEDS_REVIEW",
  READY_TO_CONFIRM: "READY_TO_CONFIRM",
});

const PRICE_SOURCE = Object.freeze({
  ADMIN_TEXT: "ADMIN_TEXT",
  PAYMENT_RECEIPT: "PAYMENT_RECEIPT",
  MARKED_DOCUMENT: "MARKED_DOCUMENT",
  MARKETPLACE_LISTING: "MARKETPLACE_LISTING",
});

const SOURCE_PRIORITY = Object.freeze({
  [PRICE_SOURCE.ADMIN_TEXT]: 300,
  [PRICE_SOURCE.PAYMENT_RECEIPT]: 200,
  [PRICE_SOURCE.MARKED_DOCUMENT]: 100,
});

function parseMoney(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0
      ? Number(value.toFixed(2))
      : null;
  }

  if (typeof value !== "string") return null;

  let normalized = value.trim().replace(/\s|\$|MXN/gi, "");
  if (!normalized) return null;

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/,/g, "");
  } else if (/^\d+,\d{2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0
    ? Number(amount.toFixed(2))
    : null;
}

function isEligibleFinalSource(evidence) {
  if (!evidence || !SOURCE_PRIORITY[evidence.sourceType]) return false;

  if (evidence.sourceType === PRICE_SOURCE.ADMIN_TEXT) {
    return evidence.explicitFinal === true;
  }

  if (evidence.sourceType === PRICE_SOURCE.PAYMENT_RECEIPT) {
    return evidence.role === "PAID_TOTAL" || evidence.explicitFinal === true;
  }

  return evidence.explicitFinal === true;
}

function resolveFinalAmount(evidenceList = []) {
  const normalized = evidenceList.map((evidence, index) => ({
    sourceId: evidence.sourceId || `source-${index + 1}`,
    sourceType: evidence.sourceType,
    explicitFinal: evidence.explicitFinal === true,
    role: evidence.role || null,
    amount: parseMoney(evidence.value),
  }));

  const contextOnly = normalized.filter(
    (evidence) => evidence.sourceType === PRICE_SOURCE.MARKETPLACE_LISTING,
  );

  const invalid = normalized.filter(
    (evidence) =>
      evidence.sourceType !== PRICE_SOURCE.MARKETPLACE_LISTING &&
      evidence.amount === null,
  );

  const candidates = normalized
    .filter(
      (evidence, index) =>
        isEligibleFinalSource(evidenceList[index]) && evidence.amount !== null,
    )
    .sort(
      (left, right) =>
        SOURCE_PRIORITY[right.sourceType] - SOURCE_PRIORITY[left.sourceType],
    );

  if (candidates.length === 0) {
    return {
      status: "MISSING",
      amount: null,
      selectedSource: null,
      candidates,
      contextOnly,
      invalid,
    };
  }

  const differentAmounts = [
    ...new Set(candidates.map((candidate) => candidate.amount)),
  ];
  if (differentAmounts.length > 1) {
    return {
      status: "CONFLICT",
      amount: null,
      selectedSource: candidates[0],
      candidates,
      contextOnly,
      invalid,
    };
  }

  return {
    status: "RESOLVED",
    amount: candidates[0].amount,
    selectedSource: candidates[0],
    candidates,
    contextOnly,
    invalid,
  };
}

function createInvoiceDraft({ customer = {}, items = [] } = {}) {
  const issues = [];
  const requiredCustomerFields = [
    ["rfc", "RFC"],
    ["name", "nombre o razón social"],
    ["postalCode", "código postal fiscal"],
    ["cfdiUse", "uso de CFDI"],
    ["fiscalRegime", "régimen fiscal"],
    ["paymentForm", "forma de pago"],
  ];

  for (const [field, label] of requiredCustomerFields) {
    if (!String(customer[field] || "").trim()) {
      issues.push({
        code: "MISSING_CUSTOMER_FIELD",
        field,
        message: `Falta ${label}.`,
      });
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    issues.push({
      code: "MISSING_ITEMS",
      field: "items",
      message: "Falta al menos un concepto.",
    });
  }

  const resolvedItems = (Array.isArray(items) ? items : []).map(
    (item, index) => {
      const concept = String(item.concept || "").trim();
      const quantity = Number(item.quantity || 1);
      const price = resolveFinalAmount(item.priceEvidence || []);

      if (!concept) {
        issues.push({
          code: "MISSING_CONCEPT",
          itemIndex: index,
          message: `Falta el concepto de la partida ${index + 1}.`,
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        issues.push({
          code: "INVALID_QUANTITY",
          itemIndex: index,
          message: `La cantidad de la partida ${index + 1} no es válida.`,
        });
      }

      if (price.status === "MISSING") {
        issues.push({
          code: "MISSING_FINAL_AMOUNT",
          itemIndex: index,
          message: `Falta el precio final de la partida ${index + 1}.`,
        });
      } else if (price.status === "CONFLICT") {
        issues.push({
          code: "CONFLICTING_FINAL_AMOUNTS",
          itemIndex: index,
          message: `Hay importes contradictorios en la partida ${index + 1}.`,
        });
      }

      return {
        concept,
        quantity,
        finalAmount: price.amount,
        priceResolution: price,
      };
    },
  );

  return {
    status:
      issues.length === 0
        ? DRAFT_STATUS.READY_TO_CONFIRM
        : DRAFT_STATUS.NEEDS_REVIEW,
    customer: {
      rfc: String(customer.rfc || "")
        .trim()
        .toUpperCase(),
      name: String(customer.name || "").trim(),
      postalCode: String(customer.postalCode || "").trim(),
      cfdiUse: String(customer.cfdiUse || "").trim(),
      fiscalRegime: String(customer.fiscalRegime || "").trim(),
      paymentForm: String(customer.paymentForm || "").trim(),
    },
    items: resolvedItems,
    issues,
  };
}

export {
  DRAFT_STATUS,
  PRICE_SOURCE,
  createInvoiceDraft,
  parseMoney,
  resolveFinalAmount,
};
