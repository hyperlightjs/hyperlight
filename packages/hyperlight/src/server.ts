import { App, Response } from '@tinyhttp/app'
import path from 'path'
import readdir from 'readdirp'
import { htmlTemplate, prodJsTemplate } from './templates'
import { convertFileExtension, normalizeRoute } from './utils/fileutils'
import { info } from './utils/logging'
import { HyperlightPage, parseBundle, serverSideHandler } from './utils/ssrutils'
import { renderToString } from 'hyperapp-render'
import { noMatchHandler } from './handlers/errorHandler'
import { serveHyperapp as serveHyperappBin } from './handlers/hyperappHandler'
import { devRouteWatch } from './dev'
import { serveStaticFolder } from './handlers/staticHandler'

interface HyperlightServerSettings {
  host: string
  port: number
}

export class HyperlightServer {
  settings: HyperlightServerSettings
  app: App

  constructor(settings: HyperlightServerSettings) {
    this.settings = settings

    this.app = new App({ noMatchHandler: noMatchHandler })
  }

  async productionServer() {
    /* Production server core logic */
    const modulesDir = await readdir.promise('.cache/client', {
      fileFilter: ['*.mjs']
    })

    const pages = await Promise.all(
      modulesDir.map(async (entry) => ({
        route: normalizeRoute(convertFileExtension(entry.path, '')),
        file: path.join('/bundled/', entry.path),
        module: await parseBundle(path.join('.cache/server', entry.path), false)
      }))
    )

    for (const page of pages) {
      this.app.get(page.route, await this.pageHandler(page))
    }

    await serveHyperappBin(this.app)
    this.app.use('/bundled/', serveStaticFolder('.cache/client', true)) // true = cache, false = no cache
    this.app.use('/', serveStaticFolder('public/', true))

    this.listen()
  }

  async devServer() {
    // Static routes for public/ and bundled code
    await serveHyperappBin(this.app)
    this.app.use('/bundled/', serveStaticFolder('.cache/client', false))
    this.app.use('/', serveStaticFolder('public/', false))

    // Live reload code serve
    const liveReloadCode = `export ${(
      await import('@hyperlight/livereload/dist/index.js')
    ).livereload.toString()}`
    this.app.get('/livereload.js', (req, res) => {
      res.type('text/javascript').send(liveReloadCode)
    })

    // dev server with auto reload
    await devRouteWatch(this.app)

    this.listen()
  }

  pageHandler = async (page: HyperlightPage) => {
    const styleSheet = `${page.file}.css`

    const initialState = await page.module.import.getInitialState?.()

    let staticHtml: string

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
      : serverSideHandler(page, initialState, styleSheet, prodJsTemplate)
  }

  listen() {
    this.app.listen(
      this.settings.port,
      () => info(`Server is now listening on ${this.settings.host}:${this.settings.port}`),
      this.settings.host
    )
  }
}
