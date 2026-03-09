"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeRedirectCsv = writeRedirectCsv;
const csv_writer_1 = require("csv-writer");
async function writeRedirectCsv(rows) {
    const writer = (0, csv_writer_1.createObjectCsvWriter)({
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
