import test from "node:test";
import assert from "node:assert/strict";
import {
  createInvoiceDraft,
  resolveFinalAmount,
} from "../src/core/invoice-draft.js";
import { handleConversationMessage } from "../src/core/invoice-conversation.js";
import {
  extractFields,
  validateFields,
  exampleText,
} from "../src/core/documents.ts";
import { catalog, checkout, updateStock } from "../src/core/commerce.ts";
import {
  stepDampedValue,
  stepElasticValue,
} from "../src/components/stress-physics.ts";
const sender = "520000000001";
const customer = {
  rfc: "XAXX010101000",
  name: "Cliente ficticio",
  postalCode: "00000",
  cfdiUse: "G03",
  fiscalRegime: "616",
  paymentForm: "03",
};
const invoiceInput = {
  customer,
  items: [
    {
      concept: "Demo",
      quantity: 1,
      priceEvidence: [
        { sourceType: "PAYMENT_RECEIPT", role: "PAID_TOTAL", value: 1250 },
      ],
    },
  ],
};
let counter = 0;
const receive = (session, text, extra = {}) =>
  handleConversationMessage({
    session,
    message: { id: `msg-${++counter}`, sender, type: "text", text, ...extra },
    allowedSenders: [sender],
    idFactory: () => `session-${counter}`,
  });
test("marketplace price is not accepted as final paid amount", () =>
  assert.equal(
    resolveFinalAmount([{ sourceType: "MARKETPLACE_LISTING", value: 1499 }])
      .status,
    "MISSING",
  ));
test("contradictory eligible evidence requires human review", () =>
  assert.equal(
    resolveFinalAmount([
      { sourceType: "PAYMENT_RECEIPT", role: "PAID_TOTAL", value: 1250 },
      { sourceType: "ADMIN_TEXT", explicitFinal: true, value: 1350 },
    ]).status,
    "CONFLICT",
  ));
test("incomplete customer cannot be confirmed", () =>
  assert.equal(
    createInvoiceDraft({ items: invoiceInput.items }).status,
    "NEEDS_REVIEW",
  ));
test("unauthorized sender cannot open a session", () =>
  assert.equal(
    handleConversationMessage({
      message: {
        id: "outside",
        sender: "520000000002",
        type: "text",
        text: "HOLA",
      },
      allowedSenders: [sender],
    }).accepted,
    false,
  ));
test("confirmation before valid draft produces no event", () =>
  assert.equal(
    receive(receive(null, "HOLA").session, "CONFIRMADO").effects.length,
    0,
  ));
test("duplicate confirmation is idempotent", () => {
  let session = receive(null, "HOLA").session;
  session = receive(session, "Datos", { extracted: invoiceInput }).session;
  session = receive(session, "LISTO").session;
  const message = {
    id: "confirm-once",
    sender,
    type: "text",
    text: "CONFIRMADO",
  };
  const first = handleConversationMessage({
    session,
    message,
    allowedSenders: [sender],
  });
  const duplicate = handleConversationMessage({
    session: first.session,
    message,
    allowedSenders: [sender],
  });
  assert.equal(first.effects.length, 1);
  assert.equal(duplicate.effects.length, 0);
  assert.equal(duplicate.duplicate, true);
});
test("session owner cannot be changed by another allowed sender", () => {
  const session = receive(null, "HOLA").session;
  const result = handleConversationMessage({
    session,
    message: {
      id: "other-owner",
      sender: "520000000002",
      type: "text",
      text: "LISTO",
    },
    allowedSenders: [sender, "520000000002"],
  });
  assert.equal(result.action, "SESSION_OWNER_MISMATCH");
});
test("sample extraction returns reviewable fields", () =>
  assert.deepEqual(validateFields(extractFields(exampleText)), []));
test("invalid calendar date is rejected", () =>
  assert.ok(
    validateFields({ ...extractFields(exampleText), fecha: "2026-02-30" })
      .length,
  ));
test("checkout validates whole cart before any stock mutation", () => {
  const original = structuredClone(catalog);
  assert.throws(
    () => checkout(original, { [catalog[0].id]: 1, [catalog[3].id]: 1 }),
    /existencias/,
  );
  assert.deepEqual(original, catalog);
});
test("successful checkout updates quantity and revision together", () => {
  const result = checkout(catalog, { [catalog[0].id]: 2 });
  assert.equal(result.total, 980);
  assert.equal(result.products[0].stock, 10);
  assert.equal(result.products[0].version, 2);
});
test("stale inventory writes are rejected", () =>
  assert.throws(
    () =>
      updateStock(
        updateStock(catalog, catalog[0].id, 1, 20),
        catalog[0].id,
        1,
        9,
      ),
    /cambió/,
  ));
test("fractional and negative stock are rejected", () => {
  for (const stock of [-1, 1.5, Infinity])
    assert.throws(() => updateStock(catalog, catalog[0].id, 1, stock));
});
test("elastic model converges without nonfinite values", () => {
  let value = 0,
    velocity = 0;
  for (let i = 0; i < 500; i++) {
    const next = stepElasticValue(value, velocity, 1, 0.016);
    value = next.value;
    velocity = next.velocity;
    assert.ok(Number.isFinite(value) && Number.isFinite(velocity));
  }
  assert.ok(Math.abs(value - 1) < 0.01);
});
