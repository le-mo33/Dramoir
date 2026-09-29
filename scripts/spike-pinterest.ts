// S0 spike (a): can we turn the sheet's pin.it links into images from this machine / a GitHub runner?
// Usage: pnpm tsx scripts/spike-pinterest.ts [path-to-xlsx] [count]
// Picks `count` poster links spread evenly across the Kdrama sheet, resolves each, and checks the image downloads.
import ExcelJS from "exceljs";
import { extractFirstUrl, resolveImageSource } from "../src/images/resolve";

const file = process.argv[2] ?? "docs/inputs/Dramoir.xlsx";
const count = Number(process.argv[3] ?? 25);

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object" && "hyperlink" in v) return String(v.hyperlink ?? v.text ?? "");
  if (typeof v === "object" && "text" in v) return String(v.text);
  return String(v);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.worksheets.find((s) => s.name.trim() === "Kdrama Database");
  if (!sheet) throw new Error("Kdrama Database sheet not found");
  const header = (sheet.getRow(2).values as ExcelJS.CellValue[]).map((v) => cellText(v).trim().toLowerCase());
  const titleCol = header.indexOf("title");
  const posterCol = header.indexOf("poster url");

  const rows: { title: string; url: string }[] = [];
  for (let r = 3; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const url = extractFirstUrl(cellText(row.getCell(posterCol).value));
    if (url?.includes("pin.it")) rows.push({ title: cellText(row.getCell(titleCol).value).trim(), url });
  }
  const step = Math.max(1, Math.floor(rows.length / count));
  const sample = rows.filter((_, i) => i % step === 0).slice(0, count);

  let ok = 0;
  for (const { title, url } of sample) {
    const res = await resolveImageSource(url);
    let status = res.ok ? "" : `FAIL ${res.reason}`;
    if (res.ok) {
      // Try candidates largest-first (originals, then 736x), as the real image job will.
      for (const [i, candidate] of res.imageUrls.entries()) {
        const img = await fetch(candidate, { method: "HEAD" });
        const type = img.headers.get("content-type") ?? "";
        if (img.ok && type.startsWith("image/")) {
          ok++;
          status = `ok ${type} ${img.headers.get("content-length") ?? "?"} bytes${i > 0 ? " (fallback size)" : ""}`;
          break;
        }
        status = `FAIL image HTTP ${img.status} ${type}`;
      }
    }
    console.log(`${title.padEnd(40).slice(0, 40)} ${status}`);
    await new Promise((r) => setTimeout(r, 1500)); // be polite: one request every ~1.5 s
  }
  const pct = Math.round((ok / sample.length) * 100);
  console.log(`\nResult: ${ok}/${sample.length} resolved to a downloadable image (${pct}%).`);
  process.exitCode = pct >= 80 ? 0 : 1;
}

main();
