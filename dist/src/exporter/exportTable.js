"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTable = exportTable;
const db_1 = require("../db");
const writeCsv_1 = require("./writeCsv");
async function exportTable(table, column, ids, output, extraWhere = "") {
    const conn = await (0, db_1.db)();
    const placeholders = ids.map(() => "?").join(",");
    const query = `
    SELECT *
    FROM ${table}
    WHERE ${column} IN (${placeholders})
    ${extraWhere}
  `;
    const [rows] = await conn.query(query, ids);
    await conn.end();
    await (0, writeCsv_1.writeCsv)(rows, output);
}
