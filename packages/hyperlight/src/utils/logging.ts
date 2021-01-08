import { bgCyan, bold, black, bgRed, bgYellow } from 'colorette'

const boldBlack = (text: string) => bold(black(text))

export function info(message: string) {
  console.info(`${boldBlack(bgCyan(' INFO '))} ${message}`)
}

export function error(message: string) {
  console.error(`${bgRed(' ERROR ')} ${message}`)
}

export function warning(message: string) {
  console.warn(`${boldBlack(bgYellow(' WARN '))} ${message}`)
}
