import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = process.env.JBIS_QA_URL || 'http://localhost:3000';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || chromium.executablePath();
const artifactDirectory = join(tmpdir(), 'jbis-browser-qa');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

if (!existsSync(executablePath)) {
  throw new Error(`Chromium was not found at ${executablePath}. Set PLAYWRIGHT_CHROMIUM_PATH to an installed Chromium executable.`);
}

await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });

async function checkRouteSet(name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const brokenLocalResponses = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400 && !response.url().endsWith('/missing-route')) brokenLocalResponses.push(`${response.status()} ${response.url()}`);
  });

  for (const path of ['/', '/services', '/about', '/contact', '/privacy', '/missing-route']) {
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    check(response?.status() === (path === '/missing-route' ? 404 : 200), `${name} ${path} returned ${response?.status()}`);
    check((await page.title()).includes('JBIS') || path === '/missing-route', `${name} ${path} has an unexpected title`);
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    check(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${name} ${path} has horizontal overflow (${dimensions.scrollWidth}/${dimensions.clientWidth})`);
    if (path === '/about') {
      await page.locator('.about-landscape').scrollIntoViewIfNeeded();
      const photos = await page.locator('.landscape-grid img').evaluateAll(async (images) => {
        await Promise.all(images.map((image) => image.decode()));
        return images.map((image) => ({ loaded: image.complete && image.naturalWidth > 0, alt: image.alt, source: image.currentSrc }));
      });
      check(photos.length === 3 && photos.every((photo) => photo.loaded && photo.alt && photo.source.includes('/landscapes/')), `${name} About landscape photos are missing or broken`);
      check(await page.locator('.landscape-credits a').count() === 4, `${name} About photo sources or license links are missing`);
      await page.screenshot({ path: join(artifactDirectory, `${name}-about-landscapes.png`), fullPage: true });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const clipped = await page.locator('.about-story').evaluate((section) => [...section.querySelectorAll('p, h2, figure, img')].some((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1;
      }));
      check(!clipped, `${name} About photographs or text are clipped at 200% text size`);
      await page.locator('.about-landscape').scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(artifactDirectory, `${name}-about-200-text.png`), fullPage: true });
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
  }

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  const desktopNavVisible = await page.locator('.desktop-nav').isVisible();
  const mobileNavVisible = await page.locator('.mobile-nav').isVisible();
  check(name === 'desktop' ? desktopNavVisible && !mobileNavVisible : !desktopNavVisible && mobileNavVisible, `${name} header navigation is not in the expected responsive state`);
  await page.screenshot({ path: join(artifactDirectory, `${name}-home.png`), fullPage: true });

  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    return element ? { className: element.className, outlineStyle: getComputedStyle(element).outlineStyle } : null;
  });
  check(Boolean(focus?.className?.includes('skip-link')), `${name} keyboard traversal does not begin with the skip link`);
  check(focus?.outlineStyle !== 'none', `${name} focused element does not expose an outline`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const transitionDuration = await page.locator('.button').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  check(transitionDuration.includes('0.00001s') || transitionDuration.includes('1e-05s') || transitionDuration.includes('0s'), `${name} reduced-motion style was not applied (${transitionDuration})`);

  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const zoomDimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  check(zoomDimensions.scrollWidth <= zoomDimensions.clientWidth + 1, `${name} layout overflows at 200% text size (${zoomDimensions.scrollWidth}/${zoomDimensions.clientWidth})`);
  const zoomOffenders = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== 'none' && (rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1);
    })
    .slice(0, 6)
    .map((element) => element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70)));
  check(zoomOffenders.length === 0, `${name} text is clipped at 200%: ${zoomOffenders.join(' | ')}`);

  await page.screenshot({ path: join(artifactDirectory, `${name}-home-200-text.png`), fullPage: true });
  check(pageErrors.length === 0, `${name} raised page errors: ${pageErrors.join('; ')}`);
  check(brokenLocalResponses.length === 0, `${name} had broken local responses: ${brokenLocalResponses.join('; ')}`);
  await context.close();
}

await checkRouteSet('desktop', { width: 1440, height: 900 });
await checkRouteSet('mobile', { width: 390, height: 844 });

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  let apiMode = 'failure';
  await page.route('**/api/contact', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (apiMode === 'success') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    } else {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Your inquiry could not be delivered. Please try again.' }) });
    }
  });

  await page.goto(`${baseUrl}/contact`, { waitUntil: 'domcontentloaded' });
  await page.locator('.turnstile-host iframe').waitFor({ state: 'attached', timeout: 3_000 }).catch(() => undefined);
  const turnstileWiring = await page.evaluate(() => ({
    iframeCount: document.querySelectorAll('.turnstile-host iframe').length,
    siteKey: document.querySelector('.turnstile-host')?.getAttribute('data-sitekey'),
    scriptPresent: Boolean(document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]')),
  }));
  check(turnstileWiring.iframeCount === 1 || (turnstileWiring.siteKey === '1x00000000000000000000AA' && turnstileWiring.scriptPresent), 'Turnstile widget wiring is missing or invalid');

  await page.locator('#project-inquiry').evaluate((form) => form.requestSubmit());
  check(await page.locator('#name').evaluate((element) => element.matches(':invalid')), 'Empty required fields did not trigger browser validation');

  await page.locator('#name').fill('Preview Tester');
  await page.locator('#email').fill('preview@example.com');
  await page.locator('#organization').fill('Preview Organization');
  await page.locator('#projectType').selectOption('Website');
  await page.locator('#timeline').selectOption('Exploring');
  await page.locator('#budget').selectOption('Not sure yet');
  await page.locator('#projectSummary').fill('This is a controlled browser test of the project inquiry states.');

  await page.locator('#project-inquiry').evaluate((form) => form.requestSubmit());
  check(await page.getByRole('button', { name: 'Sending…' }).isDisabled(), 'The submit button was not disabled while the request was pending');
  await page.getByText('Your inquiry could not be delivered. Please try again.').waitFor();
  check(await page.locator('#name').inputValue() === 'Preview Tester', 'Form values were not retained after a recoverable failure');

  apiMode = 'success';
  await page.locator('#project-inquiry').evaluate((form) => form.requestSubmit());
  await page.getByText('Your inquiry was sent. Thank you for sharing what you’re building.').waitFor();
  check(await page.locator('#name').inputValue() === '', 'Form values were not cleared after success');
  await page.screenshot({ path: join(artifactDirectory, 'mobile-contact-success.png'), fullPage: true });
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Browser QA passed. Screenshots: ${artifactDirectory}`);
}
