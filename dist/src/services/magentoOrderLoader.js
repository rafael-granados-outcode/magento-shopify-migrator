"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMagentoOrder = loadMagentoOrder;
const db_1 = require("../db");
async function loadMagentoOrder(entityId) {
    const conn = await (0, db_1.db)();
    const [orders] = await conn.query(`
    SELECT o.*
    FROM sales_flat_order o
    JOIN sales_flat_order_payment p
      ON p.parent_id = o.entity_id
    WHERE o.entity_id = ?
      AND p.method != 'm2epropayment'
      AND o.customer_email NOT LIKE '%@marketplace.amazon.com%'
      AND o.status != 'canceled'
    LIMIT 1
    `, [entityId]);
    const order = orders[0];
    // If filtered out (Amazon order), skip
    if (!order) {
        await conn.end();
        return null;
    }
    const [items] = await conn.query(`
    SELECT *
    FROM sales_flat_order_item
    WHERE order_id = ?
    AND parent_item_id IS NULL
    `, [entityId]);
    const [addresses] = await conn.query("SELECT * FROM sales_flat_order_address WHERE parent_id = ?", [entityId]);
    const [payments] = await conn.query("SELECT * FROM sales_flat_order_payment WHERE parent_id = ?", [entityId]);
    const [statusHistory] = await conn.query(`
    SELECT *
    FROM sales_flat_order_status_history
    WHERE parent_id = ?
    ORDER BY created_at ASC
    `, [entityId]);
    const [shipments] = await conn.query(`
    SELECT *
    FROM sales_flat_shipment_track
    WHERE order_id = ?
    `, [entityId]);
    const billing = addresses.find((a) => a.address_type === "billing");
    const shipping = addresses.find((a) => a.address_type === "shipping");
    await conn.end();
    return {
        order,
        items,
        billing,
        shipping,
        payments,
        statusHistory,
        shipments,
    };
}
