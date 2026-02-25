import "dotenv/config";
import { loadProducts, loadParentChildMap, loadCategoryMap, loadMediaGallery } from "./loader";
import { buildRows } from "./productBuilder";
import { writeCsv } from "./csvWriter";
import { loadCustomers } from "./customerLoader";
import { writeCustomersCsv } from "./customerCsvWriter";

async function run() {

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

  console.log("CSV exported successfully");

  // ----- CUSTOMER MIGRATION -----
  console.log("Loading customers...");
  const customers = await loadCustomers();

  console.log(`Loaded ${customers.length} customers`);
  await writeCustomersCsv(customers);
  console.log("Customer CSV export complete");
}

run();