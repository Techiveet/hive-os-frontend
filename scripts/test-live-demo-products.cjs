const { chromium } = require('/home/mike/projects/hive/hive-os-frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970';
const PUBLIC_DIR = '/home/mike/projects/hive/hive-os-frontend/public/manual-screenshots';

function saveScreenshot(sourcePath, filename) {
  const publicDest = path.join(PUBLIC_DIR, filename);
  const artifactDest = path.join(ARTIFACT_DIR, filename);
  try {
    fs.copyFileSync(sourcePath, publicDest);
    fs.copyFileSync(sourcePath, artifactDest);
    console.log(`[SAVED LIVE SCREENSHOT] ${filename}`);
  } catch (e) {
    console.error(`Failed to save screenshot ${filename}:`, e.message);
  }
}

async function run() {
  console.log('--- TESTING LIVE DEMO AT HTTPS://DEMO.TECHIVEET.COM ---');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1720, height: 1200 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();
  const liveUrl = 'https://demo.techiveet.com';

  page.on('console', msg => console.log(`PAGE LOG [${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // 1. Sign In on live demo
  console.log('1. Navigating to live sign-in...');
  await page.goto(`${liveUrl}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const emailInput = await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });
  await emailInput.fill('jollyaemero2224@gmail.com');
  const passwordInput = await page.waitForSelector('input#password, input[type="password"]', { timeout: 10000 });
  await passwordInput.fill('password');

  console.log('Submitting login via Enter key...');
  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: 35000 }),
    passwordInput.press('Enter')
  ]);

  console.log('Current URL after submit:', page.url());
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // 2. Navigate to live Products Catalog
  console.log('2. Navigating to live Products Catalog...');
  await page.goto(`${liveUrl}/dashboard/inventory/catalog/products`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Waiting for products table or rows...');
  await page.waitForSelector('tbody tr', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Scroll to show KPIs and table
  await page.evaluate(() => window.scrollTo(0, 220));
  await page.waitForTimeout(1000);

  const pLiveMain = '/tmp/07-live-demo-products-catalog.png';
  await page.screenshot({ path: pLiveMain, timeout: 30000 });
  saveScreenshot(pLiveMain, '07-live-demo-products-catalog.png');

  // Check product count in table
  const rowCount = await page.evaluate(() => {
    return document.querySelectorAll('tbody tr').length;
  });
  console.log(`Rendered product table rows on live demo: ${rowCount}`);

  // 3. Search AeroBook
  console.log('3. Searching AeroBook on live site...');
  const searchInput = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 10000 });
  await searchInput.fill('AeroBook');
  await page.waitForTimeout(2000);

  const pLiveAero = '/tmp/07-live-demo-products-aerobook.png';
  await page.screenshot({ path: pLiveAero, timeout: 30000 });
  saveScreenshot(pLiveAero, '07-live-demo-products-aerobook.png');
  console.log('Search AeroBook captured.');

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(1500);

  // 4. Test Low Stock filter
  console.log('4. Testing Low Stock filter...');
  const lowStockTab = await page.$('button:has-text("Low Stock"), [role="tab"]:has-text("Low Stock")');
  if (lowStockTab) {
    await lowStockTab.click();
    await page.waitForTimeout(2000);
    const pLiveLowStock = '/tmp/07-live-demo-products-low-stock.png';
    await page.screenshot({ path: pLiveLowStock, timeout: 30000 });
    saveScreenshot(pLiveLowStock, '07-live-demo-products-low-stock.png');
    console.log('Low Stock tab captured.');
  }

  console.log('=== LIVE TEST COMPLETE SUCCESS ===');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
