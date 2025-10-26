import { test, expect } from '@playwright/test';

test('Find optical center of text', async ({ page }) => {
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

  // Show multiple possible center lines to find the optical center
  await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));

    // Create a container for our guide lines
    const guideContainer = document.createElement('div');
    guideContainer.id = 'measurement-guides';
    guideContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10000;';
    document.body.appendChild(guideContainer);

    // Look at first H3 as example
    const header = headers[2]; // "What coding agents are supported by this tool?"
    const heading = header.querySelector('h3');

    header.scrollIntoView({ block: 'center' });

    const headingRect = heading.getBoundingClientRect();
    const styles = window.getComputedStyle(heading);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight);

    // Get chevron info
    const beforeStyles = window.getComputedStyle(header, '::before');
    const chevronHeight = parseFloat(beforeStyles.height);
    const chevronMarginTop = parseFloat(beforeStyles.marginTop);

    // Calculate chevron center relative to viewport
    const headerRect = header.getBoundingClientRect();
    // Chevron is aligned to baseline with margin-top offset
    // With align-self: baseline and margin-top, the chevron bottom is at baseline - margin-top
    // The chevron center is at baseline - margin-top - (chevron-height / 2)

    // Estimate baseline: it's approximately at top + 80% of first line
    const textTopPadding = (headingRect.height - lineHeight) / 2;
    const baselineY = headingRect.top + textTopPadding + lineHeight * 0.8;
    const chevronCenterY = baselineY - chevronMarginTop - (chevronHeight / 2);

    // Draw different possible text centers
    const centers = [
      { name: 'Heading box center', y: headingRect.top + headingRect.height / 2, color: 'blue' },
      { name: 'Font-size center', y: headingRect.top + textTopPadding + fontSize / 2, color: 'green' },
      { name: 'Line-height center', y: headingRect.top + textTopPadding + lineHeight / 2, color: 'purple' },
      { name: 'Cap-height center (70%)', y: baselineY - (fontSize * 0.7 / 2), color: 'red' },
      { name: 'X-height center (50%)', y: baselineY - (fontSize * 0.5 / 2), color: 'orange' },
      { name: 'Chevron center', y: chevronCenterY, color: 'black' }
    ];

    centers.forEach(center => {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        left: 0;
        top: ${center.y + window.scrollY}px;
        width: 100%;
        height: 2px;
        background: ${center.color};
        opacity: 0.7;
      `;
      guideContainer.appendChild(line);

      // Label
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        left: 50%;
        top: ${center.y + window.scrollY}px;
        transform: translate(-50%, -20px);
        background: white;
        padding: 2px 6px;
        border: 1px solid ${center.color};
        font-size: 10px;
        font-family: monospace;
        white-space: nowrap;
        color: ${center.color};
        font-weight: bold;
      `;
      label.textContent = center.name;
      guideContainer.appendChild(label);
    });

    console.log('Centers calculated:');
    centers.forEach(c => {
      console.log(`  ${c.name}: ${Math.round(c.y * 10) / 10}px (${c.color})`);
    });
  });

  // Take screenshot
  await page.screenshot({
    path: 'chevron-optical-centers.png',
    fullPage: false,
    clip: { x: 0, y: 100, width: 800, height: 300 }
  });

  console.log('\n📸 Screenshot saved: chevron-optical-centers.png');
  console.log('Shows different possible "centers" of the text:');
  console.log('  - BLUE: Heading box center');
  console.log('  - GREEN: Font-size center');
  console.log('  - PURPLE: Line-height center');
  console.log('  - RED: Cap-height center (current target)');
  console.log('  - ORANGE: X-height center');
  console.log('  - BLACK: Current chevron position');
  console.log('\nWhich line should the BLACK line overlap with?\n');
});
