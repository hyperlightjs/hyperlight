import { Page } from '../types'
import { join } from 'path'

export interface ParsedBundle {
  import: Page
  type: 'SSR' | 'SSG'
}

export async function parseBundle(
  bundlePath: string,
  preventCaching: boolean
): Promise<ParsedBundle> {
  bundlePath = join(process.cwd(), bundlePath)

  const page: Page = await import(
    preventCaching
      ? `${bundlePath}?r=${Math.floor(Math.random() * 10000)}`
      : bundlePath
  )

  return {
    type: page.getServerSideState ? 'SSG' : 'SSG',
    import: page
  }
}
