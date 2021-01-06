import { Hyperlight } from '.'
import cac from 'cac'
import { bundlePage } from './bundler'

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
  .option('--host <host>', 'The IP the server will listen on')
  .option('--port <port>', 'The port the server will listen on')
  .option('--directory <directory>', 'Change the working directory')
  .action((options) => {
    if (options.directory) process.chdir(options.directory)

    Hyperlight({
      host: options.host,
      port: options.port,
      prodOperation: 'SERVE'
    })
  })

cli
  .command('dev', 'Starts the dev server with live reload')
  .option('--host <host>', 'The IP the server will listen on')
  .option('--port <port>', 'The port the server will listen on')
  .option('--directory <directory>', 'Change the working directory')
  .option(
    '--ws-port <wsport>',
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

cli.help()
cli.parse()
