import { expect, test } from '@playwright/test'

import { getEditor, setEditorContent } from './helpers'

// A note typed into the editor survives a reload through IndexedDB.
test('what is typed into a note is still there after a reload', async ({ page }) => {
  const slug = `indexed-db-test-${Date.now()}`
  await page.goto(`/q/${slug}`)
  const editor = await getEditor(page)
  // The persistence layer replaces the document shortly after mount and
  // resets the selection, so the words go in through the editor API.
  await setEditorContent(editor, '<p>does this save</p>')
  await expect(editor).toContainText('does this save')

  // The reload must not race the write; wait until the persisted copy reads back.
  await expect.poll(async () => {
    await page.reload()
    return (await getEditor(page)).textContent()
  }, { timeout: 30_000 }).toContain('does this save')
})
