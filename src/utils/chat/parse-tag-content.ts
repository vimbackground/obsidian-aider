import { parseFragment } from 'parse5'

import { sanitizeAssistantContent } from './textToolExtractor'

export { sanitizeAssistantContent }

export type ParsedTagContent =
  | { type: 'string'; content: string }
  | {
      type: 'think'
      content: string
    }

/**
 * Parses text containing <think> tags into structured content
 */
export function parseTagContents(input: string): ParsedTagContent[] {
  const sanitizedInput = sanitizeAssistantContent(input)
  if (!sanitizedInput) {
    return []
  }
  const parsedResult: ParsedTagContent[] = []
  const fragment = parseFragment(sanitizedInput, {
    sourceCodeLocationInfo: true,
  })
  let lastEndOffset = 0
  for (const node of fragment.childNodes) {
    if (node.nodeName === 'think') {
      if (!node.sourceCodeLocation) {
        throw new Error('sourceCodeLocation is undefined')
      }
      const startOffset = node.sourceCodeLocation.startOffset
      const endOffset = node.sourceCodeLocation.endOffset
      if (startOffset > lastEndOffset) {
        parsedResult.push({
          type: 'string',
          content: sanitizedInput.slice(lastEndOffset, startOffset),
        })
      }

      const children = node.childNodes
      if (children.length > 0) {
        const innerContentStartOffset =
          children[0].sourceCodeLocation?.startOffset
        const innerContentEndOffset =
          children[children.length - 1].sourceCodeLocation?.endOffset
        if (!innerContentStartOffset || !innerContentEndOffset) {
          throw new Error('sourceCodeLocation is undefined')
        }
        parsedResult.push({
          type: 'think',
          content: sanitizedInput.slice(innerContentStartOffset, innerContentEndOffset),
        })
      }
      lastEndOffset = endOffset
    }
  }
  if (lastEndOffset < sanitizedInput.length) {
    parsedResult.push({
      type: 'string',
      content: sanitizedInput.slice(lastEndOffset),
    })
  }

  /**
   * Remove a single leading/trailing newline from each block's content.
   */
  parsedResult.forEach((block) => {
    block.content = block.content.replace(/^\n|\n$/g, '')
  })

  return parsedResult
}
