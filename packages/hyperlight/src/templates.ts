import { minify } from 'terser'

interface State {
  serverSideState: any
  initialState: any
}
export type JsTemplate = (state: State, pagePath: string) => Promise<string>
type DevTemplateConstructor = (wsHost?: string, wsPort?: number) => JsTemplate

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
  middleware: appSettings?.middleware,
  subscriptions: appSettings?.subscriptions
})
`)
  ).code

export const devJsTemplate: DevTemplateConstructor = (wsHost, wsPort) => async (
  state,
  pagePath
) => `
import { app } from '/hyperapp.js'
import * as pageModule from '${pagePath}'

import { livereload } from '/livereload.js'
const { middleware, savedState } = livereload("${wsHost}", "${wsPort}")

const init = { ...savedState, ...${JSON.stringify(state)} }
const appSettings = pageModule.appConfig?.(init)

app({
  init,
  view: pageModule.default,
  node: document.getElementById('app'),
  middleware: middleware(appSettings?.middleware),
  subscriptions: appSettings?.subscriptions
})
`

export const htmlTemplate = (
  js: string,
  head: string,
  preRender: string,
  stylesheet: string
) => `
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
