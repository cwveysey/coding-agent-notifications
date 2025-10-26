import { test, expect } from '@playwright/test';

test('Chevron vertical alignment - direct measurement', async ({ page }) => {
  console.log('\n🔍 Testing chevron vertical alignment...\n');

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Open all details and scroll to bring into viewport
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
    // Scroll to FAQ section
    const faq = document.querySelector('.collapsible-section');
    if (faq) faq.scrollIntoView();
  });

  await page.waitForTimeout(1000);

  // Measure all collapsible headers in one go
  const results = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));

    return headers.map((el, index) => {
      // Find heading (h2, h3, or h4)
      const heading = el.querySelector('h2, h3, h4');
      if (!heading) return { error: 'No heading found', index };

      // Force visibility by scrolling
      el.scrollIntoView({ block: 'nearest' });

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
    });
  });

  console.log('=== CHEVRON ALIGNMENT RESULTS ===\n');

  let allCentered = true;

  results.forEach((result, i) => {
    if (result.error) {
      console.log(`${i + 1}. ❌ ERROR: ${result.error}`);
      allCentered = false;
    } else {
      const status = result.centered ? '✅' : '❌';
      const truncatedText = result.text.length > 50 ? result.text.substring(0, 50) + '...' : result.text;

      console.log(`${i + 1}. ${status} <${result.tagName}> "${truncatedText}"`);
      console.log(`   Diff: ${result.diff}px (Header: ${result.header.centerY}px, Heading: ${result.heading.centerY}px)`);
      console.log(`   Size: ${result.heading.fontSize} font, ${result.heading.lineHeight} line-height, ${result.heading.height}px tall`);
      console.log(`   Chevron: ${result.chevron.height} tall, position: ${result.chevron.backgroundPosition}`);

      if (!result.centered) {
        console.log(`   ⚠️  MISALIGNED by ${result.diff}px`);
        allCentered = false;
      }

      console.log('');

      // Assert
      expect(result.diff, `Chevron ${i + 1} should be centered (current diff: ${result.diff}px)`).toBeLessThanOrEqual(2);
    }
  });

  console.log('=== SUMMARY ===\n');

  if (allCentered) {
    console.log(`🎉 SUCCESS: All ${results.length} chevrons are vertically centered!\n`);
    console.log(`✅ All chevrons passed with ≤2px tolerance\n`);
  } else {
    const failed = results.filter(r => r.error || !r.centered);
    throw new Error(`❌ ${failed.length} chevron(s) failed alignment test`);
  }
});
