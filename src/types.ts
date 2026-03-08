export interface MagentoProduct {
  entity_id: number;
  type_id: string;
  name: string;
  sku: string;
  price: number;
  special_price?: number;
  weight?: number;
  description?: string;
  short_description?: string;
  image?: string;
  visibility?: number;
  status?: number;
  [key: string]: any;
}

export interface VariantOption {
  attribute_code: string;
  label: string;
}

export interface ShopifyRow {
  [key: string]: any;
}

export interface MagentoCustomer {
  entity_id: number;
  email: string;
  firstname: string;
  lastname: string;
  telephone?: string;
  group_id: number;

  // Address fields
  company?: string;
  street?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  address_phone?: string;
}

export interface NormalizedOrder {
  incrementId: string
  shopifyCustomerId: number
  createdAt: string
  currency: string

  totalPaid: string

  billingAddress: ShopifyAddress
  shippingAddress: ShopifyAddress

  lineItems: ShopifyLineItem[]
  shippingLines: ShopifyShippingLine[]
}

export interface ShopifyLineItem {
  title: string
  sku: string
  price: string
  quantity: number
  tax_lines?: {
    price: string
    rate: number
    title: string
  }[]
}

export interface ShopifyShippingLine {
  title: string
  price: string
}

export interface ShopifyAddress {
  first_name: string
  last_name: string
  address1: string
  city: string
  province: string
  country: string
  zip: string
  phone?: string
}