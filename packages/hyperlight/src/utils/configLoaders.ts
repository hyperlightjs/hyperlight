import path from 'path'

export interface HyperlightConfigFile {
  pageExtensions: string[]
}

export type ConfigLoader = () => Promise<HyperlightConfigFile | null>

const configPath = path.join(process.cwd(), 'hyperlight.config.js')

const defaultConfig: HyperlightConfigFile = {
  pageExtensions: ['.tsx', '.ts', '.jsx', '.js']
}

export const loadConfig: ConfigLoader = async () => {
  // @ts-ignore
  try {
    const configFile = await import(configPath)
    const configuration: HyperlightConfigFile = configFile?.default?.()

    configuration.pageExtensions ?? defaultConfig.pageExtensions

    return configFile?.default?.()
  } catch (e) {
    return defaultConfig
  }
}
