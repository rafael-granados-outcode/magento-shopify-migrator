"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCsv = writeCsv;
const csv_writer_1 = require("csv-writer");
/**
 * Convert Magento datetime fields into Matrixify format
 * Matrixify expects: YYYY-MM-DD HH:MM
 */
function normalizeDate(value) {
    if (!value)
        return "";
    const str = String(value).trim();
    // Magento invalid zero date
    if (str === "0000-00-00 00:00:00") {
        return "";
    }
    const date = new Date(str);
    if (isNaN(date.getTime())) {
        return "";
    }
    // convert to ISO and remove seconds
    return date.toISOString().slice(0, 16).replace("T", " ");
}
/**
 * Sanitize values for CSV export
 */
function sanitizeValue(key, value) {
    if (value === null || value === undefined) {
        return "";
    }
    // Magento datetime fields
    if (key.endsWith("_at")) {
        return normalizeDate(value);
    }
    return String(value)
        .replace(/\r\n/g, " ") // Windows newline
        .replace(/\n/g, " ") // Unix newline
        .replace(/\r/g, " ") // Old Mac newline
        .replace(/\t/g, " ") // tabs
        .replace(/\u0000/g, "") // null characters
        .trim();
}
/**
 * Normalize rows so every column exists
 */
function normalizeRows(rows) {
    if (!rows.length)
        return [];
    const allKeys = new Set();
    rows.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);
    return rows.map(row => {
        const normalized = {};
        keys.forEach(key => {
            normalized[key] = sanitizeValue(key, row[key]);
        });
        return normalized;
    });
}
/**
 * Write CSV file
 */
async function writeCsv(rows, path) {
    if (!rows.length) {
        console.log(`⚠️ No rows for ${path}`);
        return;
    }
    const normalizedRows = normalizeRows(rows);
    const headers = Object.keys(normalizedRows[0]).map(key => ({
        id: key,
        title: key
    }));
    const writer = (0, csv_writer_1.createObjectCsvWriter)({
        path,
        header: headers,
        alwaysQuote: true
    });
    await writer.writeRecords(normalizedRows);
    console.log(`✅ CSV written: ${path} (${normalizedRows.length} rows)`);
}
