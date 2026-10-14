import http from "../shared/api/http";
import type {
  ParkingLot,
  ParkingZone,
  ParkingBay,
  ParkingTariff,
  ParkingSession,
  ParkingPass,
  ParkingReservation,
  ParkingViolation,
  ParkingDevice,
  ParkingOverviewData,
  ParkingFeeResult,
} from "./types";

const BASE = "car-parking";

type Id = number | string;
type Params = Record<string, unknown>;
type Payload = Record<string, unknown>;

export const parkingApi = {
  // Overview & Analytics
  overview: (params?: Params) => http.get<{ status: string; data: ParkingOverviewData }>(`${BASE}/overview`, { params }),
  revenueReport: (params?: Params) => http.get(`${BASE}/reports/revenue`, { params }),
  occupancyTrends: (params?: Params) => http.get(`${BASE}/reports/occupancy`, { params }),

  // Facilities / Lots
  listLots: () => http.get<{ status: string; data: ParkingLot[] }>(`${BASE}/lots`),
  getLot: (id: Id) => http.get<{ status: string; data: ParkingLot }>(`${BASE}/lots/${id}`),
  createLot: (data: Payload) => http.post<{ status: string; data: ParkingLot }>(`${BASE}/lots`, data),
  updateLot: (id: Id, data: Payload) => http.put<{ status: string; data: ParkingLot }>(`${BASE}/lots/${id}`, data),
  deleteLot: (id: Id) => http.delete(`${BASE}/lots/${id}`),
  createZone: (lotId: Id, data: Payload) => http.post<{ status: string; data: ParkingZone }>(`${BASE}/lots/${lotId}/zones`, data),

  // Bays
  listBays: (params?: Params) => http.get<{ status: string; data: { data: ParkingBay[]; total: number } }>(`${BASE}/bays`, { params }),
  createBay: (data: Payload) => http.post<{ status: string; data: ParkingBay }>(`${BASE}/bays`, data),
  updateBayStatus: (id: Id, status: string, licensePlate?: string) =>
    http.patch<{ status: string; data: ParkingBay }>(`${BASE}/bays/${id}/status`, { status, current_license_plate: licensePlate }),
  getMatrix: (lotId: Id) => http.get<{ status: string; data: ParkingZone[] }>(`${BASE}/lots/${lotId}/matrix`),

  // Tariffs
  listTariffs: (params?: Params) => http.get<{ status: string; data: ParkingTariff[] }>(`${BASE}/tariffs`, { params }),
  createTariff: (data: Payload) => http.post<{ status: string; data: ParkingTariff }>(`${BASE}/tariffs`, data),
  updateTariff: (id: Id, data: Payload) => http.put<{ status: string; data: ParkingTariff }>(`${BASE}/tariffs/${id}`, data),
  deleteTariff: (id: Id) => http.delete(`${BASE}/tariffs/${id}`),
  calculatePreview: (data: Payload) => http.post<{ status: string; data: ParkingFeeResult }>(`${BASE}/tariffs/calculate-preview`, data),

  // Sessions & Tickets
  listSessions: (params?: Params) => http.get<{ status: string; data: { data: ParkingSession[]; total: number } }>(`${BASE}/sessions`, { params }),
  getSession: (id: Id) => http.get<{ status: string; data: ParkingSession }>(`${BASE}/sessions/${id}`),
  checkIn: (data: Payload) => http.post<{ status: string; data: ParkingSession }>(`${BASE}/sessions`, data),
  calculateFee: (id: Id) => http.get<{ status: string; data: ParkingFeeResult }>(`${BASE}/sessions/${id}/fee`),
  checkout: (id: Id, data: Payload) => http.post<{ status: string; message: string; data: ParkingSession }>(`${BASE}/sessions/${id}/checkout`, data),
  lostTicket: (id: Id) => http.post<{ status: string; message: string; data: ParkingSession }>(`${BASE}/sessions/${id}/lost-ticket`),

  // Passes & Subscribers
  listPasses: (params?: Params) => http.get<{ status: string; data: { data: ParkingPass[]; total: number } }>(`${BASE}/passes`, { params }),
  getPass: (id: Id) => http.get<{ status: string; data: ParkingPass }>(`${BASE}/passes/${id}`),
  createPass: (data: Payload) => http.post<{ status: string; data: ParkingPass }>(`${BASE}/passes`, data),
  renewPass: (id: Id, months: number = 1) => http.post<{ status: string; message: string; data: ParkingPass }>(`${BASE}/passes/${id}/renew`, { months }),
  lookupPlate: (plate: string) => http.get<{ status: string; is_subscriber: boolean; data: ParkingPass | null }>(`${BASE}/passes/lookup/${encodeURIComponent(plate)}`),

  // Reservations
  listReservations: (params?: Params) => http.get<{ status: string; data: { data: ParkingReservation[]; total: number } }>(`${BASE}/reservations`, { params }),
  getReservation: (id: Id) => http.get<{ status: string; data: ParkingReservation }>(`${BASE}/reservations/${id}`),
  createReservation: (data: Payload) => http.post<{ status: string; data: ParkingReservation }>(`${BASE}/reservations`, data),
  cancelReservation: (id: Id) => http.post(`${BASE}/reservations/${id}/cancel`),
  checkinReservation: (id: Id) => http.post<{ status: string; data: ParkingReservation }>(`${BASE}/reservations/${id}/checkin`),

  // Violations
  listViolations: (params?: Params) => http.get<{ status: string; data: { data: ParkingViolation[]; total: number } }>(`${BASE}/violations`, { params }),
  getViolation: (id: Id) => http.get<{ status: string; data: ParkingViolation }>(`${BASE}/violations/${id}`),
  createViolation: (data: Payload) => http.post<{ status: string; data: ParkingViolation }>(`${BASE}/violations`, data),
  updateViolationStatus: (id: Id, status: string, notes?: string) =>
    http.patch<{ status: string; data: ParkingViolation }>(`${BASE}/violations/${id}/status`, { status, notes }),

  // Devices & Hardware
  listDevices: (params?: Params) => http.get<{ status: string; data: ParkingDevice[] }>(`${BASE}/devices`, { params }),
  createDevice: (data: Payload) => http.post<{ status: string; data: ParkingDevice }>(`${BASE}/devices`, data),
  simulateScan: (data: Payload) => http.post(`${BASE}/devices/simulate-scan`, data),
  listAnprLogs: (params?: Params) => http.get(`${BASE}/devices/anpr-logs`, { params }),
};