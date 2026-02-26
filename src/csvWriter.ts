import { createObjectCsvWriter } from "csv-writer";
import { ShopifyRow } from "./types";

function sanitizeValue(value: any): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\r\n/g, " ")   // Windows newlines
    .replace(/\n/g, " ")     // Unix newlines
    .replace(/\r/g, " ")     // Old Mac newlines
    .replace(/\t/g, " ")     // Tabs
    .replace(/\u0000/g, "")  // Null chars
    .trim();
}

function normalizeRows(rows: Record<string, any>[]) {
  const allKeys = new Set<string>();

  rows.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });

  const keys = Array.from(allKeys);

  return rows.map(row => {
    const normalized: Record<string, any> = {};

    keys.forEach(key => {
      normalized[key] = sanitizeValue(row[key]);
    });

    return normalized;
  });
}

export async function writeCsv(rows: ShopifyRow[]) {

  const headers = Array.from(
    new Set(rows.flatMap(row => Object.keys(row)))
  ).map(key => ({ id: key, title: key }));

  const writer = createObjectCsvWriter({
    path: "shopify_import.csv",
    header: headers,
    alwaysQuote: true,
  });

  const normalizedRows = normalizeRows(rows);
  await writer.writeRecords(normalizedRows);
}