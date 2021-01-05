import plugints from 'rollup-plugin-ts'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  plugins: [plugints()],
  output: [
    {
      file: pkg.module,
      format: 'esm'
    }
  ]
}
