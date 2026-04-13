export type TransformersLocationEntity = {
  entity: string
  score: number
  index: number
  word: string
}

export type TransformersLocationSpan = {
  text: string
  score: number
  tokens: TransformersLocationEntity[]
}

const CJK_REGEX = /[\u3400-\u9FFF]/
const RIGHT_JOIN_PUNCTUATION_REGEX = /^[,.;:!?)}\]、，。；：！？]/
const LEFT_JOIN_PUNCTUATION_REGEX = /[(\[{]$/

const entitySuffix = (entity: string): string => {
  const parts = entity.split('-')
  return parts[parts.length - 1] || entity
}

const cleanTokenWord = (word: string): string => {
  return word
    .replace(/^##/, '')
    .replace(/^[▁Ġ]/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const appendTokenWord = (current: string, rawWord: string): string => {
  if (!rawWord) return current

  if (rawWord.startsWith('##')) {
    return current + rawWord.slice(2)
  }

  const cleaned = cleanTokenWord(rawWord)
  if (!cleaned) return current
  if (!current) return cleaned

  const previousEndsWithCjk = CJK_REGEX.test(current[current.length - 1] || '')
  const nextStartsWithCjk = CJK_REGEX.test(cleaned[0] || '')
  const nextIsRightJoinPunctuation = RIGHT_JOIN_PUNCTUATION_REGEX.test(cleaned)
  const previousEndsWithLeftJoinPunctuation = LEFT_JOIN_PUNCTUATION_REGEX.test(current)

  if (
    previousEndsWithCjk ||
    nextStartsWithCjk ||
    nextIsRightJoinPunctuation ||
    previousEndsWithLeftJoinPunctuation
  ) {
    return current + cleaned
  }

  return `${current} ${cleaned}`
}

const averageScore = (tokens: TransformersLocationEntity[]): number => {
  if (!tokens.length) return 0
  const total = tokens.reduce((sum, token) => sum + token.score, 0)
  return total / tokens.length
}

export const mergeLocationEntities = (
  entities: TransformersLocationEntity[],
  options?: {
    minScore?: number
    minTextLength?: number
  }
): TransformersLocationSpan[] => {
  const minScore = options?.minScore ?? 0.7
  const minTextLength = options?.minTextLength ?? 2

  const spans: TransformersLocationSpan[] = []
  let currentTokens: TransformersLocationEntity[] = []

  const flush = () => {
    if (!currentTokens.length) return

    const text = currentTokens.reduce((phrase, token) => appendTokenWord(phrase, token.word), '')
    const trimmedText = text.trim()
    const score = averageScore(currentTokens)

    if (trimmedText.length >= minTextLength && score >= minScore) {
      spans.push({
        text: trimmedText,
        score,
        tokens: currentTokens,
      })
    }

    currentTokens = []
  }

  for (const entity of entities) {
    const suffix = entitySuffix(entity.entity)
    if (suffix !== 'LOC') {
      flush()
      continue
    }

    const isBegin = entity.entity.startsWith('B-')
    if (isBegin && currentTokens.length) {
      flush()
    }

    currentTokens.push(entity)
  }

  flush()

  const deduped = new Map<string, TransformersLocationSpan>()
  for (const span of spans) {
    const key = span.text.toLocaleLowerCase()
    const existing = deduped.get(key)
    if (!existing || span.score > existing.score) {
      deduped.set(key, span)
    }
  }

  return Array.from(deduped.values())
}
