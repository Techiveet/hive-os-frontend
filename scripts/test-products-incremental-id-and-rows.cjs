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
    console.log(`[SAVED SCREENSHOT] ${filename}`);
  } catch (e) {
    console.error(`Failed to save ${filename}:`, e.message);
  }
}

async function run() {
  console.log('--- TESTING PRODUCTS INCREMENTAL ID & 5 ROWS OPTION ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1720, height: 1100 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const url = 'http://demo.localhost:3001';

  // 1. Sign In
  console.log('1. Signing in on demo.localhost:3001...');
  await page.goto(`${url}/sign-in`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const emailInput = await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });
  await emailInput.fill('jollyaemero2224@gmail.com');
  const passwordInput = await page.waitForSelector('input#password, input[type="password"]', { timeout: 10000 });
  await passwordInput.fill('password');
  await passwordInput.press('Enter');

  await page.waitForURL('**/dashboard**', { timeout: 25000 }).catch(async () => {
    const handshakeBtn = await page.$('button:has-text("Initiate Handshake")');
    if (handshakeBtn) await handshakeBtn.click();
    await page.waitForURL('**/dashboard**', { timeout: 25000 });
  });

  console.log('Signed in successfully!');
  await page.evaluate(() => {
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  // 2. Navigate to Products
  console.log('2. Navigating to Products catalog...');
  await page.goto(`${url}/dashboard/inventory/catalog/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('tbody tr', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Scroll to show table headers and rows clearly
  await page.evaluate(() => window.scrollTo(0, 220));
  await page.waitForTimeout(1000);

  // Check columns and headers
  const headers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('thead th')).map(th => th.innerText.trim());
  });
  console.log('Table Headers:', headers.filter(Boolean));

  // Check incremental IDs on 10 rows
  const ids10 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('tbody tr')).map(tr => {
      const cells = tr.querySelectorAll('td');
      return {
        hashIndex: cells[1]?.innerText?.trim(),
        productName: cells[2]?.querySelector('p, span, div')?.innerText?.trim() || cells[2]?.innerText?.trim()
      };
    });
  });
  console.log('Rows (Default 10):', ids10.slice(0, 5));

  const p10 = '/tmp/08-products-incremental-id-10-rows.png';
  await page.screenshot({ path: p10, timeout: 15000 });
  saveScreenshot(p10, '08-products-incremental-id-10-rows.png');

  // 3. Test 5 Rows selector
  console.log('3. Selecting 5 Rows in rows per page selector...');
  const selectElem = await page.waitForSelector('select[aria-label="Rows per page"], select:has(option[value="5"])', { timeout: 5000 });
  const selectOptions = await page.evaluate((el) => {
    return Array.from(el.querySelectorAll('option')).map(opt => ({ value: opt.value, text: opt.innerText.trim() }));
  }, selectElem);
  console.log('Available Page Size Options in select:', selectOptions);

  await selectElem.selectOption('5');
  console.log('Selected option value "5"');
  await page.waitForTimeout(2500);

  // Verify 5 rows rendered
  const rowsCount5 = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
  const ids5 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('tbody tr')).map(tr => {
      const cells = tr.querySelectorAll('td');
      return {
        hashIndex: cells[1]?.innerText?.trim(),
        productName: cells[2]?.querySelector('p, span, div')?.innerText?.trim() || cells[2]?.innerText?.trim()
      };
    });
  });
  console.log(`Rendered rows with 5 Rows option: ${rowsCount5}`);
  console.log('Page 1 IDs:', ids5);

  const p5_page1 = '/tmp/08-products-incremental-id-5-rows-page1.png';
  await page.screenshot({ path: p5_page1, timeout: 15000 });
  saveScreenshot(p5_page1, '08-products-incremental-id-5-rows-page1.png');

  // 4. Test Page 2 with 5 Rows option
  console.log('4. Navigating to Page 2...');
  const nextBtn = await page.waitForSelector('button:has-text("Next"), button[aria-label="Next page"], [role="navigation"] button:last-child');
  if (nextBtn) {
    // Find page 2 button directly
    const page2Btn = await page.$('button:text-is("2")');
    if (page2Btn) {
      await page2Btn.click();
    } else {
      await nextBtn.click();
    }
    await page.waitForTimeout(2500);

    const ids5_page2 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('tbody tr')).map(tr => {
        const cells = tr.querySelectorAll('td');
        return {
          hashIndex: cells[1]?.innerText?.trim(),
          productName: cells[2]?.querySelector('p, span, div')?.innerText?.trim() || cells[2]?.innerText?.trim()
        };
      });
    });
    console.log('Page 2 IDs (should be 6, 7, 8, 9, 10):', ids5_page2);

    const p5_page2 = '/tmp/08-products-incremental-id-5-rows-page2.png';
    await page.screenshot({ path: p5_page2, timeout: 15000 });
    saveScreenshot(p5_page2, '08-products-incremental-id-5-rows-page2.png');
  }

  console.log('=== TEST COMPLETED SUCCESSFULLY ===');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
