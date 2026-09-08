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
  await page.type('#email', 'admin@salesacademy.com');
  await page.type('#password', 'Admin@1234!');
  await page.click('#btn-login');
  await new Promise(r => setTimeout(r, 4000));
  console.log('After login URL:', page.url());

  await page.goto('https://academy.sherazakram.com/admin/salesmen', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Salesmen page URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body includes Faizan:', bodyText.includes('Faizan'));
  console.log('Body includes View Portal:', bodyText.includes('View Portal'));

  // Click View Portal on Faizan
  const res = await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('View Portal'));
    if (btns.length > 0) {
      btns[0].click();
      return { clicked: true, count: btns.length };
    }
    return { clicked: false, count: 0 };
  });
  console.log('View portal click result:', res);
  await new Promise(r => setTimeout(r, 4000));

  console.log('URL after clicking View Portal:', page.url());
  const studentViewBody = await page.evaluate(() => document.body.innerText);
  console.log('Has Viewing as Student banner:', /viewing as student|student/i.test(studentViewBody));

  // Check WhatsApp button on student view
  const wa = await page.evaluate(() => {
    const el = document.querySelector('a[href*="wa.me"], a[title*="WhatsApp"]');
    if (!el) return null;
    const s = window.getComputedStyle(el);
    return { href: el.href, title: el.title, position: s.position, bottom: s.bottom, right: s.right };
  });
  console.log('WhatsApp button on student view:', wa);

  await page.screenshot({ path: 'scratch/qa_screenshots/view_portal_final.png' });
  await browser.close();
}
test();
