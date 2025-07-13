#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run
// JSR executable entry point
import { main } from "./cli-export.ts";

await main();