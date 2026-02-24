"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loader_1 = require("./loader");
const productBuilder_1 = require("./productBuilder");
const csvWriter_1 = require("./csvWriter");
async function run() {
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
    console.log("CSV exported successfully");
}
run();
