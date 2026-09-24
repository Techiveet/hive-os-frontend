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
