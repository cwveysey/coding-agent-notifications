import { test } from '@playwright/test';

test('Diagnostic - Check page structure', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Take full page screenshot
  await page.screenshot({ path: 'page-full.png', fullPage: true });
  console.log('✅ Full page screenshot saved');

  // Get all details elements
  const detailsCount = await page.locator('details').count();
  console.log(`Found ${detailsCount} details elements`);

  // Get all collapsible headers
  const collapsibleHeaders = await page.locator('.collapsible-header').count();
  console.log(`Found ${collapsibleHeaders} .collapsible-header elements`);

  // Get all FAQ sections
  const faqSections = await page.locator('.collapsible-section').count();
  console.log(`Found ${faqSections} .collapsible-section elements`);

  // Print HTML structure of first few elements
  const html = await page.evaluate(() => {
    const faq = document.querySelector('.collapsible-section');
    const card = document.querySelector('details.card');
    return {
      faq: faq ? faq.outerHTML.substring(0, 500) : 'NOT FOUND',
      card: card ? card.outerHTML.substring(0, 500) : 'NOT FOUND'
    };
  });

  console.log('\nFAQ HTML:', html.faq);
  console.log('\nCard HTML:', html.card);

  // Open all details and wait
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => {
      d.open = true;
    });
  });

  await page.waitForTimeout(1000);

  // Take screenshot after opening
  await page.screenshot({ path: 'page-opened.png', fullPage: true });
  console.log('\n✅ Opened page screenshot saved');

  // Scroll to bring elements into viewport and measure
  const measurements = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.collapsible-header'));
    return headers.map((el, index) => {
      // Scroll element into view
      el.scrollIntoView({ block: 'center', behavior: 'instant' });

      const h2 = el.querySelector('h2');
      if (!h2) return { error: 'No H2 found', index };

      // Force a reflow
      el.offsetHeight;

      const headerRect = el.getBoundingClientRect();
      const h2Rect = h2.getBoundingClientRect();
      const beforeStyles = window.getComputedStyle(el, '::before');
      const h2Styles = window.getComputedStyle(h2);

      const headerCenterY = headerRect.top + (headerRect.height / 2);
      const h2CenterY = h2Rect.top + (h2Rect.height / 2);
      const diff = Math.abs(headerCenterY - h2CenterY);

      return {
        index,
        text: h2.textContent,
        header: {
          top: Math.round(headerRect.top * 100) / 100,
          height: Math.round(headerRect.height * 100) / 100,
          centerY: Math.round(headerCenterY * 100) / 100
        },
        h2: {
          top: Math.round(h2Rect.top * 100) / 100,
          height: Math.round(h2Rect.height * 100) / 100,
          centerY: Math.round(h2CenterY * 100) / 100,
          fontSize: h2Styles.fontSize,
          lineHeight: h2Styles.lineHeight
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

  console.log('\n\n=== CHEVRON ALIGNMENT MEASUREMENTS ===\n');

  let allCentered = true;
  measurements.forEach(m => {
    if (m.error) {
      console.log(`${m.index + 1}. ERROR: ${m.error}`);
      allCentered = false;
    } else {
      const status = m.centered ? '✅' : '❌';
      console.log(`${m.index + 1}. ${status} "${m.text}"`);
      console.log(`   Diff: ${m.diff}px (Header center: ${m.header.centerY}px, H2 center: ${m.h2.centerY}px)`);
      console.log(`   H2: ${m.h2.fontSize} font, ${m.h2.lineHeight} line-height, ${m.h2.height}px tall`);
      console.log(`   Chevron ::before: ${m.chevron.height} tall, position: ${m.chevron.backgroundPosition}`);
      console.log('');
      if (!m.centered) allCentered = false;
    }
  });

  if (allCentered) {
    console.log('\n🎉 ALL CHEVRONS ARE VERTICALLY CENTERED!\n');
  } else {
    console.log('\n⚠️  Some chevrons are NOT centered\n');
  }
});
