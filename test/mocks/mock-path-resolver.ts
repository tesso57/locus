import { PathResolver } from "../../src/services/path-resolver.ts";
import { ok, Result } from "../../src/utils/result.ts";
import { RepoInfo } from "../../src/types.ts";
import { InMemoryFileSystem } from "./in-memory-fs.ts";

/**
 * Mock PathResolver for testing
 */
export class MockPathResolver implements PathResolver {
  constructor(
    private fs: InMemoryFileSystem,
    private baseDir = "/home/test/locus",
  ) {}

  getBaseDir(): Result<string, Error> {
    // Expand tilde if present
    const expandedDir = this.baseDir.replace(/^~/, this.fs.getHome());
    return ok(expandedDir);
  }

  async getTaskDir(repoInfo: RepoInfo | null): Promise<Result<string, Error>> {
    const baseDirResult = this.getBaseDir();
    if (!baseDirResult.ok) {
      return baseDirResult;
    }
    const baseDir = baseDirResult.value;

    if (!repoInfo) {
      await this.fs.mkdir(baseDir, true);
      return ok(baseDir);
    }

    const taskDir = `${baseDir}/${repoInfo.owner}/${repoInfo.repo}`;
    await this.fs.mkdir(taskDir, true);
    return ok(taskDir);
  }

  async getTaskFilePath(
    fileName: string,
    repoInfo: RepoInfo | null,
  ): Promise<Result<string, Error>> {
    const taskDirResult = await this.getTaskDir(repoInfo);
    if (!taskDirResult.ok) {
      return taskDirResult;
    }

    return ok(`${taskDirResult.value}/${fileName}`);
  }

  getConfigFilePath(): Result<string, Error> {
    return ok(`${this.fs.getHome()}/.config/locus/settings.yml`);
  }

  getConfigDir(): Result<string, Error> {
    return ok(`${this.fs.getHome()}/.config/locus`);
  }

  async resolveTaskFile(
    partialName: string,
    repoInfo: RepoInfo | null,
  ): Promise<Result<string, Error>> {
    const taskDirResult = await this.getTaskDir(repoInfo);
    if (!taskDirResult.ok) {
      return taskDirResult;
    }

    const taskDir = taskDirResult.value;
    const dirResult = await this.fs.readDir(taskDir);

    if (dirResult.ok) {
      const normalizedName = partialName.toLowerCase();
      for await (const entry of dirResult.value) {
        if (!entry.name.endsWith(".md")) continue;

        const fileName = entry.name.toLowerCase();
        if (fileName === normalizedName || fileName === `${normalizedName}.md`) {
          return ok(`${taskDir}/${entry.name}`);
        }
        if (fileName.includes(normalizedName)) {
          return ok(`${taskDir}/${entry.name}`);
        }
      }
    }

    // Default to adding .md extension
    const fileName = partialName.endsWith(".md") ? partialName : `${partialName}.md`;
    return ok(`${taskDir}/${fileName}`);
  }
}
