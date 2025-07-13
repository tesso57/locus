// ex. scripts/build_npm.ts
import { build, emptyDir } from "@deno/dnt";

// Read version from deno.json
const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));
const version = denoConfig.version || "0.1.0";

await emptyDir("./npm");

await build({
  entryPoints: ["./src/mod.ts"],
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
    }
  },
  typeCheck: false, // Disable type checking for now due to Cliffy issues
  test: false, // Disable test for now
  declaration: "separate", // Generate separate .d.ts files
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM"],
  },
  
  postBuild() {
    // Ensure the docs directory exists
    try {
      Deno.mkdirSync("npm/docs", { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    // Copy necessary files
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
    Deno.copyFileSync("docs/README_ja.md", "npm/docs/README_ja.md");
  },
});