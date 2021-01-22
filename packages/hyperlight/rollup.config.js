import common from '../../rollup.config'
import { dependencies } from './package.json'

const external = Object.keys(dependencies).concat(
  'util',
  'path',
  'fs/promises',
  'fs'
)

export default [
  // {
  //   ...common,
  //   input: 'src/index.ts',
  //   output: [
  //     {
  //       dir: 'dist',
  //       format: 'esm'
  //     }
  //   ],
  //   external
  // },
  {
    ...common,
    input: 'src/cli.ts',
    output: [
      {
        file: 'dist/hyperlight.js',
        format: 'esm'
      }
    ],
    external
  }
]
