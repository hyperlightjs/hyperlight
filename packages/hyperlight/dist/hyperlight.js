#!/usr/bin/env node
import readdir from 'fs-readdir-recursive';
import path, { join } from 'path';
import { App } from '@tinyhttp/app';
import esbuild from 'esbuild';
import { renderToString } from 'hyperapp-render';
import fs from 'fs';
import sirv from 'sirv';

async function bundlePage(page) {
  let build;
  try {
    build = await esbuild.build({
      entryPoints: [`pages/${page.script}`],
      bundle: true,
      external: ["hyperapp", "@tinyhttp/app"],
      platform: "node",
      jsxFactory: "jsx",
      format: "esm",
      outdir: `.cache/bundled`,
      outbase: "pages",
      outExtension: {
        ".js": ".mjs"
      },
      splitting: true,
      define: {
        NODE_END: "development"
      }
    });
  } catch (e) {
    console.error("Failed to compile");
    console.error(e.message);
    return;
  }
  for (const warning of build.warnings)
    console.warn(warning);
}

const prodJsTemplate = (state, scriptPath) => `
import { h, text, app } from './hyperapp.js'
import pageScript from '/scripts/${scriptPath}.mjs'

app({
  init: ${JSON.stringify(state)},
  view: pageScript,
  node: document.getElementById('app')
})
`;
const htmlTemplate = (js, preRender, stylesheet) => `
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

class HyperlightServer {
  constructor(config) {
    this.cacheDir = join(process.cwd(), ".cache");
    this.config = config ?? {};
    this.config.host ??= "127.0.0.1";
    this.config.port ??= "8080";
    this.app = new App();
    this.app.get("/hyperapp.js", (_, res) => {
      res.sendFile(path.resolve(`node_modules/hyperapp/hyperapp.js`));
    });
    this.config.dev ? this.devServer() : this.prodServer();
  }
  devServer() {
  }
  async prodServer() {
    const pagesDir = readdir(join(process.cwd(), "pages/"), (filePath) => path.parse(filePath).ext === ".tsx");
    fs.existsSync(this.cacheDir) ? fs.rmSync(this.cacheDir, {recursive: true, force: true}) : "";
    for (const script of pagesDir) {
      const parsedScriptPath = path.parse(script);
      const route = join(parsedScriptPath.dir, parsedScriptPath.name);
      let normalizedRoute = this.normalizeRoute(route);
      const hyperlightPage = {
        script,
        pageImport: null,
        outputPaths: {
          html: `${join(this.cacheDir, route)}.html`,
          script: `${join(this.cacheDir, "bundled", route)}.mjs`
        },
        routes: {
          base: normalizedRoute,
          html: `/${route}.html`,
          script: `/bundled/${route}.mjs`,
          stylesheet: `/bundled/${route}.css`
        }
      };
      await bundlePage(hyperlightPage);
      hyperlightPage.pageImport = await import(hyperlightPage.outputPaths.script);
      if (hyperlightPage.pageImport.getServerSideState)
        this.app.get(hyperlightPage.routes.base, this.ssrMw(hyperlightPage, htmlTemplate, prodJsTemplate));
      else
        await this.staticallyCache(hyperlightPage, htmlTemplate, prodJsTemplate);
    }
    this.app.use(sirv(this.cacheDir));
    this.app.listen(8080);
  }
  async staticallyCache(page, htmlTemplate2, jsTemplate) {
    const view = page.pageImport.default;
    const preRender = renderToString(view(page.pageImport.getInitialState));
    const htmlContent = htmlTemplate2(jsTemplate(page.pageImport.getInitialState() ?? {}, page.routes.script), preRender, page.routes.stylesheet);
    fs.writeFileSync(page.outputPaths.html, htmlContent);
  }
  ssrMw(page, htmlTemplate2, jsTemplate) {
    return async (req, res) => {
      const initialState = page.pageImport.getInitialState() ?? {};
      const serverSideState = page.pageImport.getServerSideState(req);
      const view = page.pageImport.default;
      const state = {...initialState, ...serverSideState};
      const htmlContent = htmlTemplate2(jsTemplate({...initialState, ...serverSideState}, page.routes.script), renderToString(view(state)), page.routes.stylesheet);
      res.send(htmlContent);
    };
  }
  normalizeRoute(route) {
    const lastIndex = route.lastIndexOf("index");
    if (lastIndex >= 0)
      return route.slice(0, lastIndex);
    else
      return route;
  }
}
const Hyperlight = (config) => new HyperlightServer(config);

Hyperlight();
