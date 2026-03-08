"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOrderIds = loadOrderIds;
const db_1 = require("../db");
async function loadOrderIds() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.query(`
    SELECT o.entity_id
    FROM sales_flat_order o
    JOIN sales_flat_order_payment p
      ON p.parent_id = o.entity_id
    WHERE
      o.customer_email IS NOT NULL
      AND o.customer_email != ''
      AND o.customer_email NOT LIKE '%@marketplace.amazon.com%'
      AND p.method NOT LIKE 'm2epro%'
      AND o.status != 'canceled'
    ORDER BY o.entity_id ASC
  `);
    await conn.end();
    return rows.map(r => r.entity_id);
}
