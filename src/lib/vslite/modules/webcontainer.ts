import type { FileSystemAPI, FileSystemTree } from '@webcontainer/api'
import type { TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { DockviewApi } from 'dockview'
import { logDebug } from 'src/utils/logger'

const configRaw = globalThis.localStorage?.vslite_config
const config = configRaw ? JSON.parse(configRaw) : {}

export async function getDirAsTree(
  fs: FileSystemAPI,
  path: string,
  parent: string,
  root: TreeItem<string>,
  db: Record<TreeItemIndex, TreeItem<string>>,
) {
  const entries = await fs.readdir(path, { withFileTypes: true })
  const directory = !config.showHidden
    ? entries.filter((item) => !item.name.startsWith('.') && item.name !== 'node_modules')
    : entries

  if (parent === 'root') db.root = root

  for (const item of directory) {
    const isDir = item.isDirectory()
    const itemPath = `${path}/${item.name}`
    db[itemPath] = {
      index: itemPath,
      data: item.name,
      isFolder: isDir,
      canMove: true,
      canRename: true,
      children: [],
    }
    if (parent) db?.[parent]?.children?.push(itemPath)
    if (isDir) await getDirAsTree(fs, itemPath, itemPath, root, db)
  }

  return db
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function openFolder(_fs: FileSystemAPI, _api: DockviewApi) {
  // @ts-expect-error globalThis must exist
  const dir = await globalThis.showDirectoryPicker()
  for await (const entry of dir.values()) {
    logDebug('Web Container Open Folder', entry)
  }
}

export const startFiles: FileSystemTree = {}

export const jshRC: string = `
export PNPM_HOME="/home/.pnpm"
export PATH="/bin:/usr/bin:/usr/local/bin:/home/.pnpm"
alias git='npx -y --package=g4c@stable -- g4c'
alias ni='npx -y --package=@antfu/ni -- ni'
`
