import axios from "axios";

const BASE_URL = process.env.ADMIN_API_URL!;
const TOKEN = process.env.ADMIN_API_ACCESS_TOKEN!;

export const shopify = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-Shopify-Access-Token": TOKEN,
    "Content-Type": "application/json"
  }
});