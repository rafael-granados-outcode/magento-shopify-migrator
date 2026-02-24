"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRows = buildRows;
const slugify_1 = __importDefault(require("slugify"));
const attributeLoader_1 = require("./attributeLoader");
const config_1 = require("./config");
const errorReporter_1 = require("./errorReporter");
const SYSTEM_FIELDS = [
    "entity_id",
    "type_id",
    "sku",
    "name",
    "price",
    "special_price",
    "weight",
    "image",
    "description",
    "short_description",
    "visibility",
    "status",
];
function humanize(str) {
    return str
        .replace(/_/g, " ")
        .replace(/\b\w/g, l => l.toUpperCase());
}
function imageUrl(path) {
    if (!path || path === "no_selection")
        return "";
    return `${config_1.CONFIG.mediaBaseUrl}${path}`;
}
function buildMetafields(product, variantAttributes) {
    const metafields = {};
    for (const key of Object.keys(product)) {
        // Skip system fields
        if (SYSTEM_FIELDS.includes(key))
            continue;
        // Skip variant attributes (size, color, etc.)
        if (variantAttributes.includes(key))
            continue;
        // Skip internal Magento fields
        if (key.endsWith("_value"))
            continue;
        const value = product[key];
        // Skip empty / null / undefined
        if (value === null ||
            value === undefined ||
            value === "" ||
            value === "no_selection")
            continue;
        // Only allow primitive values
        if (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean") {
            metafields[key] = String(value);
        }
    }
    return metafields;
}
function logProgress(current, total, startTime) {
    const elapsedMs = Date.now() - startTime;
    const percent = ((current / total) * 100).toFixed(1);
    const elapsedSec = (elapsedMs / 1000).toFixed(1);
    const rate = current / (elapsedMs / 1000);
    const remaining = total - current;
    const eta = rate > 0 ? (remaining / rate).toFixed(1) : "?";
    process.stdout.write(`\rProcessing ${current}/${total} (${percent}%) | ${elapsedSec}s | ETA ${eta}s`);
}
async function buildRows(products, parentChildMap, categoryMap, mediaGalleryMap) {
    const productMap = new Map(products.map(p => [p.entity_id, p]));
    const childIds = new Set(Array.from(parentChildMap.values()).flat());
    const rows = [];
    const metafieldColumns = new Set();
    const total = products.length;
    const startTime = Date.now();
    const failed = [];
    let counter = 0;
    for (const product of products) {
        counter++;
        try {
            if (product.status !== 1) {
                logProgress(counter, total, startTime);
                continue;
            }
            // ---------------- CONFIGURABLE ----------------
            if (product.type_id === "configurable") {
                const childrenIds = parentChildMap.get(product.entity_id) || [];
                const children = childrenIds
                    .map(id => productMap.get(id))
                    .filter(Boolean);
                if (!children.length) {
                    throw new Error("Configurable product has no valid children");
                }
                const optionAttributes = await (0, attributeLoader_1.loadVariantAttributes)(product.entity_id);
                const metafields = buildMetafields(product, optionAttributes);
                const handle = (0, slugify_1.default)(product.name, { lower: true });
                const images = mediaGalleryMap.get(product.entity_id) || [];
                const primaryImage = imageUrl(product.image) ||
                    imageUrl(children[0]?.image);
                const baseRow = {
                    Title: product.name,
                    Handle: handle,
                    "Body (HTML)": product.description,
                    Tags: categoryMap.get(product.entity_id)?.join(", "),
                    "Image Src": primaryImage,
                };
                optionAttributes.forEach((attr, index) => {
                    baseRow[`Option${index + 1} Name`] = humanize(attr);
                });
                // --- ADD METAFIELDS TO FIRST ROW ---
                for (const key of Object.keys(metafields)) {
                    const column = `${humanize(key)} (product.metafields.custom.${key})`;
                    metafieldColumns.add(column);
                    baseRow[column] = metafields[key];
                }
                children.forEach((child, index) => {
                    const row = { ...baseRow };
                    optionAttributes.forEach((attr, i) => {
                        row[`Option${i + 1} Value`] =
                            child[`${attr}_value`] || child[attr];
                    });
                    row["Variant SKU"] = child.sku;
                    row["Variant Price"] = child.price;
                    row["Variant Compare At Price"] = child.special_price;
                    row["Variant Weight (g)"] = child.weight;
                    if (index !== 0) {
                        delete row.Title;
                        delete row["Body (HTML)"];
                        delete row.Tags;
                        delete row["Image Src"];
                        optionAttributes.forEach((_, i) => delete row[`Option${i + 1} Name`]);
                    }
                    rows.push(row);
                });
                // --- ADD ADDITIONAL IMAGE ROWS ---
                images.slice(1).forEach(img => {
                    rows.push({
                        Handle: handle,
                        "Image Src": imageUrl(img),
                    });
                });
            }
            // ---------------- STANDALONE SIMPLE ----------------
            if (product.type_id === "simple" && !childIds.has(product.entity_id)) {
                const handle = (0, slugify_1.default)(product.name, { lower: true });
                const metafields = buildMetafields(product, []);
                const images = mediaGalleryMap.get(product.entity_id) || [];
                const baseRow = {
                    Title: product.name,
                    Handle: handle,
                    "Body (HTML)": product.description,
                    "Variant SKU": product.sku,
                    "Variant Price": product.price,
                    "Variant Compare At Price": product.special_price,
                    "Variant Weight (g)": product.weight,
                    Tags: categoryMap.get(product.entity_id)?.join(", "),
                    "Image Src": imageUrl(product.image),
                };
                for (const key of Object.keys(metafields)) {
                    const column = `${humanize(key)} (product.metafields.custom.${key})`;
                    metafieldColumns.add(column);
                    baseRow[column] = metafields[key];
                }
                rows.push(baseRow);
                images.slice(1).forEach(img => {
                    rows.push({
                        Handle: handle,
                        "Image Src": imageUrl(img),
                    });
                });
            }
        }
        catch (error) {
            failed.push({
                entity_id: product.entity_id,
                sku: product.sku,
                error: error?.message || "Unknown error"
            });
        }
        logProgress(counter, total, startTime);
    }
    await (0, errorReporter_1.exportFailures)(failed);
    return rows;
}
