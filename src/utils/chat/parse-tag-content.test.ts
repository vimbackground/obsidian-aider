import { ParsedTagContent, parseTagContents } from './parse-tag-content'

describe('parseThink', () => {
  it('should parse a string with think elements', () => {
    const input = `Start
<think>Thinking...</think>
End`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      { type: 'think', content: 'Thinking...' },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle unfinished think with only opening tag', () => {
    const input = `Start
<think>Thinking...
Some text after without closing tag`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      {
        type: 'think',
        content: 'Thinking...\nSome text after without closing tag',
      },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle multiple think elements', () => {
    const input = `Start
<think>First thought</think>
Some text after
<think>Second thought</think>
End`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      { type: 'think', content: 'First thought' },
      { type: 'string', content: 'Some text after' },
      { type: 'think', content: 'Second thought' },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle nested think elements and treat as string inside', () => {
    const input = `Start
<think>Thinking...
<think>Nested thinking</think>
</think>
End`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      {
        type: 'think',
        content: `Thinking...
<think>Nested thinking</think>`,
      },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })
})
