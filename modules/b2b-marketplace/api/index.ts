// Public API client for the B2B Marketplace (landing + detail pages).
// Tenant is resolved server-side from the request headers injected by getTenantHeaders().
import { getBackendApiRoot, getTenantHeaders } from "@/lib/runtime-context";
import api from "@/modules/shared/api/http";

export type B2BCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  growth: string | null;
  count: string | null;
  suppliers: number;
};

export type B2BProduct = {
  id: string;
  name: string;
  price: string | null;
  moq: string | null;
  image: string | null;
  supplier: string | null;
  supplier_id: number | null;
  supplier_logo: string | null;
  rating: number | null;
  reviews: number;
  location: string | null;
  verified: boolean;
  trade_assurance: boolean;
  badges: string[];
  lead_time: string | null;
  category: string | null;
};

export type B2BSupplier = {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
  flag: string | null;
  rating: number | null;
  years: number;
  products: number;
  verified: boolean;
  premium: boolean;
  on_time_rate: number | null;
};

export type SupplierPageMeta = { current_page: number; last_page: number; total: number; per_page: number };

export type B2BProductDetail = B2BProduct & {
  description: string | null;
  supplier_detail: B2BSupplier | null;
  related: B2BProduct[];
};

export type B2BSupplierDetail = B2BSupplier & {
  website: string | null;
  industry: string | null;
  product_list: B2BProduct[];
};

export type B2BCategoryDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  growth: string | null;
  product_count: number;
  products: B2BProduct[];
  suppliers: B2BSupplier[];
};

async function get<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
  const root = getBackendApiRoot();
  const qs = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const res = await fetch(`${root}/public/b2b/${path}${qs}`, {
    headers: { Accept: "application/json", ...getTenantHeaders() },
  });
  if (!res.ok) throw new Error(`B2B API ${path} failed (${res.status})`);
  const json = await res.json();
  return json.data as T;
}

export const B2BApi = {
  categories: () => get<B2BCategory[]>("categories"),
  category: (slug: string) => get<B2BCategoryDetail>(`categories/${slug}`),
  suppliers: () => get<B2BSupplier[]>("suppliers"),
  /** Paginated supplier directory (search / country filter). */
  suppliersPage: async (params: { page?: number; per_page?: number; search?: string; country?: string }) => {
    const root = getBackendApiRoot();
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    // `page` forces the paginated response shape even when no filter is set.
    const res = await fetch(`${root}/public/b2b/suppliers?${qs}`, {
      headers: { Accept: "application/json", ...getTenantHeaders() },
    });
    if (!res.ok) throw new Error(`B2B API suppliers failed (${res.status})`);
    const json = await res.json();
    return {
      data: (json.data ?? []) as B2BSupplier[],
      meta: (json.meta ?? { current_page: 1, last_page: 1, total: (json.data ?? []).length, per_page: 12 }) as SupplierPageMeta,
    };
  },
  supplierCountries: () => get<string[]>("supplier-countries"),
  supplier: (id: number | string) => get<B2BSupplierDetail>(`suppliers/${id}`),
  products: (params?: { category?: string; search?: string; supplier_id?: string }) =>
    get<B2BProduct[]>("products", params),
  product: (id: number | string) => get<B2BProductDetail>(`products/${id}`),
  // Meilisearch-backed full-text search
  search: (q: string, category?: string) => get<B2BProduct[]>("search", { q, category }),
  // Public self-service registration (pending admin approval)
  register: async (payload: B2BRegisterPayload) => {
    const res = await fetch(`${getBackendApiRoot()}/public/b2b/register`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...getTenantHeaders() },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Registration failed (${res.status})`);
    return json as { message: string; data: { id: number; status: string } };
  },
};

export type B2BRegisterPayload = {
  name: string;
  email: string;
  password: string;
  company?: string;
  requested_role: "buyer" | "seller";
  tax_id?: string;
  phone?: string;
  website?: string;
  country?: string;
};

export type B2BRegistration = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  requested_role: "buyer" | "seller";
  status: "pending" | "approved" | "rejected";
  email_verified: boolean;
  tax_id: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  rejection_reason: string | null;
  created_at: string;
};

// ── Authenticated dashboard analytics ──
export type B2BOverview = {
  kpis: {
    total_products: number;
    active_products: number;
    total_suppliers: number;
    verified_suppliers: number;
    total_categories: number;
    total_inquiries: number;
    open_inquiries: number;
    total_quotes: number;
    accepted_quotes: number;
    avg_product_rating: number;
    gmv: number;
    pipeline_value: number;
  };
  products_by_category: { name: string; count: number; growth: string | null }[];
  suppliers_by_country: { country: string; count: number }[];
  top_products: { name: string; rating: number; reviews: number; price: number }[];
  price_bands: { label: string; count: number }[];
  inquiries_by_status: { status: string; count: number }[];
  quotes_by_status: { status: string; count: number }[];
  listings_trend: { date: string; count: number }[];
};

export const fetchB2BOverview = async (): Promise<B2BOverview> =>
  (await api.get<B2BOverview>("/b2b-marketplace/dashboard/overview")).data;

// ── Workflow / portal types ──
export type B2BQuote = {
  id: number;
  inquiry_id: number;
  inquiry_title: string | null;
  inquiry_status?: string | null;
  seller: string | null;
  seller_country: string | null;
  seller_flag: string | null;
  seller_rating: number | null;
  amount: number;
  currency: string;
  delivery_time_days: number | null;
  proposal_text: string;
  status: "pending" | "accepted" | "rejected";
  has_review: boolean | null;
  order_id: number | null;
  order_number: string | null;
  order_status: string | null;
  created_at: string;
};

export type B2BInquiry = {
  id: number;
  title: string;
  description: string;
  budget_range: string | null;
  status: "open" | "closed" | "awarded";
  category: string | null;
  category_id: number | null;
  buyer: string | null;
  quotes_count: number;
  /** Present on the seller open-RFQ feed when this supplier already quoted. */
  already_quoted?: boolean;
  /** Embedded on buyer "mine" RFQs so quotes render even if GET /quotes is empty. */
  quotes?: B2BQuote[];
  created_at: string;
};

export type B2BMessage = {
  id: number;
  message: string;
  sender: string | null;
  is_me: boolean;
  created_at: string;
};

export type B2BMyProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  category_id: number | null;
  price: number | null;
  currency: string;
  price_unit: string | null;
  moq: string | null;
  lead_time: string | null;
  location: string | null;
  image_url: string | null;
  badges: string[];
  trade_assurance: boolean;
  is_featured: boolean;
  is_active: boolean;
  rating: number | null;
  reviews_count: number;
};

export type B2BReview = {
  id: number;
  rating: number;
  comment: string | null;
  seller: string | null;
  rfq: string | null;
  created_at: string;
};

export type B2BAttachment = {
  id: number;
  name: string;
  type: string | null;
  size_bytes: number;
  created_at: string;
};

const body = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

/** Hand a downloaded blob to the browser as a file save. */
const saveBlob = (blob: Blob, filename: string | null | undefined) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const B2BDash = {
  // RFQs
  inquiries: (scope?: "mine" | "open") =>
    body<B2BInquiry[]>(api.get("/b2b-marketplace/inquiries", { params: scope ? { scope } : {} })),
  createInquiry: (payload: {
    title: string;
    description: string;
    budget_range?: string;
    category_id?: number | null;
    /** Address the RFQ to one supplier ("Contact supplier"). */
    seller_id?: number | null;
    product_id?: number | null;
  }) =>
    body<B2BInquiry>(api.post("/b2b-marketplace/inquiries", payload)),
  deleteInquiry: (id: number) => api.delete(`/b2b-marketplace/inquiries/${id}`),

  // Quotes
  quotes: () => body<B2BQuote[]>(api.get("/b2b-marketplace/quotes")),
  createQuote: (payload: { inquiry_id: number; amount: number; currency?: string; delivery_time_days?: number; proposal_text: string }) =>
    body<B2BQuote>(api.post("/b2b-marketplace/quotes", payload)),
  orderFromQuote: (quoteId: number, payload: ShippingPayload) =>
    body<B2BOrder>(api.post(`/b2b-marketplace/quotes/${quoteId}/order`, payload)),
  acceptQuote: (id: number) => body<B2BQuote>(api.post(`/b2b-marketplace/quotes/${id}/accept`)),
  rejectQuote: (id: number) => body<B2BQuote>(api.post(`/b2b-marketplace/quotes/${id}/reject`)),

  // Quote attachments
  quoteAttachments: (quoteId: number) =>
    body<B2BAttachment[]>(api.get(`/b2b-marketplace/quotes/${quoteId}/attachments`)),
  uploadQuoteAttachment: (quoteId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/b2b-marketplace/quotes/${quoteId}/attachments`, form).then((r) => r.data.data as B2BAttachment);
  },
  downloadQuoteAttachment: async (quoteId: number, attachment: B2BAttachment) => {
    const res = await api.get(`/b2b-marketplace/quotes/${quoteId}/attachments/${attachment.id}`, { responseType: "blob" });
    saveBlob(res.data as Blob, attachment.name);
  },

  // RFQ attachments
  inquiryAttachments: (inquiryId: number) =>
    body<B2BAttachment[]>(api.get(`/b2b-marketplace/inquiries/${inquiryId}/attachments`)),
  uploadInquiryAttachment: (inquiryId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/b2b-marketplace/inquiries/${inquiryId}/attachments`, form).then((r) => r.data.data as B2BAttachment);
  },
  downloadInquiryAttachment: async (inquiryId: number, attachment: B2BAttachment) => {
    const res = await api.get(`/b2b-marketplace/inquiries/${inquiryId}/attachments/${attachment.id}`, { responseType: "blob" });
    saveBlob(res.data as Blob, attachment.name);
  },

  // Messages
  messages: (quoteId: number) => body<B2BMessage[]>(api.get(`/b2b-marketplace/quotes/${quoteId}/messages`)),
  sendMessage: (quoteId: number, message: string) =>
    body<B2BMessage>(api.post(`/b2b-marketplace/quotes/${quoteId}/messages`, { message })),

  // Seller products
  myProducts: () => body<B2BMyProduct[]>(api.get("/b2b-marketplace/products")),
  uploadProductImage: (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api.post("/b2b-marketplace/products/upload-image", form).then((r) => r.data.data as { url: string });
  },
  createProduct: (payload: Partial<B2BMyProduct>) => body<B2BMyProduct>(api.post("/b2b-marketplace/products", payload)),
  updateProduct: (id: string, payload: Partial<B2BMyProduct>) => body<B2BMyProduct>(api.put(`/b2b-marketplace/products/${id}`, payload)),
  deleteProduct: (id: string) => api.delete(`/b2b-marketplace/products/${id}`),

  // Reviews
  reviews: () => body<B2BReview[]>(api.get("/b2b-marketplace/reviews")),
  createReview: (payload: { quote_id: number; rating: number; comment?: string }) =>
    body<B2BReview>(api.post("/b2b-marketplace/reviews", payload)),

  // Favorites
  favorites: () => body<any[]>(api.get("/b2b-marketplace/favorites")),
  toggleFavorite: (productId: number | string) =>
    api.post("/b2b-marketplace/favorites/toggle", { product_id: productId }).then((r) => r.data),

  // Orders / checkout
  orders: () => body<B2BOrder[]>(api.get("/b2b-marketplace/orders")),
  order: (id: number | string) => body<B2BOrderDetail>(api.get(`/b2b-marketplace/orders/${id}`)),
  placeOrder: (payload: PlaceOrderPayload) => body<B2BOrder>(api.post("/b2b-marketplace/orders", payload)),

  // Registration approvals (admin)
  registrations: () => body<B2BRegistration[]>(api.get("/b2b-marketplace/registrations")),
  approveRegistration: (id: number) => api.post(`/b2b-marketplace/registrations/${id}/approve`).then((r) => r.data),
  rejectRegistration: (id: number, reason?: string) =>
    api.post(`/b2b-marketplace/registrations/${id}/reject`, { reason }).then((r) => r.data),
  resendRegistrationVerification: (id: number) =>
    api.post(`/b2b-marketplace/registrations/${id}/resend-verification`).then((r) => r.data),

  // Payments & order mediation
  payOrder: (id: number, reference: string, refund?: B2BRefundDetailsInput) =>
    body<B2BOrder>(api.post(`/b2b-marketplace/orders/${id}/pay`, { reference, ...(refund ?? {}) })),
  paymentMethods: () => body<B2BPaymentMethods>(api.get("/b2b-marketplace/payment-methods")),
  chapaCheckout: (id: number, returnUrl: string) =>
    body<{ checkout_url: string }>(api.post(`/b2b-marketplace/orders/${id}/chapa-checkout`, { return_url: returnUrl })),
  chapaVerify: (id: number) =>
    api.post(`/b2b-marketplace/orders/${id}/chapa-verify`).then((r) => r.data as { message: string; outcome: "paid" | "pending" | "failed" | "mismatch" | "unknown"; data: B2BOrder }),
  updateRefundDetails: (id: number, details: B2BRefundDetailsInput) =>
    body<B2BOrder>(api.put(`/b2b-marketplace/orders/${id}/refund-details`, details)),

  // Supplier payout destination (bank / wallet) and its admin verification
  myPayoutAccount: () => body<B2BSellerPayoutAccount | null>(api.get("/b2b-marketplace/seller/payout-account")),
  savePayoutAccount: (payload: B2BPayoutAccountInput) =>
    body<B2BSellerPayoutAccount>(api.put("/b2b-marketplace/seller/payout-account", payload)),
  payoutAccounts: (status?: "pending" | "verified" | "rejected") =>
    body<B2BAdminPayoutAccount[]>(api.get("/b2b-marketplace/admin/payout-accounts", { params: status ? { status } : {} })),
  verifyPayoutAccount: (id: number, revision: number) =>
    body<B2BAdminPayoutAccount>(api.post(`/b2b-marketplace/admin/payout-accounts/${id}/verify`, { revision })),
  rejectPayoutAccount: (id: number, revision: number, reason: string) =>
    body<B2BAdminPayoutAccount>(api.post(`/b2b-marketplace/admin/payout-accounts/${id}/reject`, { revision, reason })),
  stripeCheckout: (id: number, returnUrl: string) =>
    body<{ checkout_url: string }>(api.post(`/b2b-marketplace/orders/${id}/stripe-checkout`, { return_url: returnUrl })),
  orderInvoice: (id: number) => body<B2BInvoice>(api.get(`/b2b-marketplace/orders/${id}/invoice`)),
  adminOrders: () => body<B2BAdminOrder[]>(api.get("/b2b-marketplace/admin/orders")),
  confirmOrderPayment: (id: number) => api.post(`/b2b-marketplace/orders/${id}/confirm-payment`).then((r) => r.data),
  updateOrderStatus: (id: number, payload: { status?: string }) =>
    api.patch(`/b2b-marketplace/orders/${id}/status`, payload).then((r) => r.data),
  rejectOrderPayment: (id: number, reason?: string) =>
    api.post(`/b2b-marketplace/orders/${id}/reject-payment`, { reason }).then((r) => r.data),
  refundOrder: (id: number, payload: { mode?: "auto" | "manual"; reason?: string; reference?: string }) =>
    api.post(`/b2b-marketplace/orders/${id}/refund`, payload).then((r) => r.data),
  releasePayout: (orderId: number, partId: number, reference: string) =>
    api.post(`/b2b-marketplace/orders/${orderId}/payouts/${partId}/release`, { reference }).then((r) => r.data),
  cancelOrder: (id: number) => api.post(`/b2b-marketplace/orders/${id}/cancel`).then((r) => r.data),
  confirmReceipt: (id: number) => api.post(`/b2b-marketplace/orders/${id}/confirm-receipt`).then((r) => r.data),
  sellerOrders: () => body<B2BSellerOrder[]>(api.get("/b2b-marketplace/seller/orders")),
  sellerFulfil: (id: number, payload: { status: "processing" | "shipped"; carrier?: string; tracking_number?: string }) =>
    api.put(`/b2b-marketplace/seller/orders/${id}/fulfilment`, payload).then((r) => r.data),

  // Accepted RFQ deals that have not become an order yet (admin)
  adminDeals: () => body<B2BAcceptedDeal[]>(api.get("/b2b-marketplace/admin/deals")),

  // Disputes
  disputes: (status?: "open" | "resolved") =>
    body<B2BDispute[]>(api.get("/b2b-marketplace/disputes", { params: status ? { status } : {} })),
  raiseDispute: (orderId: number, reason: string) =>
    body<B2BDispute>(api.post(`/b2b-marketplace/orders/${orderId}/disputes`, { reason })),
  resolveDispute: (id: number, payload: { resolution: "refund_buyer" | "release_seller" | "no_action"; notes: string; refund_mode?: "auto" | "manual"; refund_reference?: string }) =>
    body<B2BDispute>(api.post(`/b2b-marketplace/disputes/${id}/resolve`, payload)),

  // Marketplace settings (admin) — commission rate
  marketplaceSettings: () => body<{ commission_percent: number }>(api.get("/b2b-marketplace/settings")),
  updateCommission: (commission_percent: number) =>
    body<{ commission_percent: number }>(api.put("/b2b-marketplace/settings", { commission_percent })),
};

export type B2BOrderPart = {
  id: number;
  seller_id: number | null;
  seller: string | null;
  fulfillment_status: "pending" | "processing" | "shipped";
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  // Admin view only
  gross_amount?: number;
  fee_amount?: number;
  payout_amount?: number;
  payout_status?: "pending" | "released" | "void";
  payout_reference?: string | null;
  payout_released_at?: string | null;
  // Where the money went (snapshot) and where it should go (admin view only)
  payout_destination?: B2BPayoutDestination | null;
  payout_account?: B2BPartPayoutAccount | null;
};

export type B2BPayoutDestination = {
  account_id: number;
  method: "bank" | "wallet";
  bank_name: string;
  account_name: string;
  account_number_last4: string;
};

export type B2BPartPayoutAccount = {
  id: number;
  status: "pending" | "verified" | "rejected";
  method: "bank" | "wallet";
  bank_name: string;
  account_name: string;
  account_number: string;
};

export type B2BPayoutAccountInput = {
  method: "bank" | "wallet";
  bank_name: string;
  account_name: string;
  account_number: string;
};

/** What a supplier sees about their own account (never the full number). */
export type B2BSellerPayoutAccount = {
  id: number;
  method: "bank" | "wallet";
  bank_name: string;
  account_name: string;
  account_number_masked: string | null;
  status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  verified_at: string | null;
};

/** Admin view: full number, and a revision to send back so a decision is never made on stale details. */
export type B2BAdminPayoutAccount = {
  id: number;
  seller_id: number;
  seller: string | null;
  seller_tax_id: string | null;
  method: "bank" | "wallet";
  bank_name: string;
  account_name: string;
  account_number: string;
  status: "pending" | "verified" | "rejected";
  revision: number;
  rejection_reason: string | null;
  verified_at: string | null;
  updated_at: string;
};

export type B2BPaymentMethods = {
  default_currency: string;
  manual: { enabled: boolean };
  chapa: { enabled: boolean; currency: string };
  stripe: { enabled: boolean };
};

export type B2BRefundDetailsInput = {
  refund_bank_name: string;
  refund_account_name: string;
  refund_account_number: string;
};

export type B2BRefundDetails = { bank_name: string; account_name: string; account_number: string };

/** "ETB 1,200.00" (or "$1,200.00" for USD). Orders carry their own currency; never assume dollars. */
export const formatMoney = (amount: number | null | undefined, currency?: string | null): string => {
  const n = (amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const c = (currency || "ETB").toUpperCase();
  return c === "USD" ? `$${n}` : `${c} ${n}`;
};

export type B2BAcceptedDeal = {
  quote_id: number;
  title: string | null;
  buyer: string | null;
  seller: string | null;
  amount: number;
  currency: string;
  accepted_at: string;
};

export type B2BDispute = {
  id: number;
  order_id: number;
  order_number: string | null;
  order_total: number | null;
  currency: string | null;
  order_status: string | null;
  payment_status: string | null;
  buyer: string | null;
  sellers: string[];
  raised_by_role: "buyer" | "seller";
  reason: string;
  status: "open" | "resolved";
  resolution: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type ShippingPayload = {
  shipping_name: string;
  shipping_company?: string;
  shipping_email: string;
  shipping_phone?: string;
  shipping_address: string;
  notes?: string;
};

export type B2BOrderLine = { name: string; unit_price: number; quantity: number; line_total: number };

export type B2BOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_status: "unpaid" | "pending_confirmation" | "paid" | "refunded";
  payment_method: string | null;
  payment_reference: string | null;
  has_refund_details?: boolean;
  refund_details?: B2BRefundDetails | null;
  payout_status: "pending" | "partial" | "released" | "void";
  quote_id?: number | null;
  shipped_at?: string | null;
  completed_at?: string | null;
  open_disputes_count?: number;
  parts?: B2BOrderPart[];
  subtotal: number;
  platform_fee_percent: number;
  platform_fee_amount: number;
  seller_payout_amount: number;
  currency: string;
  items_count: number;
  items?: B2BOrderLine[];
  created_at: string;
};

export type B2BAdminOrder = B2BOrder & { buyer: string | null; shipping_name: string | null };

export type B2BSellerOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  my_items: { name: string; quantity: number; line_total: number }[];
  my_gross: number;
  my_payout: number;
  currency: string;
  my_fulfillment_status: "pending" | "processing" | "shipped";
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  payout_status: string;
  can_ship: boolean;
  has_open_dispute: boolean;
  shipping: { name: string; company: string | null; email: string; phone: string | null; address: string } | null;
  notes: string | null;
  created_at: string;
};

export type B2BInvoice = B2BOrderDetail & {
  platform_fee_percent: number;
  platform_fee_amount: number;
  seller_payout_amount: number;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  is_admin_view: boolean;
  platform: { name: string };
};

export type B2BOrderDetail = B2BOrder & {
  shipping: { name: string; company: string | null; email: string; phone: string | null; address: string };
  notes: string | null;
  items: { id: number; name: string; unit_price: number; quantity: number; line_total: number }[];
};

export type PlaceOrderPayload = {
  items: { product_id: number; quantity: number }[];
  shipping_name: string;
  shipping_company?: string;
  shipping_email: string;
  shipping_phone?: string;
  shipping_address: string;
  notes?: string;
};