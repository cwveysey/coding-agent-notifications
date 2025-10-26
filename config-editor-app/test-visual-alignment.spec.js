import { test, expect } from '@playwright/test';

test('Visual chevron alignment with screenshots', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Navigate to FAQ section
  await page.click('.nav-item[data-view="faq"]');
  await page.waitForTimeout(500);

  // Open all details in FAQ
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
  });

  await page.waitForTimeout(1000);

  // Take full page screenshot
  await page.screenshot({
    path: 'chevron-full-page.png',
    fullPage: true
  });

  // Measure each chevron with actual rendered values
  const measurements = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));

    return headers.map((header, index) => {
      const heading = header.querySelector('h2, h3, h4');
      if (!heading) return { index, error: 'No heading' };

      // Scroll into view
      header.scrollIntoView({ block: 'center' });

      // Get computed styles
      const beforeStyles = window.getComputedStyle(header, '::before');
      const headingStyles = window.getComputedStyle(heading);

      // Get actual rendered positions
      const headerRect = header.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();

      // Parse values
      const fontSize = parseFloat(headingStyles.fontSize);
      const lineHeight = parseFloat(headingStyles.lineHeight);
      const beforeHeight = parseFloat(beforeStyles.height);
      const beforeMarginTop = parseFloat(beforeStyles.marginTop);

      // Calculate approximate text cap-height center
      // Cap height is typically 70% of font-size for most fonts
      const estimatedCapHeight = fontSize * 0.70;
      const textBaseline = headingRect.top + (headingRect.height - fontSize) / 2 + fontSize;
      const textVisualCenter = textBaseline - (fontSize / 2);

      // Calculate chevron visual center
      // The chevron is positioned from baseline with margin-top
      const chevronTop = headingRect.top + (headingRect.height - fontSize) / 2 + beforeMarginTop;
      const chevronCenter = chevronTop + (beforeHeight / 2);

      const diff = Math.abs(chevronCenter - textVisualCenter);

      return {
        index,
        text: heading.textContent.substring(0, 60),
        tagName: heading.tagName,
        fontSize: fontSize,
        lineHeight: lineHeight,
        headingRect: {
          top: Math.round(headingRect.top),
          height: Math.round(headingRect.height),
        },
        beforeHeight: beforeHeight,
        beforeMarginTop: beforeMarginTop,
        textVisualCenter: Math.round(textVisualCenter * 10) / 10,
        chevronCenter: Math.round(chevronCenter * 10) / 10,
        diff: Math.round(diff * 10) / 10,
        aligned: diff <= 2
      };
    });
  });

  console.log('\n=== VISUAL ALIGNMENT MEASUREMENTS ===\n');

  let allAligned = true;

  for (const m of measurements) {
    if (m.error) {
      console.log(`${m.index + 1}. ERROR: ${m.error}\n`);
      allAligned = false;
      continue;
    }

    const status = m.aligned ? '✅' : '❌';
    console.log(`${m.index + 1}. ${status} <${m.tagName}> "${m.text}"`);
    console.log(`   Font: ${m.fontSize}px / Line-height: ${m.lineHeight}px`);
    console.log(`   Chevron: ${m.beforeHeight}px tall, ${m.beforeMarginTop}px margin-top`);
    console.log(`   Text visual center: ${m.textVisualCenter}px`);
    console.log(`   Chevron center: ${m.chevronCenter}px`);
    console.log(`   Diff: ${m.diff}px ${m.aligned ? '✅ GOOD' : '❌ BAD'}\n`);

    if (!m.aligned) allAligned = false;
  }

  // Take individual screenshots of first few chevrons
  for (let i = 0; i < Math.min(3, measurements.length); i++) {
    const header = page.locator('.collapsible-header').nth(i);
    await header.scrollIntoViewIfNeeded();
    await header.screenshot({
      path: `chevron-${i + 1}.png`
    });
  }

  console.log('\n📸 Screenshots saved:');
  console.log('   - chevron-full-page.png');
  for (let i = 0; i < Math.min(3, measurements.length); i++) {
    console.log(`   - chevron-${i + 1}.png`);
  }

  if (allAligned) {
    console.log('\n✅ All chevrons are visually aligned!\n');
  } else {
    console.log('\n❌ Some chevrons are NOT aligned\n');
    throw new Error('Chevron alignment test failed');
  }
});
