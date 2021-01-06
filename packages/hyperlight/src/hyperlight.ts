import { Hyperlight } from '.'
import cac from 'cac'

const cli = cac('hyperlight')

cli.command('').action(cli.outputHelp)

cli
  .command('prod', 'Starts the production-ready server')
  .option('--host <host>', 'The IP the server will listen on')
  .option('--port <port>', 'The port the server will listen on')
  .option('--directory <directory>', 'Change the working directory')
  .action((options) => {
    if (options.directory) process.chdir(options.directory)

    Hyperlight({ host: options.host, port: options.port })
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
