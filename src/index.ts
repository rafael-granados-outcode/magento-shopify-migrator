import "dotenv/config";

import { loadProducts, loadParentChildMap, loadCategoryMap, loadMediaGallery } from "./loader";
import { buildRows } from "./productBuilder";
import { writeCsv } from "./csvWriter";

import { loadCustomers } from "./customerLoader";
import { writeCustomersCsv } from "./customerCsvWriter";

import { migrateAllOrders } from "./migrateOrder";

import { exportMagentoOrders } from "./exporter/exportMagentoOrders";

import { buildRedirects } from "./redirectBuilder";
import { writeRedirectCsv } from "./redirectCsvWriter";

async function createProductsCsv() {

  console.log("Loading products...");
  const products = await loadProducts();

  console.log("Loading parent-child relationships...");
  const parentChildMap = await loadParentChildMap();

  console.log("Loading categories...");
  const categoryMap = await loadCategoryMap();

  console.log("Loading media gallery...");
  const mediaGalleryMap = await loadMediaGallery();

  console.log("Building Shopify rows...");
  const rows = await buildRows(
    products,
    parentChildMap,
    categoryMap,
    mediaGalleryMap
  );

  console.log(`Generated ${rows.length} rows`);

  await writeCsv(rows);

  console.log("✅ Product CSV exported");
}

async function createCustomersCsv() {

  console.log("Loading customers...");
  const customers = await loadCustomers();

  console.log(`Loaded ${customers.length} customers`);

  await writeCustomersCsv(customers);

  console.log("✅ Customer CSV exported");
}

async function migrateOrdersApi() {

  const limitEnv = process.env.MAGENTO_ORDER_LIMIT;
  const limit = limitEnv ? Number(limitEnv) : 100;

  console.log(`Migrating up to ${limit} Magento orders via Shopify API...`);

  await migrateAllOrders(limit);

  console.log("✅ Order API migration complete");
}

async function createOrdersCsv() {

  console.log("Exporting Magento orders for Matrixify...");

  await exportMagentoOrders();

  console.log("✅ Order CSV export complete");
}

async function createRedirectsCsv() {

  console.log("Loading products...");

  const products = await loadProducts();

  const redirects = buildRedirects(products);

  await writeRedirectCsv(redirects);

  console.log("Redirect CSV export complete");
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

    case "redirects":
      await createRedirectsCsv();
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