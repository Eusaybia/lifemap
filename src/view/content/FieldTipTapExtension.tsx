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
        tag: 'Field[data-type="field"]',
      },
      {
        tag: 'span[data-field-id]',
      },
      {
        tag: 'mark[data-field-id]',
      },
      {
        tag: 'span.field-tag',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['Field', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: 'field',
      'data-type': 'field',
      'data-id': HTMLAttributes.fieldId
    }), 
      [
        'span',
        { class: 'field-pin' },
        '⭕'
      ],
      [
        'span',
        { class: 'field-text' },
        0
      ]
    ]
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