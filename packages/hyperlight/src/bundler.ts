import esbuild from "esbuild";
import { join as pathJoin } from "path";
import { HyperlightPage } from "./server";

export async function bundlePage(page: HyperlightPage) {
  let build;

  try {
    build = await esbuild.build({
      entryPoints: [`pages/${page.script}`],
      bundle: true,
      external: ["@tinyhttp/app"],
      platform: "node",
      jsxFactory: "jsx",
      jsxFragment: "Fragment",
      format: "esm",
      outdir: `.cache/bundled`,
      outbase: "pages",
      outExtension: {
        ".js": ".mjs",
      },
      splitting: true,
      define: {
        NODE_ENV: "development",
      },
    });
  } catch (e) {
    console.error("[ERROR] Failed to compile: " + e.message);
    return;
  }

  for (const warning of build.warnings) console.warn(warning);
}
