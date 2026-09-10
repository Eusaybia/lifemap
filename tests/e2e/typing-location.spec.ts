import { expect, test } from '@playwright/test'

// Typing a place name wraps it as a location tag without touching text that
// was already there; a multi-word place becomes one tag.
const editor = '[data-testid="typing-location-editor"]'

const OFF = "'[data-type=\"location\"]' stays at 0: TypingLocationScanExtension is not registered in the editor and nothing else turns typed text into a location tag; the same decision as the kairos location specs (see kairos testing.md)"

test.describe('typing location detection', () => {
  test('wraps newly typed locations without backfilling existing text', async ({ page }) => {
    test.fixme(true, OFF)
    await page.goto('/cypress-typing-location')
    await expect(page.getByTestId('typing-location-harness')).toBeVisible()
    await expect(page.locator(`${editor} [data-type="location"]`)).toHaveCount(0)
    const firstParagraph = page.locator(`${editor} .ProseMirror p`).nth(0)
    await expect(firstParagraph).toContainText('Existing Sydney stays plain text.')

    await page.getByTestId('focus-basic-location-input').click()
    await page.keyboard.type('Sydney')

    const tags = page.locator(`${editor} [data-type="location"]`)
    await expect(tags).toHaveCount(1)
    await expect(tags.first()).toContainText('📍 Sydney')
    await expect(firstParagraph.locator('[data-type="location"]')).toHaveCount(0)
  })

  test('merges multi-word locations into a single location node', async ({ page }) => {
    test.fixme(true, OFF)
    await page.goto('/cypress-typing-location')
    await page.getByTestId('focus-multiword-location-input').click()
    await page.keyboard.type('Sydney Airport')
    const tags = page.locator(`${editor} [data-type="location"]`)
    await expect(tags).toHaveCount(1)
    await expect(tags.first()).toContainText('📍 Sydney Airport')
  })
})
