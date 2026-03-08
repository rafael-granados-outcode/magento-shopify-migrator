import { shopify } from "./shopifyClient";

export async function findOrCreateShopifyCustomerByEmail(
  email: string,
  billing: any,
  shipping: any,
  magentoOrder: any
): Promise<number> {
  // Try to find existing customer by email
  const searchResponse = await shopify.get("/customers/search.json", {
    params: {
      query: `email:${email}`,
    },
  });

  const existing = searchResponse.data.customers?.[0];
  if (existing) {
    return existing.id;
  }

  const firstName =
    billing?.firstname ||
    shipping?.firstname ||
    magentoOrder.customer_firstname ||
    "";
  const lastName =
    billing?.lastname ||
    shipping?.lastname ||
    magentoOrder.customer_lastname ||
    "";

  const addressSource = shipping || billing || null;

  const customerPayload: any = {
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

  const createResponse = await shopify.post("/customers.json", customerPayload);
  return createResponse.data.customer.id;
}

