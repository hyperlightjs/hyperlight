import esbuild from 'esbuild'

export async function bundlePage(scriptPath: string) {
  let build

  try {
    build = await esbuild.build({
      entryPoints: [`pages/${scriptPath}`],
      bundle: true,
      external: ['@tinyhttp/app'],
      platform: 'node',
      jsxFactory: 'jsx',
      jsxFragment: 'Fragment',
      format: 'esm',
      outdir: `.cache/bundled`,
      outbase: 'pages',
      outExtension: {
        '.js': '.mjs'
      },
      splitting: true,
      define: {
        NODE_ENV: 'development'
      }
    })
  } catch (e) {
    console.error(e.message)
    return
  }

  for (const warning of build.warnings) console.warn(warning)
}
