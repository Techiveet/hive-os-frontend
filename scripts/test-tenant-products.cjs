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
  console.log('--- TESTING TENANT LANOUVEIL PRODUCT CATALOG ---');
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

  // 1. Sign in on tenant domain
  console.log('Signing in on lanouveil.localhost...');
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
    console.log('Signed in successfully on lanouveil!');
  } catch (err) {
    console.log('Sign-in note:', err.message);
  }

  await page.evaluate(() => {
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // 2. Navigate to tenant Products catalog
  console.log('Navigating to lanouveil Products Catalog...');
  await page.goto(tenantUrl + '/dashboard/inventory/catalog/products', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const pTenantMain = '/tmp/05-tenant-lanouveil-products-catalog.png';
  await page.screenshot({ path: pTenantMain });
  saveScreenshot(pTenantMain, '05-tenant-lanouveil-products-catalog.png');

  // Filter for Buffalo Chicken Wings
  console.log('Filtering for Wings on lanouveil...');
  const searchInput = await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 6000 });
  await searchInput.fill('Wings');
  await page.waitForTimeout(2000);

  const pTenantFiltered = '/tmp/05-tenant-lanouveil-filtered.png';
  await page.screenshot({ path: pTenantFiltered });
  saveScreenshot(pTenantFiltered, '05-tenant-lanouveil-filtered.png');

  console.log('--- TENANT VERIFICATION COMPLETE ---');
  await browser.close();
}

run().catch(err => {
  console.error('Tenant verification error:', err);
  process.exit(1);
});
