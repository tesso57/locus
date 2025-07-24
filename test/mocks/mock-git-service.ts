import { GitService } from "../../src/services/git-service.ts";
import { ok, Result } from "../../src/utils/result.ts";
import { GitInfo, RepoInfo } from "../../src/types.ts";

/**
 * Mock Git service for testing
 */
export class MockGitService implements GitService {
  private mockGitInfo: GitInfo = { isRepo: false };
  private mockRepoInfo: RepoInfo | null = null;
  private methodCalls: Map<string, any[]> = new Map();

  hasGit(): Promise<Result<boolean, Error>> {
    this.recordCall("hasGit", {});
    return Promise.resolve(ok(true));
  }

  isGitRepo(_cwd?: string): Promise<Result<boolean, Error>> {
    this.recordCall("isGitRepo", { cwd: _cwd });
    return Promise.resolve(ok(this.mockGitInfo.isRepo));
  }

  getGitInfo(_cwd?: string): Promise<Result<GitInfo, Error>> {
    this.recordCall("getGitInfo", { cwd: _cwd });
    return Promise.resolve(ok(this.mockGitInfo));
  }

  getRepoInfo(_cwd?: string): Promise<Result<RepoInfo | null, Error>> {
    this.recordCall("getRepoInfo", { cwd: _cwd });
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

  /**
   * Get all method calls for a specific method
   */
  getMethodCalls(method: string): any[] {
    return this.methodCalls.get(method) || [];
  }

  /**
   * Reset method call tracking
   */
  reset(): void {
    this.methodCalls.clear();
  }

  private recordCall(method: string, args: any): void {
    if (!this.methodCalls.has(method)) {
      this.methodCalls.set(method, []);
    }
    this.methodCalls.get(method)!.push(args);
  }
}
