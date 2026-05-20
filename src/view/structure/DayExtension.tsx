'use client'

import React from 'react'
import { Node as TipTapNode } from '@tiptap/core'
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

import {
  DayScheduleGridSurface,
  dayNodeSurfaceStyle,
  getTodayKey,
  serializeBlocks,
} from './DayScheduleSurface'
import type { DayScheduleBlock } from './DayScheduleSurface'

export { DayScheduleNodeSurface } from './DayScheduleSurface'
export type {
  DayScheduleAllDayBlock,
  DayScheduleBlock,
  DayScheduleGridSurfaceProps,
} from './DayScheduleSurface'

function DayNodeView(props: NodeViewProps) {
  const dayKey = typeof props.node.attrs.date === 'string' ? props.node.attrs.date : getTodayKey()

  const updateBlocks = (nextBlocks: DayScheduleBlock[]) => {
    props.updateAttributes({
      blocks: serializeBlocks(nextBlocks),
    })
  }

  return (
    <NodeViewWrapper
      as="section"
      data-type="day"
      data-date={dayKey}
      contentEditable={false}
      style={dayNodeSurfaceStyle}
    >
      <DayScheduleGridSurface
        date={dayKey}
        blocks={props.node.attrs.blocks}
        onBlocksChange={updateBlocks}
      />
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    day: {
      insertDay: () => ReturnType
    }
  }
}

export const DayExtension = TipTapNode.create({
  name: 'day',
  group: 'block',
  atom: true,
  inline: false,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      date: {
        default: getTodayKey(),
        parseHTML: (element) => element.getAttribute('data-date') ?? getTodayKey(),
        renderHTML: (attributes) => ({
          'data-date': typeof attributes.date === 'string' ? attributes.date : getTodayKey(),
        }),
      },
      blocks: {
        default: [],
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="day"]' }, { tag: 'section[data-type="day"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', { ...HTMLAttributes, 'data-type': 'day' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DayNodeView)
  },

  addCommands() {
    return {
      insertDay: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'day',
            attrs: {
              date: getTodayKey(),
              blocks: [],
            },
          })
          .run()
      },
    }
  },

})

export default DayExtension
