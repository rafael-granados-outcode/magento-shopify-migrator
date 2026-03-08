"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateAllOrders = migrateAllOrders;
const db_1 = require("./db");
const magentoOrderLoader_1 = require("./services/magentoOrderLoader");
const orderNormalizer_1 = require("./services/orderNormalizer");
const orderCreator_1 = require("./services/orderCreator");
const shopifyCustomerService_1 = require("./services/shopifyCustomerService");
// Helper to wait between requests
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function migrateAllOrders(limit = 1000) {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.query(`
      SELECT o.entity_id, o.customer_email
      FROM sales_flat_order o
      JOIN sales_flat_order_payment p
        ON p.parent_id = o.entity_id
      WHERE o.customer_email IS NOT NULL
      AND o.customer_email != ''
      AND o.customer_email NOT LIKE '%@marketplace.amazon.com%'
      AND p.method NOT LIKE 'm2epro%'
      AND o.status != 'canceled'
      ORDER BY o.entity_id ASC
      LIMIT ?
    `, [limit]);
    await conn.end();
    const orders = rows;
    for (const row of orders) {
        const magentoOrderId = row.entity_id;
        const email = row.customer_email;
        try {
            const magentoData = await (0, magentoOrderLoader_1.loadMagentoOrder)(magentoOrderId);
            // Skip filtered orders (Amazon, cancelled, etc)
            if (!magentoData) {
                console.log(`⏭️ Skipping filtered order ${magentoOrderId}`);
                continue;
            }
            const { order, items, billing, shipping } = magentoData;
            const shopifyCustomerId = await (0, shopifyCustomerService_1.findOrCreateShopifyCustomerByEmail)(email, billing, shipping, order);
            const normalized = (0, orderNormalizer_1.normalizeMagentoOrder)(order, items, billing, shipping, shopifyCustomerId);
            const shopifyOrder = await (0, orderCreator_1.createOrder)(normalized);
            console.log(`✅ Migrated Magento #${normalized.incrementId} → Shopify ID ${shopifyOrder.id}`);
            await sleep(15000);
        }
        catch (err) {
            const errorData = err.response?.data || err.message;
            console.error(`❌ Failed to migrate Magento order ${magentoOrderId} (${email}):`, errorData);
            if (err.response?.status === 429) {
                console.log("🛑 Rate limit reached. Sleeping for 30 seconds...");
                await sleep(30000);
            }
        }
    }
}
