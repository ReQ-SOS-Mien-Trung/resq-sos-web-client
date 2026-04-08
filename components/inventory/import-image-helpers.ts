import * as XLSX from "xlsx";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isImageHeader(value: unknown): boolean {
  const normalized = normalizeHeader(value);
  return (
    normalized === "anh" ||
    normalized === "hinh anh" ||
    normalized === "hinh anh vat pham" ||
    normalized === "image" ||
    normalized === "image url" ||
    normalized === "imageurl"
  );
}

export function getSheetRowsWithOptionalImageColumn(
  sheet: XLSX.WorkSheet,
  columnsWithoutImage: readonly string[],
  columnsWithImage: readonly string[],
): Record<string, unknown>[] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (rawRows.length === 0) return [];

  const headerRowIndex = rawRows.findIndex(
    (row) =>
      Array.isArray(row) &&
      String(row[0] ?? "").trim().toUpperCase() === "STT",
  );

  const headerRow =
    headerRowIndex >= 0 && Array.isArray(rawRows[headerRowIndex])
      ? rawRows[headerRowIndex]
      : [];
  const dataStart = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
  const columnNames = headerRow.some(isImageHeader)
    ? columnsWithImage
    : columnsWithoutImage;

  return rawRows.slice(dataStart).map((row) => {
    const arr = Array.isArray(row) ? row : [];
    const obj: Record<string, unknown> = {};

    columnNames.forEach((name, index) => {
      const raw = arr[index];
      obj[name] =
        raw !== null &&
        raw !== undefined &&
        typeof raw === "object" &&
        "v" in (raw as object)
          ? (raw as { v: unknown }).v ?? ""
          : raw ?? "";
    });

    return obj;
  });
}

export function extractImageUrlFromCell(rawImage: unknown): string {
  const imageUrl = String(rawImage ?? "").trim();
  return /^https?:\/\//i.test(imageUrl) ? imageUrl : "";
}

export function revokeBlobUrl(url?: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
