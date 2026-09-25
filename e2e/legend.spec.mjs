/**
 * Layout checks the unit suite cannot make.
 *
 * jsdom has no layout engine: it reports zero for every box and never computes
 * a grid. The legend bugs this file guards against were all geometric -- a
 * handle floating away from the bottom edge, a panel wider than the screen,
 * labels clipped at narrow widths -- so they can only be caught in a real
 * browser.
 *
 *   npm run test:e2e                     starts a preview server for the run
 *   E2E_BASE_URL=... npm run test:e2e    reuses a server already running
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173/hss-hawking-interactive/';
const MOBILE_BREAKPOINT = 768;
const MIN_TOUCH_TARGET = 44;
// Browsers report fractional box coordinates, so edge comparisons need slack.
const EDGE_TOLERANCE = 1;
const CATEGORY_COUNT = 11;

const VIEWPORTS = [
  [320, 568],   // narrowest phone still in use
  [375, 667],
  [390, 844],
  [430, 932],
  [667, 375],   // landscape
  [768, 1024],  // the md: boundary, where the layout switches
  [1440, 900],
];

// Bundled Chromium by default, because that is what CI has. Point at the
// installed browser locally with E2E_CHROME_CHANNEL=chrome.
const channel = process.env.E2E_CHROME_CHANNEL;
/**
 * True when the element takes up no room on screen, however it is hidden.
 *
 * Playwright's boundingBox() reports {x, y, width, height} and returns null for
 * an element with no box at all, so a panel removed with `display` and one
 * pushed away with `transform` both satisfy this. Asserting the effect rather
 * than the mechanism keeps the test useful if the hiding technique changes.
 */
function offViewport(box, viewportHeight) {
  if (box === null) return true;
  return box.y >= viewportHeight - EDGE_TOLERANCE || box.y + box.height <= EDGE_TOLERANCE;
}

const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
const page = await browser.newPage();
let failures = 0;

for (const [width, height] of VIEWPORTS) {
  try {
    await page.setViewportSize({ width, height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const handle = page.getByRole('button', { name: 'Legend', exact: true });
    const panel = page.locator('#legend-panel');
    const mobile = width < MOBILE_BREAKPOINT;

    if (mobile) {
      // Assert the effect, not the mechanism: a panel can be kept off-screen
      // by display, by transform or by clipping, and this check should survive
      // a future fix that picks a different one.
      assert.ok(offViewport(await panel.boundingBox(), height),
        'collapsed panel occupies no space inside the viewport');
      const box = await handle.boundingBox();
      assert.equal(
        Math.round(box.y + box.height), height,
        'collapsed handle sits on the bottom edge',
      );
      await handle.click();
    }
    await panel.waitFor({ state: 'visible' });

    const geometry = await panel.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const list = el.querySelector('ul');
      return {
        client: el.clientWidth,
        scroll: el.scrollWidth,
        left: rect.left,
        right: rect.right,
        columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
      };
    });
    assert.ok(geometry.left >= 0 && geometry.right <= width, 'panel stays inside the viewport');
    assert.ok(geometry.scroll <= geometry.client, 'panel does not scroll horizontally');
    assert.equal(geometry.columns, mobile ? 2 : 4, 'column count matches the breakpoint');

    // Labels must fit rather than be cut: clipping was the reported symptom,
    // so a fix that hides the overflow would pass every other check here.
    const clipped = await panel.evaluate((el) =>
      [...el.querySelectorAll('li span')]
        .filter((s) => s.scrollWidth > s.clientWidth + 1)
        .map((s) => s.textContent.trim()),
    );
    assert.deepEqual(clipped, [], `labels fit without clipping (${clipped.join(', ')})`);

    for (const button of await panel.getByRole('button').all()) {
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width, 'button stays inside the viewport');
      if (mobile) {
        assert.ok(box.height >= MIN_TOUCH_TARGET, `touch target is at least ${MIN_TOUCH_TARGET}px`);
      }
    }

    await panel.getByRole('button', { name: 'None', exact: true }).click();
    assert.equal(await panel.locator('[aria-pressed="true"]').count(), 0, 'None clears every filter');
    await panel.getByRole('button', { name: 'All', exact: true }).click();
    assert.equal(
      await panel.locator('[aria-pressed="true"]').count(), CATEGORY_COUNT,
      'All restores every filter',
    );

    if (mobile) {
      await handle.click();
      assert.ok(offViewport(await panel.boundingBox(), height), 'panel collapses again');
    }
    console.log(`  ok   ${width}x${height}`);
  } catch (error) {
    failures += 1;
    console.error(`  FAIL ${width}x${height}: ${error.message}`);
  }
}

await browser.close();
if (failures) {
  console.error(`\n${failures} of ${VIEWPORTS.length} viewports failed`);
  process.exit(1);
}
console.log(`\nall ${VIEWPORTS.length} viewports passed`);
