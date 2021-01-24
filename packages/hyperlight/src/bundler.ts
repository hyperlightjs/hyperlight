import esbuild from 'esbuild'
import path from 'path'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { existsSync as exists } from 'fs'
import { convertFileExtension } from './utils/fileutils'
import { minify } from 'terser'
import readdir from 'readdirp'

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
      `export { default, appConfig } from '${path.resolve(
        options.fullEntryPath
      )}'`
    )
  }

  let build: esbuild.BuildResult
  try {
    build = await esbuild.build({
      ...common,
      entryPoints: [treeShake],
      platform: 'node',
      outbase: options.base,
      outfile: options.outfile
    })
  } catch (e) {
    console.error(e)
  }

  console.time('minification')
  await writeFile(
    treeShake,
    (
      await minify(await readFile(options.outfile, 'utf-8'), {
        compress: true,
        toplevel: true
      })
    ).code
  )
  console.timeEnd('minification')
}
