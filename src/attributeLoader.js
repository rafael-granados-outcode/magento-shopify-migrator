"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadVariantAttributes = loadVariantAttributes;
const db_1 = require("./db");
async function loadVariantAttributes(productId) {
    const conn = await (0, db_1.db)();
    const [rows] = await conn.execute(`
    SELECT ea.attribute_code
    FROM eav_attribute ea
    JOIN catalog_product_super_attribute cpsa
      ON cpsa.attribute_id = ea.attribute_id
    WHERE cpsa.product_id = ?
    `, [productId]);
    return rows.map((r) => r.attribute_code);
}
//# sourceMappingURL=attributeLoader.js.map