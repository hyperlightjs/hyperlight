export default {
  pageExtensions: ['.ts', '.tsx'],
  esbuildConfig: (config) => ({
    ...config,
    minify: true,
    plugins: []
  })
}
