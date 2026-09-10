import { expect, test } from '@playwright/test'
import path from 'node:path'

// While an image upload is in flight the editor shows a placeholder; when the
// server answers, the placeholder becomes the image.
test('shows the uploading overlay while the image request is in flight', async ({ page }) => {
  let release: () => void = () => {}
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/upload*', async route => {
    await held
    await route.fulfill({ json: { url: 'https://example.com/cypress-uploaded-image.png' } })
  })

  await page.goto('/cypress-image-upload')
  // "Add image" opens the native file chooser; hand it the fixture.
  const chooser = page.waitForEvent('filechooser')
  await page.getByText('Add image').click()
  await (await chooser).setFiles(path.resolve(__dirname, 'fixtures/upload-image.png'))

  await expect(page.getByText('Uploading image...')).toBeVisible()
  release()
  await expect(page.getByText('Uploading image...')).toHaveCount(0)
  await expect(page.locator('img[src="https://example.com/cypress-uploaded-image.png"]')).toHaveCount(1)
})
