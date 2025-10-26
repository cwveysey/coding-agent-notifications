import { test } from '@playwright/test';

test('Calculate margin-top for X-height alignment', async ({ page }) => {
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

    return headers.slice(0, 3).map((header, index) => {
      const heading = header.querySelector('h2, h3, h4');
      if (!heading) return null;

      header.scrollIntoView({ block: 'center' });

      const headingRect = heading.getBoundingClientRect();
      const styles = window.getComputedStyle(heading);
      const fontSize = parseFloat(styles.fontSize);
      const lineHeight = parseFloat(styles.lineHeight);

      const beforeStyles = window.getComputedStyle(header, '::before');
      const chevronHeight = parseFloat(beforeStyles.height);

      // Calculate baseline position
      const textTopPadding = (headingRect.height - lineHeight) / 2;
      const baselineY = headingRect.top + textTopPadding + lineHeight * 0.8;

      // X-height is typically 50% of font-size
      const xHeight = fontSize * 0.5;
      const xHeightCenter = baselineY - (xHeight / 2);

      // We want: chevronCenterY = xHeightCenter
      // chevronCenterY = baselineY - marginTop - (chevronHeight / 2)
      // So: baselineY - marginTop - (chevronHeight / 2) = baselineY - (xHeight / 2)
      // -marginTop - (chevronHeight / 2) = -(xHeight / 2)
      // -marginTop = -(xHeight / 2) + (chevronHeight / 2)
      // marginTop = (xHeight / 2) - (chevronHeight / 2)
      // marginTop = (xHeight - chevronHeight) / 2

      const calculatedMarginTop = (xHeight - chevronHeight) / 2;

      return {
        tagName: heading.tagName,
        fontSize,
        xHeight,
        chevronHeight,
        calculatedMarginTop: Math.round(calculatedMarginTop * 10) / 10
      };
    }).filter(r => r !== null);
  });

  console.log('\n=== MARGIN-TOP VALUES FOR X-HEIGHT ALIGNMENT ===\n');

  results.forEach((r, i) => {
    console.log(`${i + 1}. <${r.tagName}>`);
    console.log(`   Font size: ${r.fontSize}px`);
    console.log(`   X-height: ${r.xHeight}px`);
    console.log(`   Chevron height: ${r.chevronHeight}px`);
    console.log(`   Required margin-top: ${r.calculatedMarginTop}px\n`);
  });

  // Group by tag
  const h2Values = results.filter(r => r.tagName === 'H2');
  const h3h4Values = results.filter(r => r.tagName !== 'H2');

  if (h2Values.length > 0) {
    const h2MarginTop = Math.round(h2Values[0].calculatedMarginTop);
    console.log(`\n✅ For H2: margin-top: ${h2MarginTop}px`);
  }

  if (h3h4Values.length > 0) {
    const h3h4MarginTop = Math.round(h3h4Values[0].calculatedMarginTop);
    console.log(`✅ For H3/H4: margin-top: ${h3h4MarginTop}px\n`);
  }
});
