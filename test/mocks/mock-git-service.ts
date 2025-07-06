import { GitService } from "../../src/services/git-service.ts";
import { ok, Result } from "../../src/utils/result.ts";
import { GitInfo, RepoInfo } from "../../src/types.ts";

/**
 * Mock Git service for testing
 */
export class MockGitService implements GitService {
  private mockGitInfo: GitInfo = { isRepo: false };
  private mockRepoInfo: RepoInfo | null = null;

  hasGit(): Promise<Result<boolean, Error>> {
    return Promise.resolve(ok(true));
  }

  isGitRepo(_cwd?: string): Promise<Result<boolean, Error>> {
    return Promise.resolve(ok(this.mockGitInfo.isRepo));
  }

  getGitInfo(_cwd?: string): Promise<Result<GitInfo, Error>> {
    return Promise.resolve(ok(this.mockGitInfo));
  }

  getRepoInfo(_cwd?: string): Promise<Result<RepoInfo | null, Error>> {
    return Promise.resolve(ok(this.mockRepoInfo));
  }

  // Test helpers
  setGitInfo(info: GitInfo): void {
    this.mockGitInfo = info;
  }

  setRepoInfo(info: RepoInfo | null): void {
    this.mockRepoInfo = info;
    if (info) {
      this.mockGitInfo = {
        isRepo: true,
        root: "/mock/repo",
        remoteUrl: `git@github.com:${info.owner}/${info.repo}.git`,
      };
    }
  }

  setNotInRepo(): void {
    this.mockGitInfo = { isRepo: false };
    this.mockRepoInfo = null;
  }
}
