import esbuild from "esbuild";
import { readFileSync } from "fs";

const watch = process.argv.includes("--watch");

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const version = pkg.version;

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: !watch,
  sourcemap: true,
  treeShaking: true,
  conditions: ["worker", "browser"],
  // Add version banner that survives minification
  banner: {
    js: `/* @botmonio/sdk@${version} */`,
  },
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete");
}
