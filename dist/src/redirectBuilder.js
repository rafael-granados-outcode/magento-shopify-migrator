"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRedirects = buildRedirects;
const slugify_1 = __importDefault(require("slugify"));
function normalizePath(path) {
    if (!path)
        return "";
    let p = path;
    if (!p.startsWith("/"))
        p = "/" + p;
    return p;
}
function buildRedirects(products) {
    const redirects = [];
    const seen = new Set();
    for (const product of products) {
        const oldPath = product.url_path ||
            product.request_path ||
            product.url_key;
        if (!oldPath)
            continue;
        const path = normalizePath(oldPath);
        if (seen.has(path))
            continue;
        const handle = (0, slugify_1.default)(product.name, { lower: true });
        redirects.push({
            Command: "NEW",
            Path: path,
            Target: `/products/${handle}`,
        });
        seen.add(path);
    }
    return redirects;
}
