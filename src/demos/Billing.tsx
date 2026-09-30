import { useState } from "react";
import { handleConversationMessage } from "../core/invoice-conversation.js";
const sender = "520000000001";
const customer = {
  rfc: "XAXX010101000",
  name: "Cliente de demostración",
  postalCode: "00000",
  cfdiUse: "G03",
  fiscalRegime: "616",
  paymentForm: "03",
};
const items = (conflict = false) => [
  {
    concept: "Servicio de demostración",
    quantity: 1,
    priceEvidence: [
      {
        sourceId: "marketplace-demo",
        sourceType: "MARKETPLACE_LISTING",
        value: 1499,
      },
      {
        sourceId: "pago-demo",
        sourceType: "PAYMENT_RECEIPT",
        role: "PAID_TOTAL",
        value: 1250,
      },
      ...(conflict
        ? [
            {
              sourceId: "otro-pago-demo",
              sourceType: "ADMIN_TEXT",
              explicitFinal: true,
              value: 1350,
            },
          ]
        : []),
    ],
  },
];
type Entry = { side: "user" | "bot"; text: string };
export default function Billing() {
  const [session, setSession] = useState<any>(null),
    [chat, setChat] = useState<Entry[]>([
      {
        side: "bot",
        text: "Bienvenido al simulador. Escribe HOLA para iniciar.",
      },
    ]),
    [message, setMessage] = useState(""),
    [action, setAction] = useState("SIN INICIAR"),
    [last, setLast] = useState<any>(null),
    [effects, setEffects] = useState(0);
  function send(text: string, extracted?: object, duplicate = false) {
    const msg =
      duplicate && last
        ? last
        : { id: crypto.randomUUID(), sender, type: "text", text, extracted };
    const result = handleConversationMessage({
      session,
      message: msg,
      allowedSenders: [sender],
    });
    setSession(result.session);
    setAction(result.action);
    setLast(msg);
    setEffects(effects + result.effects.length);
    setChat([
      ...chat,
      {
        side: "user",
        text: duplicate ? "↻ Reentrega del mismo mensaje" : text,
      },
      ...result.replies.map((t: string) => ({ side: "bot" as const, text: t })),
      ...(result.duplicate
        ? [
            {
              side: "bot" as const,
              text: "Mensaje duplicado ignorado. No se repite el efecto.",
            },
          ]
        : []),
    ]);
    setMessage("");
  }
  return (
    <div className="workspace">
      <div className="workspace-bar">
        <span className="status-dot" /> Simulador de conversación{" "}
        <span className="right-label">02 / MENSAJERÍA</span>
      </div>
      <div className="billing-grid">
        <section className="chat-panel">
          <div className="chat-header">
            <span className="avatar">A</span>
            <div>
              <strong>Asistente de facturación</strong>
              <small>Canal de prueba · transporte simulado</small>
            </div>
            <span className="badge green">Demo</span>
          </div>
          <div className="chat-messages" aria-live="polite">
            {chat.map((entry, i) => (
              <div key={i} className={"bubble " + entry.side}>
                {entry.text}
              </div>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) send(message.trim());
            }}
          >
            <input
              aria-label="Mensaje"
              placeholder="Escribe HOLA, LISTO, EDITAR…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              className="button primary"
              type="submit"
              disabled={!message.trim()}
            >
              Enviar →
            </button>
          </form>
        </section>
        <aside className="panel">
          <div className="eyebrow">RECORRIDO GUIADO</div>
          <h2>Del mensaje al borrador</h2>
          <p className="muted">
            Prueba el camino completo o introduce un conflicto para revisar la
            validación.
          </p>
          <div className="guided-actions">
            <button onClick={() => send("HOLA")}>
              <span>1</span> Iniciar conversación
            </button>
            <button
              onClick={() =>
                send("Datos de ejemplo recibidos", {
                  customer,
                  replaceItems: true,
                  items: items(),
                })
              }
            >
              <span>2</span> Cargar datos ficticios
            </button>
            <button onClick={() => send("LISTO")}>
              <span>3</span> Revisar borrador
            </button>
            <button onClick={() => send("CONFIRMADO")}>
              <span>4</span> Confirmar
            </button>
          </div>
          <div className="state-card">
            <small>ESTADO ACTUAL</small>
            <strong>{session?.status || "SIN SESIÓN"}</strong>
            <span>{action}</span>
            <p>
              Confirmaciones: <b>{effects}</b>
            </p>
          </div>
          <div className="toolbar">
            <button
              className="text-button"
              onClick={() => {
                send("Datos con importes contradictorios", {
                  customer,
                  replaceItems: true,
                  items: items(true),
                });
              }}
            >
              Introducir conflicto
            </button>
            <button
              className="text-button"
              disabled={!last}
              onClick={() => send("", undefined, true)}
            >
              Repetir último mensaje
            </button>
            <button className="text-button" onClick={() => send("EDITAR")}>
              Editar
            </button>
            <button className="text-button" onClick={() => send("CANCELAR")}>
              Cancelar
            </button>
          </div>
          <p className="micro">
            El precio publicado de $1,499 es contexto. El comprobante de pago
            determina los $1,250 finales. La confirmación genera un evento
            local; no emite un CFDI.
          </p>
        </aside>
      </div>
    </div>
  );
}
