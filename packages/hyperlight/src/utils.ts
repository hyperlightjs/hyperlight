import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import readdir from 'readdirp'
import path from 'path'

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

export async function scanPages() {
  const dirScan = await readdir.promise('pages/', {
    fileFilter: ['*.ts', '*.tsx']
  })

  return dirScan.map((v) => v.path)
}
