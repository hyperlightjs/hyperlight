import { bgCyan, bold, black, bgRed, bgYellow } from 'colorette'

const boldBlack = (text: string) => bold(black(text))

export function info(message: string) {
  console.log(`${boldBlack(bgCyan(' INFO '))} ${message}`)
}

export function error(message: string) {
  console.log(`${bgRed(' ERROR ')} ${message}`)
}

export function warning(message: string) {
  console.log(`${boldBlack(bgYellow(' WARN '))} ${message}`)
}
