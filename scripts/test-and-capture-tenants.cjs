const { chromium } = require('/home/mike/projects/hive/hive-os-frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970';
const PUBLIC_DIR = '/home/mike/projects/hive/hive-os-frontend/public/manual-screenshots';

// Ensure directories exist
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
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Launching browser...');
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

  console.log('Navigating to sign-in...');
  await page.goto(baseUrl + '/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Authenticate by submitting sign-in form
  console.log('Filling sign-in form...');
  try {
    const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 5000 });
    await emailInput.fill('super@hive.os');
    const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], input#password', { timeout: 5000 });
    await passwordInput.fill('password');
    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    await submitBtn.click();
    console.log('Clicked submit on sign-in, waiting for navigation to complete...');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('Reached dashboard successfully!');
  } catch (err) {
    console.log('Sign-in wait or bypass note:', err.message);
  }

  // Ensure localStorage is set properly for Super Admin central context and bypass tours
  await page.evaluate(() => {
    localStorage.setItem('hive_context', 'central');
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });
  await page.waitForTimeout(1000);

  console.log('Navigating to /dashboard/tenants...');
  await page.goto(baseUrl + '/dashboard/tenants', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Close any joyride if open
  await page.evaluate(() => {
    document.querySelectorAll('.react-joyride__overlay, .react-joyride__spotlight').forEach(el => el.remove());
  });

  // 1. Capture Platform Overview / Pulse section
  console.log('Capturing 04-tenants-cockpit-overview.png...');
  const overviewEl = await page.$('section[aria-labelledby="tenant-pulse-heading"]');
  if (overviewEl) {
    const tmpPath = '/tmp/04-tenants-cockpit-overview.png';
    await overviewEl.screenshot({ path: tmpPath });
    saveScreenshot(tmpPath, '04-tenants-cockpit-overview.png');
  }

  // 2. Capture Full Cockpit Page (with newly added Filter Bar)
  console.log('Capturing 04-tenants-cockpit-main.png...');
  const tmpMain = '/tmp/04-tenants-cockpit-main.png';
  await page.screenshot({ path: tmpMain, fullPage: false });
  saveScreenshot(tmpMain, '04-tenants-cockpit-main.png');

  // 3. Capture Tenant Directory Table Specifically
  console.log('Capturing 04-tenants-directory-table.png...');
  const tableEl = await page.$('#tour-tenant-table');
  if (tableEl) {
    const tmpTable = '/tmp/04-tenants-directory-table.png';
    await tableEl.screenshot({ path: tmpTable });
    saveScreenshot(tmpTable, '04-tenants-directory-table.png');
  }

  // 4. Test and Capture Filter Bar with Active Filters
  console.log('Testing filter bar with active filters...');
  const planTrigger = await page.$('button[aria-label="Filter by Capacity Plan"]');
  if (planTrigger) {
    await planTrigger.click();
    await page.waitForTimeout(500);
    const businessOption = await page.$('[role="option"]:has-text("Business")');
    if (businessOption) {
      await businessOption.click();
      await page.waitForTimeout(1500);
    }
  }

  const tmpFiltered = '/tmp/04-tenants-filtered-search.png';
  await page.screenshot({ path: tmpFiltered });
  saveScreenshot(tmpFiltered, '04-tenants-filtered-search.png');

  // Reset filters
  const resetBtn = await page.$('button:has-text("Reset Filters")');
  if (resetBtn) {
    await resetBtn.click();
    await page.waitForTimeout(1500);
  }

  // 5. Open "Provision Tenant Account" modal
  console.log('Opening Provision Tenant Account dialog...');
  const provisionBtn = await page.waitForSelector('button:has-text("Create Tenant Account"), #tour-tenant-provision button', { timeout: 5000 });
  await provisionBtn.click();
  await page.waitForTimeout(2000);

  const dialogContent = await page.waitForSelector('[role="dialog"]:has-text("Provision New Node")', { timeout: 5000 });

  // 5a. Top section of Provision Modal
  console.log('Capturing Provision Modal Top...');
  const tmpProvTop = '/tmp/04-tenants-provision-modal-top.png';
  await dialogContent.screenshot({ path: tmpProvTop });
  saveScreenshot(tmpProvTop, '04-tenants-provision-modal-top.png');

  // Fill in sample data to see the form reactive updates
  await page.fill('#tenant-name', 'Starlight Logistics & Retail');
  await page.waitForTimeout(500);

  // 5b. Scroll to Landing Template / Middle section of dialog
  console.log('Scrolling to Landing Template Editor...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('[role="dialog"] .overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = 350;
    }
  });
  await page.waitForTimeout(1000);
  const tmpProvMid = '/tmp/04-tenants-provision-modal-landing.png';
  await dialogContent.screenshot({ path: tmpProvMid });
  saveScreenshot(tmpProvMid, '04-tenants-provision-modal-landing.png');

  // 5c. Test "Choose from Library"
  console.log('Testing Template Library Picker...');
  const libraryBtn = await page.$('button:has-text("Choose from Library")');
  if (libraryBtn) {
    await libraryBtn.click();
    await page.waitForTimeout(1500);
    const libraryDialog = await page.waitForSelector('[role="dialog"]:has-text("Landing Template Library")', { timeout: 5000 });
    const tmpLib = '/tmp/04-tenants-template-library-picker.png';
    await libraryDialog.screenshot({ path: tmpLib });
    saveScreenshot(tmpLib, '04-tenants-template-library-picker.png');

    // Close library picker
    const closeBtn = await page.$('[role="dialog"]:has-text("Landing Template Library") button[aria-label="Close"], [role="dialog"]:has-text("Landing Template Library") button:has-text("Close")');
    if (closeBtn) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // 5d. Scroll to bottom of Provision Modal (Super Admin Settings)
  console.log('Scrolling to Super Admin Settings...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('[role="dialog"] .overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  await page.waitForTimeout(1000);
  const tmpProvBot = '/tmp/04-tenants-provision-modal-admin.png';
  await dialogContent.screenshot({ path: tmpProvBot });
  saveScreenshot(tmpProvBot, '04-tenants-provision-modal-admin.png');

  // Close Provision Dialog
  console.log('Closing Provision Dialog...');
  const cancelBtn = await page.$('[role="dialog"]:has-text("Provision New Node") button:has-text("Cancel")');
  if (cancelBtn) await cancelBtn.click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);

  // 6. Test Edit / Reconfigure Node Modal
  console.log('Testing Edit / Reconfigure Node Modal (#tour-action-edit)...');
  const editBtn = await page.waitForSelector('#tour-action-edit', { timeout: 5000 });
  await editBtn.click();
  await page.waitForTimeout(2000);

  const editDialog = await page.waitForSelector('[role="dialog"]:has-text("Reconfigure Node")', { timeout: 5000 });
  const tmpEdit = '/tmp/04-tenants-edit-modal.png';
  await editDialog.screenshot({ path: tmpEdit });
  saveScreenshot(tmpEdit, '04-tenants-edit-modal.png');

  // Close Edit Dialog cleanly
  console.log('Closing Edit Dialog...');
  const cancelEditBtn = await page.waitForSelector('[role="dialog"]:has-text("Reconfigure Node") button:has-text("Cancel")', { timeout: 5000 });
  await cancelEditBtn.click();
  await page.waitForTimeout(2000);

  // 7. Test Inspect Node / Activity & Details Dialog
  console.log('Testing Inspect Node (Activity View)...');
  const activityBtn = await page.waitForSelector('#tour-action-view', { timeout: 5000 });
  await activityBtn.click();
  await page.waitForTimeout(2500);

  const viewDialog = await page.waitForSelector('[role="dialog"]:has-text("Activity & users")', { timeout: 5000 });

  // 7a. Activity & Users Tab
  console.log('Capturing View Dialog - Activity & Users Tab...');
  const tmpViewAct = '/tmp/04-tenants-view-activity-tab.png';
  await viewDialog.screenshot({ path: tmpViewAct });
  saveScreenshot(tmpViewAct, '04-tenants-view-activity-tab.png');

  // 7b. Switch to Configuration & Domains Tab
  console.log('Switching to Configuration & Domains Tab...');
  const configTab = await page.waitForSelector('button[role="tab"]:has-text("Configuration & domains")', { timeout: 5000 });
  await configTab.click();
  await page.waitForTimeout(2500);

  console.log('Capturing View Dialog - Configuration Tab...');
  const tmpViewCfg = '/tmp/04-tenants-view-config-tab.png';
  await viewDialog.screenshot({ path: tmpViewCfg });
  saveScreenshot(tmpViewCfg, '04-tenants-view-config-tab.png');

  // 7c. Scroll down to Custom Domain Manager within Configuration Tab
  console.log('Scrolling to Custom Domain Manager...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('[role="dialog"] .overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  await page.waitForTimeout(1500);
  const tmpDomainMgr = '/tmp/04-tenants-domain-manager.png';
  await viewDialog.screenshot({ path: tmpDomainMgr });
  saveScreenshot(tmpDomainMgr, '04-tenants-domain-manager.png');

  // Close View Dialog
  console.log('Closing View Dialog...');
  const closeViewBtn = await page.waitForSelector('button:has-text("Close Overview")', { timeout: 5000 });
  await closeViewBtn.click();
  await page.waitForTimeout(2000);

  // 8. Test Purge / Delete Confirmation Dialog
  console.log('Testing Purge Alert Dialog...');
  const purgeBtn = await page.waitForSelector('#tour-action-purge', { timeout: 5000 });
  await purgeBtn.click();
  await page.waitForTimeout(1500);

  const purgeDialog = await page.waitForSelector('[role="alertdialog"]:has-text("Purge Node?")', { timeout: 5000 });
  const tmpPurge = '/tmp/04-tenants-purge-dialog.png';
  await purgeDialog.screenshot({ path: tmpPurge });
  saveScreenshot(tmpPurge, '04-tenants-purge-dialog.png');

  // Click Cancel on Purge Dialog
  const cancelPurgeBtn = await page.waitForSelector('[role="alertdialog"] button:has-text("Cancel")', { timeout: 5000 });
  await cancelPurgeBtn.click();
  await page.waitForTimeout(1500);

  await browser.close();
  console.log('All tests and captures completed successfully!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
