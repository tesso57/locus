import { Result, ok, err } from "../utils/result.ts";
import { GitError, GitNotRepoError, GitNoRemoteError, GitCommandError } from "../utils/errors.ts";
import { GitInfo, RepoInfo } from "../types.ts";

/**
 * Git service interface
 */
export interface GitService {
  /**
   * Check if git command is available
   */
  hasGit(): Promise<Result<boolean, Error>>;
  
  /**
   * Check if current directory is inside a git repository
   */
  isGitRepo(cwd?: string): Promise<Result<boolean, Error>>;
  
  /**
   * Get git repository information
   */
  getGitInfo(cwd?: string): Promise<Result<GitInfo, Error>>;
  
  /**
   * Get repository information (owner and repo name)
   */
  getRepoInfo(cwd?: string): Promise<Result<RepoInfo | null, Error>>;
}

/**
 * Default Git service implementation
 */
export class DefaultGitService implements GitService {
  async hasGit(): Promise<Result<boolean, Error>> {
    try {
      const command = new Deno.Command("git", {
        args: ["--version"],
        stdout: "null",
        stderr: "null",
      });
      const { success } = await command.output();
      return ok(success);
    } catch {
      return ok(false);
    }
  }
  
  async isGitRepo(cwd?: string): Promise<Result<boolean, Error>> {
    const hasGitResult = await this.hasGit();
    if (!hasGitResult.ok || !hasGitResult.value) {
      return ok(false);
    }
    
    try {
      const command = new Deno.Command("git", {
        args: ["rev-parse", "--is-inside-work-tree"],
        cwd: cwd || Deno.cwd(),
        stdout: "piped",
        stderr: "null",
      });
      const { success } = await command.output();
      return ok(success);
    } catch {
      return ok(false);
    }
  }
  
  async getGitInfo(cwd?: string): Promise<Result<GitInfo, Error>> {
    const isRepoResult = await this.isGitRepo(cwd);
    if (!isRepoResult.ok) {
      return err(isRepoResult.error);
    }
    
    if (!isRepoResult.value) {
      return ok({ isRepo: false });
    }
    
    const rootResult = await this.getGitRoot(cwd);
    const remoteUrlResult = await this.getRemoteUrl(cwd);
    
    return ok({
      isRepo: true,
      root: rootResult.ok ? rootResult.value : undefined,
      remoteUrl: remoteUrlResult.ok ? remoteUrlResult.value : undefined,
    });
  }
  
  async getRepoInfo(cwd?: string): Promise<Result<RepoInfo | null, Error>> {
    const gitInfoResult = await this.getGitInfo(cwd);
    if (!gitInfoResult.ok) {
      return err(gitInfoResult.error);
    }
    
    const gitInfo = gitInfoResult.value;
    if (!gitInfo.isRepo) {
      return ok(null);
    }
    
    if (!gitInfo.remoteUrl) {
      return ok(null);
    }
    
    try {
      const url = this.normalizeGitUrl(gitInfo.remoteUrl);
      const repoInfo = this.parseRepoInfo(url);
      return ok(repoInfo);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new GitError(`Failed to parse repository info: ${message}`));
    }
  }
  
  private async getGitRoot(cwd?: string): Promise<Result<string, Error>> {
    try {
      const command = new Deno.Command("git", {
        args: ["rev-parse", "--show-toplevel"],
        cwd: cwd || Deno.cwd(),
        stdout: "piped",
        stderr: "piped",
      });
      const { stdout, stderr, success } = await command.output();
      
      if (!success) {
        const errorMessage = new TextDecoder().decode(stderr).trim();
        return err(new GitCommandError(errorMessage, "git rev-parse --show-toplevel"));
      }
      
      const root = new TextDecoder().decode(stdout).trim();
      return ok(root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new GitError(`Failed to get git root: ${message}`));
    }
  }
  
  private async getRemoteUrl(cwd?: string): Promise<Result<string, Error>> {
    try {
      const command = new Deno.Command("git", {
        args: ["remote", "get-url", "origin"],
        cwd: cwd || Deno.cwd(),
        stdout: "piped",
        stderr: "piped",
      });
      const { stdout, stderr, success } = await command.output();
      
      if (!success) {
        const errorMessage = new TextDecoder().decode(stderr).trim();
        if (errorMessage.includes("No such remote")) {
          return err(new GitNoRemoteError());
        }
        return err(new GitCommandError(errorMessage, "git remote get-url origin"));
      }
      
      const url = new TextDecoder().decode(stdout).trim();
      return ok(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new GitError(`Failed to get remote URL: ${message}`));
    }
  }
  
  private normalizeGitUrl(raw: string): URL {
    // SSH / SCP-like format: git@github.com:user/repo.git
    const sshPattern = /^git@([^:]+):(.+)$/;
    const match = raw.match(sshPattern);
    
    if (match) {
      const [, host, path] = match;
      return new URL(`https://${host}/${path.replace(/\.git$/, "")}`);
    }
    
    // Already HTTPS or git://
    const url = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw.replace(/^git:\/\//, "https://"));
    
    // Strip .git suffix
    url.pathname = url.pathname.replace(/\.git$/, "");
    
    return url;
  }
  
  private parseRepoInfo(url: URL): RepoInfo {
    const parts = url.pathname.replace(/^\/|\/$/g, "").split("/");
    
    if (parts.length < 2) {
      throw new Error("Invalid repository URL: missing owner or repo name");
    }
    
    const repo = parts.pop()!;
    const owner = parts.join("/"); // Support nested groups (GitLab)
    
    return {
      host: url.host,
      owner,
      repo,
    };
  }
}