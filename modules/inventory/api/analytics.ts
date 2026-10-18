// Contract for GET /inventory/analytics/dashboard (InventoryAnalyticsController).
// Every figure is aggregated server-side from persisted rows; money fields are
// null unless the viewer holds view_finance, and procurement / sales are null
// unless they can see those modules.
import api from "@/modules/shared/api/http";

export type AlertSeverity = "out_of_stock" | "critical" | "reorder" | "overstock";

export interface StockAlert {
  source: "good" | "inventory_item" | "product";
  id: number;
  sku: string | null;
  name: string;
  uom: string | null;
  severity: AlertSeverity;
  on_hand: number;
  available: number;
  reorder_level: number;
  safety_stock: number;
  daily_usage: number | null;
  days_of_cover: number | null;
  suggested_order_qty: number;
  suggested_order_value: number | null;
  supplier_id: number | null;
  supplier_name: string | null;
}

export type ExpiryBucketKey = "expired" | "d7" | "d30" | "d90" | "later";

export interface InventoryAnalytics {
  generated_at: string;
  window_days: number;
  kpis: {
    active_goods: number;
    on_hand: number;
    reserved: number;
    inbound: number;
    outbound: number;
    movements: number;
    expiring_30d_lots: number;
    expiring_30d_qty: number;
    expired_lots_on_hand: number;
    expired_qty_on_hand: number;
    alerts: Record<AlertSeverity, number>;
    stock_value: number | null;
  };
  alerts: { counts: Record<AlertSeverity, number>; items: StockAlert[] };
  expiry_exposure: {
    buckets: Array<{ bucket: ExpiryBucketKey; lots: number; quantity: number; value: number | null }>;
    lots: Array<{
      good_id: number;
      name: string;
      uom: string | null;
      batch_number: string;
      expiry_date: string;
      days_left: number;
      bucket: ExpiryBucketKey;
      quantity: number;
      value: number | null;
      location: string | null;
      warehouse: string | null;
      sellable: boolean;
    }>;
  };
  movement_trend: Array<{ date: string; inbound: number; outbound: number; transfers: number }>;
  movement_by_source: Array<{ direction: "in" | "out" | "transfer"; source: string; quantity: number; movements: number }>;
  stock_by_warehouse: Array<{ id: number; name: string; sellable: number; held: number; reserved: number }>;
  top_movers: Array<{ id: number; name: string; sku: string | null; uom: string | null; outbound: number; on_hand: number }>;
  dead_stock: {
    count: number;
    quantity: number;
    value: number | null;
    items: Array<{ id: number; name: string; sku: string | null; uom: string | null; on_hand: number; value: number | null }>;
  };
  category_mix: Array<{ name: string; goods: number; on_hand: number; value: number | null }>;
  supplier_exposure: Array<{
    supplier: string;
    items: number;
    out_of_stock: number;
    suggested_order_qty: number;
    suggested_order_value: number | null;
  }>;
  value_trend: Array<{ date: string; value: number }> | null;
  procurement: {
    by_status: Array<{ status: string; orders: number; total: number }>;
    open_orders: number;
    open_value: number;
    overdue_orders: number;
    receipts_in_window: number;
    top_suppliers: Array<{ supplier: string; orders: number; total: number }>;
  } | null;
  sales: {
    by_status: Array<{ status: string; orders: number; total: number }>;
    backlog_qty: number;
    reserved_qty: number;
    top_demand: Array<{ product: string; ordered: number; backlog: number; reserved: number }>;
  } | null;
}

export const fetchInventoryAnalytics = async (days = 30) =>
  (await api.get<InventoryAnalytics>("/inventory/analytics/dashboard", { params: { days } })).data;
