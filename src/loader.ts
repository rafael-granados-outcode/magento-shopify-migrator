import { db } from "./db";
import { MagentoProduct } from "./types";

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
  `);
  return rows as MagentoProduct[];
}

export async function loadParentChildMap() {
  const conn = await db();
  const [rows]: any = await conn.execute(`
    SELECT parent_id, product_id
    FROM catalog_product_super_link
  `);

  const map = new Map<number, number[]>();
  rows.forEach((r: any) => {
    if (!map.has(r.parent_id)) map.set(r.parent_id, []);
    map.get(r.parent_id)!.push(r.product_id);
  });

  return map;
}

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

  return map;
}

export async function loadMediaGallery() {
  const conn = await db();

  const [rows]: any = await conn.execute(`
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

  const map = new Map<number, string[]>();

  rows.forEach((r: any) => {
    if (!map.has(r.entity_id)) map.set(r.entity_id, []);
    map.get(r.entity_id)!.push(r.file_path);
  });

  return map;
}