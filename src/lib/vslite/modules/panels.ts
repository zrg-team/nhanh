import type { DockviewApi, GridviewApi, PaneviewApi } from 'dockview'
import type { FileSystemAPI } from '@webcontainer/api'

import type { ContainerInstance } from '../hooks/use-container'

const PREVIEW_PANEL_ID = 'preview::>'

export function openDock(grid: GridviewApi, api: React.MutableRefObject<DockviewApi | null>) {
  grid.addPanel({
    id: 'dock',
    component: 'dock',
    params: { api },
  })
}

export function openPanes(grid: GridviewApi, api: React.MutableRefObject<PaneviewApi | null>) {
  grid.addPanel({
    id: 'panes',
    component: 'panes',
    params: { api },
    maximumWidth: 800,
    size: 200,
    position: {
      direction: 'left',
      referencePanel: 'dock',
    },
  })
}

export function openCopilot(container: ContainerInstance, grid: GridviewApi, dock: DockviewApi) {
  grid.addPanel({
    id: 'copilot',
    component: 'copilot',
    params: { dock, container },
    minimumWidth: 250,
    maximumWidth: 600,
    size: 350,
    position: {
      direction: 'right',
      referencePanel: 'dock',
    },
  })
}

export function openTerminal(container: ContainerInstance, grid: GridviewApi, dock: DockviewApi) {
  grid.addPanel({
    id: 'terminal',
    component: 'terminal',
    params: { dock, container },
    minimumHeight: 100,
    size: 200,
    position: {
      direction: 'below',
      referencePanel: 'dock',
    },
  })
}

export function openFileTree(
  fs: FileSystemAPI,
  grid: PaneviewApi,
  dock: DockviewApi,
  hideAppName?: boolean,
) {
  const filetree = grid.addPanel({
    id: 'filetree',
    title: 'Explorer',
    component: 'filetree',
    params: { dock, fs, hideAppName },
    isExpanded: true,
  })
  filetree.headerVisible = false
}

export function openUntitledFile(fs: FileSystemAPI, api: DockviewApi) {
  const path = './Untitled'
  api.addPanel({
    id: path,
    title: 'Untitled',
    component: 'editor',
    params: { fs, path },
  })
}

export async function openStartFile(
  file: FileSystemFileHandle,
  fs: FileSystemAPI,
  api: DockviewApi,
) {
  const path = `./${file.name}`
  const contents = await (await file.getFile()).text()
  await fs.writeFile(path, contents, 'utf-8')
  api.addPanel({
    id: path,
    title: file.name,
    component: 'editor',
    params: { fs, path },
  })
}

export function createPreviewOpener(api: DockviewApi) {
  return (serverUrl: string, serverPort: number) => {
    if (serverPort === 6006) return
    const panel = api.getPanel(PREVIEW_PANEL_ID)
    const title = `Preview`
    const url = `${serverUrl}?${Date.now()}`
    if (panel) {
      panel.api.updateParameters({ url })
      panel.api.setTitle(title)
    } else {
      api.addPanel({
        id: PREVIEW_PANEL_ID,
        title: `Preview`,
        component: 'preview',
        params: { url },
        position: {
          direction: 'within',
        },
      })
    }
  }
}

export function createFileOpener(api: DockviewApi, fs: FileSystemAPI) {
  return async (path: string, name: string) => {
    const contents = await fs.readFile(path, 'utf-8')
    const panel = api.getPanel(path)
    if (panel) {
      panel.api.setActive()
    } else {
      api.addPanel({
        id: path,
        title: name,
        component: 'editor',
        params: { fs, path, contents },
      })
    }
  }
}

export function createFileAdder(api: DockviewApi, fs: FileSystemAPI) {
  return async (path: string, name: string) => {
    const newPath = `${path}/${name.includes('.') ? name : `${name}`}`
    await fs.writeFile(newPath, new Uint8Array())
    api.addPanel({
      id: newPath,
      title: name,
      component: 'editor',
      params: { fs, path: newPath },
    })
  }
}

export function createFolderAdder(_api: DockviewApi, fs: FileSystemAPI) {
  return async (path: string, name: string) => {
    const newPath = `${path}/${name.includes('.') ? name : `${name}`}`
    await fs.mkdir(newPath, { recursive: true })
  }
}

export function createFileDeleter(api: DockviewApi, fs: FileSystemAPI) {
  return async (path: string) => {
    await fs.rm(path, { recursive: true })
    const panel = api.getPanel(path)
    if (panel) {
      panel.api.close()
    }
  }
}

export function createFileRenameHandler(api: DockviewApi, fs: FileSystemAPI) {
  return async (path: string, name: string) => {
    // Get contents of file
    const contents = await fs.readFile(path)
    // Remove file
    await fs.rm(path)
    // Write new file
    const dirPath = path.split('/').slice(0, -1).join('/')
    const newPath = `${dirPath}/${name}`
    await fs.writeFile(newPath, contents || new Uint8Array())
    // Update editor panel
    const panel = api.getPanel(path)
    if (panel) {
      panel.api.updateParameters({ path: newPath })
      panel.api.setTitle(name)
    }
  }
}

export function createFolderRenameHandler(_api: DockviewApi, fs: FileSystemAPI) {
  return async (path: string, name: string) => {
    const newPath = path.split('/').slice(0, -1).join('/') + '/' + name
    await fs.rename(path, newPath)
  }
}
