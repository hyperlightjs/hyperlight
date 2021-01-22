import typescript from '@rollup/plugin-typescript'

const common = {
  plugins: [typescript({ include: ['./src/**/*.ts'] })],
  external: ['hyperapp']
}

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'esm'
      }
    ],
    ...common
  },
  {
    input: 'src/jsxRuntime.ts',
    output: [
      {
        file: 'dist/jsxRuntime.js',
        format: 'esm'
      }
    ],
    ...common
  }
]
