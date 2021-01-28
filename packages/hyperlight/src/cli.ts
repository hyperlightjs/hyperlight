import cac from 'cac'
import { HyperlightBuilder } from './builder'
import { HyperlightServer } from './server'

const cli = cac('hyperlight')

cli
  .command('build [directory]', 'Builds a directory, making it ready to be served')
  .action(async (directory) => {
    if (directory) process.chdir(directory)

    const builder = new HyperlightBuilder(['ts', 'tsx'])
    builder.build()
    /* MUST REWRITE */
  })

cli
  .command('serve [directory]', 'Starts the production-ready server')
  .option('--host [host]', 'The IP the server will listen on')
  .option('--port [port]', 'The port the server will listen on')
  .option('--disable-cache', 'Disables file caching')
  .action((directory, options) => {
    if (directory) process.chdir(directory)

    const host = options.host ?? '127.0.0.1'
    const port = options.port ?? 3000

    const server = new HyperlightServer({ host, port })

    server.productionServer()
  })

cli
  .command('dev [directory]', 'Start the development server')
  .option('--host [host]', 'The IP the server will listen on')
  .option('--port [port]', 'The port the server will listen on')
  .option('--disable-cache', 'Disables file caching')
  .action((directory, options) => {
    if (directory) process.chdir(directory)

    const host = options.host ?? '127.0.0.1'
    const port = options.port ?? 3000

    const server = new HyperlightServer({ host, port })

    server.devServer()
  })

cli.parse()
