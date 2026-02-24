import { createObjectCsvWriter } from "csv-writer";
import { ShopifyRow } from "./types";

export async function writeCsv(rows: ShopifyRow[]) {

  const headers = Array.from(
    new Set(rows.flatMap(row => Object.keys(row)))
  ).map(key => ({ id: key, title: key }));

  const writer = createObjectCsvWriter({
    path: "shopify_import.csv",
    header: headers,
  });

  await writer.writeRecords(rows);
}