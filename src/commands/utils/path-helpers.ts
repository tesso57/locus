import { PathOptions } from "./option-types.ts";

interface PathResult {
  path: string | null;
  found: boolean;
  multiple?: boolean;
  paths?: string[];
  error?: string;
}

/**
 * Output single file path based on format options
 */
export function outputSinglePath(path: string, options: PathOptions): void {
  if (options.json) {
    console.log(JSON.stringify({ path, found: true }, null, 2));
  } else {
    console.log(path);
  }
}

/**
 * Output error when file not found
 */
export function outputNotFound(fileName: string, options: PathOptions): void {
  if (options.json) {
    console.log(JSON.stringify({ path: null, found: false, error: "File not found" }, null, 2));
    Deno.exit(1);
  } else {
    console.error(`エラー: タスクファイルが見つかりません: ${fileName}`);
    Deno.exit(1);
  }
}

/**
 * Output multiple files found
 */
export function outputMultipleFiles(paths: string[], options: PathOptions): void {
  if (options.json) {
    console.log(JSON.stringify(
      {
        path: null,
        found: true,
        multiple: true,
        paths,
      },
      null,
      2,
    ));
  } else {
    console.error(`複数のファイルが見つかりました:`);
    for (const path of paths) {
      console.error(`  ${path}`);
    }
  }
  Deno.exit(1);
}

/**
 * Handle search results and output appropriately
 */
export function handleSearchResults(
  found: string[],
  fileName: string,
  options: PathOptions,
): string | null {
  if (found.length === 0) {
    outputNotFound(fileName, options);
    return null;
  } else if (found.length === 1) {
    return found[0];
  } else {
    outputMultipleFiles(found, options);
    return null;
  }
}

/**
 * Normalize filename by removing .md extension if present
 */
export function normalizeFileName(fileName: string): string {
  return fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
}
