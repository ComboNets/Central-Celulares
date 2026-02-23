import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";

const EXCEL_PATH = path.resolve("data", "products.xlsx");

// Simple average across multiple Paraguay retailers, rounded to the nearest 1,000 PYG.
// NOTE: This script updates ONLY the models listed here.
const PRICE_UPDATES = [
  { model: "CELULAR SAMSUNG GALAXY S25 12+256GB", price: 5847000 },
  { model: "CELULAR SAMSUNG GALAXY S25+ 12+256GB", price: 6695000 },
  { model: "CELULAR SAMSUNG GALAXY S25+ 12+512GB", price: 8815000 },

  { model: "CELULAR SAMSUNG GALAXY S24 ULTRA 256GB", price: 9182000 },
  { model: "CELULAR SAMSUNG GALAXY S24 ULTRA 512GB", price: 9353000 },

  { model: "CELULAR SAMSUNG GALAXY S23 ULTRA 256GB", price: 8150000 },

  { model: "CELULAR XIAOMI 15 12GB+512GB", price: 6372000 },
  { model: "CELULAR XIAOMI 15 ULTRA 16GB+512GB", price: 8391000 },
];

function normalizeKey(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(EXCEL_PATH))) {
    throw new Error(`Missing Excel file at ${EXCEL_PATH}`);
  }

  // Backup
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.resolve("data", `products.backup-before-reprice-${stamp}.xlsx`);
  await fs.copyFile(EXCEL_PATH, backupPath);

  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const updatesByModel = new Map(PRICE_UPDATES.map((u) => [normalizeKey(u.model), u]));

  let updatedCount = 0;
  const missing = [];

  for (const u of PRICE_UPDATES) {
    const key = normalizeKey(u.model);
    const row = rows.find((r) => normalizeKey(r.model) === key);
    if (!row) {
      missing.push(u.model);
      continue;
    }

    row.price = u.price;
    updatedCount += 1;
  }

  // Preserve original headers order (whatever is already in the sheet)
  const header = Object.keys(rows[0] || {});
  const newSheet = xlsx.utils.json_to_sheet(rows, header.length ? { header } : undefined);
  workbook.Sheets[sheetName] = newSheet;
  xlsx.writeFile(workbook, EXCEL_PATH);

  console.log(`Backed up to: ${backupPath}`);
  console.log(`Updated ${updatedCount} models.`);
  if (missing.length) {
    console.log(`Missing in Excel (not updated): ${missing.join(" | ")}`);
  }
}

main().catch((err) => {
  console.error("Failed to reprice models:", err);
  process.exit(1);
});
