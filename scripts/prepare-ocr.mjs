import { copyFile, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const tessRoot = path.dirname(require.resolve("tesseract.js/package.json"));
const tessRequire = createRequire(path.join(tessRoot, "package.json"));
const coreRoot = path.dirname(
  tessRequire.resolve("tesseract.js-core/package.json"),
);
const target = path.resolve("public/ocr");
await mkdir(path.join(target, "core"), { recursive: true });
await mkdir(path.join(target, "lang"), { recursive: true });
await copyFile(
  path.join(tessRoot, "dist/worker.min.js"),
  path.join(target, "worker.min.js"),
);
for (const file of await readdir(coreRoot))
  if (/^tesseract-core.*\.(js|wasm)$/.test(file))
    await copyFile(path.join(coreRoot, file), path.join(target, "core", file));
for (const lang of ["spa", "eng"]) {
  const langRoot = path.dirname(
    require.resolve(`@tesseract.js-data/${lang}/package.json`),
  );
  await copyFile(
    path.join(langRoot, "4.0.0_best_int", lang + ".traineddata.gz"),
    path.join(target, "lang", lang + ".traineddata.gz"),
  );
}
await copyFile(
  path.join(tessRoot, "LICENSE.md"),
  path.join(target, "TESSERACT-LICENSE.md"),
);
await copyFile(
  path.join(coreRoot, "LICENSE"),
  path.join(target, "TESSERACT-CORE-LICENSE.txt"),
);
console.log("Prepared same-origin OCR worker, WASM and language models.");
