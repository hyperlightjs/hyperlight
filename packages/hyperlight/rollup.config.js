import common from '../../rollup.config'

export default [
  {
    ...common,
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'esm'
      }
    ]
  },
  {
    ...common,
    input: 'src/hyperlight.ts',
    output: [
      {
        file: 'dist/hyperlight.js',
        format: 'esm'
      }
    ]
  }
]
