import slugify from "slugify";
import { MagentoProduct, ShopifyRow } from "./types";
import { loadVariantAttributes } from "./attributeLoader";
import { CONFIG } from "./config";

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

function humanize(str: string) {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

function imageUrl(path?: string) {
  if (!path || path === "no_selection") return "";
  return `${CONFIG.mediaBaseUrl}${path}`;
}

function buildMetafields(
  product: MagentoProduct,
  variantAttributes: string[]
): Record<string, string> {

  const metafields: Record<string, string> = {};

  for (const key of Object.keys(product)) {

    // Skip system fields
    if (SYSTEM_FIELDS.includes(key)) continue;

    // Skip variant attributes (size, color, etc.)
    if (variantAttributes.includes(key)) continue;

    // Skip internal Magento fields
    if (key.endsWith("_value")) continue;

    const value = product[key as keyof MagentoProduct];

    // Skip empty / null / undefined
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "no_selection"
    ) continue;

    // Only allow primitive values
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      metafields[key] = String(value);
    }
  }

  return metafields;
}

export async function buildRows(
  products: MagentoProduct[],
  parentChildMap: Map<number, number[]>,
  categoryMap: Map<number, string[]>,
  mediaGalleryMap: Map<number, string[]>
): Promise<ShopifyRow[]> {

  const productMap = new Map(products.map(p => [p.entity_id, p]));
  const childIds = new Set(
    Array.from(parentChildMap.values()).flat()
  );

  const rows: ShopifyRow[] = [];
  const metafieldColumns = new Set<string>();

  for (const product of products) {

    if (product.status !== 1) continue;

    // ---------------- CONFIGURABLE ----------------
    if (product.type_id === "configurable") {

      const childrenIds = parentChildMap.get(product.entity_id) || [];
      const children = childrenIds.map(id => productMap.get(id)!);

      const optionAttributes = await loadVariantAttributes(product.entity_id);
      const metafields = buildMetafields(product, optionAttributes);

      const handle = slugify(product.name, { lower: true });

      const images = mediaGalleryMap.get(product.entity_id) || [];
      const primaryImage =
        imageUrl(product.image) ||
        imageUrl(children[0]?.image);

      const baseRow: Record<string, unknown> = {
        Title: product.name,
        Handle: handle,
        "Body (HTML)": product.description,
        Tags: categoryMap.get(product.entity_id)?.join(", "),
        "Image Src": primaryImage,
      };

      optionAttributes.forEach((attr: string, index: number) => {
        baseRow[`Option${index + 1} Name`] = humanize(attr);
      });

      // --- ADD METAFIELDS TO FIRST ROW ---
      for (const key of Object.keys(metafields)) {
        const column =
          `${humanize(key)} (product.metafields.custom.${key})`;
        metafieldColumns.add(column);
        baseRow[column] = metafields[key];
      }

      children.forEach((child, index) => {

        const row = { ...baseRow };

        optionAttributes.forEach((attr: string, i: number) => {
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
          optionAttributes.forEach((_: string, i: number) =>
            delete row[`Option${i + 1} Name`]
          );
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

      const handle = slugify(product.name, { lower: true });

      const metafields = buildMetafields(product, []);
      const images = mediaGalleryMap.get(product.entity_id) || [];

      const baseRow: any = {
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
        const column =
          `${humanize(key)} (product.metafields.custom.${key})`;
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

  return rows;
}

