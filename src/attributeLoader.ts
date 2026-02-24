import { db } from "./db";

export async function loadVariantAttributes(productId: number) {
  const conn = await db();

  const [rows]: any = await conn.execute(
    `
    SELECT ea.attribute_code
    FROM eav_attribute ea
    JOIN catalog_product_super_attribute cpsa
      ON cpsa.attribute_id = ea.attribute_id
    WHERE cpsa.product_id = ?
    `,
    [productId]
  );

  return rows.map((r: any) => r.attribute_code);
}