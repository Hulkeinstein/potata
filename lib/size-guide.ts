export type SizeGuideColumn = {
  readonly key: string;
  readonly label: string;
};

export type SizeGuideRow = {
  readonly size: string;
  readonly measurements: Readonly<Record<string, number>>;
};

export type SizeGuide = {
  readonly version: 1;
  readonly measurementType: "garment" | "body";
  readonly unit: "cm";
  readonly columns: readonly SizeGuideColumn[];
  readonly rows: readonly SizeGuideRow[];
  readonly note?: string;
};

const MAX_COLUMNS = 8;
const MAX_ROWS = 20;
const MAX_TEXT = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= MAX_TEXT ? text : null;
}

function parseColumns(value: unknown): readonly SizeGuideColumn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COLUMNS) return null;
  const columns: SizeGuideColumn[] = [];
  const keys = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) return null;
    const key = parseText(item.key);
    const label = parseText(item.label);
    if (!key || !label || keys.has(key) || !/^[a-z][a-z0-9_]*$/.test(key)) return null;
    keys.add(key);
    columns.push({ key, label });
  }
  return columns;
}

function parseRows(value: unknown, columns: readonly SizeGuideColumn[], productSizes?: readonly string[]): readonly SizeGuideRow[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ROWS) return null;
  const rows: SizeGuideRow[] = [];
  const sizes = new Set<string>();
  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.measurements)) return null;
    const size = parseText(item.size);
    if (!size || sizes.has(size) || (productSizes && !productSizes.includes(size))) return null;
    if (Object.keys(item.measurements).length !== columns.length) return null;
    const measurements: Record<string, number> = {};
    for (const column of columns) {
      const measurement = item.measurements[column.key];
      if (typeof measurement !== "number" || !Number.isFinite(measurement) || measurement <= 0) return null;
      measurements[column.key] = measurement;
    }
    sizes.add(size);
    rows.push({ size, measurements });
  }
  if (productSizes && productSizes.some((size) => !sizes.has(size))) return null;
  return rows;
}

export function parseSizeGuide(value: unknown, productSizes?: readonly string[]): SizeGuide | null {
  if (!isRecord(value) || value.version !== 1 || value.unit !== "cm") return null;
  if (value.measurementType !== "garment" && value.measurementType !== "body") return null;
  const columns = parseColumns(value.columns);
  if (!columns) return null;
  const rows = parseRows(value.rows, columns, productSizes);
  if (!rows) return null;
  const note = value.note === undefined ? undefined : parseText(value.note);
  if (value.note !== undefined && !note) return null;
  const measurementType: SizeGuide["measurementType"] = value.measurementType;
  const base = { version: 1 as const, measurementType, unit: "cm" as const, columns, rows };
  return note ? { ...base, note } : base;
}
