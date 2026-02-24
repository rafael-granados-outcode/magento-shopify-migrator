"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProducts = loadProducts;
exports.loadParentChildMap = loadParentChildMap;
exports.loadCategoryMap = loadCategoryMap;
exports.loadMediaGallery = loadMediaGallery;
const db_1 = require("./db");
async function loadProducts() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT *
    FROM catalog_product_flat_1
  `);
    return rows;
}
async function loadParentChildMap() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT parent_id, product_id
    FROM catalog_product_super_link
  `);
    const map = new Map();
    rows.forEach((r) => {
        if (!map.has(r.parent_id))
            map.set(r.parent_id, []);
        map.get(r.parent_id).push(r.product_id);
    });
    return map;
}
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
    return map;
}
async function loadMediaGallery() {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT
      mg.entity_id,
      mg.value AS file_path,
      mgv.position,
      mgv.label,
      mgv.disabled
    FROM catalog_product_entity_media_gallery mg
    LEFT JOIN catalog_product_entity_media_gallery_value mgv
      ON mg.value_id = mgv.value_id
  `);
    const map = new Map();
    rows.forEach((r) => {
        if (!map.has(r.entity_id))
            map.set(r.entity_id, []);
        map.get(r.entity_id).push(r.file_path);
    });
    return map;
}
