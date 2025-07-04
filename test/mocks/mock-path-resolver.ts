import { PathResolver } from "../../src/services/path-resolver.ts";
import { Result, ok } from "../../src/utils/result.ts";
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
    return ok(this.baseDir);
  }
  
  async getTaskDir(repoInfo: RepoInfo | null): Promise<Result<string, Error>> {
    if (!repoInfo) {
      await this.fs.mkdir(this.baseDir, true);
      return ok(this.baseDir);
    }
    
    const taskDir = `${this.baseDir}/${repoInfo.owner}/${repoInfo.repo}`;
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
      for (const file of dirResult.value) {
        if (!file.endsWith(".md")) continue;
        
        const fileName = file.toLowerCase();
        if (fileName === normalizedName || fileName === `${normalizedName}.md`) {
          return ok(`${taskDir}/${file}`);
        }
        if (fileName.includes(normalizedName)) {
          return ok(`${taskDir}/${file}`);
        }
      }
    }
    
    // Default to adding .md extension
    const fileName = partialName.endsWith(".md") ? partialName : `${partialName}.md`;
    return ok(`${taskDir}/${fileName}`);
  }
}