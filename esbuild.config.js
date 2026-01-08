import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

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
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete");
}
