import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { parsePropertyValue, parseKeyValuePairs } from "../../src/utils/property-parser.ts";

describe("parsePropertyValue", () => {
  it("should parse empty string", () => {
    assertEquals(parsePropertyValue(""), "");
  });

  it("should parse boolean values", () => {
    assertEquals(parsePropertyValue("true"), true);
    assertEquals(parsePropertyValue("True"), true);
    assertEquals(parsePropertyValue("TRUE"), true);
    assertEquals(parsePropertyValue("false"), false);
    assertEquals(parsePropertyValue("False"), false);
    assertEquals(parsePropertyValue("FALSE"), false);
  });

  it("should parse number values", () => {
    assertEquals(parsePropertyValue("42"), 42);
    assertEquals(parsePropertyValue("3.14"), 3.14);
    assertEquals(parsePropertyValue("-10"), -10);
    assertEquals(parsePropertyValue("-0.5"), -0.5);
  });

  it("should parse array values (comma-separated)", () => {
    assertEquals(parsePropertyValue("a,b,c"), ["a", "b", "c"]);
    assertEquals(parsePropertyValue("tag1, tag2, tag3"), ["tag1", "tag2", "tag3"]);
    assertEquals(parsePropertyValue("one,"), ["one"]);
    assertEquals(parsePropertyValue(",two"), ["two"]);
    assertEquals(parsePropertyValue(",,"), []);
  });

  it("should parse date patterns", () => {
    const now = new Date();
    
    // Test "today"
    const today = parsePropertyValue("today");
    assertEquals(typeof today, "string");
    const todayDate = new Date(today as string);
    assertEquals(todayDate.toDateString(), now.toDateString());

    // Test "tomorrow"
    const tomorrow = parsePropertyValue("tomorrow");
    assertEquals(typeof tomorrow, "string");
    const tomorrowDate = new Date(tomorrow as string);
    const expectedTomorrow = new Date(now);
    expectedTomorrow.setDate(expectedTomorrow.getDate() + 1);
    assertEquals(tomorrowDate.toDateString(), expectedTomorrow.toDateString());

    // Test "yesterday"
    const yesterday = parsePropertyValue("yesterday");
    assertEquals(typeof yesterday, "string");
    const yesterdayDate = new Date(yesterday as string);
    const expectedYesterday = new Date(now);
    expectedYesterday.setDate(expectedYesterday.getDate() - 1);
    assertEquals(yesterdayDate.toDateString(), expectedYesterday.toDateString());

    // Test relative date patterns
    const plus3d = parsePropertyValue("+3d");
    assertEquals(typeof plus3d, "string");
    const plus3dDate = new Date(plus3d as string);
    const expectedPlus3d = new Date(now);
    expectedPlus3d.setDate(expectedPlus3d.getDate() + 3);
    assertEquals(plus3dDate.toDateString(), expectedPlus3d.toDateString());

    const minus7d = parsePropertyValue("-7d");
    assertEquals(typeof minus7d, "string");
    const minus7dDate = new Date(minus7d as string);
    const expectedMinus7d = new Date(now);
    expectedMinus7d.setDate(expectedMinus7d.getDate() - 7);
    assertEquals(minus7dDate.toDateString(), expectedMinus7d.toDateString());
  });

  it("should parse ISO date format", () => {
    const isoDate = "2024-01-15";
    const result = parsePropertyValue(isoDate);
    assertEquals(typeof result, "string");
    const parsedDate = new Date(result as string);
    assertEquals(parsedDate.toISOString().startsWith(isoDate), true);
  });

  it("should return string for non-special values", () => {
    assertEquals(parsePropertyValue("hello world"), "hello world");
    assertEquals(parsePropertyValue("not-a-date"), "not-a-date");
    assertEquals(parsePropertyValue("123abc"), "123abc");
    assertEquals(parsePropertyValue("true-ish"), "true-ish");
  });
});

describe("parseKeyValuePairs", () => {
  it("should parse single key-value pair", () => {
    const result = parseKeyValuePairs(["key=value"]);
    assertEquals(result, { key: "value" });
  });

  it("should parse multiple key-value pairs", () => {
    const result = parseKeyValuePairs(["name=alice", "age=30", "active=true"]);
    assertEquals(result, { name: "alice", age: 30, active: true });
  });

  it("should handle empty array", () => {
    const result = parseKeyValuePairs([]);
    assertEquals(result, {});
  });

  it("should skip invalid formats", () => {
    const result = parseKeyValuePairs(["valid=yes", "invalid", "also-valid=ok"]);
    assertEquals(result, { valid: "yes", "also-valid": "ok" });
  });

  it("should handle empty keys", () => {
    const result = parseKeyValuePairs(["=value", "key=value"]);
    assertEquals(result, { key: "value" });
  });

  it("should handle multiple equals signs", () => {
    const result = parseKeyValuePairs(["url=https://example.com/path?query=value"]);
    assertEquals(result, { url: "https://example.com/path?query=value" });
  });

  it("should parse values with special types", () => {
    const result = parseKeyValuePairs([
      "count=42",
      "active=false",
      "tags=a,b,c",
      "due=tomorrow"
    ]);
    assertEquals(result.count, 42);
    assertEquals(result.active, false);
    assertEquals(result.tags, ["a", "b", "c"]);
    assertEquals(typeof result.due, "string"); // ISO date string
  });
});