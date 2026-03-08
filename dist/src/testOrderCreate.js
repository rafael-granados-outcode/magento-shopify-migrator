"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestOrder = createTestOrder;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const REST_URL = process.env.ORDERS_API_URL;
const ACCESS_TOKEN = process.env.ADMIN_API_ACCESS_TOKEN;
async function createTestOrder() {
    console.log("Creating test order via REST...");
    try {
        const response = await axios_1.default.post(REST_URL, {
            order: {
                email: "rafael.granados@outcodesoftware.com",
                created_at: "2022-01-15T10:30:00-05:00",
                processed_at: "2022-01-15T10:30:00-05:00",
                financial_status: "paid",
                note: "Migrated from Magento. Magento Order #100000124",
                line_items: [
                    {
                        title: "Migration Test Product",
                        price: "49.99",
                        quantity: 1
                    }
                ],
                billing_address: {
                    first_name: "Rafael",
                    last_name: "Granados",
                    address1: "123 Test St",
                    city: "Miami",
                    province: "Florida",
                    country: "United States",
                    zip: "33101"
                },
                shipping_address: {
                    first_name: "Rafael",
                    last_name: "Granados",
                    address1: "123 Test St",
                    city: "Miami",
                    province: "Florida",
                    country: "United States",
                    zip: "33101"
                },
                transactions: [
                    {
                        kind: "sale",
                        status: "success",
                        amount: "49.99"
                    }
                ]
            }
        }, {
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
                "Content-Type": "application/json"
            }
        });
        console.log(JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        console.error(error.response?.data || error.message);
    }
}
