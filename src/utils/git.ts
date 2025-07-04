import { GitInfo, RepoInfo } from "../types.ts";

/**
 * Check if git command is available
 */
export async function hasGit(): Promise<boolean> {
  try {
    const command = new Deno.Command("git", { 
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Check if current directory is inside a git repository
 */
export async function isGitRepo(cwd?: string): Promise<boolean> {
  if (!await hasGit()) return false;
  
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--is-inside-work-tree"],
      cwd: cwd || Deno.cwd(),
      stdout: "piped",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Get git repository root directory
 */
export async function getGitRoot(cwd?: string): Promise<string | null> {
  if (!await hasGit()) return null;
  
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      cwd: cwd || Deno.cwd(),
      stdout: "piped",
      stderr: "null",
    });
    const { stdout, success } = await command.output();
    if (!success) return null;
    return new TextDecoder().decode(stdout).trim();
  } catch {
    return null;
  }
}

/**
 * Get remote URL for origin
 */
export async function getRemoteUrl(cwd?: string): Promise<string | null> {
  if (!await hasGit()) return null;
  
  try {
    const command = new Deno.Command("git", {
      args: ["remote", "get-url", "origin"],
      cwd: cwd || Deno.cwd(),
      stdout: "piped",
      stderr: "null",
    });
    const { stdout, success } = await command.output();
    if (!success) return null;
    return new TextDecoder().decode(stdout).trim();
  } catch {
    return null;
  }
}

/**
 * Normalize Git URL to HTTPS format
 * Handles SSH, HTTPS, and SCP-like formats
 */
export function normalizeGitUrl(raw: string): URL {
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

/**
 * Parse repository information from URL
 */
export function parseRepoInfo(url: URL): RepoInfo {
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

/**
 * Get git repository information
 */
export async function getGitInfo(cwd?: string): Promise<GitInfo> {
  const isRepo = await isGitRepo(cwd);
  if (!isRepo) {
    return { isRepo: false };
  }
  
  const root = await getGitRoot(cwd);
  const remoteUrl = await getRemoteUrl(cwd);
  
  return {
    isRepo: true,
    root: root || undefined,
    remoteUrl: remoteUrl || undefined,
  };
}

/**
 * Get repository information from current directory
 */
export async function getRepoInfo(cwd?: string): Promise<RepoInfo | null> {
  const gitInfo = await getGitInfo(cwd);
  
  if (!gitInfo.isRepo || !gitInfo.remoteUrl) {
    return null;
  }
  
  try {
    const url = normalizeGitUrl(gitInfo.remoteUrl);
    return parseRepoInfo(url);
  } catch {
    return null;
  }
}