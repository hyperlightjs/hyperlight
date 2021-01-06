import chalk from 'chalk'

const boldBlack = (text: string) => chalk.bold(chalk.black(text))

export function info(message: string) {
  console.log(`${boldBlack(chalk.bgCyan(' INFO '))} ${message}`)
}

export function error(message: string) {
  console.log(`${chalk.bgRed(' ERROR ')} ${message}`)
}

export function warning(message: string) {
  console.log(`${boldBlack(chalk.bgYellow(' WARN '))} ${message}`)
}
