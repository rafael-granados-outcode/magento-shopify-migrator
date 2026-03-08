"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
const shopifyClient_1 = require("./shopifyClient");
async function createOrder(normalizedOrder) {
    const payload = {
        order: {
            customer: { id: normalizedOrder.shopifyCustomerId },
            processed_at: normalizedOrder.createdAt,
            financial_status: "paid",
            fulfillment_status: "fulfilled",
            note: `Migrated from Magento. Magento Order #${normalizedOrder.incrementId}`,
            line_items: normalizedOrder.lineItems,
            shipping_lines: normalizedOrder.shippingLines,
            billing_address: normalizedOrder.billingAddress,
            shipping_address: normalizedOrder.shippingAddress,
        }
    };
    // Only add transactions if the amount is greater than zero
    if (parseFloat(normalizedOrder.totalPaid) > 0) {
        payload.order.transactions = [
            {
                kind: "sale",
                status: "success",
                amount: normalizedOrder.totalPaid
            }
        ];
    }
    const response = await shopifyClient_1.shopify.post("/orders.json", payload);
    return response.data.order;
}
