const puppeteer = require('puppeteer-core');
async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  // Create fresh incognito context
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto('https://academy.sherazakram.com/auth/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#email');
  await page.type('#email', 'salesman@salesacademy.com');
  await page.type('#password', 'Sales@1234!');
  await page.click('#btn-login');
  await new Promise(r => setTimeout(r, 4500));
  console.log('Current URL after student login:', page.url());
  const wa = await page.evaluate(() => {
    const el = document.querySelector('a[href*="wa.me"], a[title*="WhatsApp"]');
    if (!el) return null;
    const s = window.getComputedStyle(el);
    return { href: el.href, title: el.title, position: s.position, bottom: s.bottom, right: s.right, draggable: el.draggable };
  });
  console.log('WhatsApp button on student dashboard:', wa);
  await page.screenshot({ path: 'scratch/qa_screenshots/wa_student_real.png' });
  await browser.close();
}
test();
