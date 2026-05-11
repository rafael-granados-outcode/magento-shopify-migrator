import slugify from "slugify";
import { MagentoProduct, ShopifyRow } from "./types";
import { loadVariantAttributes } from "./attributeLoader";
import { CONFIG } from "./config";
import { exportFailures } from "./errorReporter";

function imageUrl(path?: string) {
  if (!path || path === "no_selection") return "";
  return `${CONFIG.mediaBaseUrl}${path}`;
}

function cleanHtml(value?: string): string {
  if (!value) return "";
  return value.replace(/\r?\n/g, " ").trim();
}

function humanize(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function buildMetafields(product: MagentoProduct): Record<string, string> {
  const metafields: Record<string, string> = {};

  const excluded = new Set([
    "name",
    "description",
    "price",
    "required_options",
    "tax_class_id",
    "visibility",
    "manufacturers",
    "manufacturers_value",
    "price_type",
    "price_view",
    "shipment_type",
    "sku_type",
    "weight_type",
    "size",
    "size_value",
    "length",
    "length_value",
    "msrp",
  ]);

  for (const key of Object.keys(product)) {

    if (excluded.has(key.toLowerCase())) {
      continue;
    }

    const value = product[key as keyof MagentoProduct];

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "no_selection"
    ) continue;

    if (typeof value === "string" || typeof value === "number") {
      metafields[key] = String(value);
    }
  }

  return metafields;
}

const SHOPIFY_COLUMNS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Collection",
  "Type",
  "Tags",
  "Published",
  "Status",
  "Product Category",

  "Option1 Name",
  "Option1 Value",
  "Option1 Linked To",

  "Option2 Name",
  "Option2 Value",
  "Option2 Linked To",

  "Option3 Name",
  "Option3 Value",
  "Option3 Linked To",

  "Variant SKU",
  "Variant Price",
  "Variant Compare At Price",

  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",

  "Variant Fulfillment Service",

  "Variant Requires Shipping",
  "Variant Taxable",

  "Variant Barcode",

  "Variant Grams",
  "Variant Weight",
  "Variant Weight Unit",

  "Variant Image",

  "Image Src",
  "Image Position",
  "Image Alt Text",

  "Gift Card",

  "SEO Title",
  "SEO Description",

  "Google Shopping / Google Product Category",
  "Google Shopping / Gender",
  "Google Shopping / Age Group",
  "Google Shopping / MPN",
  "Google Shopping / Condition",
  "Google Shopping / Custom Product",

  "Cost per item",
];

function normalizeRow(row: Record<string, any>) {
  const normalized: Record<string, any> = {};

  SHOPIFY_COLUMNS.forEach(col => {
    normalized[col] =
      row[col] !== undefined &&
      row[col] !== null
        ? row[col]
        : "";
  });

  // preserve metafields/dynamic columns
  Object.keys(row).forEach(key => {
    if (!(key in normalized)) {
      normalized[key] = row[key];
    }
  });

  return normalized;
}

function cleanOptionValue(
  value?: string,
  fallback?: string,
  parentName?: string
) {

  let result = value || fallback || "";

  result = result.trim();

  // Magento pattern:
  // "Product Name - Option"
  if (result.includes(" - ")) {
    result = result.split(" - ").pop()!.trim();
  }

  // Remove full parent product name prefix
  if (parentName) {

    const escaped = parentName
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    result = result.replace(
      new RegExp(`^${escaped}\\s*`, "i"),
      ""
    ).trim();
  }

  // Cleanup duplicate spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

const failedSet = new Set<string>();

function pushFailure(
  failed: any[],
  entity_id: number,
  sku: string,
  error: string
) {
  const key = `${entity_id}-${error}`;

  if (!failedSet.has(key)) {
    failed.push({ entity_id, sku, error });
    failedSet.add(key);
  }
}

function resolveBundlePrice(
  child: MagentoProduct | undefined,
  sel: any,
  product: MagentoProduct,
  allSelections: any[],
  productMap: Map<number, MagentoProduct>
): number {

  let price = Number(child?.price || 0);

  if (price > 0) return price;

  if (sel.selection_price_type == 0) {
    price = Number(sel.selection_price_value || 0);

    if (price > 0) return price;
  }

  if (sel.selection_price_type == 1) {

    const percent = Number(sel.selection_price_value || 0);
    const base = Number(product.price || 0);

    if (base > 0) {

      price = (base * percent) / 100;

      if (price > 0) return price;
    }
  }

  const fallback = allSelections
    .map(s => productMap.get(s.product_id))
    .find(c => c && Number(c.price) > 0);

  if (fallback) return Number(fallback.price);

  return 1;
}

function isColorOption(name?: string) {

  if (!name) return false;

  const n = name.toLowerCase();

  return (
    n.includes("color") ||
    n.includes("colour") ||
    n.includes("finish")
  );
}

// ---------------- MAIN ----------------
export async function buildRows(
  products: MagentoProduct[],
  parentChildMap: Map<number, number[]>,
  categoryMap: Map<number, string[]>,
  mediaGalleryMap: Map<number, string[]>,
  bundleSelections: Map<number, any[]>,
  bundleOptions: Map<number, string>,
  bundleChildMap: Map<number, any>
): Promise<ShopifyRow[]> {

  const productMap = new Map(products.map(p => [p.entity_id, p]));

  const childIds = new Set(
    Array.from(parentChildMap.values()).flat()
  );

  const rows: ShopifyRow[] = [];
  const failed: any[] = [];

  for (const product of products) {

    try {

      const handle = slugify(
        product.name || product.sku,
        { lower: true }
      );

      const images =
        mediaGalleryMap.get(product.entity_id) || [];

      let primaryImage = imageUrl(product.image);

      if (!primaryImage && images.length) {
        primaryImage = imageUrl(images[0]);
      }

      const categories =
        categoryMap.get(product.entity_id) || [];

      const metafields = buildMetafields(product);

      const baseRow: any = {
        Title: product.name,
        Handle: handle,

        "Body (HTML)": cleanHtml(product.description),

        Vendor: "Gear Express",

        Collection: categories[0] || "",
        Type: categories[0] || "",

        Tags: categories.join(", "),

        Published: "TRUE",
        Status: "active",

        "Product Category":
          "Sporting Goods > Outdoor Recreation > Climbing",

        "Image Src": primaryImage,
        "Image Position": 1,
        "Image Alt Text": product.name || "",

        "Gift Card": "FALSE",

        "SEO Title":
          product.meta_title ||
          product.name ||
          "",

        "SEO Description":
          product.meta_description || "",

        "Google Shopping / Google Product Category": "",
        "Google Shopping / Gender": "",
        "Google Shopping / Age Group": "",
        "Google Shopping / MPN": "",
        "Google Shopping / Condition": "new",
        "Google Shopping / Custom Product": "TRUE",

        "Variant Inventory Tracker": "shopify",
        "Variant Inventory Qty": 0,
        "Variant Inventory Policy": "deny",

        "Variant Fulfillment Service": "manual",

        "Variant Requires Shipping": "TRUE",
        "Variant Taxable": "TRUE",

        "Variant Weight Unit": "lb",

        "Variant Grams": "",
        "Variant Weight": "",

        "Variant Barcode": "",

        "Variant Compare At Price": "",

        "Cost per item": "",
      };

      // =========================
      // CONFIGURABLE
      // =========================

      if (product.type_id === "configurable") {

        const childrenIds =
          parentChildMap.get(product.entity_id) || [];

        const children = childrenIds
          .map(id => productMap.get(id))
          .filter(Boolean) as MagentoProduct[];

        if (!children.length) {

          const price = Number(product.price || 0);

          if (price <= 0) {

            pushFailure(
              failed,
              product.entity_id,
              product.sku,
              "Configurable without children has no valid price"
            );

          } else {

            rows.push(
              normalizeRow({
                ...baseRow,
                "Variant SKU": product.sku,
                "Variant Price": price.toFixed(2),
              })
            );
          }

          continue;
        }

        const optionAttributes: string[] =
          await loadVariantAttributes(product.entity_id);

        optionAttributes.forEach((attr, i) => {
          baseRow[`Option${i + 1} Name`] =
            humanize(attr);
        });

        const colorValues = new Set<string>();

        children.forEach(child => {

          optionAttributes.forEach(attr => {

            if (isColorOption(attr)) {

              const color =
                child[`${attr}_value`] || child[attr];

              if (color) {
                colorValues.add(String(color).trim());
              }
            }
          });
        });

        children.forEach((child, index) => {

          const price = Number(child.price || 0);

          if (price <= 0) {

            pushFailure(
              failed,
              product.entity_id,
              product.sku,
              "Variant has no valid price"
            );

            return;
          }

          const row: any = { ...baseRow };

          optionAttributes.forEach((attr, i) => {

            const rawValue =
              child[`${attr}_value`] ||
              child[attr] ||
              "";
          
            let optionValue = cleanOptionValue(
              String(rawValue),
              child.sku,
              product.name
            );
          
            // =========================
            // FALLBACKS FOR EMPTY VALUES
            // =========================
          
            if (!optionValue) {
          
              const skuParts = child.sku
                ?.split("-")
                .filter(Boolean) || [];
          
              // COLOR FALLBACK
              if (isColorOption(attr)) {
          
                // Example:
                // CMP-0363-Blue-L
                // -> Blue
          
                if (skuParts.length >= 2) {
          
                  optionValue =
                    skuParts[skuParts.length - 2];
                }
              }
          
              // SIZE FALLBACK
              if (
                !optionValue &&
                attr.toLowerCase().includes("size")
              ) {
          
                // Example:
                // CMP-0363-Blue-L
                // -> L
          
                if (skuParts.length >= 1) {
          
                  const rawSize =
                    skuParts[skuParts.length - 1];
          
                  const sizeMap: Record<string, string> = {
                    XS: "Extra Small",
                    S: "Small",
                    SM: "Small",
                    M: "Medium",
                    MD: "Medium",
                    L: "Large",
                    LG: "Large",
                    XL: "Extra Large",
                    XXL: "2XL",
                  };
          
                  optionValue =
                    sizeMap[rawSize.toUpperCase()] ||
                    rawSize;
                }
              }
            }
          
            row[`Option${i + 1} Value`] =
              optionValue || "Default";
          
            if (isColorOption(attr)) {
          
              row[`Option${i + 1} Linked To`] =
                "product.metafields.shopify.color-pattern";
            }
          });
          
          // =========================
          // REMOVE EMPTY OPTIONS
          // =========================
          
          optionAttributes.forEach((_, i) => {
          
            const value =
              row[`Option${i + 1} Value`];
          
            if (
              !value ||
              value === "Default"
            ) {
          
              delete row[`Option${i + 1} Name`];
              delete row[`Option${i + 1} Value`];
              delete row[`Option${i + 1} Linked To`];
            }
          });

          row["Variant SKU"] = child.sku;
          row["Variant Price"] = price.toFixed(2);

          const childImages =
            mediaGalleryMap.get(child.entity_id) || [];

          const variantImage =
            imageUrl(child.image) ||
            (
              childImages.length
                ? imageUrl(childImages[0])
                : ""
            );

          if (variantImage) {
            row["Variant Image"] = variantImage;
          }

          if (index !== 0) {

            delete row.Title;
            delete row["Body (HTML)"];
            delete row.Tags;
            delete row["Image Src"];
            delete row.Vendor;
            delete row.Published;
            delete row["Product Category"];

            optionAttributes.forEach((_, i) => {
              delete row[`Option${i + 1} Name`];
              delete row[`Option${i + 1} Linked To`];
            });

          } else {

            Object.keys(metafields).forEach(key => {

              row[
                `${humanize(key)} (product.metafields.custom.${key})`
              ] = metafields[key];
            });

            if (colorValues.size) {

              row[
                "Color (product.metafields.custom.color-pattern)"
              ] = Array.from(colorValues).join(", ");
            }
          }

          rows.push(normalizeRow(row));
        });
      }

      // =========================
      // BUNDLE
      // =========================

      if (product.type_id === "bundle") {

        const selections =
          bundleSelections.get(product.entity_id) || [];

        if (!selections.length) {

          pushFailure(
            failed,
            product.entity_id,
            product.sku,
            "Bundle without selections"
          );

          rows.push(
            normalizeRow({
              ...baseRow,
              "Variant SKU": product.sku,
              "Variant Price": "1.00",
            })
          );

          continue;
        }

        const optionGroups = new Map<number, any[]>();

        selections.forEach(sel => {

          if (!optionGroups.has(sel.option_id)) {
            optionGroups.set(sel.option_id, []);
          }

          const group = optionGroups.get(sel.option_id)!;

          if (!group.find(g => g.product_id === sel.product_id)) {
            group.push(sel);
          }
        });

        const optionIds =
          Array.from(optionGroups.keys());

        const colorValues = new Set<string>();

        optionIds.forEach((optionId, i) => {

          const group =
            optionGroups.get(optionId)!;

          const optionName =
            group[0]?.option_label ||
            bundleOptions.get(optionId) ||
            `Option ${i + 1}`;

          baseRow[`Option${i + 1} Name`] =
            optionName;

          if (isColorOption(optionName)) {

            group.forEach(sel => {

              const child =
                bundleChildMap.get(sel.product_id) ||
                productMap.get(sel.product_id);

              const color = cleanOptionValue(
                sel.value_label || child?.name,
                child?.sku,
                product.name
              );

              if (color) {
                colorValues.add(color);
              }
            });
          }
        });

        function buildCombinations(
          groups: any[][],
          depth = 0,
          current: any[] = []
        ): any[][] {

          if (depth >= groups.length) {
            return [current];
          }

          let results: any[][] = [];

          groups[depth].forEach(sel => {

            results = results.concat(
              buildCombinations(
                groups,
                depth + 1,
                [...current, sel]
              )
            );
          });

          return results;
        }

        const groupArray =
          optionIds.map(id => optionGroups.get(id)!);

        const combinations =
          buildCombinations(groupArray);

        const processed = new Set<string>();

        combinations.forEach((combo, index) => {

          const row: any = { ...baseRow };

          let variantSku = "";
          let variantPrice = 0;

          combo.forEach((sel, i) => {

            const child =
              bundleChildMap.get(sel.product_id) ||
              productMap.get(sel.product_id);

            if (!child) return;

            variantSku = child.sku;

            row[`Option${i + 1} Value`] =
              cleanOptionValue(
                sel.value_label || child.name,
                child.sku,
                product.name
              );

            const optionName =
              baseRow[`Option${i + 1} Name`];

            if (isColorOption(optionName)) {

              row[`Option${i + 1} Linked To`] =
                "product.metafields.shopify.color-pattern";
            }

            const childImages =
              mediaGalleryMap.get(child.entity_id) || [];

            const variantImage =
              imageUrl(child.image) ||
              (
                childImages.length
                  ? imageUrl(childImages[0])
                  : ""
              );

            if (variantImage) {
              row["Variant Image"] = variantImage;
            }

            if (variantPrice <= 0) {

              variantPrice = resolveBundlePrice(
                child,
                sel,
                product,
                selections,
                productMap
              );
            }
          });

          if (!variantSku) return;

          if (processed.has(variantSku)) return;

          processed.add(variantSku);

          row["Variant SKU"] = variantSku;
          row["Variant Price"] =
            variantPrice.toFixed(2);

          if (index !== 0) {

            delete row.Title;
            delete row["Body (HTML)"];
            delete row.Tags;
            delete row["Image Src"];
            delete row.Vendor;
            delete row.Published;
            delete row["Product Category"];

            optionIds.forEach((_, i) => {
              delete row[`Option${i + 1} Name`];
              delete row[`Option${i + 1} Linked To`];
            });

          } else {

            Object.keys(metafields).forEach(key => {

              row[
                `${humanize(key)} (product.metafields.custom.${key})`
              ] = metafields[key];
            });

            if (colorValues.size) {

              row[
                "Color (product.metafields.custom.color-pattern)"
              ] = Array.from(colorValues).join(", ");
            }
          }

          rows.push(normalizeRow(row));
        });
      }

      // =========================
      // SIMPLE
      // =========================

      if (
        product.type_id === "simple" &&
        !childIds.has(product.entity_id)
      ) {

        const price =
          Number(product.price || 0);

        if (price <= 0) {

          pushFailure(
            failed,
            product.entity_id,
            product.sku,
            "Simple product has no valid price"
          );

        } else {

          const row: any = {
            ...baseRow,
            "Variant SKU": product.sku,
            "Variant Price": price.toFixed(2),

            "Option1 Name": "Title",
            "Option1 Value": "Default Title",
          };

          Object.keys(metafields).forEach(key => {

            row[
              `${humanize(key)} (product.metafields.custom.${key})`
            ] = metafields[key];
          });

          rows.push(normalizeRow(row));
        }
      }

    } catch (err: any) {

      pushFailure(
        failed,
        product.entity_id,
        product.sku,
        err.message || "Unknown error"
      );
    }
  }

  await exportFailures(failed);

  return rows;
}