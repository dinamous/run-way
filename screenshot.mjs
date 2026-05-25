import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
await page.screenshot({ path: 'screenshot-members.png' });
console.log('done, url:', page.url());
await browser.close();
