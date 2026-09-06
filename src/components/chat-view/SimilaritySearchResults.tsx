import { ChevronDown, ChevronRight } from 'lucide-react'
import path from 'path-browserify'
import { useState } from 'react'

import { useApp } from '../../contexts/app-context'
import { SelectEmbedding } from '../../types/vector.types'
import { useI18n } from '../../utils/i18n'
import { openMarkdownFile } from '../../utils/obsidian'

function SimiliartySearchItem({
  chunk,
}: {
  chunk: Omit<SelectEmbedding, 'embedding'> & {
    similarity: number
  }
}) {
  const app = useApp()

  const handleClick = () => {
    openMarkdownFile(app, chunk.path, chunk.metadata.startLine)
  }
  return (
    <div onClick={handleClick} className="aide-similarity-search-item">
      <div className="aide-similarity-search-item__similarity">
        {chunk.similarity.toFixed(3)}
      </div>
      <div className="aide-similarity-search-item__path">
        {path.basename(chunk.path)}
      </div>
      <div className="aide-similarity-search-item__line-numbers">
        {`${chunk.metadata.startLine} - ${chunk.metadata.endLine}`}
      </div>
    </div>
  )
}

export default function SimilaritySearchResults({
  similaritySearchResults,
}: {
  similaritySearchResults: (Omit<SelectEmbedding, 'embedding'> & {
    similarity: number
  })[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { language } = useI18n()

  return (
    <div className="aide-similarity-search-results">
      <div
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        className="aide-similarity-search-results__trigger"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div>
          {language === 'zh'
            ? `查看引用文档 (${similaritySearchResults.length})`
            : `Show Referenced Documents (${similaritySearchResults.length})`}
        </div>
      </div>
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {similaritySearchResults.map((chunk) => (
            <SimiliartySearchItem key={chunk.id} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  )
}
