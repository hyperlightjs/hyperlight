const pt2 = require("rollup-plugin-typescript2");

export default {
  input: "src/index.ts",
  plugins: [pt2()],
  output: {
    dir: "dist",
    format: "esm",
  },
};
