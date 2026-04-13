import { describe, expect, test } from 'vitest'
import { IMPORTANT_GLOW, calculateGlowStyles, scanNodeForTags } from './Aura'
import { fetchHashtags } from '../content/HashtagMention'

type FakeNode = {
  type: { name: string }
  attrs: Record<string, unknown>
  forEach?: (callback: (child: FakeNode) => void) => void
}

const createNode = (
  name: string,
  attrs: Record<string, unknown> = {},
  children: FakeNode[] = [],
): FakeNode => {
  const node: FakeNode = {
    type: { name },
    attrs,
  }

  if (children.length > 0) {
    node.forEach = (callback) => {
      children.forEach((child) => callback(child))
    }
  }

  return node
}

describe('fetchHashtags', () => {
  test('includes the predefined private tag in hashtag suggestions', () => {
    const matches = fetchHashtags('pri')

    expect(matches.some((tag) => tag.id === 'tag:private' && tag.label === 'private')).toBe(true)
  })

  test('includes the predefined active tag in hashtag suggestions', () => {
    const matches = fetchHashtags('act')

    expect(matches.some((tag) => tag.id === 'tag:active' && tag.label === 'active')).toBe(true)
  })
})

describe('scanNodeForTags', () => {
  test('detects the private hashtag so node overlays can black out the whole node', () => {
    const node = createNode('doc', {}, [
      createNode('paragraph', {}, [
        createNode('hashtag', {
          id: 'tag:private',
          label: '#private',
          'data-tag': 'private',
        }),
      ]),
    ])

    const tags = scanNodeForTags(node as any)

    expect(tags.hasPrivateTag).toBe(true)
  })

  test('treats the active hashtag as an important-style parent glow trigger', () => {
    const node = createNode('doc', {}, [
      createNode('paragraph', {}, [
        createNode('hashtag', {
          id: 'tag:active',
          label: '#active',
          'data-tag': 'active',
        }),
      ]),
    ])

    const tags = scanNodeForTags(node as any)
    const glowStyles = calculateGlowStyles(tags)

    expect(tags.hasImportantTag).toBe(true)
    expect(glowStyles).toContain(IMPORTANT_GLOW)
  })
})
