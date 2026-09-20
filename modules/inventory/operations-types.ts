// Inventory Operations types — Phase 4G.2.
// Rebuilt from the actual Phase 4G.1 backend API Resources and route validation
// (Modules/Inventory/app/Http/Resources + routes/api.php). Money and quantities are
// decimal-safe STRINGS exactly as the API returns them — never parse to float for
// anything but display.

export type DecimalString = string;

export type SerialStatus =
  | "available" | "issued" | "quarantine" | "damaged" | "returned" | "disposed" | "missing";

export type InventoryCountStatus =
  | "draft" | "counting" | "submitted" | "approved" | "finalized" | "cancelled";

export type CostingMethod = "fifo" | "standard";

export type InventoryAccountEvent =
  | "inventory_asset" | "inventory_grni" | "inventory_cogs"
  | "inventory_variance" | "inventory_gain" | "inventory_ppv";

// ---- Canonical batch / expiry ----------------------------------------------
export interface GoodBatch {
  id: number;
  good_id: number;
  batch_number: string;
  supplier_batch_number: string | null;
  supplier_id: number | null;
  status: string;
  qa_status: string | null;
  quantity_received: DecimalString | null;
  quantity_on_hand: DecimalString | null;
  quantity_reserved: DecimalString | null;
  received_date: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  is_expired: boolean;
  warehouse_id: number | null;
  warehouse_location_id: number | null;
  sellable_eligible?: boolean; // detail only (server-derived)
  sellable_quantity?: DecimalString; // detail only
  good?: { id: number; name: string; sku: string; uom: string } | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---- Serial numbers ---------------------------------------------------------
export interface InventorySerial {
  id: number;
  serial_number: string;
  good_id: number;
  good_batch_id: number | null;
  status: SerialStatus;
  warehouse_location_id: number | null;
  received_at: string | null;
  source_type: string | null;
  source_id: string | null;
  issued_reference_type: string | null;
  issued_reference_id: string | null;
  good?: { id: number; name: string; sku: string; uom: string } | null;
  batch?: { id: number; batch_number: string; expiry_date: string | null } | null;
  location?: { id: number; code: string; warehouse_id: number } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SerialTransferResult {
  message: string;
  stock_movement_id: number;
  serial: InventorySerial;
}

// ---- Stocktake --------------------------------------------------------------
export interface InventoryCountLine {
  id: number;
  inventory_count_id: number;
  good_id: number;
  warehouse_location_id: number | null;
  good_batch_id: number | null;
  batch_number: string | null;
  is_serial: boolean;
  snapshot_quantity: DecimalString | null;
  expected_quantity: DecimalString | null;
  counted_quantity: DecimalString | null;
  variance: DecimalString | null;
  expected_serials: string[] | null;
  observed_serials: string[] | null;
  missing_serials: string[] | null;
  unexpected_serials: string[] | null;
  reason: string | null;
  finalized: boolean;
  good?: { id: number; name: string; sku: string; uom: string } | null;
}

export interface InventoryCount {
  id: number;
  reference: string;
  warehouse_id: number | null;
  warehouse_location_id: number | null;
  count_type: string;
  status: InventoryCountStatus;
  snapshot_at: string | null;
  finalized_at: string | null;
  created_by_id: number | null;
  submitted_by_id: number | null;
  approved_by_id: number | null;
  notes: string | null;
  lines_count?: number;
  lines?: InventoryCountLine[];
  created_at: string | null;
  updated_at: string | null;
}

// ---- Valuation (finance) ----------------------------------------------------
export interface ValuationSummaryRow {
  good_id: number;
  sku: string;
  name: string;
  costing_method: CostingMethod;
  currency: string | null;
  physical_quantity: DecimalString;
  valuation_quantity: DecimalString;
  inventory_value: DecimalString;
  standard_unit_cost: DecimalString | null;
  derived_unit_cost: DecimalString | null;
}

export interface CostLayer {
  id: number;
  good_id: number;
  good_batch_id: number | null;
  source_movement_id: number | null;
  currency: string | null;
  unit_cost: DecimalString | null;
  quantity_received: DecimalString | null;
  quantity_remaining: DecimalString | null;
  remaining_value: DecimalString;
  received_at: string | null;
}

export interface ValuationEntry {
  id: number;
  good_id: number;
  good_batch_id: number | null;
  stock_movement_id: number | null;
  direction: "in" | "out";
  costing_method: CostingMethod;
  currency: string | null;
  purpose: string | null;
  quantity: DecimalString | null;
  unit_cost: DecimalString | null;
  value_amount: DecimalString | null;
  actual_unit_cost: DecimalString | null;
  actual_value_amount: DecimalString | null;
  purchase_price_variance: DecimalString;
  reference_type: string | null;
  reference_id: string | null;
  gl_journal_id: number | null;
  gl_status: string | null;
  created_at: string | null;
}

// ---- Costing ----------------------------------------------------------------
export interface CostingMethodState {
  good_id: number;
  sku: string;
  costing_method: CostingMethod;
  standard_unit_cost: DecimalString;
  currency: string | null;
  has_valued_inventory: boolean;
  can_change_method: boolean;
}

// ---- Account mapping --------------------------------------------------------
export interface AccountMapping {
  id: number;
  event: InventoryAccountEvent;
  source_module: "inventory";
  debit_account_id: number;
  credit_account_id: number;
  is_active: boolean;
  debit_account?: { id: number; code: string; name: string; type: string } | null;
  credit_account?: { id: number; code: string; name: string; type: string } | null;
  updated_at: string | null;
}

export interface AccountMappingStatus {
  event: InventoryAccountEvent;
  label: string;
  side: "debit" | "credit";
  status: "configured" | "system_default" | "invalid";
  has_explicit_mapping: boolean;
  default_code: string;
  effective_account_id: number | null;
  effective_account_code: string | null;
}

export interface FinanceAccountOption {
  id: number;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
}

// ---- GL trace ---------------------------------------------------------------
export interface GlJournalPayload {
  id: number;
  type: string;
  memo: string | null;
  status: string;
  entry_date: string | null;
  debit_total: DecimalString;
  credit_total: DecimalString;
  source_module: string | null;
  source_type: string | null;
  source_id: string | null;
  lines: Array<{
    account_id: number;
    debit: DecimalString;
    credit: DecimalString;
    description: string | null;
  }>;
}

export interface StockMovementPayload {
  id: number;
  type: string;
  good_id: number | null;
  quantity: DecimalString;
  from_location_id: number | null;
  to_location_id: number | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string | null;
}

export interface GlTraceFromValuation {
  valuation_entry: ValuationEntry;
  gl_journal: GlJournalPayload | null;
  stock_movement: StockMovementPayload | null;
}

export interface GlTraceFromJournal {
  gl_journal: GlJournalPayload;
  valuation_entry: ValuationEntry | null;
  stock_movement: StockMovementPayload | null;
  business_document: { reference_type: string | null; reference_id: string | null } | null;
}

// ---- Reconciliation ---------------------------------------------------------
export interface ReconciliationResult {
  metric: string;
  subledger_balance: DecimalString;
  gl_balance: DecimalString;
  difference: DecimalString;
  reconciled: boolean;
  account_id?: number;
  account_code?: string;
  note?: string;
  outstanding_is_expected?: boolean;
}

export interface ReconciliationOrphans {
  valuation_without_journal: number;
  journal_without_valuation: number;
  duplicate_valuation_per_movement: number;
  unbalanced_journals: number;
  total_anomalies: number;
  healthy: boolean;
}

// ---- Reorder basis ----------------------------------------------------------
export type ReorderBasis = "PHYSICAL_ON_HAND" | "NET_AVAILABLE" | "SELLABLE_AVAILABLE";

export interface ReorderBasisRow {
  good_id: number;
  sku: string;
  name: string;
  uom: string;
  basis: ReorderBasis;
  measured_quantity: DecimalString;
  reorder_level: DecimalString;
  safety_stock: DecimalString;
  triggered: boolean;
  below_safety_stock: boolean;
  measurements: {
    physical_on_hand: DecimalString;
    reserved: DecimalString;
    net_available: DecimalString;
    sellable_available: DecimalString;
  };
}

export interface ReorderBasisResponse {
  data: ReorderBasisRow[];
  meta: {
    current_page: number;
    per_page: number;
    last_page: number;
    total: number;
    basis: ReorderBasis;
    available_bases: ReorderBasis[];
    default_basis: ReorderBasis;
    planner_note: string;
  };
}
