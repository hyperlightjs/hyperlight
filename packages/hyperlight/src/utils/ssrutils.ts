import { PageExports, Request, Response } from '../types'
import { join } from 'path'
import { htmlTemplate, JsTemplate } from '../templates'
import { renderToString } from 'hyperapp-render'
import { noMatchHandler } from '../handlers/errorHandler'

export interface ParsedBundle {
  import: PageExports
  type: 'SSR' | 'SSG'
}

export interface HyperlightPage {
  route: string
  file: string
  module: ParsedBundle
}

export async function parseBundle(
  bundlePath: string,
  preventCaching: boolean
): Promise<ParsedBundle> {
  bundlePath = join(process.cwd(), bundlePath)

  const page: PageExports = await import(
    preventCaching ? `${bundlePath}?r=${Math.floor(Math.random() * 10000)}` : bundlePath
  )

  return {
    type: typeof page.getServerSideState == 'function' ? 'SSR' : 'SSG',
    import: page
  }
}

export const serverSideHandler = (
  page: HyperlightPage,
  initialState: any | null,
  styleSheet: string,
  jsTemplate: JsTemplate
) => async (req: Request, res: Response) => {
  const serverState = await page.module.import.getServerSideState?.({
    req,
    res,
    params: req.params
  })

  const state = {
    ...(initialState ?? page.module.import.getInitialState?.()),
    ...serverState?.state
  }

  const head = page.module.import.Head
  const view = page.module.import.default

  if (serverState?.notFound) return await noMatchHandler(req, res)

  if (serverState?.redirect) {
    const redirect = serverState.redirect

    redirect.statusCode ??= redirect.permanent ? 301 : 307

    res.status(redirect.statusCode).header('Location', redirect.dest).end()
    return
  }

  res.send(
    htmlTemplate(
      await jsTemplate(state, page.file),
      renderToString(head?.(state)),
      renderToString(view(state)),
      styleSheet
    )
  )
}
