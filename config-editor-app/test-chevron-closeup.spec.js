import { test } from '@playwright/test';

test('Close-up screenshots of chevrons', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.click('.nav-item[data-view="faq"]');
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
  });

  await page.waitForTimeout(1000);

  // Get all headers
  const headers = await page.locator('.collapsible-header').all();

  for (let i = 0; i < Math.min(5, headers.length); i++) {
    const header = headers[i];

    // Scroll into view
    await header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Get text for filename
    const text = await header.locator('h2, h3, h4').textContent();
    const shortText = text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');

    // Take close-up screenshot
    await header.screenshot({
      path: `chevron-closeup-${i + 1}-${shortText}.png`
    });

    console.log(`Screenshot ${i + 1}: ${text.substring(0, 50)}`);
  }

  console.log('\n✅ Screenshots saved. Please check them visually.\n');
});
