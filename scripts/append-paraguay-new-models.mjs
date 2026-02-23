import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";

const EXCEL_PATH = path.resolve("data", "products.xlsx");

// Must match scripts/update-products-from-excel.mjs
const EXCEL_COLUMNS = [
  "id",
  "brand_id",
  "brand_name",
  "model",
  "price",
  "sale_price",
  "storage_options",
  "display_size",
  "processor",
  "ram",
  "camera",
  "battery",
  "release_year",
  "description",
  "images",
  "is_featured",
  "is_published",
];

/**
 * Prices are estimated in PYG based on Paraguay retailers (e.g. TiendaMóvil, Nissei, Tecnoga, Tupi, Tecnostore, ShoppingChina)
 * and roughly aligned to the existing price level in this project.
 */
const NEW_PRODUCTS = [
  // Samsung (S25 series)
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S25 12+256GB", price: 5847000, storage_options: "256GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S25+ 12+256GB", price: 6695000, storage_options: "256GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S25+ 12+512GB", price: 8815000, storage_options: "512GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S25 ULTRA 12+256GB", price: 8890000, storage_options: "256GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S25 ULTRA 12+512GB", price: 9390000, storage_options: "512GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG S25 FE 8+256GB", price: 4950000, storage_options: "256GB", ram: "8GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG S25 FE 8+512GB", price: 5950000, storage_options: "512GB", ram: "8GB" },

  // Samsung (still commonly sold)
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S24 ULTRA 256GB", price: 9182000, storage_options: "256GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S24 ULTRA 512GB", price: 9353000, storage_options: "512GB", ram: "12GB" },
  { brand_id: "samsung", brand_name: "Samsung", model: "CELULAR SAMSUNG GALAXY S23 ULTRA 256GB", price: 8150000, storage_options: "256GB", ram: "12GB" },

  // Apple (Swap / reacondicionado)
  { brand_id: "apple", brand_name: "Apple", model: "CELULAR IPHONE 16 PRO 128GB ESIM SWAP", price: 7300000, storage_options: "128GB", ram: "" },
  { brand_id: "apple", brand_name: "Apple", model: "CELULAR IPHONE 16 PRO MAX 256GB ESIM SWAP", price: 8500000, storage_options: "256GB", ram: "" },
  { brand_id: "apple", brand_name: "Apple", model: "CELULAR IPHONE 15 PRO 128GB ESIM SWAP", price: 6100000, storage_options: "128GB", ram: "" },
  { brand_id: "apple", brand_name: "Apple", model: "CELULAR IPHONE 15 PRO 256GB ESIM SWAP", price: 6700000, storage_options: "256GB", ram: "" },

  // Xiaomi / Redmi (newer)
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR XIAOMI 15 12GB+512GB", price: 6372000, storage_options: "512GB", ram: "12GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR XIAOMI 15 ULTRA 16GB+512GB", price: 8391000, storage_options: "512GB", ram: "16GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR XIAOMI 15T 12GB+512GB", price: 4272000, storage_options: "512GB", ram: "12GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR XIAOMI 15T PRO 12GB+512GB", price: 6556000, storage_options: "512GB", ram: "12GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR XIAOMI 15T PRO 12GB+1024GB", price: 6325000, storage_options: "1024GB", ram: "12GB" },

  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR REDMI NOTE 15 6GB+128GB", price: 1449000, storage_options: "128GB", ram: "6GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR REDMI NOTE 15 8GB+256GB", price: 1637000, storage_options: "256GB", ram: "8GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR REDMI NOTE 15 5G 8GB+256GB", price: 2059000, storage_options: "256GB", ram: "8GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR REDMI NOTE 15 PRO 8GB+256GB", price: 2090000, storage_options: "256GB", ram: "8GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR REDMI NOTE 15 PRO 5G 8GB+256GB", price: 2559000, storage_options: "256GB", ram: "8GB" },
  { brand_id: "xiaomi", brand_name: "Xiaomi", model: "CELULAR REDMI NOTE 15 PRO+ 12GB+512GB", price: 3559000, storage_options: "512GB", ram: "12GB" },

  // Honor / Unnecto
  { brand_id: "honor", brand_name: "Honor", model: "CELULAR HONOR X6C 6GB+256GB", price: 1199000, storage_options: "256GB", ram: "6GB" },
  { brand_id: "honor", brand_name: "Honor", model: "CELULAR HONOR X5C 4GB+128GB", price: 869000, storage_options: "128GB", ram: "4GB" },
  { brand_id: "unnecto", brand_name: "Unnecto", model: "CELULAR UNNECTO BOLT 10 DS 4GB+128GB", price: 1470000, storage_options: "128GB", ram: "4GB" },
  { brand_id: "unnecto", brand_name: "Unnecto", model: "CELULAR UNNECTO BOLT 20 DS 6GB+256GB", price: 2200000, storage_options: "256GB", ram: "6GB" },
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

function toOrderedRow(row) {
  const ordered = {};
  for (const col of EXCEL_COLUMNS) ordered[col] = col in row ? row[col] : "";
  return ordered;
}

async function main() {
  if (!(await exists(EXCEL_PATH))) {
    throw new Error(`Missing Excel file at ${EXCEL_PATH}`);
  }

  // Backup
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.resolve("data", `products.backup-before-append-${stamp}.xlsx`);
  await fs.copyFile(EXCEL_PATH, backupPath);

  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const existingModels = new Set(rows.map((r) => normalizeKey(r.model)));

  let maxId = 0;
  for (const r of rows) {
    const idNum = Number(String(r.id || "").trim());
    if (!Number.isNaN(idNum)) maxId = Math.max(maxId, idNum);
  }

  const appended = [];
  for (const p of NEW_PRODUCTS) {
    const key = normalizeKey(p.model);
    if (existingModels.has(key)) continue;

    maxId += 1;
    existingModels.add(key);

    const newRow = {
      id: String(maxId),
      brand_id: p.brand_id,
      brand_name: p.brand_name,
      model: p.model,
      price: Number(p.price) || 0,
      sale_price: "",
      storage_options: String(p.storage_options || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(","),
      display_size: "",
      processor: "",
      ram: String(p.ram || ""),
      camera: "",
      battery: "",
      release_year: "",
      description: "",
      images: "",
      is_featured: false,
      is_published: true,
    };

    appended.push(newRow);
    rows.push(newRow);
  }

  const worksheetData = rows.map(toOrderedRow);
  const newWb = xlsx.utils.book_new();
  const newSheet = xlsx.utils.json_to_sheet(worksheetData, { header: EXCEL_COLUMNS });
  xlsx.utils.book_append_sheet(newWb, newSheet, sheetName || "Products");
  xlsx.writeFile(newWb, EXCEL_PATH);

  console.log(`Backed up to: ${backupPath}`);
  console.log(`Appended ${appended.length} new models.`);
}

main().catch((err) => {
  console.error("Failed to append models:", err);
  process.exit(1);
});
