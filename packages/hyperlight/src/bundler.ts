import esbuild, { Plugin } from 'esbuild'
import path from 'path'
import builtin from 'builtin-modules'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync as exists } from 'fs'
import { convertFileExtension } from './utils/fileutils'
import event from 'events'
import { error, info, warning } from './utils/logging'
import { modEsbuildConf } from './clientConfig'

interface BundlerOptions {
  fullEntryPath: string
  relativeEntryPath: string
  base?: string
  outfile: string
  watch?: esbuild.WatchMode
  minify?: boolean
}

const common: esbuild.BuildOptions = {
  bundle: true,
  jsxFactory: 'jsx.fa',
  jsxFragment: 'jsx.fr',
  format: 'esm',
  minify: true,
  define: {
    NODE_ENV: 'development'
  }
}

export async function build(
  fullEntryPath: string,
  relativeEntryPath: string,
  watch?: boolean,
  minify?: boolean
): Promise<{ server: string; client: string; stopWatcher?: () => void; eventEmitter: event }> {
  const moduleJsPath = convertFileExtension(relativeEntryPath, '.mjs')
  const server = path.join('.cache/server', moduleJsPath)
  const client = path.join('.cache/client', moduleJsPath)

  const bundleClient = async () =>
    await clientBundling({
      fullEntryPath,
      relativeEntryPath,
      outfile: client,
      minify
    })

  const emitter = new event.EventEmitter()

  const buildResult = await serverBundling({
    fullEntryPath,
    relativeEntryPath,
    outfile: server,
    minify,
    watch: watch
      ? {
          onRebuild: async (buildError) => {
            info(`Building "${relativeEntryPath}"...`)
            if (!buildError) await bundleClient()

            emitter.emit('build', relativeEntryPath)
          }
        }
      : undefined
  })

  await bundleClient()

  return { server, client, stopWatcher: buildResult.stop, eventEmitter: emitter }
}

export async function serverBundling({ ...options }: BundlerOptions) {
  let build: esbuild.BuildResult
  try {
    build = await esbuild.build(
      await modEsbuildConf({
        ...common,
        banner: { js: `const require=(await import('module')).createRequire(import.meta.url);` },
        target: 'node12.4.0',
        platform: 'node',
        entryPoints: [options.fullEntryPath],
        outbase: options.base,
        outfile: options.outfile,
        watch: options.watch,
        minify: typeof options.minify === 'undefined' ? true : options.minify
      })
    )
  } catch (e) {
    error(e)
  }

  for (const warningmessage of build.warnings) warning(warningmessage.text)

  return build
}

export async function clientBundling({ ...options }: BundlerOptions) {
  // writeFile()

  const treeShake = path.join(
    '.cache/treeshake/',
    convertFileExtension(options.relativeEntryPath, '.treeshake.ts')
  )

  if (!exists(treeShake)) {
    await mkdir(path.parse(treeShake).dir, { recursive: true })
    await writeFile(
      treeShake,
      `export { default, appConfig } from '${path.resolve(options.fullEntryPath)}'`
    )
  }

  let build: esbuild.BuildResult
  try {
    build = await esbuild.build(
      await modEsbuildConf({
        ...common,
        entryPoints: [treeShake],
        plugins: [blankImportPlugin],
        platform: 'node',
        outbase: options.base,
        outfile: options.outfile,
        watch: options.watch,
        minify: typeof options.minify === 'undefined' ? true : options.minify
      })
    )
  } catch (e) {
    error(e)
  }

  return build
}

const builtinList = builtin.reduce((prev, val, index) => (index > 0 ? `${prev}|${val}` : val))

const builtinRegexp = new RegExp(`^(${builtinList})\\/?(.+)?`)

const blankImportPlugin: Plugin = {
  name: 'blankimport',
  setup(build) {
    build.onResolve({ filter: builtinRegexp }, (args) => ({
      path: args.path,
      namespace: 'blankimport'
    }))
    build.onLoad({ filter: builtinRegexp, namespace: 'blankimport' }, async (args) => {
      const contents = JSON.stringify(
        /**
         * Operation steps:
         * - Import the module server side so you're 100% sure it will resolve
         * NOTE: A module won't get completely imported twice unless its import url changes, so the import is cached.
         * - get the keys of the import. This will get the name of every named export present in the built-in
         * - Reduce the string array into an object with the initializer {}, each string is added as the key of the object with an empty string
         *   so named imports will work but will just import a blank object.
         * - Finally stringify the object and let esbuild handle the rest for you
         */
        Object.keys(await import(args.path)).reduce<Record<string, string>>(
          (p, c) => ({ ...p, [c]: '' }),
          {}
        )
      )
      return {
        contents,
        loader: 'json'
      }
    })
  }
}
