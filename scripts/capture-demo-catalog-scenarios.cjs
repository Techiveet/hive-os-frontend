const { chromium } = require('/home/mike/projects/hive/hive-os-frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970';
const PUBLIC_DIR = '/home/mike/projects/hive/hive-os-frontend/public/manual-screenshots';

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
  console.log('--- ENHANCED DEMO TENANT PRODUCT CATALOG CAPTURE ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1720, height: 1350 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const demoUrl = 'http://demo.localhost:3001';

  // 1. Sign In
  console.log('1. Signing in...');
  await page.goto(`${demoUrl}/sign-in`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  try {
    const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 6000 });
    await emailInput.fill('jollyaemero2224@gmail.com');
    const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], input#password', { timeout: 6000 });
    await passwordInput.fill('password');
    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 6000 });
    await submitBtn.click();
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
  } catch (err) {
    console.log('Sign in note:', err.message);
  }

  await page.evaluate(() => {
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // 2. Main Catalog Table
  console.log('2. Main Catalog Overview...');
  await page.goto(`${demoUrl}/dashboard/inventory/catalog/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Scroll to show KPIs and Table
  await page.evaluate(() => window.scrollTo(0, 260));
  await page.waitForTimeout(1000);
  const pMain = '/tmp/06-demo-catalog-table-overview.png';
  await page.screenshot({ path: pMain });
  saveScreenshot(pMain, '06-demo-catalog-table-overview.png');

  const searchInput = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });

  // 3. Search Scenario: AeroBook (Standard In-Stock Laptop)
  console.log('3. Searching AeroBook...');
  await searchInput.fill('AeroBook');
  await page.waitForTimeout(1500);
  const pAero = '/tmp/06-demo-product-std-aerobook.png';
  await page.screenshot({ path: pAero });
  saveScreenshot(pAero, '06-demo-product-std-aerobook.png');

  // 4. Search Scenario: Merino (Parent & Variants)
  console.log('4. Searching Merino Variants...');
  await searchInput.fill('Merino');
  await page.waitForTimeout(1500);
  const pMerino = '/tmp/06-demo-product-variants-merino.png';
  await page.screenshot({ path: pMerino });
  saveScreenshot(pMerino, '06-demo-product-variants-merino.png');

  // 5. Search Scenario: Low Stock Headphones & Out of Stock Dock
  console.log('5. Searching Audio Accessories (Low Stock & OOS)...');
  await searchInput.fill('Noise-Canceling');
  await page.waitForTimeout(1500);
  const pLow = '/tmp/06-demo-product-low-stock-alert.png';
  await page.screenshot({ path: pLow });
  saveScreenshot(pLow, '06-demo-product-low-stock-alert.png');

  // 6. Search Scenario: Discounted Monitor
  console.log('6. Searching Discounted Monitor...');
  await searchInput.fill('Monitor');
  await page.waitForTimeout(1500);
  const pDisc = '/tmp/06-demo-product-discounted-sale.png';
  await page.screenshot({ path: pDisc });
  saveScreenshot(pDisc, '06-demo-product-discounted-sale.png');

  // 7. Search Scenario: Bulk & Heavy Freight (Steel & Degreaser)
  console.log('7. Searching Steel Plate (Heavy Cargo kg)...');
  await searchInput.fill('Steel Plate');
  await page.waitForTimeout(1500);
  const pSteel = '/tmp/06-demo-product-heavy-freight-kg.png';
  await page.screenshot({ path: pSteel });
  saveScreenshot(pSteel, '06-demo-product-heavy-freight-kg.png');

  // 8. Search Scenario: Perishable with Nutrition (Coffee)
  console.log('8. Searching Organic Coffee...');
  await searchInput.fill('Coffee');
  await page.waitForTimeout(1500);
  const pCoffee = '/tmp/06-demo-product-nutritional-coffee.png';
  await page.screenshot({ path: pCoffee });
  saveScreenshot(pCoffee, '06-demo-product-nutritional-coffee.png');

  // 9. Status Filter: Draft / Ring
  console.log('9. Searching Health Ring (Draft)...');
  await searchInput.fill('Ring');
  await page.waitForTimeout(1500);
  const pDraft = '/tmp/06-demo-product-draft-status.png';
  await page.screenshot({ path: pDraft });
  saveScreenshot(pDraft, '06-demo-product-draft-status.png');

  // 10. Status Filter: Archived / Mouse
  console.log('10. Searching Legacy Mouse (Archived)...');
  await searchInput.fill('Mouse');
  await page.waitForTimeout(1500);
  const pArchived = '/tmp/06-demo-product-archived-status.png';
  await page.screenshot({ path: pArchived });
  saveScreenshot(pArchived, '06-demo-product-archived-status.png');

  console.log('=== ENHANCED CAPTURES COMPLETED SUCCESSFULLY ===');
  await browser.close();
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
