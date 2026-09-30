const randomUUID = () => globalThis.crypto.randomUUID();
import { DRAFT_STATUS, createInvoiceDraft } from "./invoice-draft.js";

const COMMAND = Object.freeze({
  HELLO: "HOLA",
  DONE: "LISTO",
  EDIT: "EDITAR",
  CONFIRM: "CONFIRMADO",
  CANCEL: "CANCELAR",
});

const SESSION_STATUS = Object.freeze({
  RECEIVING: "RECEIVING",
  EDITING: "EDITING",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  READY_TO_CONFIRM: "READY_TO_CONFIRM",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
});

const TERMINAL_STATUSES = new Set([
  SESSION_STATUS.CONFIRMED,
  SESSION_STATUS.CANCELLED,
]);

function normalizeSender(sender) {
  const digits = String(sender || "").replace(/\D/g, "");

  // WhatsApp todavia puede entregar celulares mexicanos con el prefijo historico 521.
  if (/^521\d{10}$/.test(digits)) {
    return `52${digits.slice(3)}`;
  }

  return digits;
}

function parseCommand(text) {
  if (typeof text !== "string") return null;
  const normalized = text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return Object.values(COMMAND).includes(normalized) ? normalized : null;
}

function createSession(sender, timestamp, idFactory) {
  return {
    id: idFactory(),
    sender: normalizeSender(sender),
    status: SESSION_STATUS.RECEIVING,
    revision: 0,
    inputs: [],
    processedMessageIds: [],
    draft: null,
    confirmationKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function withProcessedMessage(session, messageId, timestamp) {
  return {
    ...session,
    processedMessageIds: [...session.processedMessageIds, messageId],
    updatedAt: timestamp,
  };
}

function collectDraftInput(inputs) {
  const customer = {};
  let items = [];

  for (const input of inputs) {
    const extracted = input.extracted;
    if (!extracted || typeof extracted !== "object") continue;

    if (extracted.customer && typeof extracted.customer === "object") {
      Object.assign(customer, extracted.customer);
    }

    if (extracted.replaceItems === true) items = [];
    if (Array.isArray(extracted.items)) items.push(...extracted.items);
  }

  return { customer, items };
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function formatDraftReply(draft) {
  if (draft.status === DRAFT_STATUS.NEEDS_REVIEW) {
    const issues = draft.issues.map((issue) => `- ${issue.message}`).join("\n");
    return `No puedo confirmar todavía:\n${issues}\n\nResponde EDITAR para corregir o CANCELAR para abandonar.`;
  }

  const itemLines = draft.items.map(
    (item, index) =>
      `${index + 1}. ${item.concept} x${item.quantity} — ${formatMoney(item.finalAmount)}`,
  );
  const total = draft.items.reduce((sum, item) => sum + item.finalAmount, 0);

  return [
    "BORRADOR DE FACTURA",
    `Cliente: ${draft.customer.name}`,
    `RFC: ${draft.customer.rfc}`,
    ...itemLines,
    `Total: ${formatMoney(total)}`,
    "",
    "Responde EDITAR, CONFIRMADO o CANCELAR.",
  ].join("\n");
}

/** @param {{session?: any, message: any, allowedSenders?: string[], draftFactory?: any, clock?: () => string, idFactory?: () => string}} options */
function handleConversationMessage({
  session = null,
  message,
  allowedSenders = /** @type {string[]} */ ([]),
  draftFactory = createInvoiceDraft,
  clock = () => new Date().toISOString(),
  idFactory = randomUUID,
}) {
  if (!message || !message.id) {
    throw new Error("Cada mensaje necesita un identificador único.");
  }

  const timestamp = clock();
  const sender = normalizeSender(message.sender);
  const allowed = new Set(allowedSenders.map(normalizeSender));

  if (!sender || !allowed.has(sender)) {
    return {
      accepted: false,
      duplicate: false,
      action: "UNAUTHORIZED",
      session,
      replies: [],
      effects: [],
    };
  }

  if (session && session.processedMessageIds.includes(message.id)) {
    return {
      accepted: true,
      duplicate: true,
      action: "DUPLICATE_IGNORED",
      session,
      replies: [],
      effects: [],
    };
  }

  const command = message.type === "text" ? parseCommand(message.text) : null;

  if (!session || TERMINAL_STATUSES.has(session.status)) {
    if (command !== COMMAND.HELLO) {
      return {
        accepted: true,
        duplicate: false,
        action: "HELLO_REQUIRED",
        session,
        replies: ["Escribe HOLA para iniciar un nuevo expediente."],
        effects: [],
      };
    }

    const newSession = withProcessedMessage(
      createSession(sender, timestamp, idFactory),
      message.id,
      timestamp,
    );
    return {
      accepted: true,
      duplicate: false,
      action: "SESSION_STARTED",
      session: newSession,
      replies: [
        "Hola. Envía los datos y archivos de la factura. Cuando termines escribe LISTO.",
      ],
      effects: [],
    };
  }

  if (session.sender !== sender) {
    return {
      accepted: false,
      duplicate: false,
      action: "SESSION_OWNER_MISMATCH",
      session,
      replies: [],
      effects: [],
    };
  }

  let nextSession = withProcessedMessage(session, message.id, timestamp);

  if (command === COMMAND.CANCEL) {
    nextSession = { ...nextSession, status: SESSION_STATUS.CANCELLED };
    return {
      accepted: true,
      duplicate: false,
      action: "SESSION_CANCELLED",
      session: nextSession,
      replies: [
        "Expediente cancelado. Escribe HOLA cuando quieras iniciar otro.",
      ],
      effects: [],
    };
  }

  if (command === COMMAND.HELLO) {
    return {
      accepted: true,
      duplicate: false,
      action: "SESSION_ALREADY_ACTIVE",
      session: nextSession,
      replies: [
        "Ya hay un expediente activo. Envía información o escribe LISTO.",
      ],
      effects: [],
    };
  }

  if (command === COMMAND.EDIT) {
    if (
      ![SESSION_STATUS.READY_TO_CONFIRM, SESSION_STATUS.NEEDS_REVIEW].includes(
        session.status,
      )
    ) {
      return {
        accepted: true,
        duplicate: false,
        action: "EDIT_NOT_AVAILABLE",
        session: nextSession,
        replies: ["Primero envía la información y escribe LISTO."],
        effects: [],
      };
    }

    nextSession = {
      ...nextSession,
      status: SESSION_STATUS.EDITING,
      draft: null,
    };
    return {
      accepted: true,
      duplicate: false,
      action: "EDITING_STARTED",
      session: nextSession,
      replies: [
        "Modo edición. Envía las correcciones y después escribe LISTO.",
      ],
      effects: [],
    };
  }

  if (command === COMMAND.CONFIRM) {
    if (session.status !== SESSION_STATUS.READY_TO_CONFIRM) {
      return {
        accepted: true,
        duplicate: false,
        action: "CONFIRM_NOT_AVAILABLE",
        session: nextSession,
        replies: [
          "El expediente todavía no está listo. Usa EDITAR o CANCELAR.",
        ],
        effects: [],
      };
    }

    const confirmationKey = `${session.id}:${session.revision}`;
    nextSession = {
      ...nextSession,
      status: SESSION_STATUS.CONFIRMED,
      confirmationKey,
      confirmedAt: timestamp,
    };
    return {
      accepted: true,
      duplicate: false,
      action: "DRAFT_CONFIRMED",
      session: nextSession,
      replies: [
        "Borrador confirmado. Todavía no se ha generado ninguna factura.",
      ],
      effects: [{ type: "DRAFT_CONFIRMED", key: confirmationKey }],
    };
  }

  if (command === COMMAND.DONE) {
    if (
      ![SESSION_STATUS.RECEIVING, SESSION_STATUS.EDITING].includes(
        session.status,
      )
    ) {
      return {
        accepted: true,
        duplicate: false,
        action: "DONE_NOT_AVAILABLE",
        session: nextSession,
        replies: [
          "Usa EDITAR para cambiar el borrador, CONFIRMADO para aceptarlo o CANCELAR.",
        ],
        effects: [],
      };
    }

    const draft = draftFactory(collectDraftInput(session.inputs));
    nextSession = {
      ...nextSession,
      status:
        draft.status === DRAFT_STATUS.READY_TO_CONFIRM
          ? SESSION_STATUS.READY_TO_CONFIRM
          : SESSION_STATUS.NEEDS_REVIEW,
      revision: session.revision + 1,
      draft,
    };
    return {
      accepted: true,
      duplicate: false,
      action: "DRAFT_REVIEWED",
      session: nextSession,
      replies: [formatDraftReply(draft)],
      effects: [],
    };
  }

  if (
    ![SESSION_STATUS.RECEIVING, SESSION_STATUS.EDITING].includes(session.status)
  ) {
    return {
      accepted: true,
      duplicate: false,
      action: "DECISION_REQUIRED",
      session: nextSession,
      replies: ["Responde EDITAR, CONFIRMADO o CANCELAR."],
      effects: [],
    };
  }

  const input = {
    messageId: message.id,
    type: message.type || "text",
    text: message.text || null,
    mediaId: message.mediaId || null,
    extracted: message.extracted || null,
  };
  nextSession = { ...nextSession, inputs: [...nextSession.inputs, input] };

  return {
    accepted: true,
    duplicate: false,
    action: "INPUT_ACCEPTED",
    session: nextSession,
    replies: ["Recibido. Puedes enviar más información o escribir LISTO."],
    effects: [],
  };
}

export {
  COMMAND,
  SESSION_STATUS,
  collectDraftInput,
  formatDraftReply,
  handleConversationMessage,
  normalizeSender,
  parseCommand,
};
