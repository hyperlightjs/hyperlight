import esbuild from 'esbuild'
import path from 'path'
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

export async function serverBundling({ ...options }: BundlerOptions) {
  let build: esbuild.BuildResult
  try {
    build = await esbuild.build({
      ...common,
      banner: `const require=(await import('module')).createRequire(import.meta.url);`,
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
      `
        export { default } from '${path.resolve(options.fullEntryPath)}'
      `
    )
  }

  let build: esbuild.BuildResult
  try {
    build = await esbuild.build({
      ...common,
      entryPoints: [treeShake],
      outbase: options.base,
      outfile: options.outfile
    })
  } catch (e) {
    console.error(e)
  }
}
