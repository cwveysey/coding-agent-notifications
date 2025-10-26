import { test, expect } from '@playwright/test';

test('Visual chevron alignment with measurement overlays', async ({ page }) => {
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

  // Add visual measurement guides
  const measurements = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));
    const results = [];

    // Create a container for our guide lines
    const guideContainer = document.createElement('div');
    guideContainer.id = 'measurement-guides';
    guideContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10000;';
    document.body.appendChild(guideContainer);

    headers.forEach((header, index) => {
      const heading = header.querySelector('h2, h3, h4');
      if (!heading) return;

      // Scroll into view
      header.scrollIntoView({ block: 'center' });

      // Get positions
      const headerRect = header.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const styles = window.getComputedStyle(heading);
      const fontSize = parseFloat(styles.fontSize);

      // Calculate text baseline and cap-height center
      // The text sits within the heading element. The baseline is approximately:
      const lineHeight = parseFloat(styles.lineHeight);
      const textTopPadding = (headingRect.height - lineHeight) / 2;

      // Baseline is at the bottom of the first line
      const baselineY = headingRect.top + textTopPadding + lineHeight * 0.8; // Approximation

      // Cap-height is typically 70% of font-size
      const capHeight = fontSize * 0.7;
      const capHeightCenter = baselineY - (capHeight / 2);

      // Calculate chevron center
      // The chevron is a ::before pseudo-element in the header
      const beforeStyles = window.getComputedStyle(header, '::before');
      const chevronHeight = parseFloat(beforeStyles.height);
      const chevronMarginTop = parseFloat(beforeStyles.marginTop);

      // With align-self: baseline, the chevron aligns to the text baseline
      // Then margin-top offsets it upward
      const chevronBottomFromBaseline = chevronMarginTop;
      const chevronCenterFromBaseline = chevronBottomFromBaseline + (chevronHeight / 2);
      const chevronCenterY = baselineY - chevronCenterFromBaseline;

      const diff = Math.abs(chevronCenterY - capHeightCenter);

      // Draw guide lines
      // Red line: text cap-height center
      const textLine = document.createElement('div');
      textLine.style.cssText = `
        position: absolute;
        left: 0;
        top: ${capHeightCenter + window.scrollY}px;
        width: 100%;
        height: 2px;
        background: rgba(255, 0, 0, 0.5);
      `;
      guideContainer.appendChild(textLine);

      // Blue line: chevron center
      const chevronLine = document.createElement('div');
      chevronLine.style.cssText = `
        position: absolute;
        left: 0;
        top: ${chevronCenterY + window.scrollY}px;
        width: 100%;
        height: 2px;
        background: rgba(0, 0, 255, 0.5);
      `;
      guideContainer.appendChild(chevronLine);

      // Label
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        left: 50%;
        top: ${headingRect.top + window.scrollY - 20}px;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.9);
        padding: 4px 8px;
        border: 1px solid #000;
        font-size: 11px;
        font-family: monospace;
        white-space: nowrap;
      `;
      label.textContent = `#${index + 1}: Diff ${diff.toFixed(1)}px (Red=Text, Blue=Chevron)`;
      guideContainer.appendChild(label);

      results.push({
        index: index + 1,
        text: heading.textContent.substring(0, 60),
        tagName: heading.tagName,
        fontSize,
        lineHeight,
        capHeight,
        chevronHeight,
        chevronMarginTop,
        baselineY: Math.round(baselineY * 10) / 10,
        capHeightCenter: Math.round(capHeightCenter * 10) / 10,
        chevronCenterY: Math.round(chevronCenterY * 10) / 10,
        diff: Math.round(diff * 10) / 10,
        aligned: diff <= 1
      });
    });

    return results;
  });

  console.log('\n=== VISUAL ALIGNMENT MEASUREMENTS (with overlays) ===\n');

  let allAligned = true;

  for (const m of measurements) {
    const status = m.aligned ? '✅' : '❌';
    console.log(`${m.index}. ${status} <${m.tagName}> "${m.text}"`);
    console.log(`   Font: ${m.fontSize}px / Line-height: ${m.lineHeight}px`);
    console.log(`   Cap-height: ${m.capHeight}px / Cap-height center: ${m.capHeightCenter}px`);
    console.log(`   Chevron: ${m.chevronHeight}px tall, ${m.chevronMarginTop}px margin-top`);
    console.log(`   Baseline Y: ${m.baselineY}px`);
    console.log(`   Text cap-height center: ${m.capHeightCenter}px (RED line)`);
    console.log(`   Chevron center: ${m.chevronCenterY}px (BLUE line)`);
    console.log(`   Diff: ${m.diff}px ${m.aligned ? '✅ ALIGNED' : '❌ NOT ALIGNED'}\\n`);

    if (!m.aligned) allAligned = false;
  }

  // Take screenshot with guide lines
  await page.screenshot({
    path: 'chevron-visual-guide.png',
    fullPage: true
  });

  console.log('📸 Screenshot saved: chevron-visual-guide.png');
  console.log('   Red lines = text cap-height centers');
  console.log('   Blue lines = chevron centers');
  console.log('   They should overlap for perfect alignment\n');

  if (!allAligned) {
    console.log('❌ Chevrons are NOT properly aligned\n');
  } else {
    console.log('✅ All chevrons are aligned within 1px tolerance\n');
  }
});
