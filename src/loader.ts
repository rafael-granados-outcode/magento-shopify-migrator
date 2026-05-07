import { db } from "./db";
import { MagentoProduct } from "./types";

// ---------------- PRODUCTS ----------------
export async function loadProducts(): Promise<MagentoProduct[]> {
  const conn = await db();

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
  return rows as MagentoProduct[];
}

// ---------------- PARENT-CHILD MAP ----------------
export async function loadParentChildMap() {
  const conn = await db();

  let rows: any[] = [];

  // CONFIGURABLE
  const [configurableRows]: any = await conn.execute(`
    SELECT parent_id, product_id
    FROM catalog_product_super_link
  `);

  rows = rows.concat(configurableRows || []);

  // BUNDLE
  try {
    const [bundleRows]: any = await conn.execute(`
      SELECT parent_product_id AS parent_id, product_id
      FROM catalog_product_bundle_selection
    `);

    rows = rows.concat(bundleRows || []);
  } catch {
    // ignore if table doesn't exist
  }

  const map = new Map<number, number[]>();

  rows.forEach((r: any) => {
    if (!map.has(r.parent_id)) map.set(r.parent_id, []);
    map.get(r.parent_id)!.push(r.product_id);
  });

  await conn.end();
  return map;
}

// ---------------- CATEGORIES ----------------
export async function loadCategoryMap() {
  const conn = await db();

  const [rows]: any = await conn.execute(`
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

  const map = new Map<number, string[]>();

  rows.forEach((r: any) => {
    if (!map.has(r.product_id)) map.set(r.product_id, []);
    map.get(r.product_id)!.push(r.category_name);
  });

  await conn.end();
  return map;
}

// ---------------- MEDIA ----------------
export async function loadMediaGallery() {
  const conn = await db();

  const [rows]: any = await conn.execute(`
    SELECT
      mg.entity_id,
      mg.value AS file_path
    FROM catalog_product_entity_media_gallery mg
  `);

  const map = new Map<number, string[]>();

  rows.forEach((r: any) => {
    if (!map.has(r.entity_id)) map.set(r.entity_id, []);
    map.get(r.entity_id)!.push(r.file_path);
  });

  await conn.end();
  return map;
}

// ---------------- BUNDLE SELECTIONS ----------------
export async function loadBundleSelections() {
  const conn = await db();

  const [rows]: any = await conn.execute(`
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

  const map = new Map<number, any[]>();

  rows.forEach((r: any) => {

    // 🔥 build clean value label
    let value_label = "";

    if (r.color_label && r.size_label) {
      value_label = `${r.color_label} / ${r.size_label}`;
    } else if (r.color_label) {
      value_label = r.color_label;
    } else if (r.size_label) {
      value_label = r.size_label;
    }

    r.value_label = value_label;

    if (!map.has(r.parent_product_id)) {
      map.set(r.parent_product_id, []);
    }

    map.get(r.parent_product_id)!.push(r);
  });

  await conn.end();

  return map;
}

// ---------------- BUNDLE OPTIONS ----------------
export async function loadBundleOptions() {
  const conn = await db();

  const [rows]: any = await conn.execute(`
    SELECT
      cbo.option_id,
      COALESCE(cbov.title, CONCAT('Option ', cbo.option_id)) AS label
    FROM catalog_product_bundle_option cbo
    LEFT JOIN catalog_product_bundle_option_value cbov
      ON cbov.option_id = cbo.option_id
      AND cbov.store_id = 0
  `);

  const map = new Map<number, string>();

  rows.forEach((r: any) => {
    map.set(r.option_id, r.label || "Option");
  });

  await conn.end();
  return map;
}

// ---------------- BUNDLE CHILD PRODUCTS ----------------
export async function loadBundleChildMap() {

  const conn = await db();

  const [rows]: any = await conn.execute(`
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

  const map = new Map<number, any>();

  rows.forEach((r: any) => {
    map.set(r.entity_id, r);
  });

  await conn.end();

  return map;
}