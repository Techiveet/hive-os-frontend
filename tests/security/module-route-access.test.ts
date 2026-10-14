import assert from "node:assert/strict";

// isTenantSession() reads window.location / localStorage; give node a minimal window.
const store = new Map<string, string>();
const fakeWindow = {
  location: { hostname: "acme.gulfingot.com" },
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
};
(globalThis as any).window = fakeWindow;
(globalThis as any).localStorage = fakeWindow.localStorage;

const asTenant = () => { fakeWindow.location.hostname = "acme.gulfingot.com"; };
const asCentral = () => { fakeWindow.location.hostname = "localhost"; };

type User = Parameters<typeof import("../../lib/dashboard-access").canAccessDashboardPath>[1];

void (async () => {
const { canAccessDashboardPath } = await import("../../lib/dashboard-access");

const tenantUser = (modules: string[], permissions: string[], roles: string[] = ["Accountant"]): User => ({
  roles,
  permissions,
  module_access: { statuses: Object.fromEntries(modules.map((slug) => [slug, { active: true }])) },
});

// ── Tenant without the finance module ────────────────────────────────────
asTenant();
const noFinance = tenantUser(["mailbox"], ["view_finance", "manage_finance"]);
assert.equal(canAccessDashboardPath("/dashboard/finance", noFinance), false, "finance needs the finance module");
assert.equal(canAccessDashboardPath("/dashboard/finance/journals", noFinance), false, "deep finance pages too");
assert.equal(canAccessDashboardPath("/dashboard/finance/journals/42?tab=lines", noFinance), false, "and their children");

// Tenant Super Admin is not exempt from the subscription — same as the sidebar.
const superAdminNoFinance = tenantUser(["mailbox"], [], ["Super Admin"]);
assert.equal(canAccessDashboardPath("/dashboard/finance", superAdminNoFinance), false, "super admin still needs the module");

// ── Tenant with the module ──────────────────────────────────────────────
const withFinanceNoPerm = tenantUser(["financial_management"], ["view_profile"]);
assert.equal(canAccessDashboardPath("/dashboard/finance", withFinanceNoPerm), false, "module alone is not enough");

const accountant = tenantUser(["financial_management"], ["view_finance"]);
assert.equal(canAccessDashboardPath("/dashboard/finance", accountant), true, "module + permission opens it");
assert.equal(canAccessDashboardPath("/dashboard/finance/journals", accountant), false, "journals needs its own permission");

const journalClerk = tenantUser(["financial_management"], ["view_journals"]);
assert.equal(canAccessDashboardPath("/dashboard/finance/journals", journalClerk), true);

const superAdminWithFinance = tenantUser(["financial_management"], [], ["Super Admin"]);
assert.equal(canAccessDashboardPath("/dashboard/finance/settings", superAdminWithFinance), true);

// Central-control override (impersonating admin) bypasses the subscription check.
assert.equal(
  canAccessDashboardPath("/dashboard/finance", { ...noFinance, central_control_override: true }),
  true,
  "central override bypasses module subscriptions",
);

// ── Central workspace: no subscription gating, permissions still apply ──
asCentral();
assert.equal(canAccessDashboardPath("/dashboard/finance", { roles: ["Admin"], permissions: [] }), true, "central Admin is unrestricted");
assert.equal(canAccessDashboardPath("/dashboard/finance", { roles: ["Viewer"], permissions: ["view_profile"] }), false);

// ── Mailbox mirrors the MailBox API: module only ───────────────────────
asTenant();
assert.equal(canAccessDashboardPath("/dashboard/mail", noFinance), true, "mailbox is in this plan");
assert.equal(canAccessDashboardPath("/dashboard/mail", tenantUser([], ["view_finance"])), false, "no mailbox module, no mail");

// identity-cards and daily-reports were also unruled; their manifests now gate them.
assert.equal(canAccessDashboardPath("/dashboard/identity-cards", tenantUser([], [])), false);
assert.equal(canAccessDashboardPath("/dashboard/daily-reports", tenantUser([], [])), false);

// ── Routes no manifest describes keep the historical default ────────────
asTenant();
assert.equal(canAccessDashboardPath("/dashboard/subscription-required", noFinance), true);

console.log("module-route-access: all assertions passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
