export const exampleText = `DOCUMENTO DE DEMOSTRACION\nFolio: DEMO-2026-001\nProveedor: Comercio Ejemplo\nFecha: 2026-09-30\nConcepto: Servicio de mantenimiento\nTotal: 1250.00\nTodos los datos son ficticios.`;
export type DocumentFields = {
  folio: string;
  proveedor: string;
  fecha: string;
  concepto: string;
  total: string;
};
export function extractFields(text: string): DocumentFields {
  const field = (label: string) =>
    text
      .match(new RegExp("^\\s*" + label + "\\s*[:=]\\s*(.+)$", "im"))?.[1]
      ?.trim() || "";
  return {
    folio: field("Folio"),
    proveedor: field("Proveedor"),
    fecha: field("Fecha"),
    concepto: field("Concepto"),
    total: field("Total")
      .replace(/\$|MXN|,/gi, "")
      .trim(),
  };
}
export function validateFields(fields: DocumentFields): string[] {
  const issues: string[] = [];
  if (!fields.folio.trim()) issues.push("Completa el folio.");
  if (!fields.proveedor.trim()) issues.push("Completa el proveedor.");
  if (!fields.concepto.trim()) issues.push("Completa el concepto.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fields.fecha) ||
    !Number.isFinite(Date.parse(fields.fecha)) ||
    new Date(fields.fecha).toISOString().slice(0, 10) !== fields.fecha
  )
    issues.push("Usa una fecha válida (AAAA-MM-DD).");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(fields.total) || Number(fields.total) <= 0)
    issues.push("Usa un importe positivo con hasta dos decimales.");
  return issues;
}
