import { App, NextFunction, Request, Response } from '@tinyhttp/app'
import path from 'path'
import readdir from 'readdirp'
import { htmlTemplate, prodJsTemplate } from './templates'
import {
  checkPeer,
  convertFileExtension,
  normalizeRoute
} from './utils/fileutils'
import { error, info } from './utils/logging'
import {
  HyperlightPage,
  parseBundle,
  serverSideHandler
} from './utils/ssrutils'
import { renderToString } from 'hyperapp-render'
import sirv from 'sirv'

interface HyperlightServerSettings {
  host: string
  port: number
}

export class HyperlightServer {
  settings: HyperlightServerSettings
  app: App

  constructor(settings: HyperlightServerSettings) {
    this.settings = settings

    this.app = new App({ noMatchHandler: this.noMatchHandler })

    checkPeer('hyperapp')
    this.app.get('/hyperapp.js', (_, res) => {
      res.sendFile(path.resolve('node_modules/hyperapp/hyperapp.js'))
    })

    this.app.get('/hyperapp.js.map', (_, res) =>
      res.sendFile(path.resolve('node_modules/hyperapp/hyperapp.js.map'))
    )
  }

  async noMatchHandler(req: Request, res: Response, _next?: NextFunction) {
    res.status(404).send('<code>Not found</code>') // TODO: Not found page
  }

  async productionServer() {
    /* Production server core logic */
    const modulesDir = await readdir.promise('.cache/client', {
      fileFilter: ['*.mjs']
    })

    const pages = await Promise.all(
      modulesDir.map(async (entry) => ({
        route: await normalizeRoute(convertFileExtension(entry.path, '')),
        file: path.join('/bundled/', entry.path),
        module: await parseBundle(path.join('.cache/server', entry.path), false)
      }))
    )

    for (const page of pages) {
      this.app.get(page.route, await this.pageHandler(page))
    }

    this.app.use('/bundled/', sirv('.cache/client', { etag: true }))
    this.app.use('/', sirv('public/', { etag: true }))

    this.app.listen(
      this.settings.port,
      () =>
        info(
          `Server is now listening on ${this.settings.host}:${this.settings.port}`
        ),
      this.settings.host
    )
  }

  pageHandler = async (page: HyperlightPage) => {
    const styleSheet = `${page.file}.css`

    const initialState = await page.module.import.getInitialState?.()

    let staticHtml

    if (page.module.type === 'SSG') {
      const head = renderToString(page.module.import.Head?.(initialState))
      staticHtml = htmlTemplate(
        await prodJsTemplate(initialState, page.file),
        head,
        renderToString(page.module.import.default(initialState)),
        styleSheet
      )
    }

    return staticHtml
      ? (_, res: Response) => res.send(staticHtml)
      : serverSideHandler(
          page,
          initialState,
          this.noMatchHandler,
          prodJsTemplate
        )
  }
}
