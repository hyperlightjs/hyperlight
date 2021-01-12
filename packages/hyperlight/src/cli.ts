import { Hyperlight } from '.'
import cac from 'cac'
import { bundlePage, bundleTSBrowser } from './bundler'
import * as utils from './utils/utils'
import path from 'path'
import { prodJsTemplate } from './templates'
import { warning } from './utils/logging'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import ncp from 'ncp'
import { promisify } from 'util'
import { serverSideRender } from './utils/ssr'

const cli = cac('hyperlight')

cli.command('').action(cli.outputHelp)

cli
  .command('bundle <file> [...files]', 'Bundles the specified files')
  .option('--output', 'Specify the output directory (defaults to .cache)')
  .action((file, files: string[], options) => {
    const toBundle = [file, ...files]

    for (const script of toBundle)
      bundlePage(script, { outDir: options.output })
  })

cli
  .command(
    'build [directory]',
    'Builds a directory, making it ready to be served'
  )
  .action((directory) => {
    if (directory) process.chdir(directory)

    Hyperlight({ prodOperation: 'BUILD' })
  })

cli
  .command('serve', 'Starts the production-ready server')
  .option('--host [host]', 'The IP the server will listen on')
  .option('--port [port]', 'The port the server will listen on')
  .option('--directory [directory]', 'Change the working directory')
  .option('--disable-cache', 'Disables file caching')
  .action((options) => {
    if (options.directory) process.chdir(options.directory)

    Hyperlight({
      host: options.host,
      port: options.port,
      prodOperation: 'SERVE',
      disableProdCache: options.disableCache
    })
  })

cli
  .command('dev', 'Starts the dev server with live reload')
  .option('--host [host]', 'The IP the server will listen on')
  .option('--port [port]', 'The port the server will listen on')
  .option('--directory [directory]', 'Change the working directory')
  .option(
    '--ws-port [wsport]',
    'The port where the websocket server (used for live reload) will listen on'
  )
  .action((options) => {
    if (options.directory) process.chdir(options.directory)

    Hyperlight({
      dev: true,
      host: options.host,
      port: options.port,
      wsPort: options.wsPort
    })
  })

cli
  .command('export', 'Statically exports a file in html, css and js files')
  .option('--directory [directory]', 'Change the working directory')
  .option('--output [directory]', 'Output directory')
  .action(async (options) => {
    options.directory ??= 'pages/'
    options.output ??= 'dist/'

    const publicDir = 'public/'

    const scriptsRoute = 'scripts/'
    const scriptsOutput = path.join(options.output, scriptsRoute)

    const tempDir = path.join(options.output, '.temp')

    await utils.createOrRecreate(options.output, 'folder')
    await utils.createOrRecreate(scriptsOutput, 'folder')
    await utils.createOrRecreate(scriptsOutput, 'folder')

    await promisify(ncp)(publicDir, options.output)

    const pages = await utils.scanPages(options.directory)
    for (const page of pages) {
      const pagePath = `/${path.join(
        scriptsRoute,
        utils.convertFileExtension(page, '.mjs')
      )}`

      const fullPagePath = path.join(process.cwd(), options.output, pagePath)
      const htmlRenderPath = path.join(
        options.output,
        utils.convertFileExtension(page, '.html')
      )

      await bundlePage(page, {
        verbose: true,
        outDir: tempDir,
        inputDir: options.directory
      })

      await bundleTSBrowser(utils.convertFileExtension(page, '.mjs'), {
        outDir: scriptsOutput,
        inputDir: tempDir,
        baseDir: tempDir
      })

      const pageImport = await import(fullPagePath)

      if (pageImport.getServerSideState) {
        warning(
          'Server side rendering for each request is not available when exporting, getServerSideState will not be available.'
        )

        warning(`Skipping over: ${page}`)
        continue
      }
      // const view = pageImport.default
      // const state = {
      //   //...pageImport.getServerSideState?.(),
      //   ...pageImport.getInitialState?.()
      // }

      // const htmlCode = htmlTemplate(
      //   await prodJsTemplate(state, pagePath),
      //   renderToString(view(state)),
      //   utils.convertFileExtension(pagePath, '.css')
      // )

      const ssr = await serverSideRender(
        { module: pageImport },
        pagePath,
        utils.convertFileExtension(pagePath, '.css'),
        prodJsTemplate
      )

      const renderPathParse = path.parse(htmlRenderPath)

      if (!existsSync(renderPathParse.dir))
        await mkdir(renderPathParse.dir, { recursive: true })
      await writeFile(htmlRenderPath, ssr.html)
    }
  })

cli.help()
cli.parse()
