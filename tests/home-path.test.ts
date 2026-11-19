import assert from "node:assert/strict";

import { isMarketplaceOnlyUser, resolveHomePath } from "../lib/home-path";

// A marketplace buyer or supplier has no permission for the main dashboard, so signing in must land them
// in the marketplace instead of on an Access Denied page.
const buyer = { permissions: ["view_b2b_marketplace", "manage_b2b_inquiries"] };
const seller = { permissions: ["view_b2b_marketplace", "view_b2b_dashboard", "manage_b2b_products"] };
const admin = { permissions: ["view_system_dashboard", "view_b2b_marketplace", "manage_b2b_marketplace"] };
const staff = { permissions: ["view_system_dashboard"] };
const nobody = { permissions: [] as string[] };

assert.equal(resolveHomePath(buyer), "/dashboard/b2b-marketplace");
assert.equal(resolveHomePath(seller), "/dashboard/b2b-marketplace");
assert.equal(resolveHomePath({ ...buyer, permissions: buyer.permissions.map((name) => ({ name })) }), "/dashboard/b2b-marketplace");

// Anyone who can open the dashboard keeps it.
assert.equal(resolveHomePath(admin), "/dashboard");
assert.equal(resolveHomePath(staff), "/dashboard");
assert.equal(resolveHomePath(nobody), "/dashboard");
assert.equal(resolveHomePath(null), "/dashboard");

// The server's own answer always wins.
assert.equal(resolveHomePath({ ...buyer, home_path: "/dashboard" }), "/dashboard");
assert.equal(resolveHomePath({ ...staff, home_path: "/dashboard/b2b-marketplace" }), "/dashboard/b2b-marketplace");

// LMS tenants are untouched.
assert.equal(resolveHomePath({ ...buyer, business_type: "lms", roles: ["student"] }), "/learn");

assert.equal(isMarketplaceOnlyUser(buyer), true);
assert.equal(isMarketplaceOnlyUser(admin), false);
assert.equal(isMarketplaceOnlyUser(undefined), false);

console.log("home-path tests passed");
