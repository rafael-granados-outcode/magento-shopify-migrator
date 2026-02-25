"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCustomers = loadCustomers;
const db_1 = require("./db");
async function loadCustomers() {
    const conn = await (0, db_1.db)();
    try {
        const [rows] = await conn.execute(`
      SELECT 
        ce.entity_id,
        ce.email,
        fn.value AS firstname,
        ln.value AS lastname,
        ce.group_id,
    
        comp.value AS company,
        street.value AS street,
        city.value AS city,
        region.value AS region,
        postcode.value AS postcode,
        country.value AS country,
        tel.value AS address_phone
    
      FROM customer_entity ce
    
      -- Firstname
      LEFT JOIN customer_entity_varchar fn
        ON fn.entity_id = ce.entity_id
        AND fn.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'firstname'
          AND entity_type_id = ce.entity_type_id
        )
    
      -- Lastname
      LEFT JOIN customer_entity_varchar ln
        ON ln.entity_id = ce.entity_id
        AND ln.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'lastname'
          AND entity_type_id = ce.entity_type_id
        )
    
      -- Select ONE address per customer (strict-mode safe)
      LEFT JOIN customer_address_entity addr
        ON addr.entity_id = (
          SELECT MIN(a.entity_id)
          FROM customer_address_entity a
          WHERE a.parent_id = ce.entity_id
        )
    
      -- Company
      LEFT JOIN customer_address_entity_varchar comp
        ON comp.entity_id = addr.entity_id
        AND comp.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'company'
          AND entity_type_id = 2
        )
    
      -- Street
      LEFT JOIN customer_address_entity_text street
        ON street.entity_id = addr.entity_id
        AND street.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'street'
          AND entity_type_id = 2
        )
    
      -- City
      LEFT JOIN customer_address_entity_varchar city
        ON city.entity_id = addr.entity_id
        AND city.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'city'
          AND entity_type_id = 2
        )
    
      -- Region
      LEFT JOIN customer_address_entity_varchar region
        ON region.entity_id = addr.entity_id
        AND region.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'region'
          AND entity_type_id = 2
        )
    
      -- Postcode
      LEFT JOIN customer_address_entity_varchar postcode
        ON postcode.entity_id = addr.entity_id
        AND postcode.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'postcode'
          AND entity_type_id = 2
        )
    
      -- Country
      LEFT JOIN customer_address_entity_varchar country
        ON country.entity_id = addr.entity_id
        AND country.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'country_id'
          AND entity_type_id = 2
        )
    
      -- Telephone
      LEFT JOIN customer_address_entity_varchar tel
        ON tel.entity_id = addr.entity_id
        AND tel.attribute_id = (
          SELECT attribute_id FROM eav_attribute
          WHERE attribute_code = 'telephone'
          AND entity_type_id = 2
        )
    
      ORDER BY ce.entity_id;
    `);
        return rows;
    }
    finally {
        await conn.end();
    }
}
