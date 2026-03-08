"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillOrder = fulfillOrder;
const shopifyClient_1 = require("./shopifyClient");
async function fulfillOrder(orderId) {
    const foResponse = await shopifyClient_1.shopify.get(`/orders/${orderId}/fulfillment_orders.json`);
    const fulfillmentOrders = foResponse.data.fulfillment_orders;
    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
        throw new Error(`No fulfillment orders found for Shopify order ${orderId}`);
    }
    await shopifyClient_1.shopify.post("/fulfillments.json", {
        fulfillment: {
            fulfillment_order_id: fulfillmentOrders[0].id,
            notify_customer: false
        }
    });
}
