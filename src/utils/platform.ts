/**
 * Cross-platform utility functions
 */

import { join } from "@std/path";

/**
 * Get the user's home directory in a cross-platform way
 * On Unix systems (Linux, macOS), uses HOME
 * On Windows, uses USERPROFILE
 */
export function getHomeDir(): string | undefined {
  if (Deno.build.os === "windows") {
    return Deno.env.get("USERPROFILE");
  }
  return Deno.env.get("HOME");
}

/**
 * Get the config directory in a cross-platform way
 * Respects XDG_CONFIG_HOME on all platforms if set
 * Falls back to platform-specific defaults
 */
export function getDefaultConfigDir(): string {
  const xdgConfig = Deno.env.get("XDG_CONFIG_HOME");
  if (xdgConfig) {
    return xdgConfig;
  }

  const home = getHomeDir();
  if (!home) {
    throw new Error(
      Deno.build.os === "windows"
        ? "USERPROFILE environment variable is not set"
        : "HOME environment variable is not set",
    );
  }

  if (Deno.build.os === "windows") {
    // On Windows, use AppData/Roaming for config
    return join(home, "AppData", "Roaming");
  }

  // On Unix systems, use ~/.config
  return join(home, ".config");
}
