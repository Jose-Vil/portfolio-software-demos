import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const ignore = new Set([
  ".git",
  "node_modules",
  "dist",
  "ocr",
  "test-results",
  "playwright-report",
]);
const patterns = [
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "GitHub credential",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/,
  ],
  ["Google API credential", /\bAIza[A-Za-z0-9_-]{30,}\b/],
  [
    "JWT credential",
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  ],
  ["Email address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["Phone-like identifier", /["'`](?:\+?52)?\d{10}["'`]/],
];
const findings = [];
let checked = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (
      /^\.env(?!\.example$)|\.(?:pem|p12|pfx|key|cer|keystore|jks|mp3|mp4|xlsx|docx)$/i.test(
        entry.name,
      )
    )
      findings.push({ file, kind: "Forbidden file" });
    if (!/\.(?:[cm]?[jt]sx?|json|ya?ml|md|html|css|svg|txt)$/.test(entry.name))
      continue;
    checked++;
    const content = (await readFile(file, "utf8"))
      .replaceAll("520000000001", "FICTIONAL_SENDER_ONE")
      .replaceAll("520000000002", "FICTIONAL_SENDER_TWO");
    for (const [kind, regex] of patterns)
      if (regex.test(content)) findings.push({ file, kind });
  }
}
await walk(".");
if (findings.length) {
  console.error(JSON.stringify({ checked, findings }, null, 2));
  process.exitCode = 1;
} else
  console.log(
    `Publication check passed: ${checked} text files, no configured secret/contact/operational patterns found.`,
  );
