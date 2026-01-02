import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export const EmptyNodeCleanupExtension = Extension.create({
  name: 'emptyNodeCleanup',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('emptyNodeCleanup'),
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some(tr => tr.docChanged)) return null

          const { tr, doc } = newState
          let modified = false

          // Find first and last group nodes
          let firstGroupPos = -1
          let lastGroupPos = -1

          doc.descendants((node, pos) => {
            if (node.type.name === 'group') {
              if (firstGroupPos === -1) firstGroupPos = pos
              lastGroupPos = pos
            }
          })

          // If no groups found, return
          if (firstGroupPos === -1) return null

          const nodesToDelete: { pos: number, size: number }[] = []
          
          // Check nodes between docAttrs and first group
          doc.nodesBetween(0, firstGroupPos, (node, pos) => {
            if (node.type.name === 'paragraph' || 
                (node.type.name === 'docAttrs' && pos > 0)) { // Keep first docAttrs
              nodesToDelete.push({ pos, size: node.nodeSize })
            }
          })

          // Check nodes after last group
          doc.nodesBetween(lastGroupPos, doc.content.size, (node, pos) => {
            if (node.type.name === 'paragraph' || 
                node.type.name === 'docAttrs') {
              nodesToDelete.push({ pos, size: node.nodeSize })
            }
          })

          // Delete nodes in reverse order
          nodesToDelete
            .sort((a, b) => b.pos - a.pos)
            .forEach(({ pos, size }) => {
              tr.delete(pos, pos + size)
              modified = true
            })

          return modified ? tr : null
        }
      })
    ]
  }
}) 