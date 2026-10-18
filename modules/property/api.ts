import api from "@/modules/shared/api/http";
import type {
  PaginatedResponse,
  Property,
  PropertyAccessCredential,
  PropertyAdvertisingBooking,
  PropertyAdvertisingSpace,
  PropertyAlert,
  PropertyBillingSchedule,
  PropertyBuilding,
  PropertyDashboardOverview,
  PropertyFloor,
  PropertyImportSummary,
  PropertyLease,
  PropertyLeaseDeposit,
  PropertyLeaseEscalation,
  PropertyLeaseInvoices,
  PropertyLeasePenalty,
  PropertyLeaseTurnoverTerm,
  PropertyMallFootfall,
  PropertyMallPromotion,
  PropertyMallPromotionParticipant,
  PropertyMallSalesReport,
  PropertyOwner,
  PropertyOwnerStatement,
  PropertyParkingArea,
  PropertyParkingSpace,
  PropertyReservation,
  PropertyRetailProfile,
  PropertyTenant,
  PropertyUnit,
  PropertyUtilityChargePreview,
  PropertyUtilityMeter,
  PropertyUtilityReading,
  PropertyUtilityTariff,
  PropertyUtilityType,
  PropertyVehicle,
  PropertyVisitorEntry,
  PropertyZone,
} from "@/modules/property/types";

type ListParams = Record<string, unknown>;

// Properties
export const fetchProperties = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<Property>>("/property/properties", { params })).data;

export const fetchProperty = async (id: number) =>
  (await api.get<Property>(`/property/properties/${id}`)).data;

export const createProperty = async (payload: Record<string, unknown>) =>
  (await api.post<Property>("/property/properties", payload)).data;

export const updateProperty = async (id: number, payload: Record<string, unknown>) =>
  (await api.put<Property>(`/property/properties/${id}`, payload)).data;

export const deleteProperty = async (id: number) => {
  await api.delete(`/property/properties/${id}`);
};

// Buildings
export const fetchBuildings = async (propertyId: number, params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyBuilding>>(`/property/properties/${propertyId}/buildings`, { params })).data;

export const createBuilding = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyBuilding>(`/property/properties/${propertyId}/buildings`, payload)).data;

export const updateBuilding = async (propertyId: number, buildingId: number, payload: Record<string, unknown>) =>
  (await api.put<PropertyBuilding>(`/property/properties/${propertyId}/buildings/${buildingId}`, payload)).data;

export const deleteBuilding = async (propertyId: number, buildingId: number) => {
  await api.delete(`/property/properties/${propertyId}/buildings/${buildingId}`);
};

// Floors
export const fetchFloors = async (buildingId: number) =>
  (await api.get<PropertyFloor[]>(`/property/buildings/${buildingId}/floors`)).data;

export const createFloor = async (buildingId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyFloor>(`/property/buildings/${buildingId}/floors`, payload)).data;

// Zones
export const fetchZones = async (propertyId: number) =>
  (await api.get<PropertyZone[]>(`/property/properties/${propertyId}/zones`)).data;

export const createZone = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyZone>(`/property/properties/${propertyId}/zones`, payload)).data;

// Units
export const fetchUnits = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyUnit>>("/property/units", { params })).data;

export const fetchUnit = async (id: number) =>
  (await api.get<PropertyUnit>(`/property/units/${id}`)).data;

export const createUnit = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyUnit>(`/property/properties/${propertyId}/units`, payload)).data;

export const updateUnit = async (id: number, payload: Record<string, unknown>) =>
  (await api.put<PropertyUnit>(`/property/units/${id}`, payload)).data;

export const changeUnitStatus = async (id: number, status: string, reason?: string) =>
  (await api.post<PropertyUnit>(`/property/units/${id}/status`, { status, reason })).data;

export const deleteUnit = async (id: number) => {
  await api.delete(`/property/units/${id}`);
};

// Owners
export const fetchOwners = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyOwner>>("/property/owners", { params })).data;

export const createOwner = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyOwner>("/property/owners", payload)).data;

// Tenants (occupants)
export const fetchPropertyTenants = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyTenant>>("/property/tenants", { params })).data;

export const createPropertyTenant = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyTenant>("/property/tenants", payload)).data;

// Reservations
export const fetchReservations = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyReservation>>("/property/reservations", { params })).data;

export const createReservation = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyReservation>("/property/reservations", payload)).data;

export const cancelReservation = async (id: number) =>
  (await api.post<PropertyReservation>(`/property/reservations/${id}/cancel`)).data;

// Leases
export const fetchLeases = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyLease>>("/property/leases", { params })).data;

export const fetchLease = async (id: number) =>
  (await api.get<PropertyLease>(`/property/leases/${id}`)).data;

export const createLease = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyLease>("/property/leases", payload)).data;

export const transitionLease = async (id: number, status: string, reason?: string) =>
  (await api.post<PropertyLease>(`/property/leases/${id}/transition`, { status, reason })).data;

export const terminateLease = async (id: number, reason: string, effective_date?: string) =>
  (await api.post<PropertyLease>(`/property/leases/${id}/terminate`, { reason, effective_date })).data;

// Lease escalations
export const previewLeaseEscalation = async (leaseId: number, rule_type: string, value: number) =>
  (
    await api.post<{ current_rent_amount: string; new_rent_amount: string }>(
      `/property/leases/${leaseId}/escalations/preview`,
      { rule_type, value }
    )
  ).data;

export const createLeaseEscalation = async (leaseId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyLeaseEscalation>(`/property/leases/${leaseId}/escalations`, payload)).data;

export const applyLeaseEscalation = async (escalationId: number) =>
  (await api.post<PropertyLeaseEscalation>(`/property/escalations/${escalationId}/apply`)).data;

// Lease deposit
export const recordLeaseDepositPayment = async (leaseId: number, amount: number) =>
  (await api.post<PropertyLeaseDeposit>(`/property/leases/${leaseId}/deposit/payment`, { amount })).data;

export const refundLeaseDeposit = async (leaseId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyLeaseDeposit>(`/property/leases/${leaseId}/deposit/refund`, payload)).data;

// Billing
export const fetchLeaseBillingSchedule = async (leaseId: number) =>
  (await api.get<PropertyBillingSchedule[]>(`/property/leases/${leaseId}/billing-schedule`)).data;

export const fetchLeaseInvoices = async (leaseId: number) =>
  (await api.get<PropertyLeaseInvoices>(`/property/leases/${leaseId}/invoices`)).data;

export const generateLeaseInvoicesNow = async (leaseId: number) =>
  (await api.post<{ generated: unknown[] }>(`/property/leases/${leaseId}/invoices/generate`)).data;

export const chargeLeasePenalty = async (leaseId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyLeasePenalty>(`/property/leases/${leaseId}/penalties`, payload)).data;

// Utility types
export const fetchUtilityTypes = async (params: ListParams = {}) =>
  (await api.get<PropertyUtilityType[]>("/property/utility-types", { params })).data;

export const createUtilityType = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyUtilityType>("/property/utility-types", payload)).data;

// Utility meters
export const fetchUtilityMeters = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyUtilityMeter>>("/property/utility-meters", { params })).data;

export const fetchUtilityMeter = async (id: number) =>
  (await api.get<PropertyUtilityMeter & { readings: PropertyUtilityReading[] }>(`/property/utility-meters/${id}`)).data;

export const createUtilityMeter = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyUtilityMeter>("/property/utility-meters", payload)).data;

// Utility tariffs
export const fetchUtilityTariffs = async (utilityTypeId?: number) =>
  (await api.get<PropertyUtilityTariff[]>("/property/utility-tariffs", { params: utilityTypeId ? { utility_type_id: utilityTypeId } : undefined })).data;

export const createUtilityTariff = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyUtilityTariff>("/property/utility-tariffs", payload)).data;

// Meter readings
export const fetchMeterReadings = async (meterId: number) =>
  (await api.get<PaginatedResponse<PropertyUtilityReading>>(`/property/utility-meters/${meterId}/readings`)).data;

export const recordMeterReading = async (meterId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyUtilityReading>(`/property/utility-meters/${meterId}/readings`, payload)).data;

export const reverseMeterReading = async (readingId: number, reason: string) =>
  (await api.post<PropertyUtilityReading>(`/property/utility-readings/${readingId}/reverse`, { reason })).data;

export const previewMeterReadingCharge = async (readingId: number) =>
  (await api.get<PropertyUtilityChargePreview>(`/property/utility-readings/${readingId}/preview`)).data;

export const billMeterReading = async (readingId: number) =>
  (await api.post(`/property/utility-readings/${readingId}/bill`)).data;

// Maintenance (Phase 6) — links a unit to a Modules\ServiceManagement asset.
// Everything past this point (requests, work orders) goes straight through
// that module's own API (@/modules/service/api), never proxied here.
export const fetchUnitMaintenance = async (unitId: number) =>
  (await api.get<{ service_asset_id: number | null }>(`/property/units/${unitId}/maintenance`)).data;

export const enableUnitMaintenance = async (unitId: number) =>
  (await api.post<{ service_asset_id: number }>(`/property/units/${unitId}/maintenance/enable`)).data;

// Phase 8 — Mall Management (spec §41-46).

// Retail profiles
export const fetchRetailProfile = async (unitId: number) =>
  (await api.get<PropertyRetailProfile | null>(`/property/units/${unitId}/retail-profile`)).data;

export const assignRetailProfile = async (unitId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyRetailProfile>(`/property/units/${unitId}/retail-profile`, payload)).data;

// Turnover rent terms
export const fetchTurnoverTerms = async (leaseId: number) =>
  (await api.get<PropertyLeaseTurnoverTerm | null>(`/property/leases/${leaseId}/turnover-terms`)).data;

export const setTurnoverTerms = async (leaseId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyLeaseTurnoverTerm>(`/property/leases/${leaseId}/turnover-terms`, payload)).data;

export const previewTurnoverRent = async (leaseId: number, turnover: number) =>
  (await api.post<{ turnover_rent: string }>(`/property/leases/${leaseId}/turnover-terms/preview`, { turnover })).data;

// Mall sales reports
export const fetchMallSalesReports = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyMallSalesReport>>("/property/mall-sales-reports", { params })).data;

export const submitMallSalesReport = async (leaseId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyMallSalesReport>(`/property/leases/${leaseId}/mall-sales-reports`, payload)).data;

export const approveMallSalesReport = async (reportId: number) =>
  (await api.post<PropertyMallSalesReport>(`/property/mall-sales-reports/${reportId}/approve`)).data;

export const rejectMallSalesReport = async (reportId: number, reason?: string) =>
  (await api.post<PropertyMallSalesReport>(`/property/mall-sales-reports/${reportId}/reject`, { reason })).data;

export const importMallSalesReports = async (leaseId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return (await api.post<PropertyImportSummary>(`/property/leases/${leaseId}/mall-sales-reports/import`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
};

// Footfall
export const fetchFootfall = async (propertyId: number, params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyMallFootfall>>(`/property/properties/${propertyId}/footfall`, { params })).data;

export const recordFootfall = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyMallFootfall>(`/property/properties/${propertyId}/footfall`, payload)).data;

export const importFootfall = async (propertyId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return (await api.post<PropertyImportSummary>(`/property/properties/${propertyId}/footfall/import`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
};

// Promotions
export const fetchPromotions = async (propertyId: number, params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyMallPromotion>>(`/property/properties/${propertyId}/promotions`, { params })).data;

export const createPromotion = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyMallPromotion>(`/property/properties/${propertyId}/promotions`, payload)).data;

export const updatePromotion = async (promotionId: number, payload: Record<string, unknown>) =>
  (await api.put<PropertyMallPromotion>(`/property/promotions/${promotionId}`, payload)).data;

export const approvePromotion = async (promotionId: number) =>
  (await api.post<PropertyMallPromotion>(`/property/promotions/${promotionId}/approve`)).data;

export const addPromotionParticipant = async (promotionId: number, propertyTenantId: number, notes?: string) =>
  (
    await api.post<PropertyMallPromotionParticipant>(`/property/promotions/${promotionId}/participants`, {
      property_tenant_id: propertyTenantId,
      notes,
    })
  ).data;

export const removePromotionParticipant = async (promotionId: number, propertyTenantId: number) =>
  (await api.delete(`/property/promotions/${promotionId}/participants`, { data: { property_tenant_id: propertyTenantId } })).data;

// Advertising spaces
export const fetchAdvertisingSpaces = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyAdvertisingSpace>>("/property/advertising-spaces", { params })).data;

export const fetchAdvertisingSpace = async (id: number) =>
  (await api.get<PropertyAdvertisingSpace>(`/property/advertising-spaces/${id}`)).data;

export const createAdvertisingSpace = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyAdvertisingSpace>(`/property/properties/${propertyId}/advertising-spaces`, payload)).data;

export const updateAdvertisingSpace = async (id: number, payload: Record<string, unknown>) =>
  (await api.put<PropertyAdvertisingSpace>(`/property/advertising-spaces/${id}`, payload)).data;

// Advertising bookings
export const fetchAdvertisingBookings = async (spaceId: number, params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyAdvertisingBooking>>(`/property/advertising-spaces/${spaceId}/bookings`, { params })).data;

export const bookAdvertisingSpace = async (spaceId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyAdvertisingBooking>(`/property/advertising-spaces/${spaceId}/bookings`, payload)).data;

export const billAdvertisingBooking = async (bookingId: number) =>
  (await api.post<{ booking: PropertyAdvertisingBooking; finance_document: unknown }>(`/property/advertising-bookings/${bookingId}/bill`)).data;

export const cancelAdvertisingBooking = async (bookingId: number) =>
  (await api.post<PropertyAdvertisingBooking>(`/property/advertising-bookings/${bookingId}/cancel`)).data;

export const completeAdvertisingBooking = async (bookingId: number) =>
  (await api.post<PropertyAdvertisingBooking>(`/property/advertising-bookings/${bookingId}/complete`)).data;

// Phase 9 — Parking / Access / Visitor (spec §47-49).

// Parking areas & spaces
export const fetchParkingAreas = async (propertyId: number) =>
  (await api.get<PropertyParkingArea[]>(`/property/properties/${propertyId}/parking-areas`)).data;

export const createParkingArea = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyParkingArea>(`/property/properties/${propertyId}/parking-areas`, payload)).data;

export const fetchParkingSpaces = async (areaId: number) =>
  (await api.get<PropertyParkingSpace[]>(`/property/parking-areas/${areaId}/spaces`)).data;

export const createParkingSpace = async (areaId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyParkingSpace>(`/property/parking-areas/${areaId}/spaces`, payload)).data;

export const allocateParkingSpace = async (spaceId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyParkingSpace>(`/property/parking-spaces/${spaceId}/allocate`, payload)).data;

export const releaseParkingSpace = async (spaceId: number) =>
  (await api.post<PropertyParkingSpace>(`/property/parking-spaces/${spaceId}/release`)).data;

export const changeParkingSpaceStatus = async (spaceId: number, status: string) =>
  (await api.post<PropertyParkingSpace>(`/property/parking-spaces/${spaceId}/status`, { status })).data;

// Vehicles
export const fetchVehicles = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyVehicle>>("/property/vehicles", { params })).data;

export const registerVehicle = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyVehicle>("/property/vehicles", payload)).data;

export const assignVehicleToSpace = async (vehicleId: number, parkingSpaceId: number) =>
  (await api.post<PropertyVehicle>(`/property/vehicles/${vehicleId}/assign-space`, { parking_space_id: parkingSpaceId })).data;

export const releaseVehicleSpace = async (vehicleId: number) =>
  (await api.post<PropertyVehicle>(`/property/vehicles/${vehicleId}/release-space`)).data;

// Access credentials
export const fetchAccessCredentials = async (params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyAccessCredential>>("/property/access-credentials", { params })).data;

export const issueAccessCredential = async (payload: Record<string, unknown>) =>
  (await api.post<PropertyAccessCredential>("/property/access-credentials", payload)).data;

export const activateAccessCredential = async (id: number) =>
  (await api.post<PropertyAccessCredential>(`/property/access-credentials/${id}/activate`)).data;

export const reportAccessCredentialLost = async (id: number) =>
  (await api.post<PropertyAccessCredential>(`/property/access-credentials/${id}/lost`)).data;

export const returnAccessCredential = async (id: number) =>
  (await api.post<PropertyAccessCredential>(`/property/access-credentials/${id}/return`)).data;

export const revokeAccessCredential = async (id: number, reason?: string) =>
  (await api.post<PropertyAccessCredential>(`/property/access-credentials/${id}/revoke`, { reason })).data;

// Visitors
export const fetchVisitors = async (propertyId: number, params: ListParams = {}) =>
  (await api.get<PaginatedResponse<PropertyVisitorEntry>>(`/property/properties/${propertyId}/visitors`, { params })).data;

export const registerVisitor = async (propertyId: number, payload: Record<string, unknown>) =>
  (await api.post<PropertyVisitorEntry>(`/property/properties/${propertyId}/visitors`, payload)).data;

export const checkInVisitor = async (entryId: number) =>
  (await api.post<PropertyVisitorEntry>(`/property/visitors/${entryId}/check-in`)).data;

export const checkOutVisitor = async (entryId: number) =>
  (await api.post<PropertyVisitorEntry>(`/property/visitors/${entryId}/check-out`)).data;

export const cancelVisitor = async (entryId: number) =>
  (await api.post<PropertyVisitorEntry>(`/property/visitors/${entryId}/cancel`)).data;

// Phase 10 — Analytics / Reports (spec §63, §91, §99).

export const fetchDashboardOverview = async () =>
  (await api.get<PropertyDashboardOverview>("/property/dashboard/overview")).data;

export const fetchDashboardAlerts = async () =>
  (await api.get<{ alerts: PropertyAlert[] }>("/property/dashboard/alerts")).data;

export const fetchPortfolioReport = async () => (await api.get<unknown[]>("/property/reports/portfolio")).data;

export const fetchOccupancyReport = async () =>
  (await api.get<{ by_property: Array<{ property_id: number; property_name: string; total_units: number; occupied_units: number; available_units: number; occupancy_percent: number }> }>("/property/reports/occupancy")).data;

export const fetchRentRollReport = async () => (await api.get<unknown[]>("/property/reports/rent-roll")).data;

export const fetchLeaseExpiryReport = async (days = 90) => (await api.get<unknown[]>("/property/reports/lease-expiry", { params: { days } })).data;

export const fetchRentCollectionReport = async () =>
  (await api.get<{ aging_buckets: Record<string, number>; invoices: unknown[] }>("/property/reports/rent-collection")).data;

export const fetchDepositLiabilityReport = async () =>
  (await api.get<{ total_held: string; deposits: unknown[] }>("/property/reports/deposit-liability")).data;

export const fetchOwnerStatement = async (ownerId: number, periodStart: string, periodEnd: string) =>
  (await api.get<PropertyOwnerStatement>(`/property/reports/owners/${ownerId}/statement`, { params: { period_start: periodStart, period_end: periodEnd } })).data;

export const fetchMallTenantSalesReport = async (periodStart: string, periodEnd: string) =>
  (await api.get<unknown[]>("/property/reports/mall-tenant-sales", { params: { period_start: periodStart, period_end: periodEnd } })).data;

export const fetchTurnoverRentReport = async (periodStart: string, periodEnd: string) =>
  (await api.get<{ total_turnover_rent: string; lines: unknown[] }>("/property/reports/turnover-rent", { params: { period_start: periodStart, period_end: periodEnd } })).data;

export const fetchMallFootfallReport = async (periodStart: string, periodEnd: string) =>
  (await api.get<unknown[]>("/property/reports/mall-footfall", { params: { period_start: periodStart, period_end: periodEnd } })).data;

export const fetchParkingAllocationReport = async () =>
  (await api.get<{ total_spaces: number; by_status: Record<string, number>; by_type: Record<string, number> }>("/property/reports/parking-allocation")).data;

// Preserve the current consolidated API used by existing property screens.
import http from "../shared/api/http";

/**
 * Property Management API (`v1/property`).
 *
 * The shared client's baseURL already ends in `/api/v1`, so this base is
 * relative to that.
 */
const BASE = "property";

type Id = number | string;
type Params = Record<string, unknown>;
type Payload = Record<string, unknown>;

export const propertyApi = {
  // ------------------------------------------------------------ dashboard
  overview: () => http.get(`${BASE}/dashboard/overview`),
  alerts: () => http.get(`${BASE}/dashboard/alerts`),

  // ------------------------------------------------------------ properties
  listProperties: (params?: Params) => http.get(`${BASE}/properties`, { params }),
  getProperty: (id: Id) => http.get(`${BASE}/properties/${id}`),
  createProperty: (data: Payload) => http.post(`${BASE}/properties`, data),
  updateProperty: (id: Id, data: Payload) => http.put(`${BASE}/properties/${id}`, data),
  deleteProperty: (id: Id) => http.delete(`${BASE}/properties/${id}`),

  listBuildings: (propertyId: Id) => http.get(`${BASE}/properties/${propertyId}/buildings`),
  createBuilding: (propertyId: Id, data: Payload) => http.post(`${BASE}/properties/${propertyId}/buildings`, data),
  updateBuilding: (propertyId: Id, id: Id, data: Payload) =>
    http.put(`${BASE}/properties/${propertyId}/buildings/${id}`, data),
  deleteBuilding: (propertyId: Id, id: Id) => http.delete(`${BASE}/properties/${propertyId}/buildings/${id}`),

  listFloors: (buildingId: Id) => http.get(`${BASE}/buildings/${buildingId}/floors`),
  createFloor: (buildingId: Id, data: Payload) => http.post(`${BASE}/buildings/${buildingId}/floors`, data),
  deleteFloor: (buildingId: Id, id: Id) => http.delete(`${BASE}/buildings/${buildingId}/floors/${id}`),

  listZones: (propertyId: Id) => http.get(`${BASE}/properties/${propertyId}/zones`),
  createZone: (propertyId: Id, data: Payload) => http.post(`${BASE}/properties/${propertyId}/zones`, data),
  deleteZone: (propertyId: Id, id: Id) => http.delete(`${BASE}/properties/${propertyId}/zones/${id}`),

  // ------------------------------------------------------------------ units
  listUnits: (params?: Params) => http.get(`${BASE}/units`, { params }),
  getUnit: (id: Id) => http.get(`${BASE}/units/${id}`),
  createUnit: (propertyId: Id, data: Payload) => http.post(`${BASE}/properties/${propertyId}/units`, data),
  updateUnit: (id: Id, data: Payload) => http.put(`${BASE}/units/${id}`, data),
  changeUnitStatus: (id: Id, status: string, reason?: string) =>
    http.post(`${BASE}/units/${id}/status`, { status, reason: reason || null }),
  deleteUnit: (id: Id) => http.delete(`${BASE}/units/${id}`),
  unitMaintenance: (id: Id) => http.get(`${BASE}/units/${id}/maintenance`),
  enableUnitMaintenance: (id: Id) => http.post(`${BASE}/units/${id}/maintenance/enable`, {}),
  getRetailProfile: (unitId: Id) => http.get(`${BASE}/units/${unitId}/retail-profile`),
  saveRetailProfile: (unitId: Id, data: Payload) => http.post(`${BASE}/units/${unitId}/retail-profile`, data),

  // ------------------------------------------------------ owners & occupiers
  listOwners: (params?: Params) => http.get(`${BASE}/owners`, { params }),
  createOwner: (data: Payload) => http.post(`${BASE}/owners`, data),
  updateOwner: (id: Id, data: Payload) => http.put(`${BASE}/owners/${id}`, data),
  deleteOwner: (id: Id) => http.delete(`${BASE}/owners/${id}`),

  listOccupiers: (params?: Params) => http.get(`${BASE}/tenants`, { params }),
  createOccupier: (data: Payload) => http.post(`${BASE}/tenants`, data),
  updateOccupier: (id: Id, data: Payload) => http.put(`${BASE}/tenants/${id}`, data),
  deleteOccupier: (id: Id) => http.delete(`${BASE}/tenants/${id}`),

  // -------------------------------------------------------------- documents
  listDocuments: (documentableType: string, documentableId: Id) =>
    http.get(`${BASE}/documents`, { params: { documentable_type: documentableType, documentable_id: documentableId } }),
  uploadDocument: (data: FormData) =>
    http.post(`${BASE}/documents`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  downloadDocument: (id: Id) => http.get(`${BASE}/documents/${id}/download`, { responseType: "blob" }),
  deleteDocument: (id: Id) => http.delete(`${BASE}/documents/${id}`),

  // ---------------------------------------------------------------- leasing
  listViewings: (params?: Params) => http.get(`${BASE}/viewings`, { params }),
  createViewing: (data: Payload) => http.post(`${BASE}/viewings`, data),
  updateViewing: (id: Id, data: Payload) => http.put(`${BASE}/viewings/${id}`, data),

  listReservations: (params?: Params) => http.get(`${BASE}/reservations`, { params }),
  createReservation: (data: Payload) => http.post(`${BASE}/reservations`, data),
  cancelReservation: (id: Id) => http.post(`${BASE}/reservations/${id}/cancel`, {}),

  // ----------------------------------------------------------------- leases
  listLeases: (params?: Params) => http.get(`${BASE}/leases`, { params }),
  getLease: (id: Id) => http.get(`${BASE}/leases/${id}`),
  createLease: (data: Payload) => http.post(`${BASE}/leases`, data),
  updateLease: (id: Id, data: Payload) => http.put(`${BASE}/leases/${id}`, data),
  transitionLease: (id: Id, status: string, reason?: string) =>
    http.post(`${BASE}/leases/${id}/transition`, { status, reason: reason || null }),
  terminateLease: (id: Id, reason: string, effectiveDate?: string) =>
    http.post(`${BASE}/leases/${id}/terminate`, { reason, effective_date: effectiveDate || null }),

  billingSchedule: (id: Id) => http.get(`${BASE}/leases/${id}/billing-schedule`),
  leaseInvoices: (id: Id) => http.get(`${BASE}/leases/${id}/invoices`),
  generateInvoices: (id: Id) => http.post(`${BASE}/leases/${id}/invoices/generate`, {}),
  chargePenalty: (id: Id, amount: number, reason: string) =>
    http.post(`${BASE}/leases/${id}/penalties`, { amount, reason }),

  leaseDeposit: (id: Id) => http.get(`${BASE}/leases/${id}/deposit`),
  recordDepositPayment: (id: Id, amount: number) => http.post(`${BASE}/leases/${id}/deposit/payment`, { amount }),
  refundDeposit: (id: Id, data: Payload) => http.post(`${BASE}/leases/${id}/deposit/refund`, data),
  forfeitDeposit: (id: Id, reason: string) =>
    http.post(`${BASE}/leases/${id}/deposit/forfeit`, { deduction_reason: reason }),

  listEscalations: (id: Id) => http.get(`${BASE}/leases/${id}/escalations`),
  previewEscalation: (id: Id, data: Payload) => http.post(`${BASE}/leases/${id}/escalations/preview`, data),
  createEscalation: (id: Id, data: Payload) => http.post(`${BASE}/leases/${id}/escalations`, data),
  applyEscalation: (escalationId: Id) => http.post(`${BASE}/escalations/${escalationId}/apply`, {}),

  turnoverTerms: (id: Id) => http.get(`${BASE}/leases/${id}/turnover-terms`),
  saveTurnoverTerms: (id: Id, data: Payload) => http.post(`${BASE}/leases/${id}/turnover-terms`, data),

  // -------------------------------------------------------------- utilities
  listUtilityTypes: () => http.get(`${BASE}/utility-types`),
  createUtilityType: (data: Payload) => http.post(`${BASE}/utility-types`, data),
  deleteUtilityType: (id: Id) => http.delete(`${BASE}/utility-types/${id}`),

  listTariffs: (params?: Params) => http.get(`${BASE}/utility-tariffs`, { params }),
  createTariff: (data: Payload) => http.post(`${BASE}/utility-tariffs`, data),

  listMeters: (params?: Params) => http.get(`${BASE}/utility-meters`, { params }),
  createMeter: (data: Payload) => http.post(`${BASE}/utility-meters`, data),
  deleteMeter: (id: Id) => http.delete(`${BASE}/utility-meters/${id}`),

  listReadings: (meterId: Id) => http.get(`${BASE}/utility-meters/${meterId}/readings`),
  createReading: (meterId: Id, data: Payload) => http.post(`${BASE}/utility-meters/${meterId}/readings`, data),
  reverseReading: (readingId: Id, reason: string) =>
    http.post(`${BASE}/utility-readings/${readingId}/reverse`, { reason }),
  previewReadingBill: (readingId: Id) => http.get(`${BASE}/utility-readings/${readingId}/preview`),
  billReading: (readingId: Id) => http.post(`${BASE}/utility-readings/${readingId}/bill`, {}),

  // ------------------------------------------------------ parking & access
  listParkingAreas: (propertyId: Id) => http.get(`${BASE}/properties/${propertyId}/parking-areas`),
  createParkingArea: (propertyId: Id, data: Payload) =>
    http.post(`${BASE}/properties/${propertyId}/parking-areas`, data),
  listParkingSpaces: (areaId: Id) => http.get(`${BASE}/parking-areas/${areaId}/spaces`),
  createParkingSpace: (areaId: Id, data: Payload) => http.post(`${BASE}/parking-areas/${areaId}/spaces`, data),
  releaseParkingSpace: (spaceId: Id) => http.post(`${BASE}/parking-spaces/${spaceId}/release`, {}),

  listVehicles: (params?: Params) => http.get(`${BASE}/vehicles`, { params }),
  createVehicle: (data: Payload) => http.post(`${BASE}/vehicles`, data),
  assignVehicleSpace: (vehicleId: Id, parkingSpaceId: Id) =>
    http.post(`${BASE}/vehicles/${vehicleId}/assign-space`, { parking_space_id: Number(parkingSpaceId) }),
  releaseVehicleSpace: (vehicleId: Id) => http.post(`${BASE}/vehicles/${vehicleId}/release-space`, {}),

  listCredentials: (params?: Params) => http.get(`${BASE}/access-credentials`, { params }),
  issueCredential: (data: Payload) => http.post(`${BASE}/access-credentials`, data),
  credentialAction: (id: Id, action: "activate" | "lost" | "return" | "revoke", reason?: string) =>
    http.post(`${BASE}/access-credentials/${id}/${action}`, reason ? { reason } : {}),

  listVisitors: (propertyId: Id, params?: Params) => http.get(`${BASE}/properties/${propertyId}/visitors`, { params }),
  registerVisitor: (propertyId: Id, data: Payload) => http.post(`${BASE}/properties/${propertyId}/visitors`, data),
  visitorAction: (entryId: Id, action: "check-in" | "check-out" | "cancel") =>
    http.post(`${BASE}/visitors/${entryId}/${action}`, {}),

  // ------------------------------------------------------------------- mall
  listSalesReports: (params?: Params) => http.get(`${BASE}/mall-sales-reports`, { params }),
  submitSalesReport: (leaseId: Id, data: Payload) => http.post(`${BASE}/leases/${leaseId}/mall-sales-reports`, data),
  approveSalesReport: (id: Id) => http.post(`${BASE}/mall-sales-reports/${id}/approve`, {}),
  rejectSalesReport: (id: Id, reason?: string) =>
    http.post(`${BASE}/mall-sales-reports/${id}/reject`, { reason: reason || null }),

  listFootfall: (propertyId: Id, params?: Params) => http.get(`${BASE}/properties/${propertyId}/footfall`, { params }),
  recordFootfall: (propertyId: Id, data: Payload) => http.post(`${BASE}/properties/${propertyId}/footfall`, data),

  listPromotions: (propertyId: Id) => http.get(`${BASE}/properties/${propertyId}/promotions`),
  createPromotion: (propertyId: Id, data: Payload) => http.post(`${BASE}/properties/${propertyId}/promotions`, data),
  approvePromotion: (id: Id) => http.post(`${BASE}/promotions/${id}/approve`, {}),

  listAdvertisingSpaces: (params?: Params) => http.get(`${BASE}/advertising-spaces`, { params }),
  createAdvertisingSpace: (propertyId: Id, data: Payload) =>
    http.post(`${BASE}/properties/${propertyId}/advertising-spaces`, data),
  listAdvertisingBookings: (spaceId: Id) => http.get(`${BASE}/advertising-spaces/${spaceId}/bookings`),
  createAdvertisingBooking: (spaceId: Id, data: Payload) =>
    http.post(`${BASE}/advertising-spaces/${spaceId}/bookings`, data),
  advertisingBookingAction: (bookingId: Id, action: "bill" | "cancel" | "complete") =>
    http.post(`${BASE}/advertising-bookings/${bookingId}/${action}`, {}),

  // ---------------------------------------------------------------- reports
  report: (name: string, params?: Params) => http.get(`${BASE}/reports/${name}`, { params }),
  ownerStatement: (ownerId: Id, params: Params) => http.get(`${BASE}/reports/owners/${ownerId}/statement`, { params }),
};

export default propertyApi;
