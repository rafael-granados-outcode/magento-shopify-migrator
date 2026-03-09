import { createObjectCsvWriter } from "csv-writer";
import { RedirectRow } from "./types";

export async function writeRedirectCsv(rows: RedirectRow[]) {

  const writer = createObjectCsvWriter({
    path: "redirects.csv",
    header: [
      { id: "Command", title: "Command" },
      { id: "Path", title: "Path" },
      { id: "Target", title: "Target" },
    ],
  });

  await writer.writeRecords(rows);

  console.log(`Redirect CSV exported (${rows.length} redirects)`);
}