import { test } from '@playwright/test';

test('Measure single-line text and find correct chevron position', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.click('.nav-item[data-view="faq"]');
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => d.open = true);
  });

  await page.waitForTimeout(1000);

  // Add visual guides showing different possible centers
  await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));

    // Find first single-line H3 (should be "What coding agents are supported by this tool?")
    const singleLineHeader = headers.find(h => {
      const heading = h.querySelector('h3');
      if (!heading) return false;
      const rect = heading.getBoundingClientRect();
      // Single line if height is close to line-height
      return rect.height < 30; // Single line
    });

    if (!singleLineHeader) {
      console.log('No single-line header found');
      return;
    }

    singleLineHeader.scrollIntoView({ block: 'center' });

    const heading = singleLineHeader.querySelector('h3');
    const headingRect = heading.getBoundingClientRect();
    const styles = window.getComputedStyle(heading);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight);

    const beforeStyles = window.getComputedStyle(singleLineHeader, '::before');
    const chevronHeight = parseFloat(beforeStyles.height);

    // Current chevron position (with align-items: center, no margin-top)
    // The chevron is centered with the heading element
    const headingCenter = headingRect.top + headingRect.height / 2;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10000;';
    document.body.appendChild(overlay);

    // Draw heading box
    const headingBox = document.createElement('div');
    headingBox.style.cssText = `
      position: absolute;
      left: ${headingRect.left}px;
      top: ${headingRect.top}px;
      width: ${headingRect.width}px;
      height: ${headingRect.height}px;
      border: 2px solid blue;
      opacity: 0.5;
    `;
    overlay.appendChild(headingBox);

    // Current chevron center line (PURPLE)
    const currentLine = document.createElement('div');
    currentLine.style.cssText = `
      position: absolute;
      left: 0;
      top: ${headingCenter}px;
      width: 100%;
      height: 2px;
      background: purple;
    `;
    overlay.appendChild(currentLine);

    // Label
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      left: 50%;
      top: ${headingCenter - 25}px;
      transform: translateX(-50%);
      background: white;
      padding: 4px 8px;
      border: 1px solid purple;
      font-size: 11px;
      font-family: monospace;
      font-weight: bold;
    `;
    label.textContent = 'CURRENT (heading center)';
    overlay.appendChild(label);

    // Console output
    console.log('\n=== SINGLE-LINE TEXT MEASUREMENT ===');
    console.log(`Text: "${heading.textContent.substring(0, 50)}"`);
    console.log(`Font size: ${fontSize}px`);
    console.log(`Line height: ${lineHeight}px`);
    console.log(`Heading height: ${headingRect.height}px`);
    console.log(`Heading center: ${headingCenter}px`);
    console.log(`Chevron height: ${chevronHeight}px`);
    console.log('\nPURPLE line = current chevron position (heading element center)');
    console.log('\nDoes this look centered with the text visually?');
  });

  // Take screenshot
  await page.screenshot({
    path: 'chevron-singleline-measurement.png',
    fullPage: false,
    clip: { x: 200, y: 50, width: 700, height: 200 }
  });

  console.log('\n📸 Screenshot saved: chevron-singleline-measurement.png\n');
});
