import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import readdir from 'readdirp'
import path from 'path'
import ws from 'ws'

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

export async function scanPages(dir: string) {
  const dirScan = await readdir.promise(dir, {
    fileFilter: ['*.ts', '*.tsx']
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
