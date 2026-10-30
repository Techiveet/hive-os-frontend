const { chromium } = require('/home/mike/projects/hive/hive-os-frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970';
const PUBLIC_DIR = '/home/mike/projects/hive/hive-os-frontend/public/manual-screenshots';

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

function saveScreenshot(sourcePath, filename) {
  const publicDest = path.join(PUBLIC_DIR, filename);
  const artifactDest = path.join(ARTIFACT_DIR, filename);
  fs.copyFileSync(sourcePath, publicDest);
  try {
    fs.copyFileSync(sourcePath, artifactDest);
  } catch (e) {}
  console.log(`[SAVED] ${filename}`);
}

async function run() {
  console.log('--- STARTING TENANT LANOUVEIL TRASH LIFECYCLE E2E TEST ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1700, height: 1050 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const tenantUrl = 'http://lanouveil.localhost:3001';

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  // 1. SIGN IN ON TENANT
  console.log('1. Signing in on tenant lanouveil as admin@lanouveil.com...');
  await page.goto(tenantUrl + '/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  try {
    const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input#email, input[placeholder*="user@"]', { timeout: 5000 });
    await emailInput.fill('admin@lanouveil.com');
    const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], input#password', { timeout: 5000 });
    await passwordInput.fill('password');
    const submitBtn = await page.waitForSelector('button[type="submit"], button:has-text("INITIATE HANDSHAKE")', { timeout: 5000 });
    await submitBtn.click();
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('Successfully signed in on tenant dashboard!');
  } catch (err) {
    console.log('Tenant sign-in note:', err.message);
  }

  await page.evaluate(() => {
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // 2. NAVIGATE TO TENANT PRODUCTS CATALOG
  console.log('2. Navigating to Tenant Products Catalog...');
  await page.goto(tenantUrl + '/dashboard/inventory/catalog/products', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const p1 = '/tmp/05-tenant-products-main.png';
  await page.screenshot({ path: p1 });
  saveScreenshot(p1, '05-tenant-products-main.png');

  // 3. CREATE PRODUCT ON TENANT
  console.log('3. Opening "New Product" modal on tenant...');
  const newProductBtn = await page.waitForSelector('#tour-products-create-btn, button:has-text("Create Product")', { timeout: 6000 });
  await newProductBtn.click();
  await page.waitForSelector('div[role="dialog"]', { timeout: 6000 });
  await page.waitForTimeout(1500);

  console.log('Filling product details for tenant...');
  const nameInput = page.locator('div:has(> div > label:has-text("Product Name")) input');
  await nameInput.fill('Tenant Lanouveil Artisan Wine');

  const skuInput = page.locator('div:has(> div > label:has-text("SKU")) input');
  await skuInput.fill('SKU-LAN-WINE-777');

  const stockCodeInput = page.locator('div:has(> div > label:has-text("Stock Code")) input');
  await stockCodeInput.fill('STK-LAN-777');

  const unitPriceInput = page.locator('div:has(> div > label:has-text("Unit Price")) input');
  await unitPriceInput.fill('45.00');

  const stockInput = page.locator('div:has(> div > label:has-text("Initial Stock Quantity")) input');
  if (await stockInput.count() > 0) {
    await stockInput.fill('80');
  }

  await page.waitForTimeout(1000);
  const p2 = '/tmp/05-tenant-product-create-modal.png';
  await page.screenshot({ path: p2 });
  saveScreenshot(p2, '05-tenant-product-create-modal.png');

  // Submit product creation
  console.log('Submitting tenant product creation form...');
  const createSubmitBtn = page.locator('div[role="dialog"] button:has-text("Create Product")');
  await createSubmitBtn.click();

  await page.waitForSelector('div[role="dialog"]', { state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(2500);

  // 4. VERIFY CREATED PRODUCT IN TENANT TABLE
  console.log('4. Verifying created product in tenant catalog...');
  const catalogSearch = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });
  await catalogSearch.fill('SKU-LAN-WINE-777');
  await page.waitForTimeout(2000);

  const p3 = '/tmp/05-tenant-product-created.png';
  await page.screenshot({ path: p3 });
  saveScreenshot(p3, '05-tenant-product-created.png');

  // 5. TEST SINGLE-ITEM MOVE TO TRASH ON TENANT
  console.log('5. Testing single-item move to trash on tenant...');
  const targetRow = page.locator('tr:has-text("SKU-LAN-WINE-777")');
  await targetRow.waitFor({ timeout: 10000 });

  const deleteBtn = targetRow.locator('button:has-text("Delete")');
  await deleteBtn.scrollIntoViewIfNeeded();
  await deleteBtn.click();
  await page.waitForTimeout(1000);

  const p4 = '/tmp/05-tenant-product-trash-dialog.png';
  await page.screenshot({ path: p4 });
  saveScreenshot(p4, '05-tenant-product-trash-dialog.png');

  // Confirm move to trash
  console.log('Confirming Move to Trash on tenant...');
  const confirmTrashBtn = page.locator('div[role="alertdialog"] button:has-text("Move to Trash")');
  await confirmTrashBtn.click();
  await page.waitForTimeout(2500);

  const p5 = '/tmp/05-tenant-product-post-trash.png';
  await page.screenshot({ path: p5 });
  saveScreenshot(p5, '05-tenant-product-post-trash.png');

  // 6. NAVIGATE TO TENANT TRASH BIN
  console.log('6. Navigating to Tenant Trash Bin (/dashboard/trash)...');
  await page.goto(tenantUrl + '/dashboard/trash', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const p6 = '/tmp/05-tenant-trash-bin-listing.png';
  await page.screenshot({ path: p6 });
  saveScreenshot(p6, '05-tenant-trash-bin-listing.png');

  // 7. RESTORE TRASHED ITEM ON TENANT
  console.log('7. Testing item restore on tenant Trash Bin...');
  const trashedRow = page.locator('tr:has-text("Tenant Lanouveil Artisan Wine")');
  await trashedRow.waitFor({ timeout: 10000 });

  const restoreBtn = trashedRow.locator('button:has-text("Restore")');
  await restoreBtn.scrollIntoViewIfNeeded();
  await restoreBtn.click();
  await page.waitForTimeout(1000);

  const p7 = '/tmp/05-tenant-trash-restore-dialog.png';
  await page.screenshot({ path: p7 });
  saveScreenshot(p7, '05-tenant-trash-restore-dialog.png');

  const confirmRestoreBtn = page.locator('div[role="alertdialog"] button:has-text("Confirm Restore")');
  await confirmRestoreBtn.click();
  await page.waitForTimeout(2500);

  const p8 = '/tmp/05-tenant-trash-post-restore.png';
  await page.screenshot({ path: p8 });
  saveScreenshot(p8, '05-tenant-trash-post-restore.png');

  // 8. VERIFY RESTORED ITEM IN TENANT CATALOG
  console.log('8. Verifying item restored back in tenant catalog...');
  await page.goto(tenantUrl + '/dashboard/inventory/catalog/products', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const catalogSearch2 = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });
  await catalogSearch2.fill('SKU-LAN-WINE-777');
  await page.waitForTimeout(2000);

  const p9 = '/tmp/05-tenant-product-restored-back.png';
  await page.screenshot({ path: p9 });
  saveScreenshot(p9, '05-tenant-product-restored-back.png');

  // 9. TEST BATCH / BULK MOVE TO TRASH ON TENANT
  console.log('9. Testing batch row selection & bulk move to trash on tenant...');
  const restoredRow = page.locator('tr:has-text("SKU-LAN-WINE-777")');
  await restoredRow.waitFor({ timeout: 8000 });

  const rowCheckbox = restoredRow.locator('button[role="checkbox"], input[type="checkbox"]').first();
  await rowCheckbox.scrollIntoViewIfNeeded();
  await rowCheckbox.click();
  await page.waitForTimeout(1200);

  const p10 = '/tmp/05-tenant-bulk-actions-toolbar.png';
  await page.screenshot({ path: p10 });
  saveScreenshot(p10, '05-tenant-bulk-actions-toolbar.png');

  const bulkTrashBtn = page.locator('section button:has-text("Move to Trash")');
  await bulkTrashBtn.click();
  await page.waitForTimeout(1000);

  const confirmBulkTrashBtn = page.locator('div[role="alertdialog"] button:has-text("Move to Trash")');
  await confirmBulkTrashBtn.click();
  await page.waitForTimeout(2500);

  // 10. TEST PERMANENT PURGE IN TENANT TRASH BIN
  console.log('10. Navigating to Tenant Trash Bin to test Permanent Purge...');
  await page.goto(tenantUrl + '/dashboard/trash', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const trashedRow2 = page.locator('tr:has-text("Tenant Lanouveil Artisan Wine")');
  await trashedRow2.waitFor({ timeout: 10000 });

  const purgeBtn = trashedRow2.locator('button:has-text("Purge")');
  await purgeBtn.scrollIntoViewIfNeeded();
  await purgeBtn.click();
  await page.waitForTimeout(1000);

  const p11 = '/tmp/05-tenant-trash-purge-dialog.png';
  await page.screenshot({ path: p11 });
  saveScreenshot(p11, '05-tenant-trash-purge-dialog.png');

  const confirmPurgeBtn = page.locator('div[role="alertdialog"] button:has-text("Permanently Purge Now"), div[role="alertdialog"] button:has-text("Purge")');
  await confirmPurgeBtn.click();
  await page.waitForTimeout(2500);

  const p12 = '/tmp/05-tenant-trash-post-purge.png';
  await page.screenshot({ path: p12 });
  saveScreenshot(p12, '05-tenant-trash-post-purge.png');

  console.log('--- ALL TENANT TRASH LIFECYCLE TESTS COMPLETED SUCCESSFULLY ---');
  await browser.close();
}

run().catch(err => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
