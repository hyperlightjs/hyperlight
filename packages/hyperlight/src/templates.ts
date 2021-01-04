export type HtmlTemplate = (
  js: string,
  preRender: string,
  stylesheet: string
) => string
export type JsTemplate = (state: any, view: any) => string

export const prodJsTemplate: JsTemplate = (state: any, pagePath: string) => `
import { app } from './hyperapp.js'
import view from '${pagePath}'

app({
  init: ${JSON.stringify(state)},
  view,
  node: document.getElementById('app')
})
`

export const htmlTemplate: HtmlTemplate = (
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
