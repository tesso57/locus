/**
 * Parse a property value string into appropriate type
 * Supports: boolean, number, array (comma-separated), date patterns, and string
 */
export function parsePropertyValue(value: string): unknown {
  // Empty string
  if (value === "") {
    return "";
  }

  // Boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }

  // Array (comma-separated)
  if (value.includes(",")) {
    return value.split(",").map((item) => item.trim()).filter((item) => item !== "");
  }

  // Date patterns
  const dateParsed = parseDatePattern(value);
  if (dateParsed) {
    return dateParsed.toISOString();
  }

  // Default to string
  return value;
}

/**
 * Parse common date patterns
 * Supports: today, tomorrow, yesterday, +Nd (e.g., +3d), -Nd (e.g., -7d)
 */
function parseDatePattern(value: string): Date | null {
  const now = new Date();
  const lowered = value.toLowerCase();

  if (lowered === "today") {
    return now;
  }

  if (lowered === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  if (lowered === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // +Nd or -Nd pattern
  const relativeMatch = value.match(/^([+-])(\d+)d$/);
  if (relativeMatch) {
    const sign = relativeMatch[1] === "+" ? 1 : -1;
    const days = parseInt(relativeMatch[2], 10);
    const result = new Date(now);
    result.setDate(result.getDate() + (sign * days));
    return result;
  }

  // ISO date format
  const date = new Date(value);
  if (!isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return date;
  }

  return null;
}

/**
 * Parse key=value pairs from an array of strings
 * Returns an object with parsed values
 */
export function parseKeyValuePairs(properties: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const prop of properties) {
    const index = prop.indexOf("=");
    if (index === -1) {
      continue; // Skip invalid format
    }

    const key = prop.substring(0, index);
    const value = prop.substring(index + 1);

    if (key) {
      result[key] = parsePropertyValue(value);
    }
  }

  return result;
}
