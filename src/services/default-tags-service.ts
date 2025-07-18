import { err, ok, Result } from "../utils/result.ts";
import { join } from "@std/path";
import {
  ClearTagsOptions,
  GetTagOptions,
  ListTagsOptions,
  RemoveTagOptions,
  SetTagOptions,
  TagInfo,
  TagsService,
} from "./tags-service.ts";
import { PathResolver } from "./path-resolver.ts";
import { FileSystem } from "./file-system.ts";
import { MarkdownService } from "./markdown-service.ts";
import { FrontMatter, RepoInfo } from "../types.ts";
import {
  FileSystemError,
  getErrorMessage,
  PropertyNotFoundError,
  TaskNotFoundError,
} from "../utils/errors.ts";

/**
 * Default implementation of TagsService
 */
export class DefaultTagsService implements TagsService {
  constructor(
    private pathResolver: PathResolver,
    private fileSystem: FileSystem,
    private markdownService: MarkdownService,
  ) {}

  async listTags(options: ListTagsOptions): Promise<Result<TagInfo[], Error>> {
    if (!options.fileName) {
      // List all task files
      return await this.getAllTaskFiles();
    }

    // Get properties of a specific file
    const filePathResult = await this.resolveTaskFile(options.fileName, options.repoInfo);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    const filePath = filePathResult.value;

    try {
      if (!await this.fileSystem.exists(filePath)) {
        return err(new TaskNotFoundError(options.fileName));
      }

      const contentResult = await this.fileSystem.readTextFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.markdownService.parseMarkdown(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }
      const { frontmatter } = parseResult.value;

      const tagInfo: TagInfo = {
        fileName: filePath.split("/").pop() || "",
        path: filePath,
        frontmatter: frontmatter || {},
      };

      return ok([tagInfo]);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to list tags: ${message}`));
    }
  }

  async getTag(options: GetTagOptions): Promise<Result<unknown, Error>> {
    const filePathResult = await this.resolveTaskFile(options.fileName, options.repoInfo);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    const filePath = filePathResult.value;

    try {
      if (!await this.fileSystem.exists(filePath)) {
        return err(new TaskNotFoundError(options.fileName));
      }

      const contentResult = await this.fileSystem.readTextFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.markdownService.parseMarkdown(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }
      const { frontmatter } = parseResult.value;

      if (!frontmatter || !(options.property in frontmatter)) {
        return err(new PropertyNotFoundError(options.property));
      }

      return ok(frontmatter[options.property]);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to get tag: ${message}`));
    }
  }

  async setTag(options: SetTagOptions): Promise<Result<void, Error>> {
    const filePathResult = await this.resolveTaskFile(options.fileName, options.repoInfo);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    const filePath = filePathResult.value;

    try {
      let frontmatter: FrontMatter = {};
      let body = "";

      if (await this.fileSystem.exists(filePath)) {
        const contentResult = await this.fileSystem.readTextFile(filePath);
        if (!contentResult.ok) {
          return err(contentResult.error);
        }
        const parseResult = this.markdownService.parseMarkdown(contentResult.value);
        if (!parseResult.ok) {
          return err(parseResult.error);
        }
        const parsed = parseResult.value;
        frontmatter = parsed.frontmatter || {};
        body = parsed.body;
      }

      frontmatter = this.markdownService.mergeFrontmatter(frontmatter, {
        [options.property]: options.value,
      });

      const generateResult = this.markdownService.generateMarkdown(frontmatter, body);
      if (!generateResult.ok) {
        return err(generateResult.error);
      }
      const newContent = generateResult.value;
      const writeResult = await this.fileSystem.writeTextFile(filePath, newContent);
      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(undefined);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to set tag: ${message}`));
    }
  }

  async removeTag(options: RemoveTagOptions): Promise<Result<void, Error>> {
    const filePathResult = await this.resolveTaskFile(options.fileName, options.repoInfo);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    const filePath = filePathResult.value;

    try {
      if (!await this.fileSystem.exists(filePath)) {
        return err(new TaskNotFoundError(options.fileName));
      }

      const contentResult = await this.fileSystem.readTextFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.markdownService.parseMarkdown(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }
      const { frontmatter, body } = parseResult.value;

      if (!frontmatter || !(options.property in frontmatter)) {
        return err(new PropertyNotFoundError(options.property));
      }

      delete frontmatter[options.property];

      const generateResult = this.markdownService.generateMarkdown(frontmatter, body);
      if (!generateResult.ok) {
        return err(generateResult.error);
      }
      const newContent = generateResult.value;
      const writeResult = await this.fileSystem.writeTextFile(filePath, newContent);
      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(undefined);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to remove tag: ${message}`));
    }
  }

  async clearTags(options: ClearTagsOptions): Promise<Result<void, Error>> {
    const filePathResult = await this.resolveTaskFile(options.fileName, options.repoInfo);
    if (!filePathResult.ok) {
      return err(filePathResult.error);
    }

    const filePath = filePathResult.value;

    try {
      if (!await this.fileSystem.exists(filePath)) {
        return err(new TaskNotFoundError(options.fileName));
      }

      const contentResult = await this.fileSystem.readTextFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.markdownService.parseMarkdown(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }
      const { body } = parseResult.value;

      const writeResult = await this.fileSystem.writeTextFile(filePath, body);
      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(undefined);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to clear tags: ${message}`));
    }
  }

  async getAllTaskFiles(): Promise<Result<TagInfo[], Error>> {
    const baseDirResult = this.pathResolver.getBaseDir();
    if (!baseDirResult.ok) {
      return err(baseDirResult.error);
    }

    const baseDir = baseDirResult.value;
    const files: TagInfo[] = [];

    try {
      await this.collectTaskFiles(baseDir, files);
      return ok(files);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to get all task files: ${message}`));
    }
  }

  private async resolveTaskFile(
    fileName: string,
    repoInfo?: RepoInfo | null,
  ): Promise<Result<string, Error>> {
    // Check if it's an absolute path
    if (fileName.startsWith("/")) {
      return ok(fileName);
    }

    // Try to find in current repo directory if in a git repo
    if (repoInfo) {
      const taskDirResult = await this.pathResolver.getTaskDir(repoInfo);
      if (!taskDirResult.ok) {
        return err(taskDirResult.error);
      }

      const repoDir = taskDirResult.value;
      const foundResult = await this.findTaskFile(repoDir, fileName);
      if (foundResult.ok) {
        return ok(foundResult.value);
      }
    }

    // Try to find in base directory
    const baseDirResult = this.pathResolver.getBaseDir();
    if (!baseDirResult.ok) {
      return err(baseDirResult.error);
    }

    const foundResult = await this.findTaskFile(baseDirResult.value, fileName);
    if (foundResult.ok) {
      return ok(foundResult.value);
    }

    // If not found, construct path
    const withExt = this.markdownService.ensureMarkdownExtension(fileName);
    return ok(join(baseDirResult.value, withExt));
  }

  private async findTaskFile(dir: string, partialName: string): Promise<Result<string, Error>> {
    const normalizedName = partialName.toLowerCase();

    try {
      const dirResult = await this.fileSystem.readDir(dir);
      if (!dirResult.ok) {
        return err(dirResult.error);
      }

      for await (const entry of dirResult.value) {
        if (!entry.isFile || !entry.name.endsWith(".md")) {
          continue;
        }

        const fileName = entry.name.toLowerCase();

        // Exact match (with or without .md)
        if (fileName === normalizedName || fileName === `${normalizedName}.md`) {
          return ok(join(dir, entry.name));
        }

        // Partial match
        if (fileName.includes(normalizedName)) {
          return ok(join(dir, entry.name));
        }
      }

      return err(new TaskNotFoundError(partialName));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      return err(new FileSystemError(`Failed to find task file: ${message}`));
    }
  }

  private async collectTaskFiles(dir: string, files: TagInfo[]): Promise<void> {
    const dirResult = await this.fileSystem.readDir(dir);
    if (!dirResult.ok) {
      return;
    }

    for await (const entry of dirResult.value) {
      const path = join(dir, entry.name);

      if (entry.isDirectory) {
        await this.collectTaskFiles(path, files);
      } else if (entry.isFile && entry.name.endsWith(".md")) {
        const relativePath = this.getRelativePath(path);
        files.push({
          fileName: entry.name,
          path: relativePath,
          frontmatter: {},
        });
      }
    }
  }

  private getRelativePath(filePath: string): string {
    const baseDirResult = this.pathResolver.getBaseDir();
    if (!baseDirResult.ok) {
      return filePath;
    }

    const baseDir = baseDirResult.value;
    if (filePath.startsWith(baseDir)) {
      return filePath.replace(baseDir + "/", "");
    }
    return filePath;
  }
}
