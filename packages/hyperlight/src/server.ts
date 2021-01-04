import readdir from 'fs-readdir-recursive'
import { join as pathJoin } from 'path'
import { App, Request, Response } from '@tinyhttp/app'
import { bundlePage } from './bundler'
import { renderToString } from 'hyperapp-render'
import path from 'path'
import fs from 'fs'
import { rm as fsRm } from 'fs/promises'
import {
  HtmlTemplate,
  htmlTemplate,
  JsTemplate,
  prodJsTemplate
} from './templates'
import sirv from 'sirv'

export interface HyperlightConfiguration {
  host: string
  port: string | number
  dev: undefined | true
}

export interface HyperlightPage {
  pageImport: any
  script: string
  outputPaths: {
    html: string
    script: string
  }
  routes: {
    base: string
    html: string | undefined
    script: string
    stylesheet: string
  }
}

export class HyperlightServer {
  config: Partial<HyperlightConfiguration>
  app: App

  cacheDir: string = pathJoin(process.cwd(), '.cache')

  constructor(config?: Partial<HyperlightConfiguration>) {
    this.config = config ?? {}
    this.config.host ??= '127.0.0.1'
    this.config.port ??= '8080'

    this.app = new App()

    this.app.get('/hyperapp.js', (_, res) => {
      res.sendFile(path.resolve(`node_modules/hyperapp/hyperapp.js`))
    })

    this.config.dev ? this.devServer() : this.prodServer()
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  devServer() {}

  async prodServer() {
    // Get all the files in the pages directory
    const pagesDir = readdir(
      pathJoin(process.cwd(), 'pages/'),
      (filePath) =>
        path.parse(filePath).ext == '.ts' || path.parse(filePath).ext == '.tsx'
    )

    // Clear cache
    fs.existsSync(this.cacheDir)
      ? await fsRm(this.cacheDir, { recursive: true, force: true })
      : ''

    // Bundle all scripts and put them in the cache folder
    // NOTE: this is where the difference between statically generated and server side rendered is made
    for (const script of pagesDir) {
      const parsedScriptPath = path.parse(script)

      const route = pathJoin(parsedScriptPath.dir, parsedScriptPath.name)
      const normalizedRoute = this.normalizeRoute(route)

      const hyperlightPage: HyperlightPage = {
        script,
        pageImport: null,
        outputPaths: {
          html: `${pathJoin(this.cacheDir, route)}.html`,
          script: `${pathJoin(this.cacheDir, 'bundled', route)}.mjs`
        },
        routes: {
          base: normalizedRoute,
          html: `/${route}.html`,
          script: `/bundled/${route}.mjs`,
          stylesheet: `/bundled/${route}.css`
        }
      }

      await bundlePage(hyperlightPage)

      // Dynamically import the pages (WARN: strictly requires esnext)
      hyperlightPage.pageImport = await import(
        hyperlightPage.outputPaths.script
      )

      if (hyperlightPage.pageImport.getServerSideState)
        this.app.get(
          hyperlightPage.routes.base,
          this.ssrMw(hyperlightPage, htmlTemplate, prodJsTemplate)
        )
      // If the page needs to be server side rendered skip the rest of the loop
      else
        await this.staticallyCache(hyperlightPage, htmlTemplate, prodJsTemplate)
    }

    this.app.use(sirv(this.cacheDir))

    this.app.listen(8080)
  }

  async staticallyCache(
    page: HyperlightPage,
    htmlTemplate: HtmlTemplate,
    jsTemplate: JsTemplate
  ) {
    const view = page.pageImport.default

    const state = page.pageImport.getInitialState?.() ?? {}

    const preRender = renderToString(view(state))

    const htmlContent = htmlTemplate(
      jsTemplate(state, page.routes.script),
      preRender,
      page.routes.stylesheet
    )

    fs.writeFileSync(page.outputPaths.html, htmlContent)
  }

  ssrMw(
    page: HyperlightPage,
    htmlTemplate: HtmlTemplate,
    jsTemplate: JsTemplate
  ) {
    return async (req: Request, res: Response) => {
      const initialState = page.pageImport.getInitialState?.() ?? {}
      const serverSideState = page.pageImport.getServerSideState(req)
      const view = page.pageImport.default

      const state = { ...initialState, ...serverSideState }

      const htmlContent = htmlTemplate(
        jsTemplate({ ...initialState, ...serverSideState }, page.routes.script),
        renderToString(view(state)),
        page.routes.stylesheet
      )

      res.send(htmlContent)
    }
  }

  normalizeRoute(route: string) {
    const lastIndex = route.lastIndexOf('index')

    if (lastIndex >= 0) return route.slice(0, lastIndex)
    else return route
  }
}

export const Hyperlight = (config?: Partial<HyperlightConfiguration>) =>
  new HyperlightServer(config)
