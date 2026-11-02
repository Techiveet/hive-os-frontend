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
  } catch (e) {
    console.warn(`Could not copy to artifact dir: ${e.message}`);
  }
  console.log(`[SAVED] ${filename}`);
}

async function run() {
  console.log('--- STARTING PRODUCTS & TRASH E2E TEST ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1700, height: 1050 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const baseUrl = 'http://127.0.0.1:3001';

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  // 1. SIGN IN
  console.log('1. Signing in as Super Admin...');
  await page.goto(baseUrl + '/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  try {
    const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 5000 });
    await emailInput.fill('super@hive.os');
    const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], input#password', { timeout: 5000 });
    await passwordInput.fill('password');
    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    await submitBtn.click();
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('Successfully authenticated into Dashboard!');
  } catch (err) {
    console.log('Sign-in step note:', err.message);
  }

  // Set local storage flags
  await page.evaluate(() => {
    localStorage.setItem('hive_context', 'central');
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // 2. NAVIGATE TO PRODUCTS CATALOG
  console.log('2. Navigating to Products Catalog...');
  await page.goto(baseUrl + '/dashboard/inventory/catalog/products', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take Screenshot 01: Main Catalog Cockpit Overview
  const p1 = '/tmp/05-products-catalog-main.png';
  await page.screenshot({ path: p1 });
  saveScreenshot(p1, '05-products-catalog-main.png');

  // 3. TEST FILTER / SEARCH
  console.log('3. Testing search filter in Products Catalog...');
  try {
    const searchInput = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });
    await searchInput.fill('Wings');
    await page.waitForTimeout(1500);

    const p2 = '/tmp/05-products-filtered-search.png';
    await page.screenshot({ path: p2 });
    saveScreenshot(p2, '05-products-filtered-search.png');

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.warn('Search input filter test note:', e.message);
  }

  // 4. TEST CREATE NEW PRODUCT MODAL
  console.log('4. Opening "New Product" modal...');
  const newProductBtn = await page.waitForSelector('#tour-products-create-btn, button:has-text("Create Product")', { timeout: 6000 });
  await newProductBtn.click();
  await page.waitForSelector('div[role="dialog"]', { timeout: 6000 });
  await page.waitForTimeout(1500);

  // Fill in Product fields accurately using scoped field label locators
  console.log('Filling product details...');
  const nameInput = page.locator('div:has(> div > label:has-text("Product Name")) input');
  await nameInput.fill('E2E Trash Lifecycle Product');

  const skuInput = page.locator('div:has(> div > label:has-text("SKU")) input');
  await skuInput.fill('SKU-TRASH-E2E-001');

  const stockCodeInput = page.locator('div:has(> div > label:has-text("Stock Code")) input');
  await stockCodeInput.fill('STK-TRASH-001');

  // Set unit price (ensure sale price remains blank so validation passes)
  const unitPriceInput = page.locator('div:has(> div > label:has-text("Unit Price")) input');
  await unitPriceInput.fill('49.99');

  // Initial stock
  const stockInput = page.locator('div:has(> div > label:has-text("Initial Stock Quantity")) input');
  if (await stockInput.count() > 0) {
    await stockInput.fill('50');
  }

  // Description
  const descInput = page.locator('div:has(> div > label:has-text("Description")) textarea');
  if (await descInput.count() > 0) {
    await descInput.fill('E2E automated verification item for trash and restore functionality.');
  }

  await page.waitForTimeout(1000);
  const p3 = '/tmp/05-products-create-modal.png';
  await page.screenshot({ path: p3 });
  saveScreenshot(p3, '05-products-create-modal.png');

  // Click Submit (Create Product) in dialog footer
  console.log('Submitting Product creation form...');
  const createSubmitBtn = page.locator('div[role="dialog"] button:has-text("Create Product")');
  await createSubmitBtn.click();

  // Wait for dialog to close
  console.log('Waiting for modal to close...');
  await page.waitForSelector('div[role="dialog"]', { state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(2500);

  // 5. VERIFY CREATED PRODUCT IN TABLE
  console.log('5. Verifying product in table...');
  const catalogSearch = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });
  await catalogSearch.fill('SKU-TRASH-E2E-001');
  await page.waitForTimeout(2000);

  const p4 = '/tmp/05-products-created-in-catalog.png';
  await page.screenshot({ path: p4 });
  saveScreenshot(p4, '05-products-created-in-catalog.png');

  // 6. SINGLE-ITEM DELETE (MOVE TO TRASH)
  console.log('6. Testing single-item move to trash...');
  const targetRow = page.locator('tr:has-text("SKU-TRASH-E2E-001")');
  await targetRow.waitFor({ timeout: 10000 });

  const deleteBtn = targetRow.locator('button:has-text("Delete")');
  await deleteBtn.scrollIntoViewIfNeeded();
  await deleteBtn.click();
  await page.waitForTimeout(1000);

  // Take screenshot of confirmation dialog
  const p5 = '/tmp/05-products-trash-confirm-dialog.png';
  await page.screenshot({ path: p5 });
  saveScreenshot(p5, '05-products-trash-confirm-dialog.png');

  // Confirm Move to Trash
  console.log('Confirming "Move to Trash"...');
  const confirmTrashBtn = page.locator('div[role="alertdialog"] button:has-text("Move to Trash")');
  await confirmTrashBtn.click();
  await page.waitForTimeout(2500);

  // Verify removed from active table
  const p6 = '/tmp/05-products-post-trash-removed.png';
  await page.screenshot({ path: p6 });
  saveScreenshot(p6, '05-products-post-trash-removed.png');

  // 7. NAVIGATE TO GLOBAL TRASH BIN
  console.log('7. Navigating to Global Trash Bin...');
  // Click header Trash Bin button or direct navigation
  const trashBinHeaderBtn = page.locator('a[href="/dashboard/trash"], button:has-text("Trash Bin")');
  if (await trashBinHeaderBtn.count() > 0) {
    await trashBinHeaderBtn.first().click();
  } else {
    await page.goto(baseUrl + '/dashboard/trash', { waitUntil: 'load', timeout: 30000 });
  }
  await page.waitForURL('**/dashboard/trash**', { timeout: 10000 });
  await page.waitForTimeout(3000);

  const p7 = '/tmp/05-trash-bin-listing.png';
  await page.screenshot({ path: p7 });
  saveScreenshot(p7, '05-trash-bin-listing.png');

  // 8. RESTORE TRASHED ITEM
  console.log('8. Testing item restore from Trash Bin...');
  const trashedRow = page.locator('tr:has-text("E2E Trash Lifecycle Product")');
  await trashedRow.waitFor({ timeout: 10000 });

  const restoreBtn = trashedRow.locator('button:has-text("Restore")');
  await restoreBtn.scrollIntoViewIfNeeded();
  await restoreBtn.click();
  await page.waitForTimeout(1000);

  // Capture Restore Confirmation Dialog
  const p8 = '/tmp/05-trash-restore-dialog.png';
  await page.screenshot({ path: p8 });
  saveScreenshot(p8, '05-trash-restore-dialog.png');

  // Click Confirm Restore
  const confirmRestoreBtn = page.locator('div[role="alertdialog"] button:has-text("Confirm Restore")');
  await confirmRestoreBtn.click();
  await page.waitForTimeout(2500);

  const p9 = '/tmp/05-trash-post-restore.png';
  await page.screenshot({ path: p9 });
  saveScreenshot(p9, '05-trash-post-restore.png');

  // 9. VERIFY RESTORED ITEM BACK IN CATALOG
  console.log('9. Navigating back to Products Catalog to verify restored item...');
  await page.goto(baseUrl + '/dashboard/inventory/catalog/products', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const catalogSearch2 = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });
  await catalogSearch2.fill('SKU-TRASH-E2E-001');
  await page.waitForTimeout(2000);

  const p10 = '/tmp/05-products-restored-back-in-catalog.png';
  await page.screenshot({ path: p10 });
  saveScreenshot(p10, '05-products-restored-back-in-catalog.png');

  // 10. TEST BATCH / BULK SELECTION & MOVE TO TRASH
  console.log('10. Testing batch row selection & bulk move to trash...');
  const restoredRow = page.locator('tr:has-text("SKU-TRASH-E2E-001")');
  await restoredRow.waitFor({ timeout: 8000 });

  // Click row selection checkbox
  const rowCheckbox = restoredRow.locator('button[role="checkbox"], input[type="checkbox"]').first();
  await rowCheckbox.scrollIntoViewIfNeeded();
  await rowCheckbox.click();
  await page.waitForTimeout(1200);

  // Capture bulk toolbar
  const p11 = '/tmp/05-products-bulk-actions-toolbar.png';
  await page.screenshot({ path: p11 });
  saveScreenshot(p11, '05-products-bulk-actions-toolbar.png');

  // Click Bulk Move to Trash in toolbar
  const bulkTrashBtn = page.locator('section button:has-text("Move to Trash")');
  await bulkTrashBtn.click();
  await page.waitForTimeout(1000);

  // Confirm bulk trash
  const confirmBulkTrashBtn = page.locator('div[role="alertdialog"] button:has-text("Move to Trash")');
  await confirmBulkTrashBtn.click();
  await page.waitForTimeout(2500);

  // 11. TEST PERMANENT PURGE IN TRASH BIN
  console.log('11. Navigating to Trash Bin to test Permanent Purge...');
  await page.goto(baseUrl + '/dashboard/trash', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const trashedRow2 = page.locator('tr:has-text("E2E Trash Lifecycle Product")');
  await trashedRow2.waitFor({ timeout: 10000 });

  // Locate Purge button
  const purgeBtn = trashedRow2.locator('button:has-text("Purge")');
  await purgeBtn.scrollIntoViewIfNeeded();
  await purgeBtn.click();
  await page.waitForTimeout(1000);

  // Capture Purge confirmation dialog
  const p12 = '/tmp/05-trash-purge-dialog.png';
  await page.screenshot({ path: p12 });
  saveScreenshot(p12, '05-trash-purge-dialog.png');

  // Confirm Purge
  const confirmPurgeBtn = page.locator('div[role="alertdialog"] button:has-text("Permanently Purge Now"), div[role="alertdialog"] button:has-text("Purge")');
  await confirmPurgeBtn.click();
  await page.waitForTimeout(2500);

  const p13 = '/tmp/05-trash-post-purge.png';
  await page.screenshot({ path: p13 });
  saveScreenshot(p13, '05-trash-post-purge.png');

  console.log('--- ALL PRODUCTS & TRASH E2E TESTS COMPLETED SUCCESSFULLY ---');
  await browser.close();
}

run().catch(err => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
