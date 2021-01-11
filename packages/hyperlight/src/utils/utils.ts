import { existsSync } from 'fs'
import { mkdir, writeFile, rm as fsRm, stat } from 'fs/promises'
import readdir from 'readdirp'
import path from 'path'
import ws from 'ws'
import chokidar from 'chokidar'
import { bundlePage } from '../bundler'
import depresolver from 'dependency-tree'

type ChokidarEvent = 'unlink' | 'add' | 'addDir' | 'change' | 'unlinkDir'

export function normalizeRoute(route: string) {
  let resultRoute = route

  const lastIndex = resultRoute.lastIndexOf('index')
  if (lastIndex >= 0) resultRoute = resultRoute.slice(0, lastIndex)

  resultRoute = resultRoute.replaceAll(/\[(.+)\]/g, (_, slug) => `:${slug}`)

  return resultRoute
}

export async function writeFileRecursive(html: string, writePath: string) {
  const parsed = path.parse(writePath)

  if (!existsSync(parsed.dir)) await mkdir(parsed.dir, { recursive: true })

  writeFile(writePath, html)
}

export async function scanPages(dir: string, pageExtensions?: string[]) {
  const dirScan = await readdir.promise(dir, {
    fileFilter: pageExtensions?.map((v) => `*${v}`) || ['*.ts', '*.tsx']
  })

  return dirScan.map((v) => v.path)
}

export async function scanForSlug(
  scanDir: string,
  route: string
): Promise<{
  route: string
  slug: any
  moduleImport: string
  module: string
} | null> {
  const routeParse = path.parse(route)
  const folderScan = await (
    await readdir.promise(path.join(scanDir, routeParse.dir), { depth: 0 })
  ).map((v) => v.path)

  if (!folderScan) return null

  const slugRegexp = /\[(.+)\]/
  const slugFile = folderScan.find((v) => v.match(slugRegexp)?.length > 0)

  if (!slugFile) return null

  const match = slugFile.match(slugRegexp)[0]
  const slugName = match.substring(1, match.length - 1)

  const slug = []
  slug[slugName] = routeParse.name

  return {
    route: `${routeParse.dir}/`,
    slug,
    module: path.join(routeParse.dir, slugFile),
    moduleImport: path.join('/bundled', routeParse.dir, `${match}.mjs`)
  }
}

export function convertFileExtension(file: string, newExtension: string) {
  const pos = file.lastIndexOf('.')
  return file.substr(0, pos < 0 ? file.length : pos) + newExtension
}

export async function createLiveServerWs() {
  const server = new ws.Server({ port: 8030 })

  return {
    reloadAll: () => {
      server.clients.forEach((socket) => socket.send('reload'))
    }
  }
}

export const createOrRecreate = async (
  dir: string,
  type: 'file' | 'folder',
  defaultContent?: string
) => {
  existsSync(dir) ? await fsRm(dir, { recursive: true, force: true }) : ''
  type === 'folder'
    ? await mkdir(dir)
    : await writeFile(dir, defaultContent ?? '', { encoding: 'utf-8' })
}

type DepTree = Record<string, { file: string; watcher: chokidar.FSWatcher }[]>

export const fileWatchDevHandler = (
  pagesDir: string,
  reloadAll: () => void
) => {
  // @ts-ignore
  const depTree: DepTree = [] // Depdenency tree memory cache

  return (
    watcher: chokidar.FSWatcher,
    eventName: ChokidarEvent,
    filepath: string
  ) => {
    if (eventName !== 'add' && eventName !== 'change') return

    const originalModulePath = path.join(pagesDir, filepath)

    // gets a flat list of all the dependencies of a file
    const scanDepTree = depresolver
      .toList({
        filename: originalModulePath,
        directory: process.cwd()
      })
      .filter((v) => v !== originalModulePath)

    for (const dependency of scanDepTree) {
      if (!depTree[dependency]) depTree[dependency] = []

      if (
        // Ignore if a watcher is already present
        depTree[dependency].find(
          (depWatcher) => depWatcher.file === originalModulePath
        )
      ) {
        continue
      }

      // Add a watcher to a dependency and remove it in case of need
      depTree[dependency].push({
        file: originalModulePath,
        watcher: chokidar
          .watch(dependency)
          .on('change', async () => {
            await bundlePage(originalModulePath, { verbose: true })
            reloadAll()
          }) // Bundle the main module in case of change
          .on('unlink', () => {
            depTree[dependency] = depTree[dependency].filter(
              ({ file, watcher }) => {
                if (file !== originalModulePath) {
                  watcher.close()
                  return false
                }
              }
            )

            bundlePage(originalModulePath, { verbose: true }) // bundle stuff on file deletion
          })
      })
    }

    bundlePage(originalModulePath, { verbose: true })
    if (eventName === 'change') reloadAll() // Reload browser via websockets
  }
}

export function getRouteFromScript(script: string): string {
  const parsedScriptPath = path.parse(script)

  return path.join(parsedScriptPath.dir, parsedScriptPath.name)
}

export async function getReadableFileSize(filename: string) {
  const stats = await stat(filename)
  //console.log('stats', stats);
  const { size } = stats
  // convert to human readable format.
  const i = Math.floor(Math.log(size) / Math.log(1024))

  return `${(size / Math.pow(1024, i)).toFixed(2)} ${
    ['B', 'KB', 'MB', 'GB', 'TB'][i]
  }`
}

export function allowedExtension(
  filepath: string,
  allowedExtensions: string[]
) {
  const parsed = path.parse(filepath)

  return allowedExtensions.indexOf(parsed.ext) >= 0
}
