const puppeteer = require('puppeteer-core');
async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://academy.sherazakram.com/auth/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#email');
  await new Promise(r => setTimeout(r, 1000));
  await page.type('#email', 'admin@salesacademy.com');
  await page.type('#password', 'Admin@1234!');
  await page.click('#btn-login');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Logged in as admin. Navigating to /admin/salesmen...');
  await page.goto('https://academy.sherazakram.com/admin/salesmen', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'scratch/qa_screenshots/salesmen_portal_check.png' });

  // Click View Portal
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b => /view portal/i.test(b.innerText));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('View portal clicked:', clicked);
  await new Promise(r => setTimeout(r, 5000));

  console.log('URL after View Portal:', page.url());
  await page.screenshot({ path: 'scratch/qa_screenshots/view_as_student_real.png' });

  // Now inspect WhatsApp button on the student view
  const wa = await page.evaluate(() => {
    const el = document.querySelector('a[href*="wa.me"], a[title*="WhatsApp"]');
    if (!el) return null;
    const s = window.getComputedStyle(el);
    return { href: el.href, title: el.title, position: s.position, bottom: s.bottom, right: s.right, draggable: el.draggable };
  });
  console.log('WhatsApp button on student view:', wa);

  await browser.close();
}
test();
