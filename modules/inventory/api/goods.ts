import api from "@/modules/shared/api/http";
import type {
  BarcodePayload,
  GoodDetailResponse,
  GoodOptionsResponse,
  GoodRecord,
  GoodStatus,
  GoodSummaryResponse,
  PaginatedResponse,
  SuggestedPurchaseOrderResponse,
} from "@/modules/inventory/types";

type ListParams = Record<string, unknown>;
type MultipartPayload = Record<string, unknown> | FormData;

const isFormData = (payload: MultipartPayload): payload is FormData => payload instanceof FormData;

export const fetchInventoryGoods = async (params: ListParams = {}) =>
  (
    await api.get<PaginatedResponse<GoodRecord>>("/inventory/goods", {
      params,
    })
  ).data;

export const fetchInventoryGood = async (id: number) =>
  (await api.get<GoodDetailResponse>(`/inventory/goods/${id}`)).data;

export const fetchInventoryGoodSummary = async () =>
  (await api.get<GoodSummaryResponse>("/inventory/goods/summary")).data;

export const fetchInventoryGoodOptions = async () =>
  (await api.get<GoodOptionsResponse>("/inventory/goods/options")).data;

export const createInventoryGood = async (payload: MultipartPayload) => {
  return (await api.post<GoodRecord>("/inventory/goods", payload)).data;
};

export const updateInventoryGood = async (id: number, payload: MultipartPayload) => {
  if (isFormData(payload)) {
    return (await api.post<GoodRecord>(`/inventory/goods/${id}?_method=PATCH`, payload)).data;
  }

  return (await api.patch<GoodRecord>(`/inventory/goods/${id}`, payload)).data;
};

export const deleteInventoryGood = async (id: number) =>
  (await api.delete(`/inventory/goods/${id}`)).data;

export const bulkDeleteInventoryGoods = async (ids: number[]) =>
  (
    await api.post<{
      deleted_count: number;
      requires_approval?: boolean;
      message?: string;
      submissions?: unknown[];
    }>("/inventory/goods/bulk-delete", {
      ids,
    })
  ).data;

export const bulkUpdateInventoryGoodsStatus = async (
  ids: number[],
  status: GoodStatus
) =>
  (
    await api.post<{ updated_count: number; status: GoodStatus }>(
      "/inventory/goods/bulk-status",
      {
        ids,
        status,
      }
    )
  ).data;

export const adjustInventoryGoodStock = async (
  id: number,
  payload: {
    mode: "add" | "deduct" | "set";
    quantity: number;
    warehouse_location_id?: number;
    unit_cost?: number;
    batch_number?: string;
    expiry_date?: string;
    reason?: string;
    notes?: string;
    idempotency_key?: string;
  }
) => (await api.post<{ message: string; good: GoodRecord }>(`/inventory/goods/${id}/adjust-stock`, payload)).data;

export const transferInventoryGoodLocation = async (
  id: number,
  payload: {
    from_location_id: number;
    to_location_id: number;
    quantity: number;
    batch_number?: string;
    notes?: string;
    idempotency_key?: string;
  }
) => (await api.post<{ message: string; good: GoodRecord }>(`/inventory/goods/${id}/transfer-location`, payload)).data;

export const generateGoodBarcode = async (prefix: string = "210") =>
  (
    await api.post<BarcodePayload>("/inventory/goods/generate-barcode", {
      prefix,
    })
  ).data;

export const suggestGoodPurchaseOrder = async (id: number) =>
  (await api.post<SuggestedPurchaseOrderResponse>(`/inventory/goods/${id}/suggest-po`)).data;
