import { join } from "@std/path";

/**
 * Get platform-appropriate test home directory
 */
export function getTestHome(): string {
  if (Deno.build.os === "windows") {
    return join("C:", "Users", "test");
  }
  return "/home/test";
}

/**
 * Get platform-appropriate test user home directory
 */
export function getTestUserHome(): string {
  if (Deno.build.os === "windows") {
    return join("C:", "Users", "user");
  }
  return "/home/user";
}

/**
 * Build a test path using the appropriate home directory
 */
export function testPath(...parts: string[]): string {
  return join(getTestHome(), ...parts);
}

/**
 * Build a test user path using the appropriate home directory
 */
export function testUserPath(...parts: string[]): string {
  return join(getTestUserHome(), ...parts);
}
