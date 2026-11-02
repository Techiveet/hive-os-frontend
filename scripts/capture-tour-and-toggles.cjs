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
  } catch (e) {
    console.warn(`Could not copy to artifact dir: ${e.message}`);
  }
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Launching browser for tour and action captures...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const baseUrl = 'http://127.0.0.1:3001';

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
  } catch (err) {}

  await page.evaluate(() => {
    localStorage.setItem('hive_context', 'central');
    localStorage.removeItem('hive_welcome_tour_completed');
    localStorage.removeItem('hive_tour_completed');
    localStorage.removeItem('hive_tour_running');
  });

  await page.goto(baseUrl + '/dashboard/tenants', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Trigger tour programmatically or click tour button
  console.log('Starting interactive tour...');
  const tourTrigger = await page.$('button[title*="tour" i], button:has-text("Tour"), button[aria-label*="tour" i]');
  if (tourTrigger) {
    await tourTrigger.click();
    await page.waitForTimeout(1500);
  } else {
    // Inject Joyride start if available
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('start-tour'));
    });
    await page.waitForTimeout(1000);
  }

  // Check if joyride tooltip is visible
  const joyrideTooltip = await page.$('.react-joyride__tooltip, [role="alertdialog"], .react-joyride__spotlight');
  if (joyrideTooltip) {
    const tmpTour = '/tmp/04-tenants-guided-tour.png';
    await page.screenshot({ path: tmpTour });
    saveScreenshot(tmpTour, '04-tenants-guided-tour.png');
  }

  // Close joyride
  await page.evaluate(() => {
    document.querySelectorAll('.react-joyride__overlay, .react-joyride__spotlight').forEach(el => el.remove());
  });

  // Hover over action buttons to capture action tooltips
  console.log('Hovering over status toggle button...');
  const statusBtn = await page.$('#tour-action-status');
  if (statusBtn) {
    await statusBtn.hover();
    await page.waitForTimeout(800);
    const tmpActions = '/tmp/04-tenants-actions-hover.png';
    const actionCell = await page.$('#tour-tenant-table tbody tr:first-child td:last-child');
    if (actionCell) {
      await actionCell.screenshot({ path: tmpActions });
      saveScreenshot(tmpActions, '04-tenants-actions-hover.png');
    }
  }

  await browser.close();
  console.log('Finished extra captures!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
