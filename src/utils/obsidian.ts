import { App, Editor, MarkdownView, TFile, TFolder, Vault } from 'obsidian'

import { MentionableBlockData } from '../types/mentionable'

export async function readTFileContent(
  file: TFile,
  vault: Vault,
): Promise<string> {
  return await vault.cachedRead(file)
}

export async function readMultipleTFiles(
  files: TFile[],
  vault: Vault,
): Promise<string[]> {
  // Read files in parallel
  const readPromises = files.map((file) => readTFileContent(file, vault))
  return await Promise.all(readPromises)
}

export function getNestedFiles(folder: TFolder, vault: Vault): TFile[] {
  const files: TFile[] = []
  for (const child of folder.children) {
    if (child instanceof TFile) {
      files.push(child)
    } else if (child instanceof TFolder) {
      files.push(...getNestedFiles(child, vault))
    }
  }
  return files
}

export async function getMentionableBlockData(
  editor: Editor,
  view: MarkdownView,
): Promise<MentionableBlockData | null> {
  const file = view.file
  if (!file) return null

  const selection = editor.getSelection()
  if (!selection) return null

  const startLine = editor.getCursor('from').line
  const endLine = editor.getCursor('to').line
  const selectionContent = editor
    .getValue()
    .split('\n')
    .slice(startLine, endLine + 1)
    .join('\n')

  return {
    content: selectionContent,
    file,
    startLine: startLine + 1, // +1 because startLine is 0-indexed
    endLine: endLine + 1, // +1 because startLine is 0-indexed
  }
}

export function getOpenFiles(app: App): TFile[] {
  try {
    const leaves = app.workspace.getLeavesOfType('markdown')

    return leaves.map((v) => (v.view as MarkdownView).file).filter((v) => !!v)
  } catch {
    return []
  }
}

export function calculateFileDistance(
  file1: TFile | TFolder,
  file2: TFile | TFolder,
): number | null {
  const path1 = file1.path.split('/')
  const path2 = file2.path.split('/')

  // If files are on different root paths, return null
  if (path1[0] !== path2[0]) {
    return null
  }

  // Find the common prefix length
  let commonPrefixLength = 0
  while (
    commonPrefixLength < path1.length &&
    commonPrefixLength < path2.length &&
    path1[commonPrefixLength] === path2[commonPrefixLength]
  ) {
    commonPrefixLength++
  }



  // Calculate distance based on the remaining path components
  const distance =
    path1.length - commonPrefixLength + (path2.length - commonPrefixLength)
  return distance
}

export function openMarkdownFile(
  app: App,
  fileOrPath: TFile | string,
  startLine?: number,
): void {
  const file =
    typeof fileOrPath === 'string'
      ? app.vault.getFileByPath(fileOrPath)
      : fileOrPath
  if (!file) return

  const existingLeaf = app.workspace
    .getLeavesOfType('markdown')
    .find((leaf) => (leaf.view as MarkdownView).file?.path === file.path)

  if (existingLeaf) {
    app.workspace.setActiveLeaf(existingLeaf, { focus: true })

    if (startLine) {
      const view = existingLeaf.view as MarkdownView
      view.setEphemeralState({ line: startLine - 1 }) // -1 because line is 0-indexed
    }
  } else {
    const leaf = app.workspace.getLeaf('tab')
    void leaf.openFile(file, {
      eState: startLine ? { line: startLine - 1 } : undefined, // -1 because line is 0-indexed
    })
  }
}
