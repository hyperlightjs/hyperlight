import esbuild from "esbuild";
import { HyperlightPage } from "./server";

export async function bundlePage(page: HyperlightPage) {
  let build;

  try {
    build = await esbuild.build({
      entryPoints: [`pages/${page.script}`],
      bundle: true,
      external: ["hyperapp", "@tinyhttp/app"],
      platform: "node",
      jsxFactory: "jsx",
      format: "esm",
      outdir: `.cache/bundled`,
      outbase: "pages",
      outExtension: {
        ".js": ".mjs",
      },
      splitting: true,
      define: {
        NODE_END: "development",
      },
    });
  } catch (e) {
    console.error("Failed to compile");
    console.error(e.message);
    return;
  }

  for (const warning of build.warnings) console.warn(warning);
}
