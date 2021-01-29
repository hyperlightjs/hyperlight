import { checkPeer } from '../utils/fileutils'
import { App } from '@tinyhttp/app'
import { minify } from 'terser'
import { eTag } from '@tinyhttp/etag'
import { readFile } from 'fs/promises'

export async function serveHyperapp(app: App) {
  checkPeer('hyperapp') // throw error if peer dep hyperapp is not satisfied

  const minifiedHyperapp = (await minify(await readFile('node_modules/hyperapp/index.js', 'utf-8')))
    .code
  const hyperappEtag = eTag(minifiedHyperapp)

  app.get('/hyperapp.js', ({ headers }, res) => {
    if (headers['if-none-match'] === hyperappEtag) res.status(304).end()
    else res.type('application/javascript').header({ ETag: hyperappEtag }).send(minifiedHyperapp)
  })
}
