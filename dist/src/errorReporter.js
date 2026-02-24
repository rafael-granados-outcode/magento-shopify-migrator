"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFailures = exportFailures;
const csv_writer_1 = require("csv-writer");
async function exportFailures(failed) {
    if (!failed.length)
        return;
    const writer = (0, csv_writer_1.createObjectCsvWriter)({
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
