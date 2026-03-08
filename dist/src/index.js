"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const migrateOrder_1 = require("./migrateOrder");
async function run() {
    // // ----- PRODUCT MIGRATION -----
    // console.log("Loading products...");
    // const products = await loadProducts();
    // console.log("Loading parent-child relationships...");
    // const parentChildMap = await loadParentChildMap();
    // console.log("Loading categories...");
    // const categoryMap = await loadCategoryMap();
    // console.log("Loading media gallery...");
    // const mediaGalleryMap = await loadMediaGallery();
    // console.log("Building Shopify rows...");
    // const rows = await buildRows(
    //   products,
    //   parentChildMap,
    //   categoryMap,
    //   mediaGalleryMap
    // );
    // console.log(`Generated ${rows.length} rows`);
    // await writeCsv(rows);
    // console.log("CSV exported successfully");
    // // ----- CUSTOMER MIGRATION -----
    // console.log("Loading customers...");
    // const customers = await loadCustomers();
    // console.log(`Loaded ${customers.length} customers`);
    // await writeCustomersCsv(customers);
    // console.log("Customer CSV export complete");
    // ----- ORDERS MIGRATION --------
    const limitEnv = process.env.MAGENTO_ORDER_LIMIT;
    const limit = limitEnv ? Number(limitEnv) : 100;
    console.log(`Migrating up to ${limit} Magento orders...`);
    await (0, migrateOrder_1.migrateAllOrders)(limit);
}
run();
