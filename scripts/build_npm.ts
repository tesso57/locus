// ex. scripts/build_npm.ts
import { build, emptyDir } from "@deno/dnt";

// Read version from deno.json
const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));
const version = denoConfig.version || "0.1.0";

await emptyDir("./npm");

await build({
  entryPoints: ["./src/cli.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  package: {
    name: "@tesso/locus",
    version: version,
    description: "A Git-aware task management CLI tool that organizes tasks by Git repository",
    license: "MIT",
    author: "tesso",
    repository: {
      type: "git",
      url: "git+https://github.com/tesso57/locus.git",
    },
    bugs: {
      url: "https://github.com/tesso57/locus/issues",
    },
    keywords: ["task", "management", "cli", "git", "markdown", "productivity"],
    engines: {
      node: ">=18.0.0"
    },
    bin: {
      locus: "./bin/locus"
    }
  },
  typeCheck: false, // Disable type checking for now due to Cliffy issues
  test: false, // Disable test for now
  declaration: "separate", // Generate separate .d.ts files
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM"],
  },
  scriptModule: false, // Only generate ESM
  
  postBuild() {
    // Ensure the docs directory exists
    try {
      Deno.mkdirSync("npm/docs", { recursive: true });
      Deno.mkdirSync("npm/bin", { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    // Copy necessary files
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
    Deno.copyFileSync("docs/README_ja.md", "npm/docs/README_ja.md");
    
    // Create a wrapper script for the CLI
    const wrapperScript = `#!/usr/bin/env node
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the CLI module
import("../esm/cli.js").then(async (module) => {
  await module.main();
}).catch(err => {
  console.error("Failed to run locus:", err);
  process.exit(1);
});
`;
    
    Deno.writeTextFileSync("npm/bin/locus", wrapperScript);
    
    // Make the script executable
    if (Deno.build.os !== "windows") {
      Deno.chmodSync("npm/bin/locus", 0o755);
    }
  },
});