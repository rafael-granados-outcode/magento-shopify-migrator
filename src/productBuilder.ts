import slugify from "slugify";
import { MagentoProduct, ShopifyRow } from "./types";
import { loadVariantAttributes } from "./attributeLoader";
import { CONFIG } from "./config";
import { exportFailures } from "./errorReporter";

// ---------------- HELPERS ----------------
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

  for (const key of Object.keys(product)) {
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

// 🔥 Clean option value (fix "Product Name - Color")
function cleanOptionValue(value?: string, fallback?: string) {
  if (!value) return fallback || "";

  // Remove product name prefix pattern
  if (value.includes(" - ")) {
    return value.split(" - ").pop()!.trim();
  }

  return value.trim();
}

// 🔥 Avoid duplicate failures
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

// 🔥 Smart bundle pricing (FIXES TRG-0105)
function resolveBundlePrice(
  child: MagentoProduct | undefined,
  sel: any,
  product: MagentoProduct,
  allSelections: any[],
  productMap: Map<number, MagentoProduct>
): number {

  let price = Number(child?.price || 0);

  // 1. child price
  if (price > 0) return price;

  // 2. fixed price
  if (sel.selection_price_type == 0) {
    price = Number(sel.selection_price_value || 0);
    if (price > 0) return price;
  }

  // 3. percent
  if (sel.selection_price_type == 1) {
    const percent = Number(sel.selection_price_value || 0);
    const base = Number(product.price || 0);

    if (base > 0) {
      price = (base * percent) / 100;
      if (price > 0) return price;
    }
  }

  // 4. 🔥 fallback → ANY child with price
  const fallback = allSelections
    .map(s => productMap.get(s.product_id))
    .find(c => c && Number(c.price) > 0);

  if (fallback) return Number(fallback.price);

  // 5. last fallback
  return 1;
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
  const childIds = new Set(Array.from(parentChildMap.values()).flat());

  const rows: ShopifyRow[] = [];
  const failed: any[] = [];

  for (const product of products) {

    try {

      const handle = slugify(product.name || product.sku, { lower: true });
      const images = mediaGalleryMap.get(product.entity_id) || [];

      let primaryImage = imageUrl(product.image);
      if (!primaryImage && images.length) {
        primaryImage = imageUrl(images[0]);
      }

      const categories = categoryMap.get(product.entity_id) || [];
      const metafields = buildMetafields(product);

      const baseRow: any = {
        Title: product.name,
        Handle: handle,
        "Body (HTML)": cleanHtml(product.description),
        Collection: categories[0] || "",
        Tags: categories.join(", "),
        "Image Src": primaryImage,
      };

      const initialRowCount = rows.length;

      // =========================
      // CONFIGURABLE
      // =========================
      if (product.type_id === "configurable") {

        const childrenIds = parentChildMap.get(product.entity_id) || [];

        const children = childrenIds
          .map(id => productMap.get(id))
          .filter(Boolean) as MagentoProduct[];

        // 🔥 fallback → treat as simple
        if (!children.length) {
          const price = Number(product.price || 0);

          if (price <= 0) {
            pushFailure(failed, product.entity_id, product.sku, "Configurable without children has no valid price");
          } else {
            rows.push({
              ...baseRow,
              "Variant SKU": product.sku,
              "Variant Price": price.toFixed(2),
            });
          }
          continue;
        }

        const optionAttributes: string[] =
          await loadVariantAttributes(product.entity_id);

        optionAttributes.forEach((attr, i) => {
          baseRow[`Option${i + 1} Name`] = humanize(attr);
        });

        children.forEach((child, index) => {

          const price = Number(child.price || 0);
          if (price <= 0) {
            pushFailure(failed, product.entity_id, product.sku, "Variant has no valid price");
            return;
          }

          const row: any = { ...baseRow };

          optionAttributes.forEach((attr, i) => {
            row[`Option${i + 1} Value`] =
              child[`${attr}_value`] || child[attr] || "";
          });

          row["Variant SKU"] = child.sku;
          row["Variant Price"] = price.toFixed(2);

          if (index !== 0) {
            delete row.Title;
            delete row["Body (HTML)"];
            delete row.Tags;
            delete row["Image Src"];
            optionAttributes.forEach((_, i) =>
              delete row[`Option${i + 1} Name`]
            );
          } else {
            Object.keys(metafields).forEach(key => {
              row[`${humanize(key)} (product.metafields.custom.${key})`] = metafields[key];
            });
          }

          rows.push(row);
        });
      }

      // =========================
      // BUNDLE
      // =========================
      if (product.type_id === "bundle") {

        const selections = bundleSelections.get(product.entity_id) || [];

        if (!selections.length) {
          pushFailure(failed, product.entity_id, product.sku, "Bundle without selections");

          rows.push({
            ...baseRow,
            "Variant SKU": product.sku,
            "Variant Price": "1.00",
          });

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

        const optionIds = Array.from(optionGroups.keys());

        if (optionIds.length === 1) {

          const optionId = optionIds[0];
          const group = optionGroups.get(optionId)!;

          baseRow["Option1 Name"] =
            group[0]?.option_label ||
            bundleOptions.get(optionId) ||
            "Option";

          group.forEach((sel, index) => {

            const child =
              bundleChildMap.get(sel.product_id) ||
              productMap.get(sel.product_id);

            const price = resolveBundlePrice(
              child,
              sel,
              product,
              selections,
              productMap
            );

            const row: any = { ...baseRow };

            row["Option1 Value"] = cleanOptionValue(
              sel.value_label || child?.name,
              child?.sku
            );

            row["Variant SKU"] = child?.sku || product.sku;
            row["Variant Price"] = price.toFixed(2);

            if (index !== 0) {
              delete row.Title;
              delete row["Body (HTML)"];
              delete row.Tags;
              delete row["Image Src"];
              delete row["Option1 Name"];
            } else {
              Object.keys(metafields).forEach(key => {
                row[
                  `${humanize(key)} (product.metafields.custom.${key})`
                ] = metafields[key];
              });
            }

            rows.push(row);
          });

        } else {

          // =========================
          // MULTI OPTION BUNDLES
          // =========================

          // Option names
          optionIds.forEach((optionId, i) => {

            const group = optionGroups.get(optionId)!;

            baseRow[`Option${i + 1} Name`] =
              group[0]?.option_label ||
              bundleOptions.get(optionId) ||
              `Option ${i + 1}`;
          });

          // Build cartesian combinations
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

          const groupArray = optionIds.map(id => optionGroups.get(id)!);

          const combinations = buildCombinations(groupArray);

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

              // 🔥 IMPORTANT
              // use LAST child sku as canonical variant sku
              variantSku = child.sku;

              row[`Option${i + 1} Value`] =
                cleanOptionValue(
                  sel.value_label || child.name,
                  child.sku
                );

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

            // skip invalid
            if (!variantSku) return;

            // dedupe REAL sku
            if (processed.has(variantSku)) return;
            processed.add(variantSku);

            row["Variant SKU"] = variantSku;
            row["Variant Price"] = variantPrice.toFixed(2);

            if (index !== 0) {

              delete row.Title;
              delete row["Body (HTML)"];
              delete row.Tags;
              delete row["Image Src"];

              optionIds.forEach((_, i) => {
                delete row[`Option${i + 1} Name`];
              });

            } else {

              Object.keys(metafields).forEach(key => {
                row[
                  `${humanize(key)} (product.metafields.custom.${key})`
                ] = metafields[key];
              });
            }

            rows.push(row);
          });
        }
      }

      // =========================
      // SIMPLE
      // =========================
      if (
        product.type_id === "simple" &&
        !childIds.has(product.entity_id)
      ) {

        const price = Number(product.price || 0);

        if (price <= 0) {
          pushFailure(failed, product.entity_id, product.sku, "Simple product has no valid price");
        } else {
          const row: any = {
            ...baseRow,
            "Variant SKU": product.sku,
            "Variant Price": price.toFixed(2),
          };

          Object.keys(metafields).forEach(key => {
            row[`${humanize(key)} (product.metafields.custom.${key})`] = metafields[key];
          });

          rows.push(row);
        }
      }

      // 🔥 FINAL SAFETY NET (NO PRODUCT LEFT BEHIND)
      // if (rows.length === initialRowCount) {
      //   pushFailure(
      //     failed,
      //     product.entity_id,
      //     product.sku,
      //     "No rows generated → forced fallback"
      //   );

      //   rows.push({
      //     ...baseRow,
      //     "Variant SKU": product.sku,
      //     "Variant Price": "1.00",
      //   });
      // }

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