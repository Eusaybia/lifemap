import { describe, expect, test } from 'vitest'
import { scanNodeForTags } from './Aura'
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
})
