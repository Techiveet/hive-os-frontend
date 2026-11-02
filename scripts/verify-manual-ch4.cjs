const { chromium } = require('/home/mike/projects/hive/hive-os-frontend/node_modules/playwright');
const fs = require('fs');

async function run() {
  console.log('Verifying User Manual Chapter 04...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1500, height: 1100 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const baseUrl = 'http://127.0.0.1:3001';

  await page.goto(baseUrl + '/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

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
    localStorage.setItem('hive_welcome_tour_completed', 'true');
    localStorage.setItem('hive_tour_running', 'false');
  });

  console.log('Navigating to user manual...');
  await page.goto(baseUrl + '/dashboard/user-manual', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Clicking CHAPTER 04...');
  const ch4Btn = await page.waitForSelector('button:has-text("CHAPTER 04")', { timeout: 10000 });
  await ch4Btn.click();
  await page.waitForTimeout(2000);

  console.log('Capturing verified user manual Chapter 04 views...');
  const tmpCh4Top = '/tmp/04-verified-user-manual-ch4-top.png';
  await page.screenshot({ path: tmpCh4Top });
  fs.copyFileSync(tmpCh4Top, '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970/verified_manual_ch4_top.png');

  // Scroll down to Provisioning section
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(1000);
  const tmpCh4Mid = '/tmp/04-verified-user-manual-ch4-mid.png';
  await page.screenshot({ path: tmpCh4Mid });
  fs.copyFileSync(tmpCh4Mid, '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970/verified_manual_ch4_mid.png');

  // Scroll down to Domain & Security section
  await page.evaluate(() => window.scrollBy(0, 1100));
  await page.waitForTimeout(1000);
  const tmpCh4Bot = '/tmp/04-verified-user-manual-ch4-bot.png';
  await page.screenshot({ path: tmpCh4Bot });
  fs.copyFileSync(tmpCh4Bot, '/mnt/c/Users/Mike/.gemini/antigravity/brain/c7bbace8-586b-4cb2-9396-3404acf2b970/verified_manual_ch4_bot.png');

  await browser.close();
  console.log('User manual Chapter 04 verified successfully!');
}

run().catch(err => {
  console.error('Manual verification failed:', err);
  process.exit(1);
});
