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