import { App, Middleware, Request, Response } from '@tinyhttp/app'
import chokidar from 'chokidar'
import path from 'path'
import { build } from './bundler'
import { devJsTemplate } from './templates'
import { convertFileExtension, normalizeRoute } from './utils/fileutils'
import { HyperlightPage, parseBundle, serverSideHandler } from './utils/ssrutils'

type MiddlewareList = Record<string, Middleware<Request, Response<any>>>

export async function devRouteWatch(
  app: App,
  extensionFilter: string[] = ['tsx', 'jsx', 'ts', 'js']
) {
  const getFullPath = (filename) => path.join(process.cwd(), 'pages/', filename)
  const filter = (filename) => extensionFilter.includes(path.parse(filename).ext.slice(1))

  const devRouter = new DevRouter(app)

  chokidar
    .watch('.', { cwd: 'pages/', followSymlinks: true })
    .on('add', async (filename) => {
      if (!filter(filename)) return

      const fullPath = getFullPath(filename)

      const { server: serverBundle } = await build(fullPath, filename)

      const module = await parseBundle(serverBundle, true)
      const page: HyperlightPage = {
        route: normalizeRoute(convertFileExtension(filename, '')),
        file: path.join('/bundled/', convertFileExtension(filename, '.mjs')),
        module
      }

      devRouter.addRoute(filename, page)
    })
    .on('unlink', (filename) => {
      if (!filter(filename)) return
      devRouter.removeRoute(filename)
    })
}

class DevRouter {
  middlewareList: MiddlewareList
  private app: App

  constructor(app: App) {
    this.app = app
    this.middlewareList = {}

    Object.assign(this.middlewareList, this.app.middleware)
  }

  private updateTHRouter() {
    this.app.middleware = Object.values(this.middlewareList)
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
  }
}
