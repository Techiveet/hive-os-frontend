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
    console.warn(`[WARN] Artifact copy failed: ${e.message}`);
  }
  console.log(`[SCREENSHOT SAVED] ${filename}`);
}

async function run() {
  console.log('=== STARTING DEMO TENANT PRODUCTS VERIFICATION ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1720, height: 1080 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const demoUrl = 'http://demo.localhost:3001';

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  // Step 1: Sign in on demo.localhost as jollyaemero2224@gmail.com
  console.log('1. Navigating to Sign-In page...');
  await page.goto(`${demoUrl}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const pSignIn = '/tmp/06-demo-signin-page.png';
  await page.screenshot({ path: pSignIn });
  saveScreenshot(pSignIn, '06-demo-signin-page.png');

  console.log('Submitting login credentials...');
  try {
    const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 6000 });
    await emailInput.fill('jollyaemero2224@gmail.com');
    const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], input#password', { timeout: 6000 });
    await passwordInput.fill('password');
    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 6000 });
    await submitBtn.click();
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
    console.log('Successfully signed in on demo tenant domain!');
  } catch (err) {
    console.log('Sign-in interaction note:', err.message);
  }

  // Ensure tour flags to prevent popups obscuring data
  await page.evaluate(() => {
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // Step 2: Navigate to Products Catalog
  console.log('2. Navigating to Products Catalog...');
  await page.goto(`${demoUrl}/dashboard/inventory/catalog/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const pCatalogMain = '/tmp/06-demo-products-catalog-main.png';
  await page.screenshot({ path: pCatalogMain });
  saveScreenshot(pCatalogMain, '06-demo-products-catalog-main.png');

  // Step 3: Search Filter Testing (e.g. "AeroBook")
  console.log('3. Testing Search Filter (AeroBook)...');
  const searchInput = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 8000 });
  await searchInput.fill('AeroBook');
  await page.waitForTimeout(2000);

  const pSearchAero = '/tmp/06-demo-products-search-aerobook.png';
  await page.screenshot({ path: pSearchAero });
  saveScreenshot(pSearchAero, '06-demo-products-search-aerobook.png');

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(1500);

  // Step 4: Status Filter Testing (Draft Status)
  console.log('4. Testing Status Filter (Draft)...');
  try {
    const statusSelect = await page.$('button:has-text("All Statuses"), select[name="status"]');
    if (statusSelect) {
      await statusSelect.click();
      await page.waitForTimeout(500);
      const draftOption = await page.$('div[role="option"]:has-text("Draft"), option[value="draft"]');
      if (draftOption) {
        await draftOption.click();
        await page.waitForTimeout(2000);
      }
    }
  } catch (e) {
    console.log('Status filter interaction note:', e.message);
  }
  const pStatusDraft = '/tmp/06-demo-products-status-draft.png';
  await page.screenshot({ path: pStatusDraft });
  saveScreenshot(pStatusDraft, '06-demo-products-status-draft.png');

  // Reset filter or navigate clean
  await page.goto(`${demoUrl}/dashboard/inventory/catalog/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Step 5: Test Parent / Variants Search (Merino)
  console.log('5. Testing Parent and Variants Display (Merino)...');
  const searchInput2 = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 8000 });
  await searchInput2.fill('Merino');
  await page.waitForTimeout(2000);

  const pVariants = '/tmp/06-demo-products-variants-merino.png';
  await page.screenshot({ path: pVariants });
  saveScreenshot(pVariants, '06-demo-products-variants-merino.png');

  // Clear search
  await searchInput2.fill('');
  await page.waitForTimeout(1500);

  // Step 6: Test Low Stock Alert Items
  console.log('6. Testing Low Stock Filter / Display...');
  const searchInput3 = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 8000 });
  await searchInput3.fill('Headphones');
  await page.waitForTimeout(2000);

  const pLowStock = '/tmp/06-demo-products-low-stock.png';
  await page.screenshot({ path: pLowStock });
  saveScreenshot(pLowStock, '06-demo-products-low-stock.png');

  // Step 7: Clear search and capture full catalog overview with pagination
  await searchInput3.fill('');
  await page.waitForTimeout(2000);
  const pFullCatalog = '/tmp/06-demo-products-full-catalog.png';
  await page.screenshot({ path: pFullCatalog, fullPage: false });
  saveScreenshot(pFullCatalog, '06-demo-products-full-catalog.png');

  console.log('=== DEMO TENANT PRODUCTS VERIFICATION COMPLETE ===');
  await browser.close();
}

run().catch(err => {
  console.error('Demo tenant test failed:', err);
  process.exit(1);
});
