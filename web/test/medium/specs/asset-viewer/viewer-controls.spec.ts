import { Route } from '#lib/route.ts';
import { factory } from '#test/common/factories.ts';
import { expect, test } from '#test/medium/fixtures.ts';
import type { Page } from '@playwright/test';

const hiddenClasses = [/-translate-y-full/, /opacity-0/, /pointer-events-none/];

const expectControlsHidden = async (page: Page) => {
  const actions = page.getByTestId('asset-viewer-navbar-actions');
  for (const hiddenClass of hiddenClasses) {
    await expect(actions).toHaveClass(hiddenClass);
  }
  await expect(actions).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByTestId('asset-viewer-navbar-backdrop')).toHaveClass(/opacity-0/);
  // the close action always stays reachable
  await expect(page.getByLabel('go_back', { exact: true })).toBeVisible();
};

const expectControlsVisible = async (page: Page) => {
  const actions = page.getByTestId('asset-viewer-navbar-actions');
  await expect(actions).not.toHaveClass(/-translate-y-full/);
  await expect(actions).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByTestId('asset-viewer-navbar-backdrop')).not.toHaveClass(/opacity-0/);
};

test.describe('asset viewer controls', () => {
  test('a single click on the photo toggles the viewer controls', async ({ page, data, app }) => {
    const asset = factory.asset();
    data.addAssets(asset);
    await page.goto(Route.viewAsset({ id: asset.id }));
    await app.viewer.waitForAsset(asset);
    await expectControlsVisible(page);

    await page.getByTestId('photo-viewer').click();
    await expectControlsHidden(page);

    await page.getByTestId('photo-viewer').click();
    await expectControlsVisible(page);
  });

  test('a double click zooms without toggling the viewer controls', async ({ page, data, app }) => {
    const asset = factory.asset();
    data.addAssets(asset);
    await page.goto(Route.viewAsset({ id: asset.id }));
    await app.viewer.waitForAsset(asset);

    await page.getByTestId('photo-viewer').dblclick();
    // wait past the double-click window before asserting nothing toggled
    await page.waitForTimeout(500);
    await expectControlsVisible(page);
  });

  test('dragging the photo does not toggle the viewer controls', async ({ page, data, app }) => {
    const asset = factory.asset();
    data.addAssets(asset);
    await page.goto(Route.viewAsset({ id: asset.id }));
    await app.viewer.waitForAsset(asset);

    const box = (await page.getByTestId('photo-viewer').boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    await expectControlsVisible(page);
  });
});
