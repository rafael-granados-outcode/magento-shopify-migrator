"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopify = void 0;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.ADMIN_API_URL;
const TOKEN = process.env.ADMIN_API_ACCESS_TOKEN;
exports.shopify = axios_1.default.create({
    baseURL: BASE_URL,
    headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
    }
});
