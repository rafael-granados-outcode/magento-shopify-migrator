import { MagentoProduct } from "./types";
import slugify from "slugify";
import { RedirectRow } from "./types";

function normalizePath(path?: string) {
  if (!path) return "";

  let p = path;

  if (!p.startsWith("/")) p = "/" + p;

  return p;
}

export function buildRedirects(products: MagentoProduct[]): RedirectRow[] {

  const redirects: RedirectRow[] = [];
  const seen = new Set<string>();

  for (const product of products) {

    const oldPath =
      (product as any).url_path ||
      (product as any).request_path ||
      product.url_key;

    if (!oldPath) continue;

    const path = normalizePath(oldPath);

    if (seen.has(path)) continue;

    const handle = slugify(product.name, { lower: true });

    redirects.push({
      Command: "NEW",
      Path: path,
      Target: `/products/${handle}`,
    });

    seen.add(path);
  }

  return redirects;
}