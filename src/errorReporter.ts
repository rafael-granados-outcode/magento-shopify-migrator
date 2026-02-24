import { createObjectCsvWriter } from "csv-writer";

export async function exportFailures(failed: any[]) {
  if (!failed.length) return;

  const writer = createObjectCsvWriter({
    path: "failed-products.csv",
    header: [
      { id: "entity_id", title: "Entity ID" },
      { id: "sku", title: "SKU" },
      { id: "error", title: "Error" },
    ],
  });

  await writer.writeRecords(failed);
  console.log("Failed products exported to failed-products.csv");
}