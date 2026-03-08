"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const loader_1 = require("./loader");
const productBuilder_1 = require("./productBuilder");
const csvWriter_1 = require("./csvWriter");
const customerLoader_1 = require("./customerLoader");
const customerCsvWriter_1 = require("./customerCsvWriter");
const migrateOrder_1 = require("./migrateOrder");
const exportMagentoOrders_1 = require("./exporter/exportMagentoOrders");
async function createProductsCsv() {
    console.log("Loading products...");
    const products = await (0, loader_1.loadProducts)();
    console.log("Loading parent-child relationships...");
    const parentChildMap = await (0, loader_1.loadParentChildMap)();
    console.log("Loading categories...");
    const categoryMap = await (0, loader_1.loadCategoryMap)();
    console.log("Loading media gallery...");
    const mediaGalleryMap = await (0, loader_1.loadMediaGallery)();
    console.log("Building Shopify rows...");
    const rows = await (0, productBuilder_1.buildRows)(products, parentChildMap, categoryMap, mediaGalleryMap);
    console.log(`Generated ${rows.length} rows`);
    await (0, csvWriter_1.writeCsv)(rows);
    console.log("✅ Product CSV exported");
}
async function createCustomersCsv() {
    console.log("Loading customers...");
    const customers = await (0, customerLoader_1.loadCustomers)();
    console.log(`Loaded ${customers.length} customers`);
    await (0, customerCsvWriter_1.writeCustomersCsv)(customers);
    console.log("✅ Customer CSV exported");
}
async function migrateOrdersApi() {
    const limitEnv = process.env.MAGENTO_ORDER_LIMIT;
    const limit = limitEnv ? Number(limitEnv) : 100;
    console.log(`Migrating up to ${limit} Magento orders via Shopify API...`);
    await (0, migrateOrder_1.migrateAllOrders)(limit);
    console.log("✅ Order API migration complete");
}
async function createOrdersCsv() {
    console.log("Exporting Magento orders for Matrixify...");
    await (0, exportMagentoOrders_1.exportMagentoOrders)();
    console.log("✅ Order CSV export complete");
}
async function run() {
    const command = process.argv[2];
    if (!command) {
        console.log(`
Usage:

products      → Create Products CSV
customers     → Create Customers CSV
orders-api    → Bulk Order Migration via Shopify API
orders-csv    → Create Orders CSV for Matrixify
`);
        process.exit(0);
    }
    switch (command) {
        case "products":
            await createProductsCsv();
            break;
        case "customers":
            await createCustomersCsv();
            break;
        case "orders-api":
            await migrateOrdersApi();
            break;
        case "orders-csv":
            await createOrdersCsv();
            break;
        default:
            console.log(`Unknown command: ${command}`);
    }
}
run();
