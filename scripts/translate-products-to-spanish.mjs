import xlsx from "xlsx";

const EXCEL_PATH = "data/products.xlsx";

function applyReplacements(input, replacements) {
  let out = String(input ?? "");
  for (const [re, rep] of replacements) out = out.replace(re, rep);
  return out;
}

function tDisplaySize(s) {
  if (!s) return s;
  return applyReplacements(s, [
    [/\bup to\b/gi, "hasta"],
  ]);
}

function tBattery(s) {
  if (!s) return s;
  return applyReplacements(s, [
    [/\(approx\)/gi, "(aprox.)"],
    [/\bapprox\b/gi, "aprox."],
    [/\bfast charging\b/gi, "carga rápida"],
    [/\bwireless charging\b/gi, "carga inalámbrica"],
    [/\bwireless\b/gi, "inalámbrica"],
    [/\bwired\b/gi, "por cable"],
    [/\bcharging\b/gi, "carga"],
  ]);
}

function tCamera(s) {
  if (!s) return s;
  return applyReplacements(s, [
    [/Rear:/gi, "Trasera:"],
    [/Front:/gi, "Frontal:"],
    [/\bmain\b/gi, "principal"],
    [/\bauxiliary\b/gi, "auxiliar"],
    [/\bwide\b/gi, "gran angular"],
    [/\bultrawide\b/gi, "ultra gran angular"],
    [/\bultra wide\b/gi, "ultra gran angular"],
    [/\btelephoto\b/gi, "teleobjetivo"],
    [/\bperiscope\b/gi, "periscópico"],
    [/\bdepth\b/gi, "profundidad"],
    [/\bmacro\b/gi, "macro"],
    [/\boptical zoom\b/gi, "zoom óptico"],
  ]);
}

function tDescription(s) {
  if (!s) return s;

  // Keep brand/product names as-is, translate common phrases.
  return applyReplacements(s, [
    [/\bAffordable\b/gi, "Económico"],
    [/\bBudget\b/gi, "De entrada"],
    [/\bEntry-level\b/gi, "De entrada"],
    [/\bMid-range\b/gi, "De gama media"],
    [/\bUpper mid-range\b/gi, "De gama media-alta"],
    [/\bflagship\b/gi, "tope de gama"],
    [/\bFan Edition\b/gi, "Fan Edition"],
    [/\bvalue\b/gi, "buena relación calidad-precio"],
    [/\bphone\b/gi, "teléfono"],
    [/\bsmartphone\b/gi, "smartphone"],
    [/\bwith\b/gi, "con"],
    [/\band\b/gi, "y"],
    [/\bplus\b/gi, "más"],
    [/\bbig\b/gi, "gran"],
    [/\blarge\b/gi, "gran"],
    [/\bcompact\b/gi, "compacto"],
    [/\bperformance\b/gi, "rendimiento"],
    [/\bcamera system\b/gi, "sistema de cámaras"],
    [/\bcameras\b/gi, "cámaras"],
    [/\bcamera\b/gi, "cámara"],
    [/\bdisplay\b/gi, "pantalla"],
    [/\bbattery\b/gi, "batería"],
    [/\bsmooth\b/gi, "fluida"],
    [/\bmain\b/gi, "principal"],
    [/\bdual\b/gi, "doble"],
    [/\bfast charging\b/gi, "carga rápida"],
    [/\bwireless\b/gi, "inalámbrica"],
    [/\bcharging\b/gi, "carga"],
    [/\bruns\b/gi, "incluye"],
    [/\bsupports\b/gi, "es compatible con"],
    [/\bused\/refurbished\b/gi, "usado/reacondicionado"],
    [/\bSWAP\/refurbished\b/gi, "SWAP/reacondicionado"],
    [/\brefurbished\b/gi, "reacondicionado"],
    [/\bdual-camera\b/gi, "doble cámara"],
    [/\btriple-camera\b/gi, "triple cámara"],
    [/\bquad-camera\b/gi, "cuádruple cámara"],
    [/\btriple cameras\b/gi, "triple cámara"],
    [/\bLong software support\b/gi, "soporte de software prolongado"],
    [/\blong software support\b/gi, "soporte de software prolongado"],
    [/\blong battery life\b/gi, "gran autonomía"],
    [/\bstrong battery life\b/gi, "gran autonomía"],
    [/\bvery fast\b/gi, "muy rápida"],
    [/\bvery fast 120W charging\b/gi, "carga muy rápida de 120W"],
    [/\bvery fast 120W\b/gi, "muy rápida de 120W"],
    [/\bvery fast charging\b/gi, "carga muy rápida"],
    [/\bfast\b/gi, "rápida"],
    [/\bsolid\b/gi, "sólida"],
    [/\bversatile\b/gi, "versátil"],
    [/\bbalanced\b/gi, "equilibrado"],
    [/\badvanced\b/gi, "avanzado"],
    [/\bbright\b/gi, "brillante"],
    [/\bincluding\b/gi, "incluyendo"],
    [/\btelephoto\b/gi, "teleobjetivo"],
    [/\btop-tier\b/gi, "de primer nivel"],
    [/\btop\b/gi, "principal"],
  ]);
}

function translateRow(row) {
  if (typeof row.display_size === "string" && row.display_size) {
    row.display_size = tDisplaySize(row.display_size);
  }
  if (typeof row.camera === "string" && row.camera) {
    row.camera = tCamera(row.camera);
  }
  if (typeof row.battery === "string" && row.battery) {
    row.battery = tBattery(row.battery);
  }
  if (typeof row.description === "string" && row.description) {
    row.description = tDescription(row.description);
  }
  return row;
}

const workbook = xlsx.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

for (const row of rows) translateRow(row);

workbook.Sheets[sheetName] = xlsx.utils.json_to_sheet(rows, { skipHeader: false });
xlsx.writeFile(workbook, EXCEL_PATH);

console.log(`Translated ${rows.length} rows to Spanish in ${EXCEL_PATH} (sheet: ${sheetName}).`);
