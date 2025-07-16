import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { join } from "@std/path";

describe("Windows CI debug", () => {
  it("should handle platform paths correctly", () => {
    console.log("=== Platform Debug Info ===");
    console.log("OS:", Deno.build.os);
    console.log("Current directory:", Deno.cwd());
    console.log("HOME env:", Deno.env.get("HOME"));
    console.log("USERPROFILE env:", Deno.env.get("USERPROFILE"));
    
    // Test path joining
    const parts = ["C:", "Users", "test", "locus"];
    const joined = join(...parts);
    console.log("\njoined path:", joined);
    
    // Test what happens with forward slashes on Windows
    const unixStyle = "/home/test/locus";
    const normalized = join(unixStyle);
    console.log("Unix style normalized:", normalized);
    
    // Always pass - this is just for debugging
    assertEquals(true, true);
  });
});