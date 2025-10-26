import { test } from '@playwright/test';

test('Verify X-height alignment', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.click('.nav-item[data-view="faq"]');
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
  });

  await page.waitForTimeout(1000);

  const results = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));

    return headers.map((header, index) => {
      const heading = header.querySelector('h2, h3, h4');
      if (!heading) return null;

      header.scrollIntoView({ block: 'center' });

      const headingRect = heading.getBoundingClientRect();
      const styles = window.getComputedStyle(heading);
      const fontSize = parseFloat(styles.fontSize);
      const lineHeight = parseFloat(styles.lineHeight);

      const beforeStyles = window.getComputedStyle(header, '::before');
      const chevronHeight = parseFloat(beforeStyles.height);
      const chevronMarginTop = parseFloat(beforeStyles.marginTop);

      // Calculate baseline
      const textTopPadding = (headingRect.height - lineHeight) / 2;
      const baselineY = headingRect.top + textTopPadding + lineHeight * 0.8;

      // X-height center
      const xHeight = fontSize * 0.5;
      const xHeightCenter = baselineY - (xHeight / 2);

      // Chevron center
      const chevronCenterY = baselineY - chevronMarginTop - (chevronHeight / 2);

      const diff = Math.abs(chevronCenterY - xHeightCenter);

      return {
        index: index + 1,
        tagName: heading.tagName,
        text: heading.textContent.substring(0, 50),
        fontSize,
        chevronMarginTop,
        xHeightCenter: Math.round(xHeightCenter * 10) / 10,
        chevronCenterY: Math.round(chevronCenterY * 10) / 10,
        diff: Math.round(diff * 10) / 10,
        aligned: diff <= 0.5
      };
    }).filter(r => r !== null);
  });

  console.log('\n=== X-HEIGHT ALIGNMENT VERIFICATION ===\n');

  let allAligned = true;

  results.forEach(r => {
    const status = r.aligned ? '✅' : '❌';
    console.log(`${r.index}. ${status} <${r.tagName}> "${r.text}"`);
    console.log(`   Margin-top: ${r.chevronMarginTop}px`);
    console.log(`   X-height center: ${r.xHeightCenter}px`);
    console.log(`   Chevron center: ${r.chevronCenterY}px`);
    console.log(`   Diff: ${r.diff}px ${r.aligned ? '✅' : '❌'}\n`);

    if (!r.aligned) allAligned = false;
  });

  if (allAligned) {
    console.log('✅ All chevrons aligned with X-height center!\n');
  } else {
    console.log('❌ Some chevrons not aligned with X-height center\n');
  }
});
