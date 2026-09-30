import { createWorker, OEM } from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = pdfWorker;
export async function readDocument(
  file: File,
  signal: AbortSignal,
  progress: (value: number) => void,
) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("El archivo supera el límite de 10 MB.");
  if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
  if (/\.txt$/i.test(file.name)) return await file.text();
  if (/\.pdf$/i.test(file.name)) {
    const task = getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      disableFontFace: true,
      maxImageSize: 7_000_000,
    });
    const abort = () => {
      void task.destroy();
    };
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 30_000);
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 8)
        throw new Error("El PDF supera el límite de 8 páginas.");
      const pages: string[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const data = await page.getTextContent();
        pages.push(
          data.items
            .map((item) =>
              "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
            )
            .join(""),
        );
        progress(n / pdf.numPages);
        page.cleanup();
      }
      const result = pages.join("\n");
      if (!result.trim())
        throw new Error(
          "Este PDF no contiene texto. Exporta una página a PNG o JPG para usar OCR.",
        );
      return result;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      await task.destroy();
    }
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Selecciona TXT, PDF, PNG, JPG o WebP.");
  const bitmap = await createImageBitmap(file);
  if (
    bitmap.width * bitmap.height > 24_000_000 ||
    bitmap.width > 12000 ||
    bitmap.height > 12000
  ) {
    bitmap.close();
    throw new Error("La imagen supera el límite de 24 megapíxeles.");
  }
  bitmap.close();
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, location.origin).href;
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const abort = () => {
    void worker?.terminate();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    worker = await createWorker(["spa", "eng"], OEM.LSTM_ONLY, {
      workerPath: base + "worker.min.js",
      corePath: base + "core/",
      langPath: base + "lang/",
      workerBlobURL: false,
      gzip: true,
      cacheMethod: "none",
      logger: (message) => {
        if (message.status === "recognizing text") progress(message.progress);
      },
    });
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    signal.removeEventListener("abort", abort);
    await worker?.terminate().catch(() => {});
  }
}
