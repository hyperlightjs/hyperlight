import { App, Request, Response } from '@tinyhttp/app'
import { bundlePage } from './bundler'
import { renderToString } from 'hyperapp-render'
import path from 'path'
import fs from 'fs'
import { rm as fsRm, mkdir } from 'fs/promises'
import { devJsTemplate, htmlTemplate, prodJsTemplate } from './templates'
import sirv from 'sirv'
import chokidar from 'chokidar'
import * as utils from './utils'
import serveHandler from 'serve-handler'

export interface HyperlightConfiguration {
  host: string
  port: number
  dev: undefined | true
  wsPort: number
}

interface HyperlightPage {
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

  cacheDir: string = path.join(process.cwd(), '.cache')

  constructor(config?: Partial<HyperlightConfiguration>) {
    this.config = config ?? {}
    this.config.host ??= '127.0.0.1'
    this.config.port ??= 8080
    this.config.wsPort ??= 8030

    this.app = new App()

    this.app.get('/hyperapp.js', (_, res) => {
      res.sendFile(path.resolve(`node_modules/hyperapp/hyperapp.js`))
    })

    this.config.dev ? this.devServer() : this.prodServer()
  }

  async clearCache() {
    fs.existsSync(this.cacheDir)
      ? await fsRm(this.cacheDir, { recursive: true, force: true })
      : ''

    await mkdir(this.cacheDir)
  }

  async removeFromCache(rmpath: string) {
    await fsRm(
      path.join(
        this.cacheDir,
        'bundled',
        utils.convertFileExtension(rmpath, '.mjs')
      )
    )
  }

  async notFound(res: Response) {
    res.statusCode = 404
    res.end('Not found')
  }

  async devServer() {
    const { reloadAll } = await utils.createLiveServerWs()

    await this.clearCache() // Clear cache

    chokidar
      .watch('.', { cwd: 'pages/' })
      .on('unlink', (path) => this.removeFromCache(path))
      .on('add', (path) => bundlePage(path))
      .on('change', (path) => {
        reloadAll()
        bundlePage(path)
      })

    this.app.use(async (req, res, next) => {
      const hypotheticalFile = path.join(
        this.cacheDir,
        'bundled',
        `${req.path}.mjs`
      )

      const hypotheticalFolder = path.join(this.cacheDir, 'bundled', req.path)

      const pageModule = { modulePath: '', moduleImport: '' }

      if (fs.existsSync(hypotheticalFile)) {
        pageModule.modulePath = hypotheticalFile
        pageModule.moduleImport = path.join('/bundled', `${req.path}.mjs`)
      } else if (fs.existsSync(hypotheticalFolder)) {
        pageModule.modulePath = path.join(hypotheticalFolder, 'index.mjs')
        pageModule.moduleImport = path.join('/bundled', req.path, 'index.mjs')

        if (!fs.existsSync(pageModule.modulePath)) {
          next?.()
          return
        }
      } else {
        next?.()
        return
      }

      const page = await import(pageModule.modulePath)
      const view = page.default
      const { getInitialState, getServerSideState } = page
      const state = { ...getInitialState?.(), ...getServerSideState?.(req) }

      const ssr = renderToString(view(state))

      res
        .type('text/html')
        .send(
          htmlTemplate(
            devJsTemplate(
              state,
              pageModule.moduleImport,
              this.config.host,
              this.config.wsPort
            ),
            ssr,
            utils.convertFileExtension(pageModule.moduleImport, '.css')
          )
        )
    })

    // TODO: this will not work
    this.app.get('/livereload.js', (_, res) => {
      res.sendFile(
        path.resolve(
          `node_modules/hyperlight/node_modules/@hyperlight/livereload/dist/index.js`
        )
      )
    })

    this.app.use('/bundled/', (req, res) =>
      serveHandler(req, res, { public: path.join(this.cacheDir, 'bundled') })
    )

    this.app.listen(this.config.port)
  }

  async prodServer() {
    // Get all the files in the pages directory
    const pagesDir = await utils.scanPages('pages/')

    this.clearCache() // Clear cache

    console.time('Build time') // Time the build

    // Symbol legenda
    console.log(`○ - Statically generated`)
    console.log('λ - Server-side rendered')
    console.log('\n')

    // Bundle all scripts and put them in the cache folder
    // NOTE: this is where the difference between statically generated and server side rendered is made
    for (const script of pagesDir) {
      const parsedScriptPath = path.parse(script)

      const route = path.join(parsedScriptPath.dir, parsedScriptPath.name)

      const hyperlightPage: HyperlightPage = {
        script,
        pageImport: null,
        outputPaths: {
          html: `${path.join(this.cacheDir, route)}.html`,
          script: `${path.join(this.cacheDir, 'bundled', route)}.mjs`
        },
        routes: {
          base: utils.normalizeRoute(route),
          html: `/${route}.html`,
          script: `/bundled/${route}.mjs`,
          stylesheet: `/bundled/${route}.css`
        }
      }

      await bundlePage(hyperlightPage.script)

      // Dynamically import the pages (WARN: strictly requires esnext)
      hyperlightPage.pageImport = await import(
        hyperlightPage.outputPaths.script
      )

      if (hyperlightPage.pageImport.getServerSideState) {
        // Differenciate between server side rendered page and statically generated ones
        console.log(`λ ${hyperlightPage.script}`)
        this.app.get(hyperlightPage.routes.base, this.ssrMw(hyperlightPage))
      } else {
        console.log(`○ ${hyperlightPage.script}`)
        this.staticallyCache(hyperlightPage)
      }
    }

    // End the timer and post result
    console.timeEnd('Build time')

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

  async staticallyCache(page: HyperlightPage) {
    const view = page.pageImport.default
    const state = page.pageImport.getInitialState?.() ?? {}
    const preRender = renderToString(view(state))

    const htmlContent = htmlTemplate(
      prodJsTemplate(state, page.routes.script),
      preRender,
      page.routes.stylesheet
    )

    await utils.writeFileRecursive(htmlContent, page.outputPaths.html)

    console.log(page.outputPaths.html)
    this.app.get(page.routes.base, (_, res) =>
      res.sendFile(page.outputPaths.html)
    )
  }

  ssrMw(page: HyperlightPage) {
    return async (req: Request, res: Response) => {
      const initialState = page.pageImport.getInitialState?.() ?? {}
      const serverSideState = page.pageImport.getServerSideState(req)
      const view = page.pageImport.default

      const state = { ...initialState, ...serverSideState }

      const htmlContent = htmlTemplate(
        prodJsTemplate(
          { ...initialState, ...serverSideState },
          page.routes.script
        ),
        renderToString(view(state)),
        page.routes.stylesheet
      )

      res.send(htmlContent)
    }
  }
}

export const Hyperlight = (config?: Partial<HyperlightConfiguration>) =>
  new HyperlightServer(config)
