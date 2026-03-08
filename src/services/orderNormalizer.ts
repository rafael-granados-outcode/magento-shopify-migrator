import { NormalizedOrder } from "../types";

export function normalizeMagentoOrder(
  order: any,
  items: any[],
  billing: any,
  shipping: any,
  shopifyCustomerId: number
): NormalizedOrder {

  const lineItems = items
    .filter(i => !i.parent_item_id) // avoid configurable duplicates
    .map(item => ({
      title: item.name,
      sku: item.sku,
      price: Number(item.price).toFixed(2),
      quantity: Number(item.qty_ordered),
      tax_lines: item.tax_amount > 0
        ? [{
            price: Number(item.tax_amount).toFixed(2),
            rate: item.tax_percent / 100,
            title: "Tax"
          }]
        : []
    }));

  const shippingLines = order.shipping_amount > 0
    ? [{
        title: "Shipping",
        price: Number(order.shipping_amount).toFixed(2)
      }]
    : [];

  return {
    incrementId: order.increment_id,
    shopifyCustomerId,
    createdAt: new Date(order.created_at).toISOString(),
    currency: order.order_currency_code,
    totalPaid: Number(order.total_paid).toFixed(2),

    billingAddress: {
      first_name: billing?.firstname || "Guest",
      last_name: billing?.lastname || "Customer",
      address1: billing?.street || "",
      city: billing?.city || "",
      province: billing?.region || "", 
      country: billing?.country_id || "US",
      zip: billing?.postcode || "",
      phone: billing?.telephone || ""
    },

    shippingAddress: {
      first_name: shipping.firstname,
      last_name: shipping.lastname,
      address1: shipping.street,
      city: shipping.city,
      province: shipping.region,
      country: shipping.country_id,
      zip: shipping.postcode,
      phone: shipping.telephone
    },

    lineItems,
    shippingLines
  };
}