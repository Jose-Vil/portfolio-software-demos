import { useEffect, useRef, useState } from "react";
import {
  exampleText,
  extractFields,
  validateFields,
  type DocumentFields,
} from "../core/documents";
const labels: Record<keyof DocumentFields, string> = {
  folio: "Folio",
  proveedor: "Proveedor",
  fecha: "Fecha",
  concepto: "Concepto",
  total: "Total (MXN)",
};
export default function Documents() {
  const [text, setText] = useState(exampleText),
    [fields, setFields] = useState(extractFields(exampleText)),
    [records, setRecords] = useState<(DocumentFields & { id: string })[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function load(file?: File) {
    if (!file || busy) return;
    controller.current = new AbortController();
    setBusy(true);
    setNotice("");
    setProgress(0);
    try {
      const { readDocument } = await import("../core/read-document");
      const result = await readDocument(
        file,
        controller.current.signal,
        setProgress,
      );
      setText(result);
      setFields(extractFields(result));
      setNotice("Lectura completada. Revisa los campos antes de confirmar.");
    } catch (e) {
      setNotice(
        controller.current.signal.aborted
          ? "Lectura cancelada."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  function sampleImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 1200, 720);
    ctx.fillStyle = "#111";
    ctx.font = "32px Arial";
    exampleText
      .split("\n")
      .forEach((line, i) => ctx.fillText(line, 60, 80 + i * 70));
    canvas.toBlob(
      (blob) =>
        blob &&
        void load(
          new File([blob], "documento-ficticio.png", { type: "image/png" }),
        ),
      "image/png",
    );
  }
  function confirm() {
    const issues = validateFields(fields);
    if (issues.length) {
      setNotice(issues.join(" "));
      return;
    }
    if (records.some((r) => r.folio === fields.folio.trim())) {
      setNotice(
        "Este folio ya fue registrado. Cambia el folio para agregar otro registro.",
      );
      return;
    }
    setRecords([
      ...records,
      { ...fields, folio: fields.folio.trim(), id: crypto.randomUUID() },
    ]);
    setNotice(
      "Registro confirmado. Se conserva únicamente en la memoria de esta pestaña.",
    );
  }
  return (
    <div className="workspace">
      <div className="workspace-bar">
        <span className="status-dot" /> Procesamiento local{" "}
        <span className="right-label">01 / DOCUMENTOS</span>
      </div>
      <div className="doc-grid">
        <section className="panel">
          <div className="panel-heading">
            <span className="step">1</span>
            <h2>Documento de origen</h2>
          </div>
          <p className="muted">
            Prueba el ejemplo o carga un documento ficticio.
          </p>
          <div className="toolbar">
            <button
              className="button secondary"
              onClick={() => {
                setText(exampleText);
                setFields(extractFields(exampleText));
                setNotice("Ejemplo cargado.");
              }}
              disabled={busy}
            >
              Ejemplo de texto
            </button>
            <button
              className="button secondary"
              onClick={sampleImage}
              disabled={busy}
            >
              Probar OCR real
            </button>
            <label
              className={
                "button secondary file-label" + (busy ? " disabled" : "")
              }
            >
              Cargar archivo
              <input
                type="file"
                accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
                disabled={busy}
                onChange={(e) => {
                  void load(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {busy && (
            <div className="progress-area" role="status">
              <progress max="1" value={progress} />
              <span>Procesando… {Math.round(progress * 100)}%</span>
              <button
                className="text-button"
                onClick={() => controller.current?.abort()}
              >
                Cancelar
              </button>
            </div>
          )}
          <label className="field">
            Texto extraído
            <textarea
              value={text}
              rows={9}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button
            className="text-button"
            onClick={() => {
              setFields(extractFields(text));
              setNotice("Campos extraídos. Revisa y confirma.");
            }}
            disabled={busy}
          >
            Extraer campos del texto →
          </button>
          <p className="micro">
            TXT y PDF con texto, o imágenes con OCR · Hasta 10 MB · PDF de hasta
            8 páginas.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <span className="step">2</span>
            <h2>Revisión y confirmación</h2>
          </div>
          <p className="muted">
            La extracción propone. Tú confirmas el registro.
          </p>
          <div className="form-grid">
            {(Object.keys(labels) as (keyof DocumentFields)[]).map((key) => (
              <label
                key={key}
                className={"field " + (key === "concepto" ? "span-two" : "")}
              >
                {labels[key]}
                <input
                  type={key === "fecha" ? "date" : "text"}
                  value={fields[key]}
                  onChange={(e) =>
                    setFields({ ...fields, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <button className="button primary" onClick={confirm} disabled={busy}>
            Confirmar registro <span>✓</span>
          </button>
          <div className="notice" role="status">
            {notice ||
              "Los campos editables permiten corregir errores de lectura."}
          </div>
        </section>
      </div>
      <section className="records">
        <div className="panel-heading">
          <h2>Registros confirmados</h2>
          <span className="badge">{records.length}</span>
        </div>
        {records.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.folio}</td>
                    <td>{r.proveedor}</td>
                    <td>{r.fecha}</td>
                    <td>${Number(r.total).toFixed(2)}</td>
                    <td>
                      <span className="badge green">Revisado</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            Tu primer registro aparecerá aquí después de revisarlo.
          </div>
        )}
      </section>
    </div>
  );
}
