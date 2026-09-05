import clsx from 'clsx'
import { Eye, EyeOff, X } from 'lucide-react'
import { PropsWithChildren, useCallback } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import {
  Mentionable,
  MentionableBlock,
  MentionableCurrentFile,
  MentionableFile,
  MentionableFolder,
  MentionableImage,
  MentionableUrl,
  MentionableVault,
} from '../../../types/mentionable'

import { getMentionableIcon } from './utils/get-metionable-icon'

function BadgeBase({
  children,
  onDelete,
  onClick,
  isFocused,
  readOnly,
}: PropsWithChildren<{
  onDelete?: () => void
  onClick?: () => void
  isFocused?: boolean
  readOnly?: boolean
}>) {
  return (
    <div
      className={`aide-chat-user-input-file-badge ${isFocused ? 'aide-chat-user-input-file-badge-focused' : ''}`}
      onClick={readOnly ? undefined : onClick}
      style={readOnly ? { cursor: 'default' } : undefined}
    >
      {children}
      {!readOnly && onDelete && (
        <div
          className="aide-chat-user-input-file-badge-delete"
          onClick={(evt) => {
            evt.stopPropagation()
            onDelete()
          }}
        >
          <X size={12} />
        </div>
      )}
    </div>
  )
}

function FileBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableFile
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.file.name}</span>
      </div>
    </BadgeBase>
  )
}

function FolderBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableFolder
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.folder.name}</span>
      </div>
    </BadgeBase>
  )
}

function VaultBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableVault
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>Vault</span>
      </div>
    </BadgeBase>
  )
}

function CurrentFileBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableCurrentFile
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const { settings, setSettings } = useSettings()

  const handleCurrentFileToggle = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      setSettings({
        ...settings,
        chatOptions: {
          ...settings.chatOptions,
          includeCurrentFileContent:
            !settings.chatOptions.includeCurrentFileContent,
        },
      })
    },
    [settings, setSettings],
  )

  const Icon = getMentionableIcon(mentionable)
  return mentionable.file ? (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span
          className={clsx(
            !settings.chatOptions.includeCurrentFileContent &&
              'aide-excluded-content',
          )}
        >
          {mentionable.file.name}
        </span>
      </div>
      <div
        className={clsx(
          'aide-chat-user-input-file-badge-name-suffix',
          !settings.chatOptions.includeCurrentFileContent &&
            'aide-excluded-content',
        )}
      >
        {' (Current File)'}
      </div>
      <div
        className="aide-chat-user-input-file-badge-eye"
        onClick={handleCurrentFileToggle}
      >
        {settings.chatOptions.includeCurrentFileContent ? (
          <Eye size={12} />
        ) : (
          <EyeOff size={12} />
        )}
      </div>
    </BadgeBase>
  ) : null
}

function BlockBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableBlock
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.file.name}</span>
      </div>
      <div className="aide-chat-user-input-file-badge-name-suffix">
        {` (${mentionable.startLine}:${mentionable.endLine})`}
      </div>
    </BadgeBase>
  )
}

function UrlBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableUrl
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.url}</span>
      </div>
    </BadgeBase>
  )
}

function ImageBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableImage
  onDelete?: () => void
  onClick?: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="aide-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="aide-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.name}</span>
      </div>
    </BadgeBase>
  )
}

export default function MentionableBadge({
  mentionable,
  onDelete = () => {},
  onClick = () => {},
  isFocused = false,
  readOnly = false,
}: {
  mentionable: Mentionable
  onDelete?: () => void
  onClick?: () => void
  isFocused?: boolean
  readOnly?: boolean
}) {
  const effectiveOnDelete = readOnly ? undefined : onDelete
  const effectiveOnClick = readOnly ? undefined : onClick

  switch (mentionable.type) {
    case 'file':
      return (
        <FileBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
    case 'folder':
      return (
        <FolderBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
    case 'vault':
      return (
        <VaultBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
    case 'current-file':
      return (
        <CurrentFileBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
    case 'block':
      return (
        <BlockBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
    case 'url':
      return (
        <UrlBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
    case 'image':
      return (
        <ImageBadge
          mentionable={mentionable}
          onDelete={effectiveOnDelete}
          onClick={effectiveOnClick}
          isFocused={isFocused}
        />
      )
  }
}
