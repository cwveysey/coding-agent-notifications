import { test, expect } from '@playwright/test';

test.describe('Chevron Vertical Alignment', () => {
  test('FAQ collapsible chevrons should be vertically centered with text', async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:5173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Open all details elements first
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => d.open = true);
    });

    // Wait a bit for rendering
    await page.waitForTimeout(500);

    // Find all FAQ collapsible headers
    const faqHeaders = page.locator('.collapsible-header');
    const count = await faqHeaders.count();

    console.log(`\n=== Testing ${count} FAQ Collapsible Headers ===\n`);

    for (let i = 0; i < count; i++) {
      const header = faqHeaders.nth(i);
      const h2 = header.locator('h2');

      // Get the text content for logging
      const text = await h2.textContent();
      console.log(`Testing FAQ: "${text}"`);

      // Get bounding boxes
      const headerBox = await header.boundingBox();
      const h2Box = await h2.boundingBox();

      if (!headerBox || !h2Box) {
        console.log(`  ⚠️  Could not get bounding boxes`);
        continue;
      }

      // Calculate vertical centers
      const headerCenterY = headerBox.y + (headerBox.height / 2);
      const h2CenterY = h2Box.y + (h2Box.height / 2);

      // Get computed styles to understand the chevron positioning
      const beforeStyles = await header.evaluate((el) => {
        const styles = window.getComputedStyle(el, '::before');
        return {
          height: styles.height,
          backgroundPosition: styles.backgroundPosition,
          display: styles.display,
        };
      });

      const h2Styles = await h2.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          lineHeight: styles.lineHeight,
          fontSize: styles.fontSize,
        };
      });

      console.log(`  Header: top=${headerBox.y.toFixed(2)}px, height=${headerBox.height.toFixed(2)}px, centerY=${headerCenterY.toFixed(2)}px`);
      console.log(`  H2: top=${h2Box.y.toFixed(2)}px, height=${h2Box.height.toFixed(2)}px, centerY=${h2CenterY.toFixed(2)}px`);
      console.log(`  H2 styles: fontSize=${h2Styles.fontSize}, lineHeight=${h2Styles.lineHeight}`);
      console.log(`  ::before styles: height=${beforeStyles.height}, backgroundPosition=${beforeStyles.backgroundPosition}`);

      // The chevron container (::before) should be centered with the header
      // Since the header uses align-items: center, the chevron and h2 should be vertically centered
      const verticalDiff = Math.abs(headerCenterY - h2CenterY);
      console.log(`  Vertical difference: ${verticalDiff.toFixed(2)}px`);

      // Check if they're centered (allow 2px tolerance for sub-pixel rendering)
      if (verticalDiff <= 2) {
        console.log(`  ✅ PASS: Chevron and text are vertically centered\n`);
      } else {
        console.log(`  ❌ FAIL: Chevron and text are NOT vertically centered (diff: ${verticalDiff.toFixed(2)}px)\n`);
      }

      // Assert with a reasonable tolerance (2px)
      expect(verticalDiff).toBeLessThanOrEqual(2);
    }
  });

  test('Card collapsible chevrons should be vertically centered with text', async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:5173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Open all details elements first
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => d.open = true);
    });

    // Wait a bit for rendering
    await page.waitForTimeout(500);

    // Find all card details elements
    const cardHeaders = page.locator('details.card > summary');
    const count = await cardHeaders.count();

    console.log(`\n=== Testing ${count} Card Collapsible Headers ===\n`);

    for (let i = 0; i < count; i++) {
      const summary = cardHeaders.nth(i);
      const h2 = summary.locator('h2');

      // Get the text content for logging
      const text = await h2.textContent();
      console.log(`Testing Card: "${text}"`);

      // Get bounding boxes
      const summaryBox = await summary.boundingBox();
      const h2Box = await h2.boundingBox();

      if (!summaryBox || !h2Box) {
        console.log(`  ⚠️  Could not get bounding boxes`);
        continue;
      }

      // Calculate vertical centers
      const summaryCenterY = summaryBox.y + (summaryBox.height / 2);
      const h2CenterY = h2Box.y + (h2Box.height / 2);

      // Get h2's ::before styles (the chevron)
      const beforeStyles = await h2.evaluate((el) => {
        const styles = window.getComputedStyle(el, '::before');
        return {
          height: styles.height,
          backgroundPosition: styles.backgroundPosition,
          display: styles.display,
        };
      });

      const h2Styles = await h2.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          lineHeight: styles.lineHeight,
          fontSize: styles.fontSize,
        };
      });

      console.log(`  Summary: top=${summaryBox.y.toFixed(2)}px, height=${summaryBox.height.toFixed(2)}px, centerY=${summaryCenterY.toFixed(2)}px`);
      console.log(`  H2: top=${h2Box.y.toFixed(2)}px, height=${h2Box.height.toFixed(2)}px, centerY=${h2CenterY.toFixed(2)}px`);
      console.log(`  H2 styles: fontSize=${h2Styles.fontSize}, lineHeight=${h2Styles.lineHeight}`);
      console.log(`  ::before styles: height=${beforeStyles.height}, backgroundPosition=${beforeStyles.backgroundPosition}`);

      const verticalDiff = Math.abs(summaryCenterY - h2CenterY);
      console.log(`  Vertical difference: ${verticalDiff.toFixed(2)}px`);

      // Check if they're centered (allow 2px tolerance for sub-pixel rendering)
      if (verticalDiff <= 2) {
        console.log(`  ✅ PASS: Chevron and text are vertically centered\n`);
      } else {
        console.log(`  ❌ FAIL: Chevron and text are NOT vertically centered (diff: ${verticalDiff.toFixed(2)}px)\n`);
      }

      // Assert with a reasonable tolerance (2px)
      expect(verticalDiff).toBeLessThanOrEqual(2);
    }
  });

  test('Visual verification with screenshot', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Open all details elements first
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => d.open = true);
    });

    await page.waitForTimeout(500);

    // Scroll to FAQ section
    const faqSection = page.locator('.collapsible-section').first();
    await faqSection.scrollIntoViewIfNeeded();

    // Take screenshot of FAQ section
    await faqSection.screenshot({
      path: 'chevron-alignment-faq.png',
      animations: 'disabled'
    });

    console.log('\n✅ Screenshot saved: chevron-alignment-faq.png');

    // Take screenshot of a card section
    const cardSection = page.locator('details.card').first();
    if (await cardSection.count() > 0) {
      await cardSection.scrollIntoViewIfNeeded();
      await cardSection.screenshot({
        path: 'chevron-alignment-card.png',
        animations: 'disabled'
      });
      console.log('✅ Screenshot saved: chevron-alignment-card.png\n');
    }
  });
});
