import slugify from "slugify";
import { MagentoProduct, ShopifyRow } from "./types";
import { loadVariantAttributes } from "./attributeLoader";
import { CONFIG } from "./config";
import { exportFailures } from "./errorReporter";

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

  // ---------------- STANDARD ATTRIBUTE EXPORT ----------------
  for (const key of Object.keys(product)) {

    if (SYSTEM_FIELDS.includes(key)) continue;
    if (variantAttributes.includes(key)) continue;
    if (key.endsWith("_value")) continue;

    const value = product[key as keyof MagentoProduct];

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "no_selection"
    ) continue;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      metafields[key] = String(value);
    }
  }

  // ---------------- FORCE IMAGE METAFIELDS ----------------

  if (product.small_image && product.small_image !== "no_selection") {
    metafields["small_image"] = imageUrl(product.small_image);
  }

  if (product.thumbnail && product.thumbnail !== "no_selection") {
    metafields["thumbnail"] = imageUrl(product.thumbnail);
  }

  return metafields;
}

function logProgress(current: number, total: number, startTime: number) {
  const elapsedMs = Date.now() - startTime;
  const percent = ((current / total) * 100).toFixed(1);
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  const rate = current / (elapsedMs / 1000);
  const remaining = total - current;
  const eta = rate > 0 ? (remaining / rate).toFixed(1) : "?";

  process.stdout.write(
    `\rProcessing ${current}/${total} (${percent}%) | ${elapsedSec}s | ETA ${eta}s`
  );
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

  const total = products.length;
  const startTime = Date.now();
  const failed: any[] = [];

  let counter = 0;

  for (const product of products) {
    counter++;

    try {
      // ---------------- CONFIGURABLE ----------------
      if (product.type_id === "configurable") {
  
        const childrenIds = parentChildMap.get(product.entity_id) || [];
        const children = childrenIds
          .map(id => productMap.get(id))
          .filter(Boolean) as MagentoProduct[];

        if (!children.length) {
          throw new Error("Configurable product has no valid children");
        }
  
        const optionAttributes = await loadVariantAttributes(product.entity_id);
        const metafields = buildMetafields(product, optionAttributes);
  
        const handle = slugify(product.name, { lower: true });
  
        const images = mediaGalleryMap.get(product.entity_id) || [];
        let primaryImage = "";

        if (product.image && product.image !== "no_selection") {
          primaryImage = imageUrl(product.image);
        } else if (children[0]?.image && children[0].image !== "no_selection") {
          primaryImage = imageUrl(children[0].image);
        } else if (
          (product as any).small_image &&
          (product as any).small_image !== "no_selection"
        ) {
          primaryImage = imageUrl((product as any).small_image);
        } else if (
          children[0] &&
          (children[0] as any).small_image &&
          (children[0] as any).small_image !== "no_selection"
        ) {
          primaryImage = imageUrl((children[0] as any).small_image);
        } else if (images.length) {
          primaryImage = imageUrl(images[0]);
        }
  
        const categories = categoryMap.get(product.entity_id) || [];

        const baseRow: Record<string, unknown> = {
          Title: product.name,
          Handle: handle,
          "Body (HTML)": product.description,
          // Use first Magento category as main collection
          Collection: categories[0] || "",
          // Keep all categories as tags
          Tags: categories.join(", "),
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

          const hasValidPrice =
            child.price !== undefined &&
            child.price !== null &&
            Number(child.price) > 0;

          if (!hasValidPrice) {
            failed.push({
              entity_id: child.entity_id,
              sku: child.sku,
              error: "Missing or zero price for variant",
            });
            return;
          }
  
          const row = { ...baseRow };
  
          optionAttributes.forEach((attr: string, i: number) => {
            row[`Option${i + 1} Value`] =
              child[`${attr}_value`] || child[attr];
          });
  
          row["Variant SKU"] = child.sku;
          row["Variant Price"] =
            child.price && Number(child.price) !== 0 ? child.price : "";
          row["Variant Compare At Price"] =
            child.special_price && Number(child.special_price) !== 0
              ? child.special_price
              : "";
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

        let primaryImage = "";

        if (product.image && product.image !== "no_selection") {
          primaryImage = imageUrl(product.image);
        } else if (
          (product as any).small_image &&
          (product as any).small_image !== "no_selection"
        ) {
          primaryImage = imageUrl((product as any).small_image);
        } else if (images.length) {
          primaryImage = imageUrl(images[0]);
        }
  
        const hasValidPrice =
          product.price !== undefined &&
          product.price !== null &&
          Number(product.price) > 0;

        if (!hasValidPrice) {
          failed.push({
            entity_id: product.entity_id,
            sku: product.sku,
            error: "Missing or zero price for simple product",
          });
          continue;
        }

        const categories = categoryMap.get(product.entity_id) || [];

        const baseRow: any = {
          Title: product.name,
          Handle: handle,
          "Body (HTML)": product.description,
          "Variant SKU": product.sku,
          "Variant Price":
            product.price && Number(product.price) !== 0 ? product.price : "",
          "Variant Compare At Price":
            product.special_price && Number(product.special_price) !== 0
              ? product.special_price
              : "",
          "Variant Weight (g)": product.weight,
          Collection: categories[0] || "",
          Tags: categories.join(", "),
          "Image Src": primaryImage,
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
    } catch (error: any) {
      failed.push({
        entity_id: product.entity_id,
        sku: product.sku,
        error: error?.message || "Unknown error"
      });
    }
    logProgress(counter, total, startTime);
  }

  await exportFailures(failed);
  return rows;
}

