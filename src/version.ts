/**
 * Version utility for dynamic version loading
 */

// Try to load version from deno.json
let VERSION = "0.0.0";

try {
  // Use import.meta.resolve to get the path relative to the current module
  const denoJsonPath = new URL("../deno.json", import.meta.url);
  const denoJsonText = await Deno.readTextFile(denoJsonPath);
  const denoJson = JSON.parse(denoJsonText);
  VERSION = denoJson.version || VERSION;
} catch (error) {
  // Fallback to hardcoded version if deno.json cannot be read
  // This can happen in compiled binaries or when permissions are restricted
  VERSION = "0.1.2";
}

export { VERSION };
