"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProducts = loadProducts;
exports.loadParentChildMap = loadParentChildMap;
exports.loadCategoryMap = loadCategoryMap;
exports.loadMediaGallery = loadMediaGallery;
exports.loadBundleSelections = loadBundleSelections;
exports.loadBundleOptions = loadBundleOptions;
exports.loadBundleChildMap = loadBundleChildMap;
const db_1 = require("./db");
// ---------------- PRODUCTS ----------------
async function loadProducts() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT
      cpf.*,
      cpet.value AS description
    FROM catalog_product_flat_1 cpf
    LEFT JOIN catalog_product_entity_text cpet
      ON cpet.entity_id = cpf.entity_id
      AND cpet.attribute_id = (
        SELECT attribute_id
        FROM eav_attribute
        WHERE attribute_code = 'description'
          AND entity_type_id = 4
        LIMIT 1
      )
    WHERE cpf.name NOT LIKE '%(Amazon)%'
  `);
    await conn.end();
    return rows;
}
// ---------------- PARENT-CHILD MAP ----------------
async function loadParentChildMap() {
    const conn = await (0, db_1.db)();
    const map = new Map();
    // =========================
    // CONFIGURABLE PRODUCTS
    // =========================
    const [configurableRows] = await conn.execute(`
    SELECT DISTINCT
      parent.entity_id AS parent_id,
      child.entity_id AS child_id

    FROM catalog_product_super_link cpsl

    INNER JOIN catalog_product_entity parent
      ON parent.entity_id = cpsl.parent_id

    INNER JOIN catalog_product_entity child
      ON child.entity_id = cpsl.product_id

    INNER JOIN catalog_product_flat_1 parent_flat
      ON parent_flat.entity_id = parent.entity_id

    INNER JOIN catalog_product_flat_1 child_flat
      ON child_flat.entity_id = child.entity_id

    WHERE parent_flat.type_id = 'configurable'
      AND child_flat.type_id = 'simple'
  `);
    configurableRows.forEach((r) => {
        if (!map.has(r.parent_id)) {
            map.set(r.parent_id, []);
        }
        const children = map.get(r.parent_id);
        if (!children.includes(r.child_id)) {
            children.push(r.child_id);
        }
    });
    // =========================
    // BUNDLE PRODUCTS
    // =========================
    try {
        const [bundleRows] = await conn.execute(`
      SELECT DISTINCT
        parent.entity_id AS parent_id,
        child.entity_id AS child_id

      FROM catalog_product_bundle_selection cpbs

      INNER JOIN catalog_product_entity parent
        ON parent.entity_id = cpbs.parent_product_id

      INNER JOIN catalog_product_entity child
        ON child.entity_id = cpbs.product_id

      INNER JOIN catalog_product_flat_1 parent_flat
        ON parent_flat.entity_id = parent.entity_id

      INNER JOIN catalog_product_flat_1 child_flat
        ON child_flat.entity_id = child.entity_id

      WHERE parent_flat.type_id = 'bundle'
    `);
        bundleRows.forEach((r) => {
            if (!map.has(r.parent_id)) {
                map.set(r.parent_id, []);
            }
            const children = map.get(r.parent_id);
            if (!children.includes(r.child_id)) {
                children.push(r.child_id);
            }
        });
    }
    catch {
        // ignore if bundle tables do not exist
    }
    await conn.end();
    return map;
}
// ---------------- CATEGORIES ----------------
async function loadCategoryMap() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT ccp.product_id, ccev.value AS category_name
    FROM catalog_category_product ccp
    JOIN catalog_category_entity_varchar ccev
      ON ccev.entity_id = ccp.category_id
    WHERE ccev.attribute_id = (
      SELECT attribute_id
      FROM eav_attribute
      WHERE attribute_code = 'name'
      AND entity_type_id = 3
      LIMIT 1
    )
  `);
    const map = new Map();
    rows.forEach((r) => {
        if (!map.has(r.product_id))
            map.set(r.product_id, []);
        map.get(r.product_id).push(r.category_name);
    });
    await conn.end();
    return map;
}
// ---------------- MEDIA ----------------
async function loadMediaGallery() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT
      mg.entity_id,
      mg.value AS file_path
    FROM catalog_product_entity_media_gallery mg
  `);
    const map = new Map();
    rows.forEach((r) => {
        if (!map.has(r.entity_id))
            map.set(r.entity_id, []);
        map.get(r.entity_id).push(r.file_path);
    });
    await conn.end();
    return map;
}
// ---------------- BUNDLE SELECTIONS ----------------
async function loadBundleSelections() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT DISTINCT
      sel.parent_product_id,
      sel.product_id,
      sel.option_id,
      sel.selection_price_type,
      sel.selection_price_value,

      -- option label
      cbov.title AS option_label,

      -- color value
      color_value.value AS color_label,

      -- size value
      size_value.value AS size_label

    FROM catalog_product_bundle_selection sel

    LEFT JOIN catalog_product_bundle_option_value cbov
      ON cbov.option_id = sel.option_id
      AND cbov.store_id = 0

    -- =========================
    -- COLOR
    -- =========================
    LEFT JOIN eav_attribute color_attr
      ON color_attr.attribute_code = 'color'
      AND color_attr.entity_type_id = 4

    LEFT JOIN catalog_product_entity_int color_int
      ON color_int.entity_id = sel.product_id
      AND color_int.attribute_id = color_attr.attribute_id

    LEFT JOIN eav_attribute_option_value color_value
      ON color_value.option_id = color_int.value
      AND color_value.store_id = 0

    -- =========================
    -- SIZE
    -- =========================
    LEFT JOIN eav_attribute size_attr
      ON size_attr.attribute_code = 'size'
      AND size_attr.entity_type_id = 4

    LEFT JOIN catalog_product_entity_int size_int
      ON size_int.entity_id = sel.product_id
      AND size_int.attribute_id = size_attr.attribute_id

    LEFT JOIN eav_attribute_option_value size_value
      ON size_value.option_id = size_int.value
      AND size_value.store_id = 0
  `);
    const map = new Map();
    rows.forEach((r) => {
        let value_label = "";
        if (r.color_label && r.size_label) {
            value_label = `${r.color_label} / ${r.size_label}`;
        }
        else if (r.color_label) {
            value_label = r.color_label;
        }
        else if (r.size_label) {
            value_label = r.size_label;
        }
        r.value_label = value_label;
        if (!map.has(r.parent_product_id)) {
            map.set(r.parent_product_id, []);
        }
        map.get(r.parent_product_id).push(r);
    });
    await conn.end();
    return map;
}
// ---------------- BUNDLE OPTIONS ----------------
async function loadBundleOptions() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT
      cbo.option_id,
      COALESCE(cbov.title, CONCAT('Option ', cbo.option_id)) AS label
    FROM catalog_product_bundle_option cbo
    LEFT JOIN catalog_product_bundle_option_value cbov
      ON cbov.option_id = cbo.option_id
      AND cbov.store_id = 0
  `);
    const map = new Map();
    rows.forEach((r) => {
        map.set(r.option_id, r.label || "Option");
    });
    await conn.end();
    return map;
}
// ---------------- BUNDLE CHILD PRODUCTS ----------------
async function loadBundleChildMap() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT
      cpe.entity_id,
      cpe.sku,

      name.value AS name,

      price.value AS price

    FROM catalog_product_entity cpe

    LEFT JOIN catalog_product_entity_varchar name
      ON name.entity_id = cpe.entity_id
      AND name.attribute_id = (
        SELECT attribute_id
        FROM eav_attribute
        WHERE attribute_code = 'name'
          AND entity_type_id = 4
        LIMIT 1
      )

    LEFT JOIN catalog_product_entity_decimal price
      ON price.entity_id = cpe.entity_id
      AND price.attribute_id = (
        SELECT attribute_id
        FROM eav_attribute
        WHERE attribute_code = 'price'
          AND entity_type_id = 4
        LIMIT 1
      )
  `);
    const map = new Map();
    rows.forEach((r) => {
        map.set(r.entity_id, r);
    });
    await conn.end();
    return map;
}
