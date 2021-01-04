'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var readdir = require('fs-readdir-recursive');
var path = require('path');
var app = require('@tinyhttp/app');
var esbuild = require('esbuild');
var hyperappRender = require('hyperapp-render');
var fs = require('fs');
var promises = require('fs/promises');
var sirv = require('sirv');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var readdir__default = /*#__PURE__*/_interopDefaultLegacy(readdir);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var esbuild__default = /*#__PURE__*/_interopDefaultLegacy(esbuild);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var sirv__default = /*#__PURE__*/_interopDefaultLegacy(sirv);

async function bundlePage(page) {
  let build;
  try {
    build = await esbuild__default['default'].build({
      entryPoints: [`pages/${page.script}`],
      bundle: true,
      external: ["@tinyhttp/app"],
      platform: "node",
      jsxFactory: "jsx",
      jsxFragment: "Fragment",
      format: "esm",
      outdir: `.cache/bundled`,
      outbase: "pages",
      outExtension: {
        ".js": ".mjs"
      },
      splitting: true,
      define: {
        NODE_ENV: "development"
      }
    });
  } catch (e) {
    console.error("[ERROR] Failed to compile: " + e.message);
    return;
  }
  for (const warning of build.warnings)
    console.warn(warning);
}

const prodJsTemplate = (state, pagePath) => `
import { app } from './hyperapp.js'
import view from '${pagePath}'

app({
  init: ${JSON.stringify(state)},
  view,
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
    this.cacheDir = path.join(process.cwd(), ".cache");
    this.config = config ?? {};
    this.config.host ??= "127.0.0.1";
    this.config.port ??= "8080";
    this.app = new app.App();
    this.app.get("/hyperapp.js", (_, res) => {
      res.sendFile(path__default['default'].resolve(`node_modules/hyperapp/hyperapp.js`));
    });
    this.config.dev ? this.devServer() : this.prodServer();
  }
  devServer() {
  }
  async prodServer() {
    const pagesDir = readdir__default['default'](path.join(process.cwd(), "pages/"), (filePath) => path__default['default'].parse(filePath).ext == ".ts" || path__default['default'].parse(filePath).ext == ".tsx");
    fs__default['default'].existsSync(this.cacheDir) ? await promises.rm(this.cacheDir, {recursive: true, force: true}) : "";
    for (const script of pagesDir) {
      const parsedScriptPath = path__default['default'].parse(script);
      const route = path.join(parsedScriptPath.dir, parsedScriptPath.name);
      let normalizedRoute = this.normalizeRoute(route);
      const hyperlightPage = {
        script,
        pageImport: null,
        outputPaths: {
          html: `${path.join(this.cacheDir, route)}.html`,
          script: `${path.join(this.cacheDir, "bundled", route)}.mjs`
        },
        routes: {
          base: normalizedRoute,
          html: `/${route}.html`,
          script: `/bundled/${route}.mjs`,
          stylesheet: `/bundled/${route}.css`
        }
      };
      await bundlePage(hyperlightPage);
      hyperlightPage.pageImport = await Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(hyperlightPage.outputPaths.script)); });
      if (hyperlightPage.pageImport.getServerSideState)
        this.app.get(hyperlightPage.routes.base, this.ssrMw(hyperlightPage, htmlTemplate, prodJsTemplate));
      else
        await this.staticallyCache(hyperlightPage, htmlTemplate, prodJsTemplate);
    }
    this.app.use(sirv__default['default'](this.cacheDir));
    this.app.listen(8080);
  }
  async staticallyCache(page, htmlTemplate2, jsTemplate) {
    const view = page.pageImport.default;
    const state = page.pageImport.getInitialState?.() ?? {};
    const preRender = hyperappRender.renderToString(view(state));
    const htmlContent = htmlTemplate2(jsTemplate(state, page.routes.script), preRender, page.routes.stylesheet);
    fs__default['default'].writeFileSync(page.outputPaths.html, htmlContent);
  }
  ssrMw(page, htmlTemplate2, jsTemplate) {
    return async (req, res) => {
      const initialState = page.pageImport.getInitialState?.() ?? {};
      const serverSideState = page.pageImport.getServerSideState(req);
      const view = page.pageImport.default;
      const state = {...initialState, ...serverSideState};
      const htmlContent = htmlTemplate2(jsTemplate({...initialState, ...serverSideState}, page.routes.script), hyperappRender.renderToString(view(state)), page.routes.stylesheet);
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

exports.Hyperlight = Hyperlight;
exports.HyperlightServer = HyperlightServer;
