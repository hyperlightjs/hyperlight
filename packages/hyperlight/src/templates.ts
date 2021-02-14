import { State } from 'hyperapp'
import { minify } from 'terser'

export type JsTemplate = (state: any, pagePath: string) => Promise<string>
export type DevTemplateConstructor = (wsHost?: string, wsPort?: number) => JsTemplate

export const prodJsTemplate: JsTemplate = async (state, pagePath) =>
  (
    await minify(`
import { app } from '/hyperapp.js'
import * as pageModule from '${pagePath}'
const init = ${JSON.stringify(state)}
const appSettings = pageModule.appConfig?.(init)

app({
  init,
  view: pageModule.default,
  node: document.getElementById('app'),
  dispatch: appSettings?.middleware,
  subscriptions: appSettings?.subscriptions
})
`)
  ).code

export const devJsTemplate = async (state: State<any>, pagePath: string) => `
import { app } from '/hyperapp.js'
import * as pageModule from '${pagePath}'

import { livereload } from '/livereload.js'
const { middlewareConstructor: middleware, savedState } = livereload(location.hostname, "3003")

const init = { ...savedState, ...${JSON.stringify(state)} }
const appSettings = pageModule.appConfig?.(init)

app({
  init,
  view: pageModule.default,
  node: document.getElementById('app'),
  dispatch: middleware(appSettings?.middleware),
  subscriptions: appSettings?.subscriptions
})
`

export const htmlTemplate = (js: string, head: string, preRender: string, stylesheet: string) => `
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="${stylesheet}">
    ${head}
  </head>
  <body>
    <main id="app">${preRender}</main>
    <script type="module">
      ${js}
    </script>
  </body>
</html>
`
