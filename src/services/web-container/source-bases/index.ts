import type { FileSystemTree } from '@webcontainer/api'

export const SOURCE_BASES = ['empty-source', 'simple-html', 'shadcn-react-vite'] as const

export const getSourceBase = async (sourceBase: string): Promise<FileSystemTree> => {
  switch (sourceBase) {
    case 'empty-source':
      return import('./empty-source').then((module) => module.BASE)
    case 'simple-html':
      return import('./simple-html-source').then((module) => module.BASE)
    case 'shadcn-react-vite':
      return import('./shadcn-react-vite').then((module) => module.BASE)
    default:
      throw new Error(`Unknown source base: ${sourceBase}`)
  }
}
