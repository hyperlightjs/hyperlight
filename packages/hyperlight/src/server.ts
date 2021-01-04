import { join as pathJoin } from 'path'
import { App, Request, Response } from '@tinyhttp/app'
import { bundlePage } from './bundler'
import { renderToString } from 'hyperapp-render'
import path from 'path'
import fs from 'fs'
import { rm as fsRm, writeFile, mkdir } from 'fs/promises'
import {
  HtmlTemplate,
  htmlTemplate,
  JsTemplate,
  prodJsTemplate
} from './templates'
import sirv from 'sirv'
import readdir from 'readdirp'
import * as utils from './utils'

export interface HyperlightConfiguration {
  host: string
  port: number
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
    this.config.port ??= 8080

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
    const pagesDir = await utils.scanPages()

    // Clear cache
    fs.existsSync(this.cacheDir)
      ? await fsRm(this.cacheDir, { recursive: true, force: true })
      : ''

    console.log(`○ - Statically generated`)
    console.log('λ - Server-side rendered')
    console.log('\n')

    // Bundle all scripts and put them in the cache folder
    // NOTE: this is where the difference between statically generated and server side rendered is made
    for (const script of pagesDir) {
      const parsedScriptPath = path.parse(script)

      const route = pathJoin(parsedScriptPath.dir, parsedScriptPath.name)
      const normalizedRoute = utils.normalizeRoute(route)

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

      if (hyperlightPage.pageImport.getServerSideState) {
        // Differenciate between server side rendered page and statically generated ones
        console.log(`λ ${hyperlightPage.script}`)
        this.app.get(
          hyperlightPage.routes.base,
          this.ssrMw(hyperlightPage, htmlTemplate, prodJsTemplate)
        )
      } else {
        console.log(`○ ${hyperlightPage.script}`)
        this.staticallyCache(hyperlightPage, htmlTemplate, prodJsTemplate)
      }
    }

    this.app.use('/bundled/', sirv(this.cacheDir))

    this.app.listen(
      this.config.port,
      () =>
        console.log(
          `\nServer is now listening on port: ${this.config.host}:${this.config.port}`
        ),
      this.config.host
    )
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

    await utils.writeFileRecursive(htmlContent, page.outputPaths.html)

    console.log(page.outputPaths.html)
    this.app.get(page.routes.base, (_, res) =>
      res.sendFile(page.outputPaths.html)
    )
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
}

export const Hyperlight = (config?: Partial<HyperlightConfiguration>) =>
  new HyperlightServer(config)
