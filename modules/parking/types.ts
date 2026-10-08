export interface ParkingLot {
  id: number;
  tenant_id: string;
  code: string;
  name: string;
  type?: string;
  address?: string;
  city?: string;
  total_capacity: number;
  hourly_rate_standard?: number;
  operating_hours?: string;
  contact_phone?: string;
  latitude?: number;
  longitude?: number;
  has_ev_charging?: boolean;
  has_valet?: boolean;
  status?: string;
  is_active?: boolean;
  zones_count?: number;
  bays_count?: number;
  sessions_count?: number;
  zones?: ParkingZone[];
  tariffs?: ParkingTariff[];
  devices?: ParkingDevice[];
  created_at?: string;
}

export interface ParkingZone {
  id: number;
  parking_lot_id: number;
  code?: string;
  name: string;
  floor_number?: number;
  floor_level?: string;
  zone_type?: string;
  capacity?: number;
  is_covered?: boolean;
  status?: string;
  bays?: ParkingBay[];
}

export interface ParkingBay {
  id: number;
  parking_lot_id: number;
  parking_zone_id?: number;
  zone_id?: number;
  bay_number?: string;
  bay_code?: string;
  bay_type?: string;
  status: string;
  current_license_plate?: string | null;
  current_session_id?: number | null;
  sensor_device_id?: string | null;
  last_status_change_at?: string | null;
  parking_lot?: { id: number; name: string };
  parking_zone?: { id: number; name: string; floor_level?: string };
  zone?: { id: number; name: string; floor_number?: number; floor_level?: string };
}

export interface ParkingTariff {
  id: number;
  parking_lot_id?: number | null;
  code?: string;
  name: string;
  description?: string;
  vehicle_type?: string;
  billing_type?: string;
  tariff_type?: string;
  base_rate: number;
  base_hours?: number;
  subsequent_hourly_rate?: number;
  max_daily_rate?: number;
  daily_max_cap?: number;
  grace_period_minutes: number;
  lost_ticket_fee?: number;
  lost_ticket_penalty?: number;
  night_surcharge?: number;
  overnight_flat_rate?: number;
  is_active: boolean;
  parking_lot?: { id: number; name: string };
}

export interface ParkingSession {
  id: number;
  ticket_number: string;
  parking_lot_id: number;
  parking_bay_id?: number | null;
  bay_id?: number | null;
  parking_tariff_id?: number | null;
  tariff_id?: number | null;
  license_plate: string;
  vehicle_type: string;
  vehicle_color?: string | null;
  vehicle_make_model?: string | null;
  entry_time: string;
  exit_time?: string | null;
  entry_gate?: string;
  exit_gate?: string | null;
  anpr_entry_confidence?: number | null;
  anpr_exit_confidence?: number | null;
  duration_minutes?: number;
  calculated_fee?: number;
  total_fee?: number;
  discount_amount?: number;
  paid_amount?: number;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_status?: string;
  status: string;
  notes?: string | null;
  parking_lot?: { id: number; name: string };
  parking_bay?: { id: number; bay_number?: string; bay_code?: string };
  bay?: { id: number; bay_code?: string; bay_number?: string };
  tariff?: { id: number; name: string; base_rate?: number };
}

export interface ParkingPass {
  id: number;
  pass_number?: string;
  pass_code?: string;
  parking_lot_id?: number;
  assigned_bay_id?: number | null;
  customer_name?: string;
  user_name?: string;
  customer_phone?: string;
  user_phone?: string;
  customer_email?: string | null;
  user_email?: string | null;
  pass_type: string;
  license_plate: string;
  rfid_card_uid?: string | null;
  valid_from: string;
  valid_until?: string;
  valid_to?: string;
  price_etb?: number;
  price_paid?: number;
  payment_status?: string;
  status?: string;
  is_active?: boolean;
  parking_lot?: { id: number; name: string };
  assigned_bay?: { id: number; bay_number: string };
}

export interface ParkingReservation {
  id: number;
  reservation_code: string;
  parking_lot_id?: number;
  parking_bay_id?: number | null;
  bay_id?: number | null;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string | null;
  license_plate: string;
  vehicle_type?: string;
  reserved_from?: string;
  reserved_until?: string;
  start_time?: string;
  end_time?: string;
  estimated_cost?: number;
  deposit_paid?: number;
  prepaid_amount?: number;
  qr_token?: string | null;
  status: string;
  special_requests?: string | null;
  parking_lot?: { id: number; name: string };
  parking_bay?: { id: number; bay_number?: string; bay_code?: string };
  bay?: { id: number; bay_code?: string; bay_number?: string };
}

export interface ParkingViolation {
  id: number;
  violation_number: string;
  parking_lot_id?: number;
  parking_session_id?: number | null;
  bay_id?: number | null;
  parking_bay_id?: number | null;
  license_plate: string;
  violation_type: string;
  fine_amount: number;
  issued_at: string;
  officer_name?: string;
  status: string;
  notes?: string | null;
  photo_evidence_url?: string | null;
  parking_lot?: { id: number; name: string };
  parking_bay?: { id: number; bay_number?: string; bay_code?: string };
}

export interface ParkingDevice {
  id: number;
  parking_lot_id: number;
  device_code: string;
  name: string;
  device_type: string;
  ip_address?: string | null;
  mac_address?: string | null;
  gate_direction?: string;
  status: string;
  last_heartbeat_at?: string | null;
  firmware_version?: string | null;
  parking_lot?: { id: number; name: string };
}

export interface ParkingOverviewData {
  total_facilities?: number;
  total_bays?: number;
  occupied_bays?: number;
  available_bays?: number;
  reserved_bays?: number;
  maintenance_bays?: number;
  occupancy_rate_percentage?: number;
  active_sessions_count?: number;
  today_sessions_count?: number;
  today_revenue_etb?: number;
  overstay_alerts_count?: number;
  active_subscribers_count?: number;
  confirmed_reservations_count?: number;
  pending_violations_count?: number;
  facilities?: ParkingLot[];
  recent_sessions?: ParkingSession[];
  devices?: ParkingDevice[];
  kpis?: {
    occupancy_rate: number;
    occupied_bays: number;
    total_bays: number;
    available_bays: number;
    revenue_today: number;
    active_sessions: number;
    overstay_count: number;
  };
}

export interface ParkingFeeResult {
  duration_minutes: number;
  hours_charged?: number;
  base_amount?: number;
  base_fee?: number;
  additional_fee?: number;
  discount_amount?: number;
  lost_ticket_fee?: number;
  final_amount?: number;
  final_fee: number;
  daily_cap?: number;
  tariff_name?: string;
  is_grace_period?: boolean;
  is_lost_ticket?: boolean;
  session_id?: number;
  ticket_number?: string;
  license_plate?: string;
}
