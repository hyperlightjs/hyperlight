import esbuild from 'esbuild'
import path from 'path'
import { gray } from 'colorette'
import { error, info, warning } from './utils/logging'
import { writeFile } from 'fs/promises'
import * as utils from './utils/utils'

interface BundlerOptions {
  verbose: boolean
  inputDir: string
  outDir: string
  baseDir: string
  outputFile: string
}

const commonSettings: esbuild.BuildOptions = {
  bundle: true,
  external: ['@tinyhttp/app'],
  platform: 'node',
  jsxFactory: 'jsx.fa',
  jsxFragment: 'jsx.fr',
  format: 'esm',
  minify: true,
  splitting: true,
  define: {
    NODE_ENV: 'development'
  },
  outExtension: {
    '.js': '.mjs'
  }
}

export async function bundlePage(
  scriptPath: string,
  options?: Partial<BundlerOptions>
) {
  let build: esbuild.BuildResult
  const entryPoint = path.join(options?.inputDir ?? '', scriptPath)

  const bundleLog = (message: string) =>
    options?.verbose ? info(message) : false

  bundleLog(
    gray(`${new Date().toLocaleTimeString('en-US')} - Detected file change`)
  )
  bundleLog(`Bundling ${entryPoint}\n`)

  try {
    build = await esbuild.build({
      ...commonSettings,
      entryPoints: [entryPoint],
      outdir: options.outDir ?? `.cache/bundled`,
      outbase: options.baseDir ?? 'pages/',
      outfile: options.outputFile
    })
  } catch (e) {
    error('FAILED!\n')
    error(e.message)
    return
  }

  for (const w of build.warnings) warning([w.text, w.location].join('\n'))
}

export async function bundleTSBrowser( // ts stands for tree shaker here btw
  inputFile: string,
  options?: Partial<BundlerOptions>
) {
  const bundledPath = path.join(options.inputDir, inputFile)

  const treeShaker = utils.convertFileExtension(bundledPath, '.js')
  await writeFile(treeShaker, `export { default } from '${bundledPath}'`)

  await esbuild.build({
    ...commonSettings,
    entryPoints: [treeShaker],
    outbase: options?.baseDir,
    outdir: options.outDir
  })
}
