import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";

const EXCEL_PATH = path.resolve("data", "products.xlsx");
const FOTOS_DIR = path.resolve("assets-src");
const PUBLIC_OUT_DIR = path.resolve("public", "images", "fotos");
const DOCS_OUT_DIR = path.resolve("docs", "images", "fotos");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function tokenize(s) {
  const stop = new Set(["celular", "de"]);
  const raw = norm(s)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t && !stop.has(t));

  // Merge patterns like: "a" "16" => "a16" (common in model names)
  const merged = [];
  for (let i = 0; i < raw.length; i += 1) {
    const t = raw[i];
    const next = raw[i + 1];
    if (t && next && t.length === 1 && /^[a-z]$/.test(t) && /^\d+$/.test(next)) {
      merged.push(`${t}${next}`);
      i += 1;
      continue;
    }
    merged.push(t);
  }

  return merged;
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function statSafe(p) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

function scoreFileName(fileName) {
  const n = fileName.toLowerCase();
  let score = 0;

  // Prefer typical product-image sizes / patterns
  if (n.includes("800x800")) score += 50;
  if (n.includes("700x700")) score += 40;
  if (n.match(/\b\d+x\d+\b/)) score += 10;

  // Prefer numeric gallery-like filenames used by many WP exports
  if (n.match(/^\d+[\-_]/)) score += 10;

  // De-prioritize obvious non-product assets
  const badTokens = [
    "logo",
    "tarjeta",
    "btn",
    "contacto",
    "accesorios",
    "pago",
    "shopping",
    "paseo",
    "electronica",
    "electrodomesticos",
    "informatica",
    "juegos",
    "billeteras",
    "visa",
    "master",
    "american",
    "footer",
  ];
  if (badTokens.some((t) => n.includes(t))) score -= 100;

  return score;
}

async function main() {
  await fs.mkdir(PUBLIC_OUT_DIR, { recursive: true });
  await fs.mkdir(DOCS_OUT_DIR, { recursive: true });

  const entries = await fs.readdir(FOTOS_DIR, { withFileTypes: true });

  // Map root-level image files by base name
  const rootImagesByBase = new Map();
  // Map *_files dirs by base name
  const filesDirsByBase = new Map();

  // Token index for fuzzy matching (root-level images only)
  const rootImageTokenIndex = [];

  for (const e of entries) {
    if (e.isFile()) {
      const extRaw = path.extname(e.name);
      const ext = extRaw.toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;

      // IMPORTANT: use extRaw (original casing) when stripping the extension
      const baseRaw = path.basename(e.name, extRaw);
      const base = norm(baseRaw);

      const arr = rootImagesByBase.get(base) ?? [];
      arr.push(e.name);
      rootImagesByBase.set(base, arr);

      rootImageTokenIndex.push({
        fileName: e.name,
        base,
        tokens: tokenize(base),
      });
    } else if (e.isDirectory()) {
      if (!e.name.toLowerCase().endsWith("_files")) continue;
      const base = norm(e.name.slice(0, -"_files".length));
      filesDirsByBase.set(base, e.name);
    }
  }

  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const missing = [];
  let linked = 0;

  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    const model = String(row.model ?? "").trim();
    const key = norm(model);

    if (!id || !model) continue;

    let chosenPath = null;

    // 1) Prefer exact model match at assets-src root
    const rootCandidates = rootImagesByBase.get(key) ?? [];
    if (rootCandidates.length > 0) {
      let best = null;
      for (const f of rootCandidates) {
        const p = path.join(FOTOS_DIR, f);
        const st = await statSafe(p);
        if (!st) continue;
        if (!best || st.size > best.size) best = { p, size: st.size };
      }
      if (best) chosenPath = best.p;
    }

    // 2) Fall back to matching *_files directory (pick best-looking image within)
    if (!chosenPath) {
      const dirName = filesDirsByBase.get(key);
      if (dirName) {
        const dirPath = path.join(FOTOS_DIR, dirName);
        const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
        const fileCandidates = [];

        for (const de of dirEntries) {
          if (!de.isFile()) continue;
          const ext = path.extname(de.name).toLowerCase();
          if (!IMAGE_EXTS.has(ext)) continue;

          const p = path.join(dirPath, de.name);
          const st = await statSafe(p);
          if (!st) continue;

          fileCandidates.push({
            p,
            size: st.size,
            score: scoreFileName(de.name),
          });
        }

        fileCandidates.sort((a, b) => {
          // primary: score, secondary: size
          if (b.score !== a.score) return b.score - a.score;
          return b.size - a.size;
        });

        if (fileCandidates.length > 0) {
          chosenPath = fileCandidates[0].p;
        }
      }
    }

    // 2.5) Fuzzy match against root-level images when names differ (e.g. model vs slug)
    if (!chosenPath) {
      const modelTokens = tokenize(model);
      const digitTokens = modelTokens.filter((t) => /\d/.test(t));
      const minScore = modelTokens.length <= 2 ? 0.12 : 0.35;
      let best = null;

      for (const cand of rootImageTokenIndex) {
        // For very short model names, avoid accidental matches by requiring digit-containing tokens to match.
        if (modelTokens.length <= 2 && digitTokens.length > 0) {
          const candSet = new Set(cand.tokens);
          if (!digitTokens.every((t) => candSet.has(t))) continue;
        }

        const score = jaccard(modelTokens, cand.tokens);
        if (score < minScore) continue;

        const p = path.join(FOTOS_DIR, cand.fileName);
        const st = await statSafe(p);
        if (!st) continue;

        if (!best || score > best.score || (score === best.score && st.size > best.size)) {
          best = { p, score, size: st.size };
        }
      }

      if (best) chosenPath = best.p;
    }

    // 3) If still no foto found, keep existing images as-is
    if (!chosenPath) {
      missing.push({ id, model });
      continue;
    }

    const ext = path.extname(chosenPath).toLowerCase();
    const outFileName = `p-${id}${ext}`;
    const publicOut = path.join(PUBLIC_OUT_DIR, outFileName);
    const docsOut = path.join(DOCS_OUT_DIR, outFileName);

    await fs.copyFile(chosenPath, publicOut);
    await fs.copyFile(chosenPath, docsOut);

    row.images = `/images/fotos/${outFileName}`;

    // Clear any absolute URL columns to avoid confusion
    if ("image_link_1" in row) row.image_link_1 = "";
    if ("image_link_2" in row) row.image_link_2 = "";
    if ("image_link_3" in row) row.image_link_3 = "";
    if ("image_links" in row) row.image_links = "";

    linked += 1;
  }

  const newSheet = xlsx.utils.json_to_sheet(rows, { skipHeader: false });
  workbook.Sheets[sheetName] = newSheet;
  xlsx.writeFile(workbook, EXCEL_PATH);

  console.log(
    JSON.stringify(
      {
        sheetName,
        products: rows.length,
        linked,
        missingCount: missing.length,
        missing,
        publicOutDir: PUBLIC_OUT_DIR,
        docsOutDir: DOCS_OUT_DIR,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("Failed to link assets-src images:", err);
  process.exit(1);
});
