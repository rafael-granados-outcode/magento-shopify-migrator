# Magento 1.x → Shopify Migration Tool

A Node.js toolkit for migrating **Products, Customers, Redirects, and Orders** from
**Magento** to **Shopify**.

The tool supports two order migration strategies:

-   **Shopify Admin API** -- Direct order creation in Shopify (good for
    small migrations or testing)
-   **Matrixify CSV Export** -- Recommended for large stores

------------------------------------------------------------------------

# Installation

Clone the repository and install dependencies:

``` bash
npm install
```

------------------------------------------------------------------------

# Environment Variables

Create a `.env` file in the root of the project.

Example:

``` env
# Magento Database
MAGENTO_DB_HOST=localhost
MAGENTO_DB_USER=root
MAGENTO_DB_PASSWORD=password
MAGENTO_DB_NAME=magento

# Shopify API
SHOPIFY_STORE=my-store
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxx

# Optional: limit for API order migration
MAGENTO_ORDER_LIMIT=100
```

------------------------------------------------------------------------

# Build

Compile the TypeScript project:

``` bash
npm run build
```

------------------------------------------------------------------------

# Usage

Run the CLI using:

``` bash
npm run migrate <command>
```

Available commands:

  Command        Description
  -------------- --------------------------------------
  `products`     Generate Shopify Products CSV
  `redirects`    Generate Shopify Products Redirections CSV
  `customers`    Generate Shopify Customers CSV
  `orders-api`   Migrate orders via Shopify Admin API
  `orders-csv`   Export Magento orders for Matrixify

------------------------------------------------------------------------

# Export Products CSV

Generate the Shopify products import file:

``` bash
npm run migrate products
```

Output:

    shopify_import.csv

This file can be imported directly into Shopify.

------------------------------------------------------------------------

# Export Customers CSV

Generate the Shopify customers import file:

``` bash
npm run migrate customers
```

Output:

    customers_import.csv

------------------------------------------------------------------------

# Order Migration via Shopify Admin API

Recommended for **small migrations or testing**.

``` bash
npm run migrate orders-api
```

You can control how many orders migrate with:

``` env
MAGENTO_ORDER_LIMIT=100
```

------------------------------------------------------------------------

# Order Migration via Matrixify (Recommended)

For large stores, exporting Magento tables and importing them through
**Matrixify** is significantly faster.

Run:

``` bash
npm run migrate orders-csv
```

This will generate ZIP batches containing Magento order tables.

Example output:

    exports/

    batch_1.zip
    batch_2.zip
    batch_3.zip

Each ZIP contains the following Magento tables:

    sales_flat_order.csv
    sales_flat_order_address.csv
    sales_flat_order_item.csv
    sales_flat_order_payment.csv
    sales_flat_order_status_history.csv
    sales_flat_shipment_track.csv

Upload the ZIP files directly into **Matrixify**.

Each batch contains **10,000 orders** to comply with Matrixify import
limits.

------------------------------------------------------------------------

# Product redirections CSV for matrixify


``` bash
npm run migrate redirects
```

Output: redirects.csv

------------------------------------------------------------------------

# Project Structure

    src/

    exporter/
      exportMagentoOrders.ts
      exportTable.ts
      zipBatch.ts
      writeCsv.ts

    loader.ts
    productBuilder.ts
    customerLoader.ts

    run.ts

------------------------------------------------------------------------

# Recommended Migration Order

For best results, migrate data in the following order:

1.  **Products**
2.  **Customers**
3.  **Orders**

Orders should be migrated **after customers** to ensure proper customer
association in Shopify.

------------------------------------------------------------------------

# Notes

-   Magento configurable product duplicates are filtered automatically.
-   Invalid Magento dates (`0000-00-00 00:00:00`) are normalized
    automatically.
-   CSV values are sanitized to prevent Matrixify import errors.
-   Orders are split into batches of **10,000** for Matrixify
    compatibility.

------------------------------------------------------------------------

# License

MIT
