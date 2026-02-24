"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCsv = writeCsv;
const csv_writer_1 = require("csv-writer");
async function writeCsv(rows) {
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row)))).map(key => ({ id: key, title: key }));
    const writer = (0, csv_writer_1.createObjectCsvWriter)({
        path: "shopify_import.csv",
        header: headers,
    });
    await writer.writeRecords(rows);
}
//# sourceMappingURL=csvWriter.js.map