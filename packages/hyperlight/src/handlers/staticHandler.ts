import { checkPeer } from '../utils/fileutils'
import path from 'path'
import { App } from '@tinyhttp/app'

export async function serveHyperapp(app: App) {
  checkPeer('hyperapp') // throw error if peer dep hyperapp is not satisfied

  app.get('/hyperapp.js', (_, res) => {
    res.sendFile(path.resolve('node_modules/hyperapp/hyperapp.js'))
  })

  app.get('/hyperapp.js.map', (_, res) =>
    res.sendFile(path.resolve('node_modules/hyperapp/hyperapp.js.map'))
  )
}
