import { err, ok, Result } from "../../utils/result.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { extractTitle, parseMarkdown } from "../../utils/markdown.ts";
import { FileSystem } from "../../services/file-system.ts";

interface FileSearchOptions {
  searchTerm: string;
  searchByTitle?: boolean;
  searchByFileName?: boolean;
  exactMatch?: boolean;
}

/**
 * Check if filename matches search criteria
 */
function isFileNameMatch(
  fileName: string,
  searchTerm: string,
  fileNameWithMd: string,
  exactMatch: boolean,
): boolean {
  if (exactMatch) {
    return fileName === fileNameWithMd || fileName === searchTerm;
  }

  const fileNameWithoutMd = searchTerm.endsWith(".md") ? searchTerm.slice(0, -3) : searchTerm;
  return fileName.includes(fileNameWithoutMd);
}

/**
 * Check if task title matches search term
 */
async function isTitleMatch(
  filePath: string,
  searchTerm: string,
  fs: FileSystem,
): Promise<boolean> {
  const contentResult = await fs.readTextFile(filePath);
  if (!contentResult.ok) {
    return false;
  }

  const { body } = parseMarkdown(contentResult.value);
  const title = extractTitle(body);

  if (!title) {
    return false;
  }

  return title.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * Search for markdown files in a directory tree
 */
export async function searchMarkdownFiles(
  baseDir: string,
  options: FileSearchOptions,
  fs: FileSystem,
): Promise<Result<string[], Error>> {
  const found: string[] = [];
  const { searchTerm, searchByTitle = true, searchByFileName = true, exactMatch = false } = options;

  // Prepare search terms
  const fileNameWithMd = searchTerm.endsWith(".md") ? searchTerm : `${searchTerm}.md`;

  async function searchDir(dir: string): Promise<void> {
    const entriesResult = await fs.readDir(dir);
    if (!entriesResult.ok) {
      return; // Ignore directories we can't read
    }

    for await (const entry of entriesResult.value) {
      const fullPath = join(dir, entry.name);

      const statResult = await fs.stat(fullPath);
      if (!statResult.ok) {
        continue;
      }

      if (statResult.value.isDirectory) {
        await searchDir(fullPath);
      } else if (statResult.value.isFile && entry.name.endsWith(".md")) {
        let matched = false;

        // Check filename match
        if (searchByFileName) {
          matched = isFileNameMatch(entry.name, searchTerm, fileNameWithMd, exactMatch);
        }

        // Check title match if not already matched by filename
        if (!matched && searchByTitle) {
          matched = await isTitleMatch(fullPath, searchTerm, fs);
        }

        if (matched) {
          found.push(fullPath);
        }
      }
    }
  }

  try {
    await searchDir(baseDir);
    return ok(found);
  } catch (error) {
    return err(new Error(`Failed to search files: ${error}`));
  }
}

/**
 * Search for a file recursively in a directory (backward compatibility)
 */
export function searchFile(
  baseDir: string,
  searchTerm: string,
  fs: FileSystem,
): Promise<Result<string[], Error>> {
  return searchMarkdownFiles(baseDir, { searchTerm }, fs);
}
