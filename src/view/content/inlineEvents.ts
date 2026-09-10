import type { Editor } from '@tiptap/core';
import { Fragment, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';

/** Preserve the rich nodes and their marks; only add event identity to inline content. */
export function markEventContent(doc: ProseMirrorNode, groupId: string): Fragment {
  const event = doc.type.schema.marks.spanGroup.create({ groupId, groupType: 'event' });
  const visit = (node: ProseMirrorNode): ProseMirrorNode => {
    if (node.isInline) return node.mark(event.addToSet(node.marks));
    const children: ProseMirrorNode[] = [];
    node.forEach(child => children.push(visit(child)));
    return node.copy(Fragment.from(children));
  };
  return visit(doc).content;
}

function parseNote(schema: Schema, value: unknown): ProseMirrorNode {
  if (!value || typeof value !== 'object' || !('type' in value) || value.type !== 'doc') {
    throw new Error('The linked note did not return a document. Nothing was converted.');
  }
  const doc = schema.nodeFromJSON(value);
  doc.check();
  if (!doc.textContent.trim()) throw new Error('A linked note is empty. Nothing was converted.');
  return doc;
}

const converting = new WeakSet<Editor>();

/** Explicit one-time conversion: never mount child editors or mutate their source notes. */
export async function convertSubnotesToInlineEvents(editor: Editor): Promise<void> {
  if (converting.has(editor)) return;
  const original = editor.state.doc;
  const portals: { pos: number; size: number; id: string }[] = [];
  original.descendants((node, pos) => {
    if (node.type.name !== 'externalPortal') return;
    if (typeof node.attrs.externalQuantaId !== 'string') throw new Error('A sub-note has no identity.');
    portals.push({ pos, size: node.nodeSize, id: node.attrs.externalQuantaId });
    return false;
  });
  if (!portals.length) return;
  converting.add(editor);
  try {
    const documents = new Map<string, ProseMirrorNode>();
    for (const { id } of portals) {
      if (documents.has(id)) continue;
      const response = await fetch(`/api/getNote?noteId=${encodeURIComponent(`000000/${id}`)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load a sub-note. Nothing was converted.');
      documents.set(id, parseNote(editor.schema, await response.json()));
    }
    // Height updates can change portal attrs during fetching; substantive edits must not be overwritten.
    const current = editor.state.doc;
    if (!current.eq(original)) throw new Error('The note changed while loading. Please try conversion again.');
    const backup = { parent: original.toJSON(), linkedNotes: Object.fromEntries([...documents].map(([id, doc]) => [id, doc.toJSON()])) };
    // A separate snapshot survives ordinary rolling-backup eviction. Failure aborts before editing.
    localStorage.setItem(`inline-event-backup:${Date.now()}`, JSON.stringify(backup));
    const transaction = editor.state.tr;
    for (const portal of [...portals].reverse()) {
      const doc = documents.get(portal.id);
      if (!doc) throw new Error('A sub-note was not loaded. Nothing was converted.');
      transaction.replaceWith(portal.pos, portal.pos + portal.size, markEventContent(doc, portal.id));
    }
    editor.view.dispatch(transaction.scrollIntoView());
  } finally {
    converting.delete(editor);
  }
}
