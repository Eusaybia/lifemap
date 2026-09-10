import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { markEventContent } from './inlineEvents';

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'inline*' },
    text: { group: 'inline' },
    timepoint: { inline: true, group: 'inline', atom: true, attrs: { id: {} } },
    location: { inline: true, group: 'inline', atom: true, attrs: { name: {} } },
  },
  marks: { bold: {}, spanGroup: { attrs: { groupId: {}, groupType: {} } } },
});

describe('inline event content', () => {
  it('keeps rich text, time and location tags in one editor with shared identity across paragraphs', () => {
    const doc = schema.nodeFromJSON({ type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'text', text: 'Leave home', marks: [{ type: 'bold' }] },
        { type: 'timepoint', attrs: { id: 'timepoint:time-6-30' } },
      ] },
      { type: 'paragraph', content: [{ type: 'location', attrs: { name: 'Bardia' } }] },
    ] });
    const content = markEventContent(doc, 'departure');
    const result = schema.node('doc', null, content);
    result.check();
    const inline: string[] = [];
    result.descendants(node => {
      if (!node.isInline) return;
      inline.push(node.type.name);
      expect(node.marks.find(mark => mark.type.name === 'spanGroup')?.attrs).toEqual({ groupId: 'departure', groupType: 'event' });
    });
    expect(inline).toEqual(['text', 'timepoint', 'location']);
    expect(result.firstChild?.firstChild?.marks.some(mark => mark.type.name === 'bold')).toBe(true);
    expect(result.textContent).toBe(doc.textContent);
    expect(result.lastChild?.firstChild?.attrs.name).toBe('Bardia');
    expect(doc.firstChild?.firstChild?.marks).toHaveLength(1);
  });
});
