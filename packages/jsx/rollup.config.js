import esbuild from "rollup-plugin-esbuild";

export default {
  input: "src/index.ts",
  plugins: [esbuild({ target: "esnext" })],
  output: {
    dir: "dist",
    format: "esm",
  },
};
