import React, { useMemo } from 'react'

import { ChatAssistantMessage } from '../../types/chat'
import {
  ParsedTagContent,
  parseTagContents,
} from '../../utils/chat/parse-tag-content'

import AssistantMessageReasoning from './AssistantMessageReasoning'
import { ObsidianMarkdown } from './ObsidianMarkdown'

export default function AssistantMessageContent({
  content,
}: {
  content: ChatAssistantMessage['content']
}) {
  return <AssistantTextRenderer>{content}</AssistantTextRenderer>
}

const AssistantTextRenderer = React.memo(function AssistantTextRenderer({
  children,
}: {
  children: string
}) {
  const blocks: ParsedTagContent[] = useMemo(
    () => parseTagContents(children),
    [children],
  )

  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'string' ? (
          <div key={index}>
            <ObsidianMarkdown content={block.content} scale="sm" />
          </div>
        ) : block.type === 'think' ? (
          <AssistantMessageReasoning key={index} reasoning={block.content} />
        ) : null,
      )}
    </>
  )
})
