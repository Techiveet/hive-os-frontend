import http from "@/modules/shared/api/http";

const BASE = "logistics";
type Payload = Record<string, unknown>;
export const logisticsApi = {
  overview: () => http.get(`${BASE}/overview`),
  references: () => http.get(`${BASE}/reference-data`),
  selector: (type: string, search = "", page = 1) =>
    http.get(`${BASE}/reference-data/select`, {
      params: { type, search: search || undefined, page, per_page: 20 },
    }),
  rateSheets: (params?: Record<string, unknown>) =>
    http.get(`${BASE}/rate-sheets`, { params }),
  rateSheet: (id: number | string) => http.get(`${BASE}/rate-sheets/${id}`),
  createRateSheet: (payload: Payload) =>
    http.post(`${BASE}/rate-sheets`, payload),
  reviseRateSheet: (id: number | string, version: Payload) =>
    http.post(`${BASE}/rate-sheets/${id}/revisions`, { version }),
  activateRateSheet: (id: number | string) =>
    http.post(`${BASE}/rate-sheets/${id}/activate`),
  lookupRates: (params: Record<string, unknown>) =>
    http.get(`${BASE}/rates/lookup`, { params }),
  quotations: (params?: Record<string, unknown>) =>
    http.get(`${BASE}/quotations`, { params }),
  quotation: (id: number | string) => http.get(`${BASE}/quotations/${id}`),
  createQuotation: (payload: Payload) =>
    http.post(`${BASE}/quotations`, payload),
  reviseQuotation: (id: number | string, revision?: Payload) =>
    http.post(
      `${BASE}/quotations/${id}/revisions`,
      revision ? { revision } : {},
    ),
  submitQuotation: (id: number | string, revisionId: number | string) =>
    http.post(`${BASE}/quotations/${id}/revisions/${revisionId}/submit`),
  sendQuotation: (id: number | string, revisionId: number | string) =>
    http.post(`${BASE}/quotations/${id}/revisions/${revisionId}/send`),
  acceptQuotation: (
    id: number | string,
    revisionId: number | string,
    payload: Payload,
  ) =>
    http.post(
      `${BASE}/quotations/${id}/revisions/${revisionId}/accept`,
      payload,
    ),
  rejectQuotation: (
    id: number | string,
    revisionId: number | string,
    payload: Payload,
  ) =>
    http.post(
      `${BASE}/quotations/${id}/revisions/${revisionId}/reject`,
      payload,
    ),
  convertQuotation: (id: number | string, revisionId: number | string) =>
    http.post(`${BASE}/quotations/${id}/revisions/${revisionId}/convert`),
  bookings: (params?: Record<string, unknown>) =>
    http.get(`${BASE}/bookings`, { params }),
  booking: (id: number | string) => http.get(`${BASE}/bookings/${id}`),
  transitionBooking: (id: number | string, payload: Payload) =>
    http.post(`${BASE}/bookings/${id}/status`, payload),
  amendBooking: (id: number | string, payload: Payload) =>
    http.post(`${BASE}/bookings/${id}/amendments`, payload),
  jobs: (params?: Record<string, unknown>) =>
    http.get(`${BASE}/jobs`, { params }),
  job: (id: number | string) => http.get(`${BASE}/jobs/${id}`),
  createJob: (payload: Payload) => http.post(`${BASE}/jobs`, payload),
  updateJob: (id: number, payload: Payload) =>
    http.put(`${BASE}/jobs/${id}`, payload),
  deleteJob: (id: number) => http.delete(`${BASE}/jobs/${id}`),
  addParty: (id: number, payload: Payload) =>
    http.post(`${BASE}/jobs/${id}/parties`, payload),
  addCargo: (id: number, payload: Payload) =>
    http.post(`${BASE}/jobs/${id}/cargo`, payload),
  addPackage: (id: number, payload: Payload) =>
    http.post(`${BASE}/jobs/${id}/packages`, payload),
  addLeg: (id: number, payload: Payload) =>
    http.post(`${BASE}/jobs/${id}/legs`, payload),
  reviseLeg: (jobId: number, legId: number, payload: Payload) =>
    http.put(`${BASE}/jobs/${jobId}/legs/${legId}`, payload),
  removeLeg: (jobId: number, legId: number) =>
    http.delete(`${BASE}/jobs/${jobId}/legs/${legId}`),
  reorderLegs: (id: number, legIds: number[]) =>
    http.post(`${BASE}/jobs/${id}/legs/reorder`, { leg_ids: legIds }),
  updateLegOperation: (jobId: number, legId: number, payload: Payload) =>
    http.patch(`${BASE}/jobs/${jobId}/legs/${legId}/operations`, payload),
  recordLegOperation: (jobId: number, legId: number, payload: Payload) =>
    http.post(`${BASE}/jobs/${jobId}/legs/${legId}/operations/events`, payload),
  createSupplyChainHandoff: (jobId: number, legId: number, payload: Payload) =>
    http.post(
      `${BASE}/jobs/${jobId}/legs/${legId}/supply-chain-handoff`,
      payload,
    ),
  equipment: (params?: Record<string, unknown>) =>
    http.get(`${BASE}/equipment`, { params }),
  equipmentItem: (id: number | string) => http.get(`${BASE}/equipment/${id}`),
  createEquipment: (payload: Payload) =>
    http.post(`${BASE}/equipment`, payload),
  assignEquipment: (id: number | string, payload: Payload) =>
    http.post(`${BASE}/equipment/${id}/assignments`, payload),
  recordEquipmentEvent: (assignmentId: number | string, payload: Payload) =>
    http.post(`${BASE}/equipment-assignments/${assignmentId}/events`, payload),
  recordEquipmentSeal: (assignmentId: number | string, payload: Payload) =>
    http.post(`${BASE}/equipment-assignments/${assignmentId}/seals`, payload),
  recordEquipmentVgm: (assignmentId: number | string, payload: Payload) =>
    http.post(`${BASE}/equipment-assignments/${assignmentId}/vgms`, payload),
  equipmentFreeTimeRules: () => http.get(`${BASE}/equipment/free-time-rules`),
  applyEquipmentFreeTime: (assignmentId: number | string, payload: Payload) =>
    http.post(
      `${BASE}/equipment-assignments/${assignmentId}/free-time`,
      payload,
    ),
  consolidations: (params?: Record<string, unknown>) =>
    http.get(`${BASE}/consolidations`, { params }),
  consolidation: (id: number | string) =>
    http.get(`${BASE}/consolidations/${id}`),
  createConsolidation: (payload: Payload) =>
    http.post(`${BASE}/consolidations`, payload),
  addConsolidationMember: (id: number | string, payload: Payload) =>
    http.post(`${BASE}/consolidations/${id}/members`, payload),
  removeConsolidationMember: (id: number | string, memberId: number | string) =>
    http.delete(`${BASE}/consolidations/${id}/members/${memberId}`),
  transitionConsolidation: (id: number | string, status: string) =>
    http.post(`${BASE}/consolidations/${id}/status`, { status }),
  allocateConsolidationCost: (id: number | string, payload: Payload) =>
    http.post(`${BASE}/consolidations/${id}/cost-allocations`, payload),
  customsCases: (params?: Record<string, unknown>) => http.get(`${BASE}/customs-cases`, { params }),
  customsCase: (id: number | string) => http.get(`${BASE}/customs-cases/${id}`),
  createCustomsCase: (payload: Payload) => http.post(`${BASE}/customs-cases`, payload),
  transitionCustomsCase: (id: number | string, payload: Payload) => http.post(`${BASE}/customs-cases/${id}/status`, payload),
  placeCustomsHold: (id: number | string, payload: Payload) => http.post(`${BASE}/customs-cases/${id}/holds`, payload),
  resolveCustomsHold: (caseId: number | string, holdId: number | string, resolution: string) => http.post(`${BASE}/customs-cases/${caseId}/holds/${holdId}/resolve`, { resolution }),
  updateCustomsChecklist: (caseId: number | string, itemId: number | string, payload: Payload) => http.patch(`${BASE}/customs-cases/${caseId}/checklist/${itemId}`, payload),
  documentTypes: () => http.get(`${BASE}/document-types`),
  documents: (params?: Record<string, unknown>) => http.get(`${BASE}/documents`, { params }),
  document: (id: number | string) => http.get(`${BASE}/documents/${id}`),
  createDocument: (payload: Payload) => http.post(`${BASE}/documents`, payload),
  uploadDocumentVersion: (id: number | string, payload: FormData) => http.post(`${BASE}/documents/${id}/versions`, payload),
  generateDocumentVersion: (id: number | string, changeReason: string) => http.post(`${BASE}/documents/${id}/generate`, { change_reason: changeReason }),
  downloadDocumentVersion: (id: number | string, versionId: number | string) =>
    http.get(`${BASE}/documents/${id}/versions/${versionId}/download`, { responseType: "blob" }),
  transitionDocument: (id: number | string, status: string) => http.post(`${BASE}/documents/${id}/status`, { status }),
  warehouseHandoffs: (params?: Record<string, unknown>) => http.get(`${BASE}/warehouse-handoffs`, { params }),
  warehouseHandoff: (id: number | string) => http.get(`${BASE}/warehouse-handoffs/${id}`),
  createWarehouseHandoff: (payload: Payload) => http.post(`${BASE}/warehouse-handoffs`, payload),
  completeWarehouseHandoff: (id: number | string, lines: Array<Record<string, unknown>>) => http.post(`${BASE}/warehouse-handoffs/${id}/complete`, { lines }),
  jobFinanceReferences: () => http.get(`${BASE}/job-finance/references`),
  jobFinance: (id: number | string) => http.get(`${BASE}/jobs/${id}/finance`),
  financialDashboard: (params?: Record<string, unknown>) => http.get(`${BASE}/financial-dashboard`, { params }),
  financialReport: (report: string, params?: Record<string, unknown>) => http.get(`${BASE}/financial-reports/${report}`, { params }),
  financialReportExport: (report: string, params?: Record<string, unknown>) => http.get(`${BASE}/financial-reports/${report}/export`, { params, responseType: "blob" }),
  createJobCharge: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/charges`, payload),
  transitionJobCharge: (jobId: number | string, chargeId: number | string, status: string) => http.post(`${BASE}/jobs/${jobId}/charges/${chargeId}/status`, { status }),
  createJobCost: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/costs`, payload),
  approveJobCost: (jobId: number | string, costId: number | string) => http.post(`${BASE}/jobs/${jobId}/costs/${costId}/approve`),
  recordActualJobCost: (jobId: number | string, costId: number | string, payload: Payload) => http.post(`${BASE}/jobs/${jobId}/costs/${costId}/actual`, payload),
  createBillingRequest: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/billing-requests`, payload),
  approveBillingRequest: (jobId: number | string, requestId: number | string) => http.post(`${BASE}/jobs/${jobId}/billing-requests/${requestId}/approve`),
  postBillingRequest: (jobId: number | string, requestId: number | string) => http.post(`${BASE}/jobs/${jobId}/billing-requests/${requestId}/post`),
  createVendorBillRequest: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/vendor-bill-requests`, payload),
  approveVendorBillRequest: (jobId: number | string, requestId: number | string) => http.post(`${BASE}/jobs/${jobId}/vendor-bill-requests/${requestId}/approve`),
  postVendorBillRequest: (jobId: number | string, requestId: number | string) => http.post(`${BASE}/jobs/${jobId}/vendor-bill-requests/${requestId}/post`),
  createAccrual: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/accruals`, payload),
  postAccrual: (jobId: number | string, accrualId: number | string) => http.post(`${BASE}/jobs/${jobId}/accruals/${accrualId}/post`),
  reverseAccrual: (jobId: number | string, accrualId: number | string, vendorBillRequestId?: number) => http.post(`${BASE}/jobs/${jobId}/accruals/${accrualId}/reverse`, { vendor_bill_request_id: vendorBillRequestId }),
  financialCloseReadiness: (id: number | string) => http.get(`${BASE}/jobs/${id}/financial-close/readiness`),
  closeJobFinancials: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/financial-close`, payload),
  reopenJobFinancials: (id: number | string, reason: string) => http.post(`${BASE}/jobs/${id}/financial-reopen`, { reason }),
  controlTower: (params?: Record<string, unknown>) => http.get(`${BASE}/control-tower`, { params }),
  commandCenter: () => http.get(`${BASE}/command-center`),
  operationalReport: (report: string, params?: Record<string, unknown>) => http.get(`${BASE}/operational-reports/${report}`, { params }),
  operationalReportExport: (report: string, params?: Record<string, unknown>) => http.get(`${BASE}/operational-reports/${report}/export`, { params, responseType: "blob" }),
  trackingWorkspace: (id: number | string) => http.get(`${BASE}/jobs/${id}/tracking`),
  recordTrackingEvent: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/tracking-events`, payload),
  correctTrackingEvent: (jobId: number | string, eventId: number | string, payload: Payload) => http.post(`${BASE}/jobs/${jobId}/tracking-events/${eventId}/corrections`, payload),
  syncMilestones: (id: number | string) => http.post(`${BASE}/jobs/${id}/milestones/sync`),
  completeMilestone: (jobId: number | string, milestoneId: number | string, payload: Payload) => http.post(`${BASE}/jobs/${jobId}/milestones/${milestoneId}/complete`, payload),
  recordEta: (id: number | string, payload: Payload) => http.post(`${BASE}/jobs/${id}/eta`, payload),
  exceptions: (params?: Record<string, unknown>) => http.get(`${BASE}/exceptions`, { params }),
  exception: (id: number | string) => http.get(`${BASE}/exceptions/${id}`),
  createException: (payload: Payload) => http.post(`${BASE}/exceptions`, payload),
  transitionException: (id: number | string, payload: Payload) => http.post(`${BASE}/exceptions/${id}/transition`, payload),
  assignException: (id: number | string, employeeId: number | null) => http.post(`${BASE}/exceptions/${id}/assign`, { responsible_employee_id: employeeId }),
  commentOnException: (id: number | string, comment: string) => http.post(`${BASE}/exceptions/${id}/comments`, { comment }),
  trackingSettings: () => http.get(`${BASE}/tracking-settings`),
  updateTrackingSettings: (payload: Payload) => http.put(`${BASE}/tracking-settings`, payload),
};
