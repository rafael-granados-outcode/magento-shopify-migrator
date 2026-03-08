"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateShopifyCustomerByEmail = findOrCreateShopifyCustomerByEmail;
const shopifyClient_1 = require("./shopifyClient");
async function findOrCreateShopifyCustomerByEmail(email, billing, shipping, magentoOrder) {
    // Try to find existing customer by email
    const searchResponse = await shopifyClient_1.shopify.get("/customers/search.json", {
        params: {
            query: `email:${email}`,
        },
    });
    const existing = searchResponse.data.customers?.[0];
    if (existing) {
        return existing.id;
    }
    const firstName = billing?.firstname ||
        shipping?.firstname ||
        magentoOrder.customer_firstname ||
        "";
    const lastName = billing?.lastname ||
        shipping?.lastname ||
        magentoOrder.customer_lastname ||
        "";
    const addressSource = shipping || billing || null;
    const customerPayload = {
        customer: {
            email,
            first_name: firstName,
            last_name: lastName,
            verified_email: true,
        },
    };
    if (addressSource) {
        customerPayload.customer.addresses = [
            {
                first_name: firstName,
                last_name: lastName,
                address1: addressSource.street,
                city: addressSource.city,
                province: addressSource.region,
                country: addressSource.country_id,
                zip: addressSource.postcode,
                phone: addressSource.telephone,
                default: true,
            },
        ];
    }
    const createResponse = await shopifyClient_1.shopify.post("/customers.json", customerPayload);
    return createResponse.data.customer.id;
}
