import esbuild, { Plugin } from 'esbuild'
import path from 'path'
import builtin from 'builtin-modules'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync as exists } from 'fs'
import { convertFileExtension } from './utils/fileutils'

interface BundlerOptions {
  fullEntryPath: string
  relativeEntryPath: string
  base?: string
  outfile: string
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
  relativeEntryPath: string
): Promise<{ server: string; client: string }> {
  const moduleJsPath = convertFileExtension(relativeEntryPath, '.mjs')
  const server = path.join('.cache/server', moduleJsPath)
  const client = path.join('.cache/client', moduleJsPath)

  await serverBundling({
    fullEntryPath,
    relativeEntryPath,
    outfile: server
  })

  await clientBundling({
    fullEntryPath,
    relativeEntryPath,
    outfile: client
  })

  return { server, client }
}

export async function serverBundling({ ...options }: BundlerOptions) {
  let build: esbuild.BuildResult
  try {
    build = await esbuild.build({
      ...common,
      banner: `const require=(await import('module')).createRequire(import.meta.url);`,
      target: 'node12.4.0',
      platform: 'node',
      entryPoints: [options.fullEntryPath],
      outbase: options.base,
      outfile: options.outfile
    })
  } catch (e) {
    console.error(e)
  }

  for (const warning of build.warnings) console.error(warning)

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
    build = await esbuild.build({
      ...common,
      entryPoints: [treeShake],
      plugins: [blankImportPlugin],
      platform: 'node',
      outbase: options.base,
      outfile: options.outfile
    })
  } catch (e) {
    console.error(e)
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
