import { minify } from 'terser'

export const prodJsTemplate = async (state: any, pagePath: string) =>
  (
    await minify(`
import { app } from '/hyperapp.js'
import view from '${pagePath}'

app({
  init: ${JSON.stringify(state)},
  view,
  node: document.getElementById('app')
})
`)
  ).code

export const devJsTemplate = (
  state: any,
  pagePath: string,
  wsHost?: string,
  wsPort?: number
) => `
import { app } from '/hyperapp.js'
import view from '${pagePath}'

import { livereload } from '/livereload.js'
const { middleware, savedState } = livereload("${wsHost}", "${wsPort}")

app({
  init: savedState ?? ${JSON.stringify(state)},
  view,
  node: document.getElementById('app'),
  middleware
})
`

export const htmlTemplate = (
  js: string,
  preRender: string,
  stylesheet: string
) => `
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="${stylesheet}">
  </head>
  <body>
    <main id="app">${preRender}</main>
    <script type="module">
      ${js}
    </script>
  </body>
</html>
`
