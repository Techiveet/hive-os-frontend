export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

export const PROPERTY_TYPES = [
  "residential", "commercial", "retail", "mall", "office", "warehouse",
  "industrial", "mixed_use", "land", "apartment_complex", "condominium",
  "villa_compound", "hotel_residence", "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = ["active", "under_construction", "inactive", "disposed"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const UNIT_TYPES = [
  "apartment", "office", "shop", "retail_unit", "kiosk", "warehouse", "storage",
  "restaurant", "food_court", "stall", "parking_space", "atm", "advertising",
  "event_space", "residential_unit", "villa", "other",
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_STATUSES = [
  "available", "reserved", "under_negotiation", "lease_pending_approval", "occupied",
  "notice_given", "under_maintenance", "renovation", "blocked", "owner_occupied", "inactive",
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export type Property = {
  id: number;
  code: string;
  name: string;
  type: PropertyType;
  status: PropertyStatus;
  property_manager_employee_id?: number | null;
  address_line?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  sub_city?: string | null;
  gross_area?: string | null;
  leasable_area?: string | null;
  common_area?: string | null;
  parking_capacity?: number;
  description?: string | null;
  buildings_count?: number;
  units_count?: number;
  buildings?: PropertyBuilding[];
  zones?: PropertyZone[];
  created_at?: string;
};

export type PropertyBuilding = {
  id: number;
  property_id: number;
  code: string;
  name: string;
  type?: string | null;
  floors_count: number;
  status: string;
  floors?: PropertyFloor[];
  units_count?: number;
  created_at?: string;
};

export type PropertyFloor = {
  id: number;
  building_id: number;
  code: string;
  name?: string | null;
  level: number;
  units_count?: number;
};

export type PropertyZone = {
  id: number;
  property_id: number;
  floor_id?: number | null;
  code: string;
  name: string;
  type?: string | null;
  units_count?: number;
};

export type PropertyUnit = {
  id: number;
  property_id: number;
  building_id?: number | null;
  floor_id?: number | null;
  zone_id?: number | null;
  unit_code: string;
  unit_type: UnitType;
  status: UnitStatus;
  rentable_area?: string | null;
  currency?: string;
  rent_rate?: string | null;
  service_asset_id?: number | null;
  property?: { id: number; name: string; code: string };
  building?: { id: number; name: string; code: string } | null;
  floor?: { id: number; name: string | null; level: number } | null;
  created_at?: string;
};

export type PropertyOwner = {
  id: number;
  party_type: "individual" | "company";
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  ownerships_count?: number;
};

export type PropertyTenant = {
  id: number;
  party_type: "individual" | "company";
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
};

export const RESERVATION_STATUSES = ["active", "converted", "expired", "cancelled"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type PropertyReservation = {
  id: number;
  reservation_number: string;
  unit_id: number;
  unit?: { id: number; unit_code: string; property_id: number };
  prospect_name?: string | null;
  prospect_phone?: string | null;
  prospect_email?: string | null;
  reservation_date: string;
  expires_at: string;
  deposit_amount?: string | null;
  quoted_rent?: string | null;
  currency?: string;
  status: ReservationStatus;
  created_at?: string;
};

export const LEASE_STATUSES = [
  "draft", "submitted", "under_review", "approved", "awaiting_signature", "signed",
  "scheduled", "active", "renewal_due", "expiring", "expired", "terminated", "cancelled", "rejected",
] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const BILLING_FREQUENCIES = ["monthly", "quarterly", "semiannual", "annual", "custom"] as const;

export type PropertyLeaseDeposit = {
  id: number;
  lease_id: number;
  required_amount: string;
  paid_amount: string;
  status: "pending" | "partially_paid" | "held" | "refunded" | "forfeited";
  paid_at?: string | null;
  refunded_at?: string | null;
  refunded_amount?: string | null;
  deduction_amount?: string | null;
  deduction_reason?: string | null;
};

export type PropertyLeaseEscalation = {
  id: number;
  lease_id: number;
  rule_type: "fixed_percentage" | "fixed_amount" | "stepped";
  value: string;
  effective_date: string;
  previous_rent_amount?: string | null;
  new_rent_amount?: string | null;
  applied_at?: string | null;
};

export type PropertyLeaseRevision = {
  id: number;
  lease_id: number;
  type: "amendment" | "renewal" | "termination" | "extension";
  effective_date: string;
  reason?: string | null;
  created_at?: string;
};

export type PropertyLease = {
  id: number;
  lease_number: string;
  property_id: number;
  property?: { id: number; name: string; code: string };
  property_tenant_id: number;
  occupant?: { id: number; name: string };
  owner_id?: number | null;
  owner?: { id: number; name: string } | null;
  units?: PropertyUnit[];
  commencement_date: string;
  expiry_date: string;
  possession_date?: string | null;
  billing_start_date?: string | null;
  notice_period_days: number;
  grace_period_days: number;
  currency: string;
  rent_amount: string;
  billing_frequency: string;
  security_deposit_amount: string;
  terms?: string | null;
  status: LeaseStatus;
  signed_at?: string | null;
  activated_at?: string | null;
  terminated_at?: string | null;
  termination_reason?: string | null;
  deposit?: PropertyLeaseDeposit | null;
  escalations?: PropertyLeaseEscalation[];
  revisions?: PropertyLeaseRevision[];
  created_at?: string;
};

export type PropertyBillingSchedule = {
  id: number;
  lease_id: number;
  charge_type: string;
  frequency: string;
  amount: string;
  currency: string;
  next_due_date: string;
  last_billed_through?: string | null;
  is_active: boolean;
};

export type FinanceDocumentSummary = {
  id: number;
  number: string;
  type: string;
  status: string;
  document_date: string;
  due_date?: string | null;
  currency: string;
  total: string;
  paid_amount: string;
};

export type PropertyLeaseInvoices = {
  documents: FinanceDocumentSummary[];
  outstanding_balance: number;
};

export type PropertyLeasePenalty = {
  id: number;
  lease_id: number;
  amount: string;
  reason: string;
  finance_document_id?: number | null;
  created_at?: string;
};

export type PropertyUtilityType = {
  id: number;
  code: string;
  name: string;
  unit_of_measure: string;
  is_active: boolean;
};

export type PropertyUtilityMeter = {
  id: number;
  utility_type_id: number;
  utility_type?: PropertyUtilityType;
  property_id: number;
  property?: { id: number; name: string };
  building_id?: number | null;
  unit_id?: number | null;
  unit?: { id: number; unit_code: string } | null;
  parent_meter_id?: number | null;
  meter_number: string;
  serial_number?: string | null;
  multiplier: string;
  initial_reading: string;
  installed_on?: string | null;
  is_active: boolean;
};

export const TARIFF_STRUCTURES = ["flat", "per_unit", "stepped"] as const;

export type PropertyUtilityTariff = {
  id: number;
  utility_type_id: number;
  structure: (typeof TARIFF_STRUCTURES)[number];
  rate?: string | null;
  steps?: Array<{ up_to: number | null; rate: number }> | null;
  fixed_monthly_charge: string;
  minimum_charge: string;
  effective_from: string;
  effective_to?: string | null;
};

export type PropertyUtilityReading = {
  id: number;
  meter_id: number;
  reading_date: string;
  previous_reading: string;
  current_reading: string;
  consumption: string;
  method: string;
  is_estimated: boolean;
  notes?: string | null;
  is_billed: boolean;
  finance_document_id?: number | null;
  reversed_at?: string | null;
  created_at?: string;
};

export type PropertyUtilityChargePreview = {
  consumption: string;
  unit_of_measure: string;
  tariff_structure: string;
  charge_amount: string;
};

// Phase 8 — Mall Management (spec §41-46).

export const RETAILER_TYPES = [
  "anchor_tenant", "standard_retailer", "kiosk", "pop_up_shop", "restaurant",
  "food_court", "entertainment", "service_provider", "atm_bank", "advertising_tenant",
] as const;
export type RetailerType = (typeof RETAILER_TYPES)[number];

export const TRADING_STATUSES = ["not_open", "trading", "temporarily_closed", "permanently_closed"] as const;
export const FIT_OUT_STATUSES = ["pending", "in_progress", "completed"] as const;

export type PropertyRetailProfile = {
  id: number;
  unit_id: number;
  retailer_type: RetailerType;
  retail_category?: string | null;
  shop_size?: string | null;
  frontage?: string | null;
  operating_hours?: Record<string, unknown> | null;
  trading_status: (typeof TRADING_STATUSES)[number];
  fit_out_status: (typeof FIT_OUT_STATUSES)[number];
  store_opening_date?: string | null;
  operating_rules?: string | null;
};

export type PropertyLeaseTurnoverTerm = {
  id: number;
  lease_id: number;
  base_rent_amount: string;
  percentage_rate: string;
  breakpoint_amount: string;
  period: "monthly" | "quarterly";
  is_active: boolean;
};

export type PropertyImportSummary = {
  total: number;
  accepted: number;
  rejected: number;
  errors: Array<{ row: number; message: string }>;
};

export const MALL_SALES_PERIOD_TYPES = ["daily", "weekly", "monthly"] as const;

export type PropertyMallSalesReport = {
  id: number;
  lease_id: number;
  lease?: { id: number; lease_number: string };
  unit_id: number;
  period_type: (typeof MALL_SALES_PERIOD_TYPES)[number];
  period_start: string;
  period_end: string;
  gross_sales: string;
  refunds: string;
  net_sales: string;
  transaction_count?: number | null;
  approval_status: "pending" | "approved" | "rejected";
  calculated_turnover_rent?: string | null;
  finance_document_id?: number | null;
  notes?: string | null;
  created_at?: string;
};

export type PropertyMallFootfall = {
  id: number;
  property_id: number;
  recorded_date: string;
  entrance?: string | null;
  device_code?: string | null;
  visitor_count: number;
  source: "manual" | "import" | "api";
};

export const MALL_PROMOTION_TYPES = ["campaign", "event", "promotion", "holiday_campaign"] as const;
export const MALL_PROMOTION_STATUSES = ["draft", "submitted", "approved", "active", "completed", "cancelled"] as const;

export type PropertyMallPromotionParticipant = {
  id: number;
  promotion_id: number;
  property_tenant_id: number;
  occupant?: { id: number; name: string };
  notes?: string | null;
};

export type PropertyMallPromotion = {
  id: number;
  property_id: number;
  name: string;
  promotion_type: (typeof MALL_PROMOTION_TYPES)[number];
  location?: string | null;
  organizer?: string | null;
  start_date: string;
  end_date: string;
  cost: string;
  revenue: string;
  status: (typeof MALL_PROMOTION_STATUSES)[number];
  description?: string | null;
  participants?: PropertyMallPromotionParticipant[];
};

export const ADVERTISING_SPACE_TYPES = [
  "billboard", "digital_screen", "banner", "atrium", "escalator_panel", "elevator", "event_space",
] as const;

export type PropertyAdvertisingSpace = {
  id: number;
  property_id: number;
  property?: { id: number; name: string };
  code: string;
  name: string;
  space_type: (typeof ADVERTISING_SPACE_TYPES)[number];
  location_description?: string | null;
  rate_amount: string;
  rate_period: "daily" | "weekly" | "monthly";
  status: "available" | "booked" | "maintenance" | "inactive";
  bookings?: PropertyAdvertisingBooking[];
};

export type PropertyAdvertisingBooking = {
  id: number;
  advertising_space_id: number;
  advertiser_name: string;
  start_date: string;
  end_date: string;
  amount: string;
  status: "reserved" | "confirmed" | "completed" | "cancelled";
  finance_document_id?: number | null;
};

// Phase 9 — Parking / Access / Visitor (spec §47-49).

export type PropertyParkingArea = {
  id: number;
  property_id: number;
  code: string;
  name: string;
  level?: string | null;
  description?: string | null;
  spaces_count?: number;
};

export const PARKING_SPACE_TYPES = ["general", "reserved", "visitor", "tenant", "employee", "disabled", "ev_charging"] as const;

export type PropertyParkingSpace = {
  id: number;
  parking_area_id: number;
  code: string;
  space_type: (typeof PARKING_SPACE_TYPES)[number];
  status: "available" | "occupied" | "reserved" | "maintenance" | "inactive";
  assigned_lease_id?: number | null;
  assigned_employee_id?: number | null;
  assigned_employee?: { id: number; primary_name: string } | null;
};

export type PropertyVehicle = {
  id: number;
  plate_number: string;
  vehicle_type?: string | null;
  property_tenant_id?: number | null;
  occupant?: { id: number; name: string } | null;
  employee_id?: number | null;
  employee?: { id: number; primary_name: string } | null;
  permit_start_date?: string | null;
  permit_end_date?: string | null;
  parking_space_id?: number | null;
  parkingSpace?: { id: number; code: string } | null;
};

export const ACCESS_CREDENTIAL_TYPES = ["access_card", "qr_pass", "visitor_pass", "key", "rfid"] as const;

export type PropertyAccessCredential = {
  id: number;
  credential_type: (typeof ACCESS_CREDENTIAL_TYPES)[number];
  reference_code: string;
  property_tenant_id?: number | null;
  occupant?: { id: number; name: string } | null;
  property_owner_id?: number | null;
  owner?: { id: number; name: string } | null;
  employee_id?: number | null;
  employee?: { id: number; primary_name: string } | null;
  status: "issued" | "active" | "lost" | "returned" | "revoked" | "expired";
  issued_at?: string | null;
  expires_at?: string | null;
};

export type PropertyVisitorEntry = {
  id: number;
  property_id: number;
  property_tenant_id?: number | null;
  visiting?: { id: number; name: string } | null;
  unit_id?: number | null;
  visitor_name: string;
  visitor_contact?: string | null;
  host_name?: string | null;
  vehicle_plate?: string | null;
  status: "expected" | "checked_in" | "checked_out" | "cancelled";
  scheduled_at?: string | null;
  arrived_at?: string | null;
  departed_at?: string | null;
};

// Phase 10 — Analytics / Reports (spec §63, §91, §99).

export type PropertyDashboardOverview = {
  cards: {
    properties: number;
    buildings: number;
    units: number;
    available_units: number;
    occupied_units: number;
    occupancy_percent: number;
    active_leases: number;
    leases_expiring: number;
    monthly_billed_rent: string;
    rent_collected: string;
    outstanding_rent: string;
  };
  charts: {
    occupancy_trend: Array<{ status: string; count: number }>;
    billed_vs_collected: Array<{ month: string; billed: string; collected: string }>;
    income_by_property: Array<{ property_id: number; property_name: string; income: string }>;
    lease_expiries: Array<{ month: string; count: number }>;
  };
};

export type PropertyAlert = {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  record_type: string;
  record_id: number;
  url: string;
};

export type PropertyOwnerStatement = {
  owner_id: number;
  owner_name: string;
  period_start: string;
  period_end: string;
  lines: Array<{ property_id: number; property_name: string; ownership_percentage: string; gross_income: string; owner_share: string }>;
  gross_revenue: string;
  management_fee: string;
  net_payable: string;
};
