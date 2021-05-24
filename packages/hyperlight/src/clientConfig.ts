import path from 'path'
import esbuild from 'esbuild'

import { HyperlightConfiguration } from './types'

export const importClientConf = async (): Promise<HyperlightConfiguration> => {
  return (await import(path.join(process.cwd(), 'hyperlight.js'))).default
}

export const modEsbuildConf = async (
  config: esbuild.BuildOptions
): Promise<esbuild.BuildOptions> => {
  const moddedConfig = (await importClientConf())?.esbuild?.(config)

  return moddedConfig || config
}
