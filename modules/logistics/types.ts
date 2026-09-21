export interface LogisticsOption {
  id: number;
  name: string;
  code?: string;
  node_type?: string;
  employee_number?: string;
  primary_name?: string;
}
export interface LogisticsSelectorOption extends LogisticsOption {
  meta?: Record<string, unknown>;
}
export interface LogisticsReferences {
  customers: LogisticsOption[];
  employees: LogisticsOption[];
  modes: LogisticsOption[];
  nodes: LogisticsOption[];
  suppliers: LogisticsOption[];
  products: LogisticsOption[];
  inventory_items: Array<{ id: number; name: string; sku: string }>;
  warehouses: LogisticsOption[];
  incoterms: LogisticsOption[];
  charge_codes: LogisticsOption[];
  equipment_types: Array<
    LogisticsOption & { category: string; requires_iso_validation: boolean }
  >;
  air_weight_profiles: Array<
    LogisticsOption & {
      divisor: string;
      rounding_increment: string;
      is_default: boolean;
    }
  >;
}
export interface LogisticsPageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
export interface ControlTowerJob {
  id: number;
  job_number: string;
  status: string;
  customer?: LogisticsOption | null;
  origin_node?: LogisticsOption | null;
  destination_node?: LogisticsOption | null;
  primary_transport_mode?: LogisticsOption | null;
  planned_departure_at: string | null;
  planned_arrival_at: string | null;
  original_eta_at: string | null;
  latest_eta_at: string | null;
  last_tracking_event_at: string | null;
  open_exception_count: number;
  overdue_milestone_count: number;
  active_alert_count: number;
}
export interface CommandCenterMetrics {
  active_jobs: number;
  in_transit_jobs: number;
  arriving_next_48_hours: number;
  stale_tracking_jobs: number;
  at_risk_milestones: number;
  active_alerts: number;
  open_exceptions: number;
  critical_exceptions: number;
  exception_by_category: Record<string, number>;
  exception_by_severity: Record<string, number>;
}
export interface LogisticsMilestone {
  id: number;
  transport_leg_id: number | null;
  transport_node_id: number | null;
  route_revision: number;
  sequence: number;
  code: string;
  name: string;
  requirement_type: string;
  status: string;
  planned_at: string | null;
  estimated_at: string | null;
  actual_at: string | null;
  due_at: string | null;
  completion_source: string | null;
  responsible_employee_id: number | null;
}
export interface OperationalTimelineItem {
  identity: string;
  source: string;
  code: string;
  title: string;
  occurred_at: string;
  received_at?: string | null;
  status?: string | null;
  mode?: string | null;
  node?: string | null;
  reference?: string | null;
  is_out_of_order?: boolean;
}
export interface LogisticsException {
  id: number;
  exception_number: string;
  forwarding_job_id: number;
  transport_leg_id: number | null;
  milestone_id: number | null;
  category: string;
  severity: string;
  status: string;
  source: string;
  detected_at: string;
  due_at: string | null;
  responsible_employee_id: number | null;
  root_cause_code: string | null;
  root_cause_detail: string | null;
  action_required: string;
  customer_impact: string | null;
  operational_impact: string | null;
  has_financial_impact: boolean;
  acknowledged_at: string | null;
  escalated_at: string | null;
  resolution: string | null;
  resolved_at: string | null;
  job?: { id: number; job_number: string; status: string } | null;
  responsible_employee?: LogisticsOption | null;
  comments?: Array<{ id: number; comment: string; created_at: string; created_by?: { id: number; name: string } }>;
}
export interface TrackingWorkspace {
  job: {
    id: number;
    job_number: string;
    status: string;
    original_eta_at: string | null;
    latest_eta_at: string | null;
    last_tracking_event_at: string | null;
  };
  milestones: LogisticsMilestone[];
  timeline: OperationalTimelineItem[];
  eta_history: Array<{
    id: number;
    scope: string;
    transport_leg_id: number | null;
    milestone_id: number | null;
    eta_at: string;
    prior_eta_at: string | null;
    recorded_at: string;
    source: string;
    confidence: string | null;
    reason: string | null;
  }>;
  exceptions: LogisticsException[];
}
export interface CustomsCase {
  id: number; case_number: string; forwarding_job_id: number; clearance_type: string; status: string;
  customs_office: string | null; declaration_reference: string | null; e_sad_reference: string | null;
  e_manifest_reference: string | null; t1_reference: string | null; release_reference: string | null;
  released_at: string | null; notes: string | null; job?: { id: number; job_number: string; status: string };
  items?: Array<Record<string, unknown>>; assessments?: Array<Record<string, unknown>>;
  holds?: Array<{ id: number; hold_type: string; reason: string; resolved_at: string | null }>;
  checklist?: Array<{ id: number; label_snapshot: string; is_required: boolean; is_complete: boolean; notes?: string | null }>;
  events?: Array<{ id: number; event_type: string; occurred_at: string; reference?: string | null; notes?: string | null }>;
}
export interface DocumentType { id: number; code: string; name: string; category: string; mode_code: string | null; }
export interface FreightDocument {
  id: number; document_record_number: string; document_number: string | null; forwarding_job_id: number | null;
  document_type_id: number; status: string; source: string; original_copy: string; current_version: number;
  issued_on: string | null; expires_on: string | null; type?: DocumentType; job?: { id: number; job_number: string; status: string };
  versions?: Array<{ id: number; version: number; original_filename: string | null; mime_type: string | null; size_bytes: number | null; sha256: string | null; change_reason?: string | null; created_at: string }>;
}
export interface WarehouseHandoff {
  id: number; handoff_number: string; forwarding_job_id: number; warehouse_id: number; warehouse_location_id: number | null;
  direction: string; purpose: string; inventory_treatment: string; status: string; scheduled_at: string | null;
  completed_at: string | null; warehouse_reference: string | null; job?: { id: number; job_number: string; status: string };
  lines?: Array<{ id: number; expected_quantity: string; actual_quantity: string | null; uom: string; condition: string | null; stock_movement_id: number | null }>;
  discrepancies?: Array<{ id: number; discrepancy_type: string; description: string; status: string }>;
}
export interface RateLine {
  id: number;
  charge_code_id: number;
  description: string;
  basis: string;
  default_quantity?: string;
  buy_rate?: string;
  sell_rate: string;
  minimum_buy_amount?: string;
  minimum_sell_amount?: string;
  charge_code?: LogisticsOption;
}
export interface RateSheetVersion {
  id: number;
  version: number;
  effective_date: string;
  expiry_date: string | null;
  status: string;
  revision_notes?: string | null;
  lines: RateLine[];
}
export interface RateSheet {
  id: number;
  rate_sheet_number: string;
  name: string;
  rate_type: string;
  supplier_id: number | null;
  sales_customer_id: number | null;
  transport_mode_id: number | null;
  origin_node_id: number | null;
  destination_node_id: number | null;
  service_type: string | null;
  currency: string;
  status: string;
  current_version: number;
  is_customer_specific: boolean;
  notes: string | null;
  supplier?: LogisticsOption;
  customer?: LogisticsOption;
  transport_mode?: LogisticsOption;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
  versions?: RateSheetVersion[];
}
export interface QuotationLine {
  id: number;
  charge_code: string;
  description: string;
  currency: string;
  basis: string;
  quantity: string;
  sell_unit_rate: string;
  sell_amount: string;
  buy_unit_rate?: string;
  buy_amount?: string;
  is_overridden: boolean;
}
export interface QuotationLeg {
  id: number;
  sequence: number;
  transport_mode_id: number;
  origin_node_id: number;
  destination_node_id: number;
  provider_supplier_id?: number | null;
  estimated_departure_at?: string | null;
  estimated_arrival_at?: string | null;
  transport_mode?: LogisticsOption;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
}
export interface QuotationOption {
  id: number;
  option_code: string;
  label: string;
  provider?: LogisticsOption;
  primary_transport_mode?: LogisticsOption;
  service_type: string | null;
  estimated_transit_minutes: number | null;
  estimated_departure_at: string | null;
  estimated_arrival_at: string | null;
  total_sell: string;
  total_buy?: string;
  profit_amount?: string;
  margin_percentage?: string | null;
  markup_percentage?: string | null;
  legs: QuotationLeg[];
  lines: QuotationLine[];
}
export interface QuotationRevision {
  id: number;
  revision: number;
  status: string;
  origin_node_id: number;
  destination_node_id: number;
  requested_transport_mode_id: number | null;
  incoterm_id: number | null;
  service_type: string | null;
  cargo_summary: string | null;
  requested_departure_at: string | null;
  valid_until: string;
  currency: string;
  total_sell: string;
  total_buy?: string;
  profit_amount?: string;
  margin_percentage?: string | null;
  markup_percentage?: string | null;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
  parties: Array<Record<string, unknown>>;
  cargo: Array<Record<string, unknown>>;
  options: QuotationOption[];
  workflow_submission_id?: number | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
}
export interface FreightQuotation {
  id: number;
  quotation_number: string;
  sales_customer_id: number;
  status: string;
  current_revision: number;
  customer?: LogisticsOption;
  revision: QuotationRevision | null;
  revision_history?: Array<{
    id: number;
    revision: number;
    status: string;
    valid_until: string;
    currency: string;
    total_sell: string;
    total_buy?: string;
    profit_amount?: string;
    margin_percentage?: string | null;
    created_at: string;
  }>;
  activity?: Array<{
    id: number;
    event: string;
    description: string;
    created_at: string;
  }>;
  created_at?: string;
  updated_at?: string;
}
export interface BookingAmendment {
  id: number;
  revision: number;
  status: string;
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  reason: string;
  applied_at: string | null;
  created_at: string;
}
export interface Booking {
  id: number;
  booking_number: string;
  status: string;
  quotation_revision_id: number;
  quotation_option_id: number;
  forwarding_job_id: number | null;
  sales_customer_id: number;
  provider_supplier_id: number | null;
  transport_mode_id: number | null;
  origin_node_id: number;
  destination_node_id: number;
  service_type: string | null;
  requested_departure_at: string | null;
  confirmed_departure_at: string | null;
  requested_arrival_at: string | null;
  confirmed_arrival_at: string | null;
  carrier_booking_reference: string | null;
  cargo_summary: string | null;
  notes: string | null;
  customer?: LogisticsOption;
  provider?: LogisticsOption;
  transport_mode?: LogisticsOption;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
  forwarding_job?: { id: number; job_number: string; status: string };
  amendments?: BookingAmendment[];
}
export interface TransportLeg {
  id: number;
  route_revision: number;
  sequence: number;
  transport_mode_id: number;
  origin_node_id: number;
  destination_node_id: number;
  provider_supplier_id: number | null;
  booking_id: number | null;
  service_type: string | null;
  status: string;
  requested_departure_at: string | null;
  planned_departure_at: string | null;
  actual_departure_at: string | null;
  requested_arrival_at: string | null;
  planned_arrival_at: string | null;
  actual_arrival_at: string | null;
  provider_reference: string | null;
  notes: string | null;
  allows_route_gap: boolean;
  route_gap_reason: string | null;
  transport_mode?: LogisticsOption;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
  provider?: LogisticsOption;
  ocean_detail?: Record<string, unknown> | null;
  air_detail?: Record<string, unknown> | null;
  road_detail?: Record<string, unknown> | null;
  rail_detail?: Record<string, unknown> | null;
  equipment_assignments?: Array<{
    id: number;
    equipment_id: number;
    identification_number: string;
    status: string;
  }>;
  supply_chain_handoff?: {
    id: number;
    supply_chain_shipment_id: number;
    status: string;
    shipment_number: string | null;
    shipment_status: string | null;
  } | null;
}
export interface EquipmentAssignment {
  id: number;
  equipment_id: number;
  forwarding_job_id: number;
  booking_id: number | null;
  consolidation_id: number | null;
  status: string;
  current_node_id: number | null;
  tare_weight_kg: string | null;
  max_gross_weight_kg: string | null;
  actual_gross_weight_kg: string | null;
  free_time_start_at: string | null;
  free_time_end_at: string | null;
  free_time: {
    free_days_remaining: number | null;
    overdue_days: number;
    is_expired: boolean;
    demurrage_exposure: string | null;
    detention_exposure: string | null;
    total_exposure: string | null;
    currency: string | null;
  };
  damage_flag: boolean;
  damage_severity: string | null;
  damage_notes: string | null;
  damage_file_entry_id: number | null;
  job?: { id: number; job_number: string; status: string };
  current_node?: LogisticsOption | null;
  legs?: Array<{
    id: number;
    sequence: number;
    transport_leg_id: number;
    leg: TransportLeg | null;
  }>;
  events?: Array<{
    id: number;
    event_type: string;
    time_kind: string;
    event_at: string;
    source: string;
    external_reference: string | null;
    notes: string | null;
    node?: LogisticsOption | null;
  }>;
  seals?: Array<{
    id: number;
    seal_type: string;
    seal_number: string;
    applied_at: string;
    removed_at: string | null;
    change_reason: string | null;
  }>;
  vgms?: Array<{
    id: number;
    weight_kg: string;
    method: string;
    status: string;
    verified_at: string | null;
    verified_by_name: string | null;
    source: string;
  }>;
}
export interface EquipmentFreeTimeRule {
  id: number;
  name: string;
  start_event: string;
  free_days: number;
  currency: string;
  effective_date: string;
  expiry_date: string | null;
  supplier?: LogisticsOption | null;
  equipment_type?: LogisticsOption | null;
}
export interface Equipment {
  id: number;
  identification_number: string;
  normalized_number: string;
  equipment_type_id: number;
  owner_supplier_id: number | null;
  is_iso_standard: boolean;
  iso_validated_at: string | null;
  is_active: boolean;
  notes: string | null;
  type?: LogisticsOption & {
    category: string;
    length_feet: string | null;
    max_gross_weight_kg: string | null;
    tare_weight_kg: string | null;
    capacity_cbm: string | null;
  };
  owner?: LogisticsOption | null;
  assignments?: EquipmentAssignment[];
  created_at?: string;
  updated_at?: string;
}
export interface ConsolidationMember {
  id: number;
  house_forwarding_job_id: number;
  house_reference: string | null;
  allocated_weight_kg: string;
  allocated_cbm: string;
  allocated_chargeable_weight_kg: string;
  allocated_packages: string;
  equipment_utilization_percentage: string | null;
  allocation_percentage: string;
  allocation_value: string;
  status: string;
  job?: { id: number; job_number: string; status: string };
  customer?: LogisticsOption | null;
}
export interface Consolidation {
  id: number;
  consolidation_number: string;
  master_reference: string | null;
  master_forwarding_job_id: number | null;
  transport_leg_id: number | null;
  transport_mode_id: number;
  provider_supplier_id: number | null;
  origin_node_id: number;
  destination_node_id: number;
  status: string;
  allocation_method: string;
  capacity_weight_kg: string | null;
  capacity_cbm: string | null;
  capacity_packages: string | null;
  planned_departure_at: string | null;
  planned_arrival_at: string | null;
  confirmed_at: string | null;
  deconsolidation_started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  lock_version: number;
  mode?: LogisticsOption;
  provider?: LogisticsOption | null;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
  master_job?: { id: number; job_number: string; status: string } | null;
  members?: ConsolidationMember[];
  equipment?: EquipmentAssignment[];
  members_count?: number;
  created_at?: string;
  updated_at?: string;
}
export interface ForwardingJob {
  id: number;
  job_number: string;
  status: string;
  sales_customer_id: number;
  responsible_employee_id: number | null;
  salesperson_employee_id: number | null;
  source_quotation_revision_id: number | null;
  origin_node_id: number;
  destination_node_id: number;
  primary_transport_mode_id: number | null;
  service_category: string | null;
  incoterm_id: number | null;
  external_reference: string | null;
  planned_departure_at: string | null;
  planned_arrival_at: string | null;
  internal_notes: string | null;
  current_route_revision: number;
  lock_version: number;
  customer?: LogisticsOption;
  responsible_employee?: LogisticsOption;
  salesperson?: LogisticsOption;
  incoterm?: LogisticsOption;
  source_quotation?: {
    id: number | null;
    quotation_number: string | null;
    revision: number;
  } | null;
  origin_node?: LogisticsOption;
  destination_node?: LogisticsOption;
  primary_transport_mode?: LogisticsOption;
  parties?: Array<Record<string, unknown>>;
  cargo?: Array<Record<string, unknown>>;
  packages?: Array<Record<string, unknown>>;
  legs?: TransportLeg[];
  bookings?: Array<{
    id: number;
    booking_number: string;
    status: string;
    carrier_booking_reference: string | null;
    provider?: LogisticsOption | null;
    transport_mode?: LogisticsOption | null;
  }>;
  equipment?: EquipmentAssignment[];
  consolidations?: Array<{
    id: number;
    consolidation_number: string;
    status: string;
    mode: string;
    house_reference: string | null;
    allocation_percentage: string;
  }>;
  customs_cases?: Array<{ id: number; case_number: string; clearance_type: string; status: string }>;
  freight_documents?: Array<{ id: number; document_record_number: string; document_number: string | null; status: string; current_version: number; type?: LogisticsOption }>;
  warehouse_handoffs?: Array<{ id: number; handoff_number: string; purpose: string; inventory_treatment: string; status: string }>;
  activity?: Array<{
    id: number;
    event: string;
    description: string;
    created_at: string;
  }>;
}
export interface LogisticsOverview {
  total_jobs: number;
  draft_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  recent_jobs: ForwardingJob[];
}

export interface JobCharge {
  id: number; description: string; source_category: string; basis: string; status: string;
  quantity?: string; unit_rate?: string; currency?: string; original_amount?: string;
  tax_amount?: string; billed_amount?: string; credited_amount?: string; remaining_amount?: string;
  is_override: boolean; override_reason?: string | null;
  charge_code?: { id: number; code: string; name: string };
}

export interface JobCost {
  id: number; description: string; source_category: string; basis: string; status: string;
  quantity?: string; unit_rate?: string; currency?: string; quoted_estimated_amount?: string;
  estimated_amount?: string; current_expected_amount?: string; accrued_amount?: string;
  actual_amount?: string; vendor_billed_amount?: string; variance_vs_quote?: string;
  variance_vs_expected?: string; supplier_invoice_reference?: string | null; is_override: boolean;
  charge_code?: { id: number; code: string; name: string };
  supplier?: { id: number; name: string } | null;
}

export interface LogisticsFinanceDocumentLink { id: number; number: string; status: string; paid_amount: string; }
export interface LogisticsBillingRequest {
  id: number; request_number: string; status: string; invoice_date: string; due_date?: string | null;
  currency?: string; subtotal?: string; tax_total?: string; total?: string;
  lines?: Array<{ id: number; job_charge_id: number; description?: string; amount: string; tax_amount: string }>;
  finance_document?: LogisticsFinanceDocumentLink | null;
}
export interface LogisticsVendorBillRequest extends LogisticsBillingRequest {
  supplier?: { id: number; name: string }; supplier_invoice_reference?: string;
  duplicate_override?: boolean; duplicate_override_reason?: string | null;
}
export interface LogisticsAccrual {
  id: number; job_cost_id: number; amount: string; currency: string; base_amount: string;
  base_currency: string; posting_date: string; reason: string; status: string;
  finance_period_id: number; posted_at?: string | null; settled_at?: string | null; reversed_at?: string | null;
}
export interface FinancialClosure {
  id: number; revision: number; action: "closed" | "reopened"; base_currency: string;
  expected_revenue: string; billed_revenue: string; estimated_cost: string; accrued_cost: string;
  actual_cost: string; recognized_cost: string; profit: string; margin_percentage: string | null;
  markup_percentage: string | null; reason: string; effective_at: string;
}
export interface JobFinanceSummary {
  financial_status: string; base_currency?: string; quoted_revenue?: string; expected_revenue?: string;
  billable_revenue?: string; billed_revenue?: string; unbilled_revenue?: string; revenue_variance?: string;
  estimated_cost?: string; current_expected_cost?: string; accrued_cost?: string; actual_cost?: string;
  vendor_billed_cost?: string; unbilled_vendor_cost?: string; recognized_cost?: string; cost_variance?: string;
  projected_profit?: string; actual_profit?: string; projected_margin_percentage?: string | null;
  actual_margin_percentage?: string | null; projected_markup_percentage?: string | null;
  actual_markup_percentage?: string | null; customer_invoice_state?: string; vendor_bill_state?: string;
  failed_postings?: number;
}
export interface JobFinancePayload {
  job: { id: number; job_number: string; financial_status: string };
  summary: JobFinanceSummary; charges: JobCharge[]; costs: JobCost[];
  billing_requests: LogisticsBillingRequest[]; vendor_bill_requests: LogisticsVendorBillRequest[];
  accruals: LogisticsAccrual[]; closures: FinancialClosure[];
}
export interface JobFinanceReferences {
  tax_rates: Array<{ id: number; code: string; name: string; rate: string; is_inclusive: boolean }>;
  periods: Array<{ id: number; name: string; starts_on: string; ends_on: string; status: string }>;
}
export interface LogisticsFinancialDashboard {
  base_currency: string; revenue: string; gross_profit: string; average_margin_percentage: string | null;
  unbilled_revenue: string; open_accruals: number; unbilled_costs: string; jobs_ready_to_close: number;
  negative_margin_jobs: number; failed_postings: number; from: string; to: string;
}
export interface LogisticsFinancialReport {
  report: string; rows: Array<Record<string, string | number | null>>;
  meta: { current_page: number; per_page: number; total: number; last_page: number };
  filters: Record<string, unknown>;
}
