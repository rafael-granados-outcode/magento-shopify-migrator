"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCsv = writeCsv;
const csv_writer_1 = require("csv-writer");
function sanitizeValue(value) {
    if (value === null || value === undefined)
        return "";
    return String(value)
        .replace(/\r\n/g, " ") // Windows newlines
        .replace(/\n/g, " ") // Unix newlines
        .replace(/\r/g, " ") // Old Mac newlines
        .replace(/\t/g, " ") // Tabs
        .replace(/\u0000/g, "") // Null chars
        .trim();
}
function normalizeRows(rows) {
    const allKeys = new Set();
    rows.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);
    return rows.map(row => {
        const normalized = {};
        keys.forEach(key => {
            normalized[key] = sanitizeValue(row[key]);
        });
        return normalized;
    });
}
async function writeCsv(rows) {
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row)))).map(key => ({ id: key, title: key }));
    const writer = (0, csv_writer_1.createObjectCsvWriter)({
        path: "shopify_import.csv",
        header: headers,
        alwaysQuote: true,
    });
    const normalizedRows = normalizeRows(rows);
    await writer.writeRecords(normalizedRows);
}
