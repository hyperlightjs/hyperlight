import { App, NextFunction, Request, Response } from '@tinyhttp/app'
import { bundlePage } from './bundler'
import { renderToString } from 'hyperapp-render'
import path from 'path'
import fs from 'fs'
import { rm as fsRm } from 'fs/promises'
import { devJsTemplate, htmlTemplate, prodJsTemplate } from './templates'
import sirv from 'sirv'
import chokidar from 'chokidar'
import * as utils from './utils/utils'
import serveHandler from 'serve-handler'
import { error, info } from './utils/logging'

export interface HyperlightConfiguration {
  host: string
  port: number
  dev: undefined | true
  wsPort: number
  prodOperation: 'BUILD' | 'SERVE'
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
  bundledDir: string = path.join(this.cacheDir, 'bundled/')
  depTreeCache: string = path.join(this.cacheDir, 'deptree.json')
  pagesDir: string = path.join(process.cwd(), 'pages/')
  publicDir: string = path.join(process.cwd(), 'public/')

  hyperappJs = 'node_modules/hyperapp/hyperapp.js'

  constructor(config?: Partial<HyperlightConfiguration>) {
    this.config = config ?? {}

    this.config.host ??= 'localhost'
    this.config.port ??= 3000
    this.config.wsPort ??= 8030

    this.app = new App({
      onError: this.appErrorHandler
    })

    if (!fs.existsSync(this.hyperappJs)) {
      error("Package 'hyperapp' is not installed!")
      return
    }

    this.app.get('/hyperapp.js', (_, res) => {
      res.sendFile(path.resolve(this.hyperappJs))
    })

    if (this.config.dev) {
      this.devServer()
    } else if (this.config.prodOperation === 'BUILD') {
      this.prodBuild()
    } else {
      this.prodServe()
    }
  }

  async appErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (err.code !== 404) {
      error(err.message)
      error(err.stack)
    } else if (err.code === 404) res.send('404 Not found')
    else res.send(`${err.message}, check the console`)

    next?.()
  }

  async clearCache() {
    await utils.createOrRecreate(this.cacheDir, 'folder')
    // if (this.config.dev)
    // await utils.createOrRecreate(this.depTreeCache, 'file', '{}')
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

  async devServer() {
    const { reloadAll } = await utils.createLiveServerWs()
    const liveReloadCode = `export ${await (
      await import('@hyperlight/livereload/dist/index.js')
    ).livereload.toString()}`

    await this.clearCache() // Clear cache

    const devWatchHandler = utils.fileWatchDevHandler(this.pagesDir, reloadAll)

    const watcher = chokidar
      .watch('.', { cwd: this.pagesDir, ignored: /^.*\.(css)$/ })
      .on('unlink', (path) => this.removeFromCache(path))
      .on('all', (eventName, filepath) =>
        devWatchHandler(watcher, eventName, filepath)
      )

    this.app.use(async (req, res, next) => {
      const hypotheticalFile = path.join(this.bundledDir, `${req.path}.mjs`)

      const hypotheticalFolder = path.join(this.bundledDir, req.path)

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
        const slugScan = await utils.scanForSlug(this.bundledDir, req.path)
        if (!slugScan) {
          next?.()
          return
        }

        pageModule.moduleImport = slugScan.moduleImport
        pageModule.modulePath = path.join(this.bundledDir, slugScan.module)

        req.params = { ...slugScan.slug }
      }

      const randomImport = Math.round(Math.random() * 1000000)

      // Since import() caches imports, just adding a query param (that has no effect on node) prevents it from caching
      // At the moment just a Math.random() is good enough, there will be 1 in a million chance of getting a cached file

      const page = await import(
        `${pageModule.modulePath}?random=${randomImport}`
      )
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

    this.app.get('/livereload.js', (_, res) => {
      res.type('text/javascript').send(liveReloadCode)
    })

    this.app.use('/bundled/', (req, res) =>
      serveHandler(req, res, { public: this.bundledDir })
    )

    this.app.use('/', (req, res) =>
      serveHandler(req, res, { public: this.publicDir, symlinks: true })
    )

    this.app.listen(
      this.config.port,
      () =>
        info(
          `Started on: http://${this.config.host}:${this.config.port}\n\n` // Comunicate that the server is now listening
        ),
      this.config.host
    )
  }

  async prodBuild() {
    const pagesDir = await utils.scanPages(this.pagesDir)

    await this.clearCache() // Clear cache folder

    for (const script of pagesDir)
      bundlePage(path.join(this.pagesDir, script), {
        outDir: this.bundledDir
      }) // bundle every page
  }

  async prodServe() {
    // Get all the files in the pages directory
    const pagesDir = await utils.scanPages(this.pagesDir)

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
          script: `${path.join(this.bundledDir, route)}.mjs`
        },
        routes: {
          base: utils.normalizeRoute(route),
          html: `/${route}.html`,
          script: `/bundled/${route}.mjs`,
          stylesheet: `/bundled/${route}.css`
        }
      }

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
        this.useStaticCache(hyperlightPage)
      }
    }

    this.app.use('/bundled/', sirv(this.bundledDir))

    this.app.use('/', sirv(this.publicDir))

    this.app.listen(
      this.config.port,
      () =>
        info(
          `Server is now listening on ${this.config.host}:${this.config.port}`
        ),
      this.config.host
    )
  }

  async useStaticCache(page: HyperlightPage) {
    const view = page.pageImport.default
    const state = page.pageImport.getInitialState?.() ?? {}
    const preRender = renderToString(view(state))

    const htmlContent = htmlTemplate(
      await prodJsTemplate(state, page.routes.script),
      preRender,
      page.routes.stylesheet
    )

    this.app.get(page.routes.base, (_, res) =>
      res.type('text/html').send(htmlContent)
    )
  }

  ssrMw(page: HyperlightPage) {
    const initialState = page.pageImport.getInitialState?.() ?? {}

    return async (req: Request, res: Response) => {
      const serverSideState = page.pageImport.getServerSideState(req)
      const view = page.pageImport.default

      const state = { ...initialState, ...serverSideState }

      const htmlContent = htmlTemplate(
        await prodJsTemplate(
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
