import type { Locator, Page } from '@playwright/test'

/** The first Tiptap editor inside `root` (the page by default), once mounted. */
export async function getEditor(root: Page | Locator): Promise<Locator> {
  const editor = root.locator('.ProseMirror').first()
  await editor.waitFor()
  return editor
}

/** Replace the editor's content through the editor API rather than keystrokes. */
export async function setEditorContent(editor: Locator, content: string) {
  await editor.evaluate((el: any, html: string) => el.editor.commands.setContent(html), content)
}

/** Put the caret at the end of the document through the editor API. */
export async function focusEditorEnd(editor: Locator) {
  await editor.click()
  await editor.evaluate((el: any) => el.editor.commands.focus('end'))
}
