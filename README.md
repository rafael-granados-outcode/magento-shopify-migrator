# Magento → Shopify Migration Tool

A Node.js toolkit for migrating **Products, Customers, and Orders** from **Magento** to **Shopify**.

The tool supports two order migration strategies:

- **Shopify Admin API** – Direct order creation in Shopify (good for small migrations or testing)
- **Matrixify CSV Export** – Recommended for large stores

---

# Installation

Clone the repository and install dependencies:

bash
npm i

# Environment Variables

Create a .env file in the root of the project.

Example:

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

# Build

Compile the TypeScript project:

npx tsc

# Usage

Run the CLI using:

npm run migrate <command>

Available commands:

Command	Description
products	Generate Shopify Products CSV
customers	Generate Shopify Customers CSV
orders-api	Migrate orders via Shopify Admin API
orders-csv	Export Magento orders for Matrixify

# Export Products CSV

Generate the Shopify products import file:

npm run migrate products

Output:

shopify_import.csv

This file can be imported directly into Shopify.

# Export Customers CSV

Generate the Shopify customers import file:

npm run migrate customers

Output:

customers_import.csv

# Order Migration via Shopify Admin API

Recommended for small migrations or testing.

npm run migrate orders-api

You can control how many orders migrate with:

MAGENTO_ORDER_LIMIT=100

# Order Migration via Matrixify (Recommended)

For large stores, exporting Magento tables and importing them through Matrixify is significantly faster.

Run:

npm run migrate orders-csv

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

Upload the ZIP files directly into Matrixify.

Each batch contains 10,000 orders to comply with Matrixify import limits.

# Recommended Migration Order

For best results, migrate data in the following order:

Products

Customers

Orders

Orders should be migrated after customers to ensure proper customer association in Shopify.

# Notes

Magento configurable product duplicates are filtered automatically.

Invalid Magento dates (0000-00-00 00:00:00) are normalized automatically.

CSV values are sanitized to prevent Matrixify import errors.

Orders are split into batches of 10,000 for Matrixify compatibility.