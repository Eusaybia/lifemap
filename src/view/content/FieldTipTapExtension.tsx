import { Mark, mergeAttributes } from '@tiptap/core'

export interface FieldOptions {
  HTMLAttributes: Record<string, any>,
  multicolor: boolean,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    field: {
      /**
       * Set a field mark
       */
      setField: (attributes?: { fieldId: string, class?: string }) => ReturnType,
      /**
       * Toggle a field mark
       */
      toggleField: (attributes?: { fieldId: string, class?: string }) => ReturnType,
      /**
       * Unset a field mark
       */
      unsetField: () => ReturnType,
    }
  }
}

export const FieldExtension = Mark.create<FieldOptions>({
  name: 'field',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      fieldId: {
        default: null,
        parseHTML: element => element.getAttribute('data-field-id'),
        renderHTML: attributes => {
          if (!attributes.fieldId) {
            return {}
          }
          return {
            'data-field-id': attributes.fieldId,
          }
        },
      },
      class: {
        default: 'field-mark',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {}
          }
          return {
            class: attributes.class,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-field-id]',
      },
      {
        tag: 'mark[data-field-id]',
      },
      {
        tag: 'span.field-tag',
      },
      {
        tag: 'span[data-field-type="field-mark"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: `${HTMLAttributes.class || 'field-mark'} field-tag`,
      style: `
        background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%);
        border: 1px solid #81c784;
        border-radius: 6px;
        padding: 1px 6px;
        margin: 0 1px;
        display: inline;
        font-size: 0.9em;
        font-weight: 500;
        color: #2e7d32;
        text-decoration: none;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        vertical-align: baseline;
        line-height: inherit;
        position: relative;
        overflow-wrap: break-word;
        word-break: break-word;
        white-space: normal;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      `,
      'data-field-type': 'field-mark',
    }), 0]
  },

  addCommands() {
    return {
      setField: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      toggleField: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetField: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})