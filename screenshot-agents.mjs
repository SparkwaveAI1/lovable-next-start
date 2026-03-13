import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

await mkdir('/tmp/screenshots', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

console.log('Navigating to agents page...');
await page.goto('https://sparkwaveai.app/agents', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

const title = await page.title();
console.log('Page title:', title);

const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent || 'not found');
console.log('H1:', h1);

const h3s = await page.evaluate(() => Array.from(document.querySelectorAll('h3')).map(e => e.textContent));
console.log('H3 elements:', JSON.stringify(h3s));

const errorEls = await page.evaluate(() => Array.from(document.querySelectorAll('[class*=red-50]')).map(e => e.textContent?.trim()));
console.log('Error elements:', JSON.stringify(errorEls));

const pulseEls = await page.evaluate(() => Array.from(document.querySelectorAll('[class*=animate-pulse]')).length);
console.log('Loading skeletons:', pulseEls);

const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
console.log('Body text sample:', bodyText);

await page.screenshot({ path: '/tmp/screenshots/agents.png', fullPage: true });
console.log('Screenshot saved');

await browser.close();
