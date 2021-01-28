import { rm, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { error } from './logging'
import { bold } from 'colorette'

export function convertFileExtension(file: string, newExtension: string) {
  const pos = file.lastIndexOf('.')
  return file.substr(0, pos < 0 ? file.length : pos) + newExtension
}

export async function clearCache() {
  await rm('.cache', { recursive: true, force: true })
}

export async function getReadableFileSize(filename: string) {
  const stats = await stat(filename)
  //console.log('stats', stats);
  const { size } = stats
  // convert to human readable format.
  const i = Math.floor(Math.log(size) / Math.log(1024))

  return `${(size / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`
}

export function normalizeRoute(route: string): string {
  route = `/${route}`

  route = route.replaceAll(/\[(.+)\]/g, (_: string, match: string) => `:${match}`)

  route = route.replace(/([a-z\d]+)(\/*|)$/, (_: string, match: string) =>
    match == 'index' ? '' : match
  )

  return route
}

export function checkPeer(name: string) {
  if (!existsSync(`node_modules/${name}`)) {
    error(`Peer dependency ${bold(name)} not met`)
    process.exit(1)
  }
}
