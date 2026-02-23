import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";

const PROJECT_ROOT = path.resolve(".");
const DATA_DIR = path.resolve(PROJECT_ROOT, "data");
const EXCEL_PATH = path.resolve(DATA_DIR, "products.xlsx");

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
 * List transcribed from the screenshot provided in chat.
 * Prices are in PYG (Guaraní) as integers.
 */
const SCREENSHOT_PRODUCTS = [
  { model: "CELULAR XIAOMI REDMI 15 C 128 GB", price: 840000 },
  { model: "CELULAR REDMI NOTE 14 DE 128", price: 1190000 },
  { model: "CELULAR REDMI A5 64GB", price: 650000 },
  { model: "CELULAR REDMIA A2 32 gb", price: 540000 },
  { model: "CELULAR A14 128G SWAP", price: 750000 },
  { model: "CELULAR IPHONE 16 128 GB", price: 5650000 },
  { model: "CELULAR REDMI A5 128 GB", price: 820000 },
  { model: "CELULAR SAMSUNG A06 128 GB", price: 820000 },
  { model: "CELULAR SAMSUNG A16 8 RAM 256 GB", price: 1590000 },
  { model: "CELULAR SAMSUNG A26 256/8", price: 1790000 },
  { model: "CELULAR SAMSUNG A17 128 GB", price: 1290000 },
  { model: "CELULAR SAMSUNG A04 SWAP 128 GB", price: 650000 },
  { model: "CELULAR SAMSUNG A15 SWAP", price: 790000 },
  { model: "CELULAR TECNO SPARK 20 256 GB", price: 820000 },
  { model: "CELULAR REDMI NOTE 14 PRO 256 GB", price: 1950000 },
  { model: "CELULAR A 16 SWAP", price: 850000 },
  { model: "CELULAR IPHONE 11 DE 128 GB", price: 1690000 },
  { model: "CELULAR IPHONE XR 128GB", price: 1250000 },
  { model: "CELULAR NOKIA 106", price: 140000 },
  { model: "CELULAR IPHONE 11 PRO 64 GB", price: 1750000 },
  { model: "CELULAR SAMSUNG NOTE 20 5G SWAP", price: 1550000 },
  { model: "CELULAR SAMSUNG A13 64GB", price: 690000 },
  { model: "CELULAR TECNO SPARK 128 GB", price: 720000 },
  { model: "CELULAR LG B220", price: 140000 },
  { model: "CELULAR HONOR X5B 128 GB", price: 720000 },
  { model: "CELULAR REDMI 15C 256 GB", price: 940000 },
  { model: "CELULAR SAMSUNG A06 4/64GB", price: 690000 },
  { model: "CELULAR SAMSUNG A16 6/128GB", price: 990000 },
  { model: "CELULAR SAMSUNG S24 FE", price: 3690000 },
  { model: "CELULAR SAMSUNG S23 FE SWAP", price: 2550000 },
  { model: "CELULAR IPHONE 15 128G SWAP", price: 3850000 },
  { model: "CELULAR IPHONE 12 128 GB SWAP", price: 1790000 },
  { model: "CELULAR IPHONE 13 PRO 128 GB SWAP", price: 3300000 },
  { model: "CELULAR IPHONE 14 PRO 256 GB SWAP", price: 4500000 },
  { model: "CELULAR IPHONE 13 PRO MAX 128 GB SWAP", price: 3390000 },
];

function normalizeModel(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\bgb\b/gi, "GB")
    .trim();
}

function detectBrand(model) {
  const m = normalizeModel(model).toLowerCase();

  // Order matters: some Xiaomi/Redmi models contain "A5", "A2", etc.
  if (m.includes("iphone") || m.includes("apple")) return { id: "apple", name: "Apple" };
  if (m.includes("xiaomi") || m.includes("redmi") || m.includes("poco")) return { id: "xiaomi", name: "Xiaomi" };
  if (m.includes("samsung") || /\ba\s*\d+\b/.test(m) || /\ba\d+\b/.test(m)) {
    return { id: "samsung", name: "Samsung" };
  }
  if (m.includes("honor")) return { id: "honor", name: "Honor" };
  if (m.includes("tecno")) return { id: "tecno", name: "Tecno" };
  if (m.includes("nokia")) return { id: "nokia", name: "Nokia" };
  if (/\blg\b/.test(m)) return { id: "lg", name: "LG" };

  return { id: "unknown", name: "Sin marca" };
}

function parseRamGb(model) {
  const m = normalizeModel(model).toUpperCase();

  // e.g. "8 RAM"
  const ramMatch = m.match(/\b(\d{1,2})\s*RAM\b/);
  if (ramMatch) return `${ramMatch[1]}GB`;

  // e.g. "256/8" or "4/64GB" or "6/128GB"
  const slashMatch = m.match(/\b(\d{1,4})\s*\/\s*(\d{1,2})\b/);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    // Assume the smaller number is RAM when it looks plausible.
    if (b > 0 && b <= 24 && a >= 32) return `${b}GB`;
  }

  return "";
}

function parseStorageOptions(model) {
  const m = normalizeModel(model).toUpperCase();

  const storages = new Set();

  // explicit e.g. 128 GB, 256GB, 128G
  for (const match of m.matchAll(/\b(\d{2,4})\s*(?:GB|G)\b/g)) {
    const n = Number(match[1]);
    if ([32, 64, 128, 256, 512, 1024].includes(n)) storages.add(`${n}GB`);
  }

  // patterns like "DE 128" (storage implied)
  const deMatch = m.match(/\bDE\s*(\d{2,4})\b/);
  if (deMatch) {
    const n = Number(deMatch[1]);
    if ([32, 64, 128, 256, 512, 1024].includes(n)) storages.add(`${n}GB`);
  }

  // slash patterns like 256/8
  const slash = m.match(/\b(\d{1,4})\s*\/\s*(\d{1,2})\b/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const maybeStorage = a >= b ? a : b;
    if ([32, 64, 128, 256, 512, 1024].includes(maybeStorage)) storages.add(`${maybeStorage}GB`);
  }

  return Array.from(storages);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  // backup existing file if present
  if (await fileExists(EXCEL_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.resolve(DATA_DIR, `products.backup-${stamp}.xlsx`);
    await fs.copyFile(EXCEL_PATH, backupPath);
    console.log("Backed up existing Excel to:", backupPath);
  }

  const rows = SCREENSHOT_PRODUCTS.map((p, idx) => {
    const model = normalizeModel(p.model);
    const brand = detectBrand(model);
    const ram = parseRamGb(model);
    const storage = parseStorageOptions(model);

    return {
      id: String(idx + 1),
      brand_id: brand.id,
      brand_name: brand.name,
      model,
      price: Number(p.price) || 0,
      sale_price: "",
      storage_options: storage.join(","),
      display_size: "",
      processor: "",
      ram,
      camera: "",
      battery: "",
      release_year: "",
      description: "",
      images: "",
      is_featured: false,
      is_published: true,
    };
  });

  const worksheetData = rows.map((row) => {
    const ordered = {};
    for (const col of EXCEL_COLUMNS) ordered[col] = col in row ? row[col] : "";
    return ordered;
  });

  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(worksheetData, { header: EXCEL_COLUMNS });
  xlsx.utils.book_append_sheet(workbook, sheet, "Products");

  xlsx.writeFile(workbook, EXCEL_PATH);
  console.log(`Wrote ${rows.length} rows to`, EXCEL_PATH);
}

main().catch((err) => {
  console.error("Failed to overwrite products.xlsx:", err);
  process.exit(1);
});
