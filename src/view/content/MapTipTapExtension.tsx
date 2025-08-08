import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MapNodeView } from './MapNodeView'

export interface MapOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    map: {
      insertMap: () => ReturnType
    }
  }
}

export const MapExtension = Node.create<MapOptions>({
  name: 'map',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  content: '',

  atom: true,

  addAttributes() {
    return {
      center: {
        default: [-55, -15], // South America center
      },
      zoom: {
        default: 3,
      },
      style: {
        default: 'mapbox://styles/mapbox/streets-v12',
      },
      width: {
        default: '100%',
      },
      height: {
        default: '400px',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="map"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'map', ...HTMLAttributes }]
  },

  addCommands() {
    return {
      insertMap: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            center: [-55, -15],
            zoom: 3,
            style: 'mapbox://styles/mapbox/streets-v12',
            width: '100%',
            height: '400px',
          },
        })
      },
    }
  },

  addInputRules() {
    return [
      {
        find: /-map-$/,
        handler: ({ state, range, commands }) => {
          const { from, to } = range
          
          // Delete the trigger text
          commands.deleteRange({ from, to })
          
          // Insert the map
          commands.insertMap()
          
          return true
        },
      },
    ]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => this.editor.commands.insertMap(),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapNodeView)
  },
})