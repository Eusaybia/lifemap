import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { DeepMindTracker } from '@/components/DeepMindTracker'
import { NodeOverlay } from '../components/NodeOverlay'

const DeepMindTrackerNodeView = (props: any) => {
  return (
    <NodeViewWrapper>
      <NodeOverlay
        nodeProps={props}
        nodeType="deepMindTracker"
        backgroundColor="#ffffff"
      >
        <div
          contentEditable={false}
          style={{
            width: '100%',
            height: '400px', // matches the tracker height
            borderRadius: 10,
            background: 'rgba(248, 250, 252, 0.88)',
            border: '1px solid rgba(148, 163, 184, 0.45)',
            position: 'relative'
          }}
        >
          <DeepMindTracker />
        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

export const DeepMindTrackerExtension = Node.create({
  name: 'deepMindTracker',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-deep-mind-tracker="true"]' }]
  },

  renderHTML() {
    return [
      'div',
      mergeAttributes({ 'data-deep-mind-tracker': 'true' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DeepMindTrackerNodeView)
  },
})
