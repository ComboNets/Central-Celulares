import xlsx from "xlsx";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error("Usage: node scripts/print-product-row.mjs <id-or-model-substring>");
  process.exit(1);
}

const workbook = xlsx.readFile("data/products.xlsx");
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

const byId = rows.find((r) => String(r.id) === query);
const byModel = rows.find((r) => String(r.model || "").toLowerCase().includes(query.toLowerCase()));

const found = byId ?? byModel;
if (!found) {
  console.error(`No row found for query: ${query}`);
  process.exit(2);
}

console.log(JSON.stringify(found, null, 2));
