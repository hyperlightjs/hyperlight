export type HtmlTemplate = (
  js: string,
  preRender: string,
  stylesheet: string
) => string;
export type JsTemplate = (state: any, scriptPath: string) => string;

export const prodJsTemplate: JsTemplate = (state: any, scriptPath: string) => `
import { h, text, app } from './hyperapp.js'
import pageScript from '/scripts/${scriptPath}.mjs'

app({
  init: ${JSON.stringify(state)},
  view: pageScript,
  node: document.getElementById('app')
})
`;

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
`;
