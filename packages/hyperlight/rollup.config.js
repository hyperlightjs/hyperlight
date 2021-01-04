import esbuild from 'rollup-plugin-esbuild'
import pluginBin from 'rollup-plugin-bin'
import plugints from 'rollup-plugin-ts'

import pkg from './package.json'

const config = (input, output, plugins) => ({
  input,
  plugins: [plugints({ tsconfig: 'tsconfig.json' }), esbuild(), ...plugins],
  output: output ?? {
    dir: 'dist',
    format: 'esm'
  }
})

export default [
  config('src/hyperlight.ts', undefined, [pluginBin()]),
  config(
    'src/index.ts',
    [
      { format: 'esm', file: pkg.module },
      { format: 'cjs', file: pkg.main }
    ],
    []
  )
]
