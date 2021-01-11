import path from 'path'
import { BuildOptions } from 'esbuild'

export interface HyperlightConfigFile {
  pageExtensions: string[]
  esbuildConfig: (config: BuildOptions) => BuildOptions
}

export type ConfigLoader = () => Promise<HyperlightConfigFile | null>

const configPath = path.join(process.cwd(), 'hyperlight.config.js')

const defaultConfig: HyperlightConfigFile = {
  pageExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  esbuildConfig: (config) => config
}

export const loadConfig: ConfigLoader = async () => {
  // @ts-ignore
  try {
    const configFile = await import(configPath)
    const configuration: HyperlightConfigFile = configFile?.default

    configuration.pageExtensions ??= defaultConfig.pageExtensions
    configuration.esbuildConfig ??= defaultConfig.esbuildConfig

    return configuration
  } catch (e) {
    return defaultConfig
  }
}
