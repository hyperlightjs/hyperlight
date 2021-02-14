import { App, Middleware, Request, Response } from '@tinyhttp/app'
import chokidar from 'chokidar'
import path from 'path'
import WebSocket from 'ws'
import { build } from './bundler'
import { devJsTemplate } from './templates'
import { convertFileExtension, normalizeRoute } from './utils/fileutils'
import { info } from './utils/logging'
import { HyperlightPage, parseBundle, serverSideHandler } from './utils/ssrutils'

type MiddlewareList = Record<string, Middleware<Request, Response<any>>>

export async function devRouteWatch(
  app: App,
  extensionFilter: string[] = ['tsx', 'jsx', 'ts', 'js']
) {
  const getFullPath = (filename) => path.join(process.cwd(), 'pages/', filename)
  const filter = (filename) => extensionFilter.includes(path.parse(filename).ext.slice(1))

  const devRouter = new DevRouter(app)
  const devWatchRegisterer = new DevWatcher()
  const livereload = new LiveReloadServer()

  chokidar
    .watch('.', { cwd: 'pages/', followSymlinks: true })
    .on('add', async (filename) => {
      if (!filter(filename)) return

      const fullPath = getFullPath(filename)

      const { server: serverBundle, stopWatcher, eventEmitter } = await build(
        fullPath,
        filename,
        true
      )

      eventEmitter.on('build', async (filename: string) => {
        const module = await parseBundle(serverBundle, true)
        const page: HyperlightPage = {
          route: normalizeRoute(convertFileExtension(filename, '')),
          file: path.join('/bundled/', convertFileExtension(filename, '.mjs')),
          module
        }

        devWatchRegisterer.addWatcher(filename, stopWatcher)
        devRouter.reloadRoute(filename, page)
        livereload.send('reload')
      })

      eventEmitter.emit('build', filename) // Emit the first build event after the build
    })
    .on('unlink', (filename) => {
      if (!filter(filename)) return

      info(`Removing "${filename}"`)
      devWatchRegisterer.stopWatcher(filename)
      devRouter.removeRoute(filename)
    })
  // .on('all', console.log)
}

class LiveReloadServer {
  ws: WebSocket.Server

  constructor() {
    this.ws = new WebSocket.Server({ port: 3003, host: '0.0.0.0' })
  }

  send(event: string) {
    this.ws.clients.forEach((socket) => socket.send(event))
  }
}

class DevWatcher {
  private watcherStoppers: Record<string, () => void> = {} // filename / stop function pairs

  addWatcher(filename: string, stopWatcher: () => void) {
    this.watcherStoppers[filename] = stopWatcher
  }

  stopWatcher(filename: string) {
    this.watcherStoppers[filename]()
    this.watcherStoppers[filename] = undefined
  }
}

class DevRouter {
  private middlewareList: MiddlewareList
  private app: App

  constructor(app: App) {
    this.app = app
    this.middlewareList = {}

    Object.assign(this.middlewareList, this.app.middleware)
  }

  private updateTHRouter() {
    this.app.middleware = Object.values(this.middlewareList).filter((v) => v !== undefined)
  }

  addRoute(filename: string, page: HyperlightPage) {
    this.middlewareList[filename] = {
      type: 'route',
      method: 'GET',
      handler: serverSideHandler(page, null, `${page.file}.css`, devJsTemplate),
      path: page.route
    }

    this.updateTHRouter()
  }

  removeRoute(filename: string) {
    this.middlewareList[filename] = undefined

    this.updateTHRouter()
  }

  reloadRoute(filename: string, page: HyperlightPage) {
    this.removeRoute(filename)
    this.addRoute(filename, page)
  }
}
