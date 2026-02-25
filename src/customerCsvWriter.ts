import { createObjectCsvWriter } from "csv-writer";
import { MagentoCustomer } from "./types";

export async function writeCustomersCsv(customers: MagentoCustomer[]) {

  const writer = createObjectCsvWriter({
    path: "shopify_customers.csv",
    header: [
      { id: "firstName", title: "First Name" },
      { id: "lastName", title: "Last Name" },
      { id: "email", title: "Email" },
      { id: "acceptsMarketing", title: "Accepts Email Marketing" },

      { id: "company", title: "Default Address Company" },
      { id: "address1", title: "Default Address Address1" },
      { id: "address2", title: "Default Address Address2" },
      { id: "city", title: "Default Address City" },
      { id: "province", title: "Default Address Province Code" },
      { id: "country", title: "Default Address Country Code" },
      { id: "zip", title: "Default Address Zip" },
      { id: "phone", title: "Default Address Phone" },

      { id: "tags", title: "Tags" },
      { id: "note", title: "Note" },
      { id: "taxExempt", title: "Tax Exempt" }
    ],
    alwaysQuote: true
  });

  const rows = customers.map(cust => ({
    firstName: cust.firstname || "",
    lastName: cust.lastname || "",
    email: cust.email,
    acceptsMarketing: "true",

    company: cust.company || "",
    address1: cust.street || "",
    address2: "",
    city: cust.city || "",
    province: cust.region || "",
    country: cust.country || "",
    zip: cust.postcode || "",
    phone: cust.address_phone || "",

    tags: `magento_group_${cust.group_id}`,
    note: `Migrated from Magento ID ${cust.entity_id}`,
    taxExempt: "false"
  }));

  await writer.writeRecords(rows);

  console.log(`Customers CSV exported: shopify_customers.csv (${rows.length} rows)`);
}