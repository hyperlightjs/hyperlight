import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import readdir from 'readdirp'
import path from 'path'
import ws from 'ws'

export function normalizeRoute(route: string) {
  const lastIndex = route.lastIndexOf('index')

  if (lastIndex >= 0) return route.slice(0, lastIndex)
  else return route
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
