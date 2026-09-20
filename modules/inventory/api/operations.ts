// Inventory Operations API — Phase 4G.2.
// Thin client over the proven Phase 4G.1 endpoints (/api/v1/inventory/*). Paths are
// relative to the backend API root (the shared axios client adds base URL + auth +
// tenant headers). Single resources come back at the ROOT (the app sets
// JsonResource::withoutWrapping()); resource collections come back as { data, meta }.
import api from "@/modules/shared/api/http";
import type {
  AccountMapping,
  AccountMappingStatus,
  CostingMethodState,
  CostLayer,
  FinanceAccountOption,
  GlTraceFromJournal,
  GlTraceFromValuation,
  GoodBatch,
  InventoryAccountEvent,
  InventoryCount,
  InventoryCountLine,
  InventorySerial,
  ReconciliationOrphans,
  ReconciliationResult,
  ReorderBasis,
  ReorderBasisResponse,
  SerialTransferResult,
  ValuationEntry,
  ValuationSummaryRow,
} from "@/modules/inventory/operations-types";

type ListParams = Record<string, unknown>;

/** Laravel resource-collection shape: { data, meta, links }. */
export interface MetaPaginated<T> {
  data: T[];
  meta?: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
  links?: Record<string, string | null>;
}

/** Raw Laravel paginator shape (flat): { data, current_page, per_page, total, ... }. */
export interface FlatPaginated<T> {
  data: T[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

// ---- Canonical batch / expiry ----------------------------------------------
export const fetchInventoryBatches = async (params: ListParams = {}) =>
  (await api.get<MetaPaginated<GoodBatch>>("/inventory/batches", { params })).data;

export const fetchInventoryBatch = async (id: number) =>
  (await api.get<GoodBatch>(`/inventory/batches/${id}`)).data;

// ---- Serial numbers ---------------------------------------------------------
export const fetchInventorySerials = async (params: ListParams = {}) =>
  (await api.get<MetaPaginated<InventorySerial>>("/inventory/serials", { params })).data;

export const lookupInventorySerial = async (serialNumber: string) =>
  (await api.get<InventorySerial>("/inventory/serials/lookup", {
    params: { serial_number: serialNumber },
  })).data;

export const fetchInventorySerial = async (id: number) =>
  (await api.get<InventorySerial>(`/inventory/serials/${id}`)).data;

export const transferInventorySerial = async (
  id: number,
  payload: { to_location_id: number; idempotency_key?: string }
) => (await api.post<SerialTransferResult>(`/inventory/serials/${id}/transfer`, payload)).data;

// ---- Stocktake --------------------------------------------------------------
export const fetchStocktakes = async (params: ListParams = {}) =>
  (await api.get<MetaPaginated<InventoryCount>>("/inventory/stocktakes", { params })).data;

export const fetchStocktake = async (id: number) =>
  (await api.get<InventoryCount>(`/inventory/stocktakes/${id}`)).data;

export const createStocktake = async (payload: {
  reference?: string;
  warehouse_id?: number;
  warehouse_location_id?: number;
  count_type?: "physical" | "cycle" | "spot" | "blind";
  notes?: string;
}) => (await api.post<InventoryCount>("/inventory/stocktakes", payload)).data;

export const generateStocktakeLines = async (id: number) =>
  (await api.post<InventoryCount>(`/inventory/stocktakes/${id}/generate`)).data;

export const enterStocktakeLine = async (
  id: number,
  lineId: number,
  payload: { counted_quantity: number; observed_serials?: string[]; reason?: string }
) => (await api.post<InventoryCountLine>(`/inventory/stocktakes/${id}/lines/${lineId}/enter`, payload)).data;

export const submitStocktake = async (id: number) =>
  (await api.post<InventoryCount>(`/inventory/stocktakes/${id}/submit`)).data;

export const approveStocktake = async (id: number) =>
  (await api.post<InventoryCount>(`/inventory/stocktakes/${id}/approve`)).data;

export const finalizeStocktake = async (id: number) =>
  (await api.post<InventoryCount>(`/inventory/stocktakes/${id}/finalize`)).data;

export const cancelStocktake = async (id: number) =>
  (await api.post<InventoryCount>(`/inventory/stocktakes/${id}/cancel`)).data;

// ---- Valuation (finance) ----------------------------------------------------
export const fetchValuationSummary = async (params: ListParams = {}) =>
  (await api.get<FlatPaginated<ValuationSummaryRow>>("/inventory/valuation/summary", { params })).data;

export const fetchCostLayers = async (params: ListParams & { good_id: number }) =>
  (await api.get<MetaPaginated<CostLayer>>("/inventory/valuation/layers", { params })).data;

export const fetchValuationEntries = async (params: ListParams = {}) =>
  (await api.get<MetaPaginated<ValuationEntry>>("/inventory/valuation/entries", { params })).data;

// ---- Costing ----------------------------------------------------------------
export const fetchCostingMethod = async (goodId: number) =>
  (await api.get<CostingMethodState>(`/inventory/costing/${goodId}`)).data;

export const updateCostingMethod = async (
  goodId: number,
  payload: { costing_method?: "fifo" | "standard"; standard_unit_cost?: number }
) => (await api.patch<CostingMethodState>(`/inventory/costing/${goodId}`, payload)).data;

// ---- Account mapping --------------------------------------------------------
export const fetchAccountMappings = async () =>
  (await api.get<{ data: AccountMapping[] }>("/inventory/account-mappings")).data.data;

export const fetchAccountMappingStatus = async () =>
  (await api.get<{ data: AccountMappingStatus[] }>("/inventory/account-mappings/status")).data.data;

export const fetchAccountOptions = async (params: ListParams = {}) =>
  (await api.get<{ data: FinanceAccountOption[] }>("/inventory/account-mappings/options", { params })).data.data;

export const updateAccountMapping = async (
  event: InventoryAccountEvent,
  payload: { account_id: number; is_active?: boolean }
) => (await api.patch<AccountMapping>(`/inventory/account-mappings/${event}`, payload)).data;

// ---- GL trace ---------------------------------------------------------------
export const fetchGlTraceFromValuation = async (entryId: number) =>
  (await api.get<GlTraceFromValuation>(`/inventory/gl-trace/valuation/${entryId}`)).data;

export const fetchGlTraceFromJournal = async (journalId: number) =>
  (await api.get<GlTraceFromJournal>(`/inventory/gl-trace/journal/${journalId}`)).data;

// ---- Reconciliation ---------------------------------------------------------
export const fetchReconciliationInventoryGl = async () =>
  (await api.get<ReconciliationResult>("/inventory/reconciliation/inventory-gl")).data;

export const fetchReconciliationCogs = async () =>
  (await api.get<ReconciliationResult>("/inventory/reconciliation/cogs")).data;

export const fetchReconciliationGrni = async () =>
  (await api.get<ReconciliationResult>("/inventory/reconciliation/grni")).data;

export const fetchReconciliationPpv = async () =>
  (await api.get<ReconciliationResult>("/inventory/reconciliation/ppv")).data;

export const fetchReconciliationOrphans = async () =>
  (await api.get<ReconciliationOrphans>("/inventory/reconciliation/orphans")).data;

// ---- Reorder basis ----------------------------------------------------------
export const fetchReorderBasis = async (params: ListParams & { basis?: ReorderBasis } = {}) =>
  (await api.get<ReorderBasisResponse>("/inventory/reorder-basis", { params })).data;

// ---- Warehouse locations (destination picker for serial transfer) -----------
export interface WarehouseLocationOption {
  id: number;
  code: string;
  name: string | null;
  warehouse_id: number;
  is_active?: boolean;
  is_sellable?: boolean;
  warehouse?: { id: number; name: string } | null;
}

export const fetchWarehouseLocations = async (params: ListParams = {}) =>
  (
    await api.get<{ data: WarehouseLocationOption[] }>("/warehouse/locations", {
      params: { limit: 200, ...params },
    })
  ).data.data;
