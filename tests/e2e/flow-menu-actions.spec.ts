import { expect, test } from '@playwright/test'

// Every action in the group flow menu must show a readable label, including
// the ones that only appear once the list scrolls.
test('renders a visible text label for every action option while scrolling', async ({ page }) => {
  await page.goto('/cypress-flow-menu')
  await expect(page.getByText('Group Flow Menu Harness')).toBeVisible()

  const grip = page.locator('[data-node-overlay="true"][data-node-type="group"] .node-overlay-grip-handle').first()
  await grip.dispatchEvent('mousedown', { button: 0 })

  const actions = page.getByTestId('node-actions')
  await expect(actions).toBeVisible()
  const options = actions.locator('[data-flow-switch-option]')
  await expect.poll(() => options.count()).toBeGreaterThan(5)

  const names = await options.evaluateAll(elements => elements.map(element => element.getAttribute('data-flow-switch-option') ?? ''))
  for (const name of names) {
    const option = actions.locator(`[data-flow-switch-option="${name}"]`)
    await option.scrollIntoViewIfNeeded()
    await expect(option, `label for ${name}`).not.toHaveText('')
    // Scrolling animates; the overlap with the list is read until it is positive.
    await expect.poll(() => option.evaluate((element, containerSelector) => {
      const containerRect = (document.querySelector(containerSelector) as HTMLElement).getBoundingClientRect()
      const rect = element.getBoundingClientRect()
      return Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top)
    }, '[data-testid="node-actions"]'), { message: `visible height for ${name}` }).toBeGreaterThan(0)
  }

  await expect(actions.locator('[data-flow-switch-option="Insert 2 columns"]')).toContainText('Insert 2 columns')
  await expect(actions.locator('[data-flow-switch-option="Insert 3 columns"]')).toContainText('Insert 3 columns')
})
