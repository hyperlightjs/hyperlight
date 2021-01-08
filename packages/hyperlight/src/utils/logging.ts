import { cyan, bold, red, yellow, gray, blue } from 'colorette'

function msg(message: string) {
  return `${gray(bold('['))} ${message} ${gray(bold(']'))}`
}

export function info(message: string) {
  console.info(msg(bold(cyan('INFO'))), message)
}

export function error(message: string) {
  console.error(msg(bold(red('ERROR'))), message)
}

export function warning(message: string) {
  console.error(msg(bold(yellow('WARN'))), message)
}

export function success(message: string) {
  console.error(msg(bold(blue('SUCCESS'))), message)
}
