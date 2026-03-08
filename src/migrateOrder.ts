import { db } from "./db";
import { loadMagentoOrder } from "./services/magentoOrderLoader";
import { normalizeMagentoOrder } from "./services/orderNormalizer";
import { createOrder } from "./services/orderCreator";
import { findOrCreateShopifyCustomerByEmail } from "./services/shopifyCustomerService";

// Helper to wait between requests
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function migrateAllOrders(limit: number = 1000) {
  const conn = await db();
  const [rows] = await conn.query(
    `
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
    `,
    [limit]
  );
  await conn.end();

  const orders = rows as any[];

  for (const row of orders) {
    const magentoOrderId = row.entity_id;
    const email = row.customer_email;
  
    try {
  
      const magentoData = await loadMagentoOrder(magentoOrderId);
  
      // Skip filtered orders (Amazon, cancelled, etc)
      if (!magentoData) {
        console.log(`⏭️ Skipping filtered order ${magentoOrderId}`);
        continue;
      }
  
      const { order, items, billing, shipping } = magentoData;
  
      const shopifyCustomerId = await findOrCreateShopifyCustomerByEmail(
        email,
        billing,
        shipping,
        order
      );
  
      const normalized = normalizeMagentoOrder(
        order,
        items as any[],
        billing,
        shipping,
        shopifyCustomerId
      );
  
      const shopifyOrder = await createOrder(normalized);
  
      console.log(
        `✅ Migrated Magento #${normalized.incrementId} → Shopify ID ${shopifyOrder.id}`
      );
  
      await sleep(15000);
  
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
  
      console.error(
        `❌ Failed to migrate Magento order ${magentoOrderId} (${email}):`,
        errorData
      );
  
      if (err.response?.status === 429) {
        console.log("🛑 Rate limit reached. Sleeping for 30 seconds...");
        await sleep(30000);
      }
    }
  }
}