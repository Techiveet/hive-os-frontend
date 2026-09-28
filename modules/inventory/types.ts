export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

export type ProductCategory = {
  id: number;
  name: string;
  parent_id?: number | null;
  is_active: boolean;
  products_count?: number;
  parent?: {
    id: number;
    name: string;
  } | null;
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  products_count?: number;
};

export type Supplier = {
  id: number;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  products_count?: number;
};

export type SupplierDetail = Supplier & {
  products?: Array<{
    id: number;
    name: string;
    sku: string;
    supplier_id?: number | null;
  }>;
};

export type InventoryEntityRecord = {
  id: number;
  entity_type: string;
  name: string;
  code?: string | null;
  parent_id?: number | null;
  is_active: boolean;
  image?: string | null;
  payload?: Record<string, unknown> | null;
  parent?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  created_by_id?: number | null;
  updated_by_id?: number | null;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  current_stock: string;
  reorder_level: string;
  selling_price: string;
  is_active: boolean;
};

export type ProductKeyValue = {
  key: string;
  value: string;
};

export type ProductRecord = {
  id: number;
  tenant_id?: string;
  name: string;
  sku: string;
  stock_code?: string | null;
  description?: string | null;
  product_category_id?: number | null;
  source_type?: string | null;
  source_id?: number | null;
  parent_product_id?: number | null;
  unit?: string | null;
  uom?: string | null;
  units_per_package?: number | null;
  reorder_point: number;
  quantity: string;
  stock_quantity?: string; // Alias for UI compatibility
  unit_price: string;
  price?: string;
  tax_rate: string;
  cost_of_good: string;
  cost?: string;
  currency?: string | null;
  sale_price?: string | null;
  barcode?: string | null;
  barcode_path?: string | null;
  image?: string | null;
  image_preview_url?: string | null;
  model_3d_path?: string | null;
  model_3d_preview_url?: string | null;
  hs_code?: string | null;
  country_of_origin?: string | null;
  nutritional_info?: ProductKeyValue[] | null;
  attributes?: ProductKeyValue[] | null;
  track_inventory: boolean;
  allow_backorders: boolean;
  status: "draft" | "published" | "archived";
  qa_status?: "pending" | "qa_passed" | "qa_failed" | "no_batches";
  workflow_status?: "pending" | "approved" | "rejected" | undefined;

  weight?: string | null;
  weight_unit?: string | null;
  length?: string | null;
  width?: string | null;
  height?: string | null;
  dimension_unit?: string | null;
  lead_time_days?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  variants_count?: number;
  category?: {
    id: number;
    name: string;
  } | null;
  parent?: {
    id: number;
    name: string;
    sku: string;
  } | null;
  variants?: Array<{
    id: number;
    name: string;
    sku: string;
    parent_product_id: number | null;
    status: "draft" | "published" | "archived";
    quantity: string;
    price?: string;
    reorder_point: number;
    track_inventory: boolean;
  }>;
  tags: Tag[];
};

export type ProductDetailResponse = {
  product: ProductRecord;
  country_name?: string | null;
};

export type ProductSummaryResponse = {
  totals: {
    products: number;
    published: number;
    draft: number;
    archived: number;
    variants: number;
    low_stock: number;
  };
  catalog: {
    categories: number;
    tags: number;
    suppliers: number;
  };
  recent_products: ProductRecord[];
};

export type ProductOptionsResponse = {
  categories: Array<Pick<ProductCategory, "id" | "name" | "parent_id">>;
  tags: Array<Pick<Tag, "id" | "name" | "slug">>;
  parent_products: Array<Pick<ProductRecord, "id" | "name" | "sku">>;
  uom_options: string[];
  status_options: Array<"draft" | "published" | "archived">;
  currency_options: Array<{
    code: string;
    symbol: string;
    label: string;
  }>;
  countries: Array<{
    code: string;
    name: string;
  }>;
};

export type BarcodePayload = {
  barcode: string;
  preview_data_url: string;
};

export type QaProtocol = {
  id: number;
  name: string;
  code: string;
  stage: string;
  stage_label: string;
  position: number;
  payload: {
    type: "numeric_range" | "qualitative_target";
    unit?: string;
    min?: number;
    max?: number;
    target?: string;
    options?: string[];
    description?: string;
    is_mandatory?: boolean;
    is_critical?: boolean;
  };
};

export type InventoryBatch = InventoryEntityRecord & {
  payload: {
    product_id: number;
    batch_number: string;
    production_date: string;
    expiry_date?: string;
    qa_status?: "pending" | "qa_passed" | "qa_failed";
    qa_locked?: boolean;
    [key: string]: unknown;
  };
};

export type QaResult = {
  id?: number;
  inventory_entity_record_id?: number; // Test template ID
  batch_id?: number;
  test_name: string;
  test_code?: string;
  stage?: string | null;
  stage_label?: string | null;
  test_value: string | number;
  is_passed: boolean;
  status?: "passed" | "failed" | "pending";
  recorded_at: string;
};

export type CoAResponse = {
  batch: {
    id: number;
    batch_number: string;
    product_name?: string | null;
    qa_status: string;
    release_decision?: string;
  };
  compliance: {
    score: number;
    total_tests: number;
    passed_tests: number;
    mandatory_failures: string[];
    missing_tests: string[];
    stage_summary: Array<{
      stage: string;
      stage_label: string;
      total_tests: number;
      passed_tests: number;
      failed_tests: number;
      pending_tests: number;
    }>;
  };
  results: QaResult[];
  tested_by?: string | null;
  tested_at?: string | null;
  notes?: string | null;
  sample_size?: number | null;
};

export type QaBatchResultRecord = {
  id: number;
  result: "passed" | "failed";
  notes?: string | null;
  tested_at?: string | null;
  tested_by?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
  payload?: {
    raw_input?: Record<string, string | number | null>;
    tests?: Record<
      string,
      {
        protocol_id?: number;
        code?: string;
        name: string;
        stage?: string;
        stage_label?: string;
        value?: string | number | null;
        status?: "passed" | "failed" | "pending";
        unit?: string | null;
      }
    >;
    compliance?: {
      mandatory_failures?: string[];
      missing_mandatory_tests?: string[];
    };
    stage_summary?: Array<{
      stage: string;
      stage_label: string;
      total_tests: number;
      passed_tests: number;
      failed_tests: number;
      pending_tests: number;
    }>;
    sample_size?: number | null;
  } | null;
};

export type PaginatedQaBatchResults = PaginatedResponse<QaBatchResultRecord>;

// ==========================================
// Goods (Raw Materials & Inventory Inputs) Types
// ==========================================

export type GoodType =
  | "raw_material"
  | "component"
  | "packaging"
  | "consumable"
  | "semi_finished";

export type GoodStatus = "active" | "inactive" | "archived";
export type GoodTaxType = "exclusive" | "inclusive";

export type GoodSupplierRecord = {
  id: number;
  supplier_id: number;
  name: string;
  code?: string | null;
  unit_cost?: number | string | null;
  lead_time_days?: number | null;
  supplier_sku?: string | null;
  min_order_qty?: number | string | null;
  is_preferred?: boolean;
  pivot?: {
    supplier_sku?: string | null;
    unit_cost?: string | number | null;
    lead_time_days?: number | null;
    min_order_qty?: string | number | null;
    is_preferred?: boolean;
  };
};

export type GoodBatchRecord = {
  id: number;
  good_id: number;
  batch_number: string;
  supplier_batch_number?: string | null;
  supplier_id?: number | null;
  supplier?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  quantity_received: string | number;
  quantity_on_hand: string | number;
  quantity_reserved?: string | number;
  received_date: string;
  manufacture_date?: string | null;
  expiry_date?: string | null;
  status: "active" | "quarantine" | "expired" | "depleted";
  warehouse_id?: number | null;
  warehouse_location_id?: number | null;
  warehouse?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  location?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  qa_status?: "pending" | "passed" | "failed" | "released" | string | null;
};

export type GoodStockLocationRecord = {
  id: number;
  warehouse_id?: number | null;
  warehouse_name: string;
  location_id: number;
  location_code: string;
  location_name: string;
  location_type?: string;
  batch_number?: string | null;
  on_hand: number;
  reserved: number;
  available: number;
  unit_cost: number;
  expiry_date?: string | null;
  received_at?: string | null;
};

export type GoodMovementRecord = {
  id: number;
  good_id?: number;
  type: "receive" | "issue" | "transfer" | "adjustment" | string;
  quantity: string | number;
  unit_cost?: string | number | null;
  batch_number?: string | null;
  serial_number?: string | null;
  expiry_date?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  from_location?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  to_location?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  performed_by?: {
    id: number;
    name: string;
  } | null;
  created_at: string;
};

export type GoodBomUsageRecord = {
  bom_id: number;
  bom_name: string;
  bom_code: string;
  bom_status: string;
  product_id?: number | null;
  product_name: string;
  product_sku: string;
  quantity_per_unit: number;
  uom: string;
  scrap_percent: number;
  gross_quantity: number;
  is_critical: boolean;
};

export type GoodRecord = {
  id: number;
  tenant_id?: string;
  name: string;
  sku: string;
  stock_code?: string | null;
  barcode?: string | null;
  barcode_path?: string | null;
  qr_code_path?: string | null;
  description?: string | null;
  good_type: GoodType;
  category_id?: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
  uom: string;
  unit_of_measure?: string;
  purchase_uom?: string | null;
  consumption_uom?: string | null;
  conversion_factor: string | number;
  uom_conversion_factor?: string | number;
  packaging_quantity: number;
  weight?: string | number | null;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  unit_cost: string | number;
  tax_rate: string | number;
  tax_type: GoodTaxType;
  currency: string;
  quantity_on_hand: string | number;
  total_quantity?: string | number;
  reserved_quantity: string | number;
  available_stock?: number;
  available_quantity?: number;
  is_low_stock?: boolean;
  reorder_level: string | number;
  safety_stock: string | number;
  min_order_quantity: string | number;
  minimum_order_quantity?: string | number;
  lead_time_days?: number | null;
  max_stock_capacity?: string | number | null;
  primary_warehouse_id?: number | null;
  primary_warehouse?: {
    id: number;
    name: string;
    code?: string | null;
    address?: string | null;
  } | null;
  default_location_id?: number | null;
  default_location?: {
    id: number;
    name: string;
    code?: string | null;
    warehouse_id?: number | null;
  } | null;
  preferred_supplier_id?: number | null;
  preferred_supplier?: Supplier | null;
  suppliers?: GoodSupplierRecord[];
  track_batches: boolean;
  track_expiry: boolean;
  shelf_life_days?: number | null;
  expiry_alert_days?: number | null;
  msds_file_path?: string | null;
  spec_sheet_path?: string | null;
  msds_sheet_path?: string | null;
  image?: string | null;
  image_preview_url?: string | null;
  model_3d_path?: string | null;
  is_active: boolean;
  status: GoodStatus;
  metadata?: Record<string, unknown> | null;
  batches?: GoodBatchRecord[];
  stock_movements?: GoodMovementRecord[];
  created_at: string;
  updated_at: string;
};

export type GoodDetailResponse = {
  good: GoodRecord;
  stocks_by_location: GoodStockLocationRecord[];
  bom_usages: GoodBomUsageRecord[];
};

export type GoodSummaryResponse = {
  totals: {
    goods: number;
    total_stock_value: number;
    low_stock: number;
    expiring_soon: number;
    active: number;
    raw_materials: number;
    components: number;
    packaging: number;
    consumables: number;
    semi_finished: number;
  };
  recent_goods: GoodRecord[];
};

export type GoodOptionsResponse = {
  categories: Array<{ id: number; name: string; parent_id?: number | null }>;
  suppliers: Array<{ id: number; name: string; code?: string | null; email?: string | null }>;
  warehouses: Array<{ id: number; name: string; code?: string | null; type?: string | null }>;
  locations: Array<{ id: number; name: string; code?: string | null; warehouse_id?: number | null; type?: string | null }>;
  good_types: Array<{ value: GoodType; label: string }>;
  uom_options: string[];
  status_options: GoodStatus[];
  tax_types: GoodTaxType[];
  currency_options: Array<{
    code: string;
    symbol: string;
    label: string;
  }>;
};

export type SuggestedPurchaseOrderResponse = {
  good_id: number;
  good_name: string;
  sku: string;
  uom: string;
  current_stock: number;
  available_stock: number;
  reorder_level: number;
  min_order_quantity: number;
  suggested_quantity: number;
  unit_cost: number;
  estimated_total: number;
  preferred_supplier?: {
    id: number;
    name: string;
    code?: string | null;
    email?: string | null;
  } | null;
  purchase_order_draft: {
    supplier_id?: number | null;
    currency?: string;
    items: Array<{
      good_id: number;
      name: string;
      sku: string;
      quantity: number;
      unit_cost: number;
      total_price: number;
    }>;
    notes?: string;
  };
};
