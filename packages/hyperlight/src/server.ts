import { App, NextFunction, Request, Response } from '@tinyhttp/app'
import { bundlePage, bundleTSBrowser } from './bundler'
import path from 'path'
import fs from 'fs'
import { rm as fsRm } from 'fs/promises'
import { devJsTemplate, prodJsTemplate } from './templates'
import sirv, { Options } from 'sirv'
import chokidar from 'chokidar'
import table from 'as-table'
import * as utils from './utils/utils'
import serveHandler from 'serve-handler'
import { error, info, success } from './utils/logging'
import { serverSideRender } from './utils/ssr'
import { eTag } from '@tinyhttp/etag'
import { generateCacheHeaders } from './utils/cacheManager'
import { ServerSideRenderResult } from './typings'
import { loadConfig } from './utils/configLoaders'

export interface HyperlightCliOptions {
  host: string
  port: number
  dev: true | undefined
  wsPort: number
  prodOperation: 'BUILD' | 'SERVE'
  disableProdCache: boolean
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
  options: Partial<HyperlightCliOptions>

  app: App

  cacheDir: string = path.join(process.cwd(), '.cache')
  bundledDir: string = path.join(this.cacheDir, 'bundled/')
  scriptsDir: string = path.join(this.cacheDir, 'scripts/')
  depTreeCache: string = path.join(this.cacheDir, 'deptree.json')
  pagesDir: string = path.join(process.cwd(), 'pages/')
  publicDir: string = path.join(process.cwd(), 'public/')

  cacheSirvSettings?: Options

  hyperappJs = 'node_modules/hyperapp/hyperapp.js'

  constructor(options?: Partial<HyperlightCliOptions>) {
    this.options = options ?? {}

    this.options.host ??= 'localhost'
    this.options.port ??= 3000
    this.options.wsPort ??= 8030
    this.options.disableProdCache ??= false

    this.options.disableProdCache
      ? ''
      : (this.cacheSirvSettings = { immutable: true, maxAge: 300, etag: true })

    this.app = new App({
      onError: this.appErrorHandler
    })

    if (!fs.existsSync(this.hyperappJs)) {
      error("Package 'hyperapp' is not installed!")
      return
    }

    const etag = eTag(this.hyperappJs)
    this.app.get('/hyperapp.js', (_, res) => {
      res.set(generateCacheHeaders(etag, 'public', 500))
      res.sendFile(path.resolve(this.hyperappJs))
    })

    if (this.options.dev) {
      this.devServer()
    } else if (this.options.prodOperation === 'BUILD') {
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
    if (err.code === 404 || res.statusCode === 404) {
      res.statusCode = 404
      res.send('404 Not found')
    } else {
      error(err.message)
      error(err.stack)
      res.send(err.message)
    }

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
    const config = await loadConfig()

    const { reloadAll } = await utils.createLiveServerWs()
    const liveReloadCode = `export ${await (
      await import('@hyperlight/livereload/dist/index.js')
    ).livereload.toString()}`

    await this.clearCache() // Clear cache

    const devWatchHandler = utils.fileWatchDevHandler(this.pagesDir, reloadAll)

    const watcher = chokidar
      .watch('.', {
        cwd: this.pagesDir,
        followSymlinks: true
      })
      .on('unlink', (path) =>
        utils.allowedExtension(path, config.pageExtensions) // Chokidar does not support file filtering. I had to implement it myself
          ? this.removeFromCache(path)
          : ''
      )
      .on('all', (eventName, filepath) =>
        utils.allowedExtension(filepath, config.pageExtensions)
          ? devWatchHandler(watcher, eventName, filepath)
          : ''
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

      const styleSheet = utils.convertFileExtension(
        pageModule.moduleImport,
        '.css'
      )
      const jsTemplate = devJsTemplate(this.options.host, this.options.wsPort)

      const ssr = await serverSideRender(
        { module: page },
        pageModule.moduleImport,
        styleSheet,
        jsTemplate,
        { req, res, params: req.params }
      )

      await this.ssrResponseHandler(res, ssr)
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
      this.options.port,
      () =>
        info(
          `Started on: http://${this.options.host}:${this.options.port}\n\n` // Comunicate that the server is now listening
        ),
      this.options.host
    )
  }

  async prodBuild() {
    const config = await loadConfig()

    const pagesDir = await utils.scanPages(this.pagesDir, config.pageExtensions)

    await this.clearCache() // Clear cache folder

    info('Creating an optimized production build')

    const buildInfo = []

    for (const script of pagesDir) {
      const route = utils.getRouteFromScript(script)

      // bundle every page
      await bundlePage(script, {
        inputDir: this.pagesDir,
        baseDir: this.pagesDir,
        outDir: this.bundledDir
      })

      const tempBundle = await import(
        `${path.join(this.bundledDir, route)}.mjs`
      )

      await bundleTSBrowser(
        utils.convertFileExtension(script, '.mjs'),
        {
          outDir: this.scriptsDir,
          inputDir: this.bundledDir,
          baseDir: this.bundledDir
        },
        [tempBundle.appConfig ? 'appConfig' : undefined]
      )

      const pageModulePath = `${path.join(this.scriptsDir, route)}`

      const size = await utils.getReadableFileSize(`${pageModulePath}.mjs`)

      buildInfo.push({
        Page: `${tempBundle.getServerSideState ? 'λ' : '○'} ${script}`,
        Size: size
      })
    }

    console.log('\n', table(buildInfo))

    // Symbol legenda
    console.log(`\n○  (Static) - rendered as static HTML`)
    console.log('λ  (Server) - rendered at runtime')
    console.log('\n')

    success('Production build completed\n')
    info(`To start the project in production mode run \`hyperlight serve\`\n`)
  }

  async prodServe() {
    // Get all the files in the pages directory
    const pagesDir = await utils.scanPages(this.pagesDir)

    // Bundle all scripts and put them in the cache folder
    // NOTE: this is where the difference between statically generated and server side rendered is made
    for (const script of pagesDir) {
      const route = utils.getRouteFromScript(script)

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
          script: `/scripts/${route}.mjs`,
          stylesheet: `/scripts/${route}.css`
        }
      }

      // Dynamically import the pages (WARN: strictly requires esnext)
      hyperlightPage.pageImport = await import(
        hyperlightPage.outputPaths.script
      )

      if (hyperlightPage.pageImport.getServerSideState) {
        // Differenciate between server side rendered page and statically generated ones
        this.app.get(
          hyperlightPage.routes.base,
          this.ssrMw(hyperlightPage, !this.options.disableProdCache)
        )
      } else {
        this.useStaticCache(hyperlightPage)
      }
    }

    this.app.use('/scripts/', sirv(this.scriptsDir, this.cacheSirvSettings))

    this.app.use('/', sirv(this.publicDir, this.cacheSirvSettings))

    this.app.listen(
      this.options.port,
      () =>
        info(
          `Server is now listening on ${this.options.host}:${this.options.port}`
        ),
      this.options.host
    )
  }

  async useStaticCache(page: HyperlightPage) {
    const ssr = await serverSideRender(
      { module: page.pageImport },
      page.routes.script,
      page.routes.stylesheet,
      prodJsTemplate
    )

    const etag = eTag(ssr.html)
    const cacheHeaders = !this.options.disableProdCache
      ? generateCacheHeaders(etag, 'public', 500)
      : {}

    this.app.get(page.routes.base, (_, res) => {
      res.set(cacheHeaders).send(ssr.html)
    })
  }

  ssrMw(page: HyperlightPage, cache?: boolean) {
    const initialState = page.pageImport.getInitialState?.() ?? {}

    return async (req: Request, res: Response) => {
      const ssr = await serverSideRender(
        { module: page.pageImport, initialState },
        page.routes.script,
        page.routes.stylesheet,
        prodJsTemplate,
        { req, res, params: req.params }
      )

      if (cache) res.set(generateCacheHeaders(eTag(ssr.html), 'private', 500))

      await this.ssrResponseHandler(res, ssr)
    }
  }

  async ssrResponseHandler(res: Response, ssr: ServerSideRenderResult<any>) {
    if (ssr.serverSideState.notFound) {
      res.statusCode = 404
      throw 'not found'
    } else if (ssr.serverSideState.redirect)
      res
        .header('Location', ssr.serverSideState.redirect.dest)
        .status(
          ssr.serverSideState.redirect.statusCode ??
            (ssr.serverSideState.redirect.permanent ? 301 : 307)
        )
        .end()
    else res.type('text/html').send(ssr.html)
  }
}

export const Hyperlight = (config?: Partial<HyperlightCliOptions>) =>
  new HyperlightServer(config)
