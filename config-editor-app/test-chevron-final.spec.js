import { test, expect } from '@playwright/test';

test('Chevron vertical alignment - comprehensive test', async ({ page }) => {
  console.log('\n🔍 Starting comprehensive chevron alignment test...\n');

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Open all details elements
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
  });

  await page.waitForTimeout(1000);

  // Measure each collapsible header individually
  const headers = await page.locator('.collapsible-header').all();

  console.log(`Found ${headers.length} collapsible headers\n`);
  console.log('=== CHEVRON ALIGNMENT TEST RESULTS ===\n');

  let allCentered = true;
  const results = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];

    // Scroll into view
    await header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const result = await header.evaluate((el, index) => {
      // Find heading (h2, h3, or h4)
      const heading = el.querySelector('h2, h3, h4');
      if (!heading) return { error: 'No heading found', index };

      const headerRect = el.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const beforeStyles = window.getComputedStyle(el, '::before');
      const headingStyles = window.getComputedStyle(heading);

      // Calculate centers
      const headerCenterY = headerRect.top + (headerRect.height / 2);
      const headingCenterY = headingRect.top + (headingRect.height / 2);
      const diff = Math.abs(headerCenterY - headingCenterY);

      return {
        index,
        text: heading.textContent?.trim().substring(0, 60),
        tagName: heading.tagName,
        header: {
          top: Math.round(headerRect.top * 100) / 100,
          height: Math.round(headerRect.height * 100) / 100,
          centerY: Math.round(headerCenterY * 100) / 100
        },
        heading: {
          top: Math.round(headingRect.top * 100) / 100,
          height: Math.round(headingRect.height * 100) / 100,
          centerY: Math.round(headingCenterY * 100) / 100,
          fontSize: headingStyles.fontSize,
          lineHeight: headingStyles.lineHeight
        },
        chevron: {
          height: beforeStyles.height,
          backgroundPosition: beforeStyles.backgroundPosition
        },
        diff: Math.round(diff * 100) / 100,
        centered: diff <= 2
      };
    }, i);

    results.push(result);

    if (result.error) {
      console.log(`${i + 1}. ❌ ERROR: ${result.error}`);
      allCentered = false;
    } else {
      const status = result.centered ? '✅' : '❌';
      const truncatedText = result.text.length > 50 ? result.text.substring(0, 50) + '...' : result.text;

      console.log(`${i + 1}. ${status} <${result.tagName}> "${truncatedText}"`);
      console.log(`   Alignment: ${result.diff}px diff (Header: ${result.header.centerY}px, Heading: ${result.heading.centerY}px)`);
      console.log(`   Heading: ${result.heading.fontSize} font, ${result.heading.lineHeight} line-height, ${result.heading.height}px tall`);
      console.log(`   Chevron: ${result.chevron.height} tall, bg-pos: ${result.chevron.backgroundPosition}`);

      if (!result.centered) {
        console.log(`   ⚠️  NOT CENTERED - difference is ${result.diff}px`);
        allCentered = false;
      }

      console.log('');

      // Assert alignment
      expect(result.diff).toBeLessThanOrEqual(2);
    }
  }

  console.log('\n=== SUMMARY ===\n');

  if (allCentered) {
    console.log('🎉 ALL CHEVRONS ARE VERTICALLY CENTERED!\n');
    console.log(`✅ All ${results.length} chevrons passed alignment test (≤2px tolerance)\n`);
  } else {
    const failed = results.filter(r => r.error || !r.centered);
    console.log(`❌ ${failed.length} chevron(s) failed alignment test\n`);
    throw new Error(`Chevron alignment test failed for ${failed.length} element(s)`);
  }
});
