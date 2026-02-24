import { createObjectCsvWriter } from "csv-writer";
import { ShopifyRow } from "./types";

function normalizeRows(rows: Record<string, any>[]) {
  const allKeys = new Set<string>();

  // Collect all keys
  rows.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });

  const keys = Array.from(allKeys);

  // Ensure every row has all keys
  return rows.map(row => {
    const normalized: Record<string, any> = {};
    keys.forEach(key => {
      normalized[key] = row[key] ?? "";
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