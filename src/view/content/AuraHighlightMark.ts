import { Mark, mergeAttributes } from '@tiptap/core'

export const AURA_HIGHLIGHT_STATES = ['confused', 'semi-known', 'clear'] as const

export type AuraHighlightState = typeof AURA_HIGHLIGHT_STATES[number]

export const isAuraHighlightState = (value: unknown): value is AuraHighlightState => (
  typeof value === 'string' && (AURA_HIGHLIGHT_STATES as readonly string[]).includes(value)
)

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    auraHighlight: {
      setAuraHighlight: (state: AuraHighlightState) => ReturnType
      unsetAuraHighlight: () => ReturnType
    }
  }
}

export interface AuraHighlightOptions {
  HTMLAttributes: Record<string, any>
}

export const AuraHighlightMark = Mark.create<AuraHighlightOptions>({
  name: 'auraHighlight',

  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      state: {
        default: 'semi-known',
        parseHTML: element => {
          const parsedState = element.getAttribute('data-aura-state')
          return isAuraHighlightState(parsedState) ? parsedState : 'semi-known'
        },
        renderHTML: attributes => {
          const state = isAuraHighlightState(attributes.state) ? attributes.state : 'semi-known'
          return {
            'data-aura-state': state,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'span[data-aura-state]' },
      { tag: 'mark[data-aura-state]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const state = isAuraHighlightState(HTMLAttributes['data-aura-state'])
      ? HTMLAttributes['data-aura-state']
      : 'semi-known'

    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: ['aura-highlight', `aura-highlight-${state}`, HTMLAttributes.class].filter(Boolean).join(' '),
          'data-aura-state': state,
        },
      ),
      0,
    ]
  },

  addCommands() {
    return {
      setAuraHighlight: state => ({ commands }) => {
        if (!isAuraHighlightState(state)) return false
        return commands.setMark(this.name, { state })
      },
      unsetAuraHighlight: () => ({ commands }) => commands.unsetMark(this.name),
    }
  },
})

export default AuraHighlightMark
