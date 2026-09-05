import { Check, Copy } from 'lucide-react'
import { PropsWithChildren, useMemo, useState } from 'react'

import { useApp } from '../../contexts/app-context'
import { useDarkModeContext } from '../../contexts/dark-mode-context'
import { useSettings } from '../../contexts/settings-context'
import { openMarkdownFile } from '../../utils/obsidian'

import { MemoizedSyntaxHighlighterWrapper } from './SyntaxHighlighterWrapper'

export default function MarkdownCodeComponent({
  language,
  filename,
  children,
}: PropsWithChildren<{
  language?: string
  filename?: string
}>) {
  const app = useApp()
  const { isDarkMode } = useDarkModeContext()
  const { settings } = useSettings()
  const languageSetting = settings.language ?? 'en'

  const [copied, setCopied] = useState(false)

  const wrapLines = useMemo(() => {
    return !language || ['markdown'].includes(language)
  }, [language])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleOpenFile = () => {
    if (filename) {
      openMarkdownFile(app, filename)
    }
  }

  const displayLang = filename || language || (languageSetting === 'zh' ? '代码' : 'code')

  return (
    <div className="aide-code-block">
      <div className="aide-code-block-header">
        <div
          className="aide-code-block-header-filename"
          onClick={filename ? handleOpenFile : undefined}
          style={{ cursor: filename ? 'pointer' : 'default', userSelect: 'none' }}
        >
          {displayLang}
        </div>
        <div className="aide-code-block-header-button-container">
          <button
            className="clickable-icon aide-code-block-header-button"
            onClick={() => {
              void handleCopy()
            }}
            title={languageSetting === 'zh' ? '复制代码' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check size={12} />
                <span>{languageSetting === 'zh' ? '已复制' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>{languageSetting === 'zh' ? '复制' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>
      <MemoizedSyntaxHighlighterWrapper
        isDarkMode={isDarkMode}
        language={language}
        hasFilename={!!filename}
        wrapLines={wrapLines}
      >
        {String(children)}
      </MemoizedSyntaxHighlighterWrapper>
    </div>
  )
}
