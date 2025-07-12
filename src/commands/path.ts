import { Command } from "@cliffy/command";
import { ensureMarkdownExtension, validateFileName } from "../utils/markdown.ts";
import { isAbsolute, resolve } from "@std/path";
import { createAction, executeCommand, getRepoInfoOptional } from "./utils/command-helpers.ts";
import { PathOptions } from "./utils/option-types.ts";
import { checkFileExists, searchFile, validateFileExists } from "./utils/file-helpers.ts";
import { ok, Result } from "../utils/result.ts";
import { FileSystem } from "../services/file-system.ts";
import { PathResolver } from "../services/path-resolver.ts";
import { GitService } from "../services/git-service.ts";
import { RepoInfo } from "../types.ts";
import { logError } from "../utils/errors.ts";
import {
  handleSearchResults,
  normalizeFileName,
  outputNotFound,
  outputSinglePath,
} from "./utils/path-helpers.ts";

/**
 * Handle absolute path
 */
async function handleAbsolutePath(
  fileName: string,
  options: PathOptions,
  fileSystem: FileSystem,
): Promise<Result<void, Error>> {
  const existsResult = await validateFileExists(fileName, fileSystem);
  if (!existsResult.ok) {
    return existsResult;
  }
  outputSinglePath(fileName, options);
  return ok(undefined);
}

/**
 * Search in all task directories
 */
async function searchAllDirectories(
  baseFileName: string,
  options: PathOptions,
  pathResolver: PathResolver,
  fileSystem: FileSystem,
): Promise<Result<void, Error>> {
  const baseDirResult = pathResolver.getBaseDir();
  if (!baseDirResult.ok) {
    return baseDirResult;
  }

  const foundResult = await searchFile(baseDirResult.value, baseFileName, fileSystem);
  if (!foundResult.ok) {
    return foundResult;
  }

  const foundPath = handleSearchResults(foundResult.value, baseFileName, options);
  if (foundPath) {
    outputSinglePath(foundPath, options);
  }

  return ok(undefined);
}

/**
 * Search in current directory
 */
async function searchCurrentDirectory(
  fileName: string,
  baseFileName: string,
  options: PathOptions,
  repoInfo: RepoInfo | null,
  pathResolver: PathResolver,
  fileSystem: FileSystem,
): Promise<Result<void, Error>> {
  const taskDirResult = await pathResolver.getTaskDir(repoInfo);
  if (!taskDirResult.ok) {
    return taskDirResult;
  }

  // Try exact match first
  const exactMatchPath = await findExactMatch(
    baseFileName,
    fileName,
    taskDirResult.value,
    fileSystem,
  );

  if (exactMatchPath) {
    outputSinglePath(exactMatchPath, options);
    return ok(undefined);
  }

  // Search for partial match or by title
  const searchResult = await searchFile(taskDirResult.value, baseFileName, fileSystem);
  if (!searchResult.ok) {
    return searchResult;
  }

  const found = searchResult.value;

  // Special handling for not found with hint
  if (found.length === 0 && !options.noGit && !repoInfo) {
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            path: null,
            found: false,
            error: "File not found",
            hint: "Use --no-git option outside Git repository",
          },
          null,
          2,
        ),
      );
    } else {
      logError(`タスクファイルが見つかりません: ${baseFileName}`);
      console.error(`ヒント: Gitリポジトリ外の場合は --no-git オプションを使用してください`);
    }
    Deno.exit(1);
    return ok(undefined);
  }

  const foundPath = handleSearchResults(found, baseFileName, options);
  if (foundPath) {
    outputSinglePath(foundPath, options);
  }

  return ok(undefined);
}

/**
 * Try to find exact match with or without .md extension
 */
async function findExactMatch(
  baseFileName: string,
  originalFileName: string,
  taskDir: string,
  fileSystem: FileSystem,
): Promise<string | null> {
  // Try with .md extension first
  const fileNameWithMd = ensureMarkdownExtension(baseFileName);
  let filePath = resolve(taskDir, fileNameWithMd);

  let existsResult = await checkFileExists(filePath, fileSystem);
  if (!existsResult.ok) {
    return null;
  }

  if (existsResult.value) {
    return filePath;
  }

  // If not found with .md, try without extension (in case it was provided with .md)
  if (originalFileName.endsWith(".md")) {
    filePath = resolve(taskDir, baseFileName);
    existsResult = await checkFileExists(filePath, fileSystem);
    if (!existsResult.ok || !existsResult.value) {
      return null;
    }
    return filePath;
  }

  return null;
}

export function createPathCommand(): Command<any, any, any> {
  return new Command()
    .name("path")
    .description("タスクファイルの絶対パスを表示")
    .arguments("<fileName:string>")
    .option("--no-git", "Git情報を使用しない")
    .option("-a, --all", "すべてのタスクディレクトリから検索")
    .option("--json", "JSON形式で出力")
    .action(createAction<PathOptions>(async (options, fileName: string) => {
      await executeCommand(async ({ container }) => {
        const gitService = container.getGitService();
        const pathResolver = await container.getPathResolver();
        const fileSystem = container.getFileSystem();

        // Handle absolute path
        if (isAbsolute(fileName)) {
          return handleAbsolutePath(fileName, options, fileSystem);
        }

        // Normalize filename
        const baseFileName = normalizeFileName(fileName);
        validateFileName(baseFileName);

        // Get repository information
        const repoInfo = await getRepoInfoOptional(gitService, options.noGit);

        // Search based on options
        if (options.all) {
          return searchAllDirectories(baseFileName, options, pathResolver, fileSystem);
        } else {
          return searchCurrentDirectory(
            fileName,
            baseFileName,
            options,
            repoInfo,
            pathResolver,
            fileSystem,
          );
        }
      });
    }));
}
