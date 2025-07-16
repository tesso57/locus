import { assertEquals } from "@std/assert";
import { DefaultFormatService } from "../../src/services/default-format-service.ts";
import { I18nService } from "../../src/services/i18n.ts";
import { TaskInfo } from "../../src/services/task-service.ts";
import { FrontMatter } from "../../src/types.ts";
import { ok, Result } from "../../src/utils/result.ts";

// Create a mock I18nService for testing
class MockI18nService implements I18nService {
  private translations: Record<string, string> = {
    "format.status.todo": "⏳ 未着手",
    "format.status.inProgress": "🔄 進行中",
    "format.status.done": "✅ 完了",
    "format.status.cancelled": "🚫 キャンセル",
    "format.priority.high": "🔴 高",
    "format.priority.medium": "🟡 中",
    "format.priority.low": "🟢 低",
    "format.date.unknown": "不明",
    "format.date.today": "今日",
    "format.date.yesterday": "昨日",
    "format.date.daysAgo": "{{n}}日前",
    "format.date.weeksAgo": "{{n}}週間前",
    "format.date.monthsAgo": "{{n}}ヶ月前",
    "format.date.yearsAgo": "{{n}}年前",
    "display.metadata": "メタデータ",
    "display.file": "ファイル",
    "display.status": "ステータス",
    "display.priority": "優先度",
    "display.tags": "タグ: {{tags}}",
    "display.created": "作成日: {{date}}",
    "display.updated": "更新日: {{date}}",
    "display.due": "期限: {{date}}",
    "display.repository": "リポジトリ: {{repo}}",
    "display.customFields": "カスタムフィールド",
    "display.noContent": "(コンテンツなし)",
  };

  getCurrentLanguage(): string {
    return "ja";
  }

  t(key: string, params?: Record<string, unknown>): string {
    let value = this.translations[key] || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
    }

    return value;
  }

  setLanguage(_lang: string): Result<void, Error> {
    // Not implemented for tests
    return ok(undefined);
  }

  getSupportedLanguages(): string[] {
    return ["ja", "en"];
  }
}

Deno.test("DefaultFormatService - formatStatus", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  // Test known statuses
  assertEquals(service.formatStatus("todo").includes("未着手"), true);
  assertEquals(service.formatStatus("in_progress").includes("進行中"), true);
  assertEquals(service.formatStatus("done").includes("完了"), true);
  assertEquals(service.formatStatus("cancelled").includes("キャンセル"), true);

  // Test unknown status
  assertEquals(service.formatStatus("unknown"), "unknown");
});

Deno.test("DefaultFormatService - formatPriority", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  // Test known priorities
  assertEquals(service.formatPriority("high").includes("高"), true);
  assertEquals(service.formatPriority("normal").includes("中"), true);
  assertEquals(service.formatPriority("low").includes("低"), true);

  // Test unknown priority
  assertEquals(service.formatPriority("unknown"), "unknown");
});

Deno.test("DefaultFormatService - getPriorityValue", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  assertEquals(service.getPriorityValue("high"), 3);
  assertEquals(service.getPriorityValue("normal"), 2);
  assertEquals(service.getPriorityValue("low"), 1);
  assertEquals(service.getPriorityValue("unknown"), 0);
});

Deno.test("DefaultFormatService - formatTags", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  assertEquals(service.formatTags([]).length, 0);
  assertEquals(service.formatTags(["tag1"]).includes("#tag1"), true);
  assertEquals(service.formatTags(["tag1", "tag2"]).includes("#tag1"), true);
  assertEquals(service.formatTags(["tag1", "tag2"]).includes("#tag2"), true);
});

Deno.test("DefaultFormatService - formatDate", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  // Test today
  const today = new Date();
  const todayResult = service.formatDate(today);
  assertEquals(todayResult.includes("今日"), true);

  // Test yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayResult = service.formatDate(yesterday);
  assertEquals(yesterdayResult.includes("昨日"), true);

  // Test 3 days ago
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysResult = service.formatDate(threeDaysAgo);
  assertEquals(threeDaysResult.includes("3日前"), true);

  // Test empty string
  const emptyResult = service.formatDate("");
  assertEquals(emptyResult.includes("不明"), true);

  // Test invalid date
  const invalidResult = service.formatDate("invalid");
  assertEquals(invalidResult.includes("不明"), true);
});

Deno.test("DefaultFormatService - displayTask", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  const frontmatter: FrontMatter = {
    date: "2024-01-15",
    created: "2024-01-15T10:00:00Z",
    status: "todo",
    priority: "high",
    tags: ["test", "sample"],
  };

  const task: TaskInfo = {
    fileName: "test-task.md",
    title: "Test Task",
    status: "todo",
    priority: "high",
    tags: ["test", "sample"],
    created: "2024-01-15T10:00:00Z",
    path: "/test/test-task.md",
    repository: "owner/repo",
    frontmatter,
    body: "This is a test task body.\n\n## Section\n\nSome content.",
  };

  const result = service.displayTask(task);
  assertEquals(result.ok, true);
  if (result.ok) {
    const output = result.value;
    assertEquals(output.includes("Test Task"), true);
    assertEquals(output.includes("test-task.md"), true);
    assertEquals(output.includes("未着手"), true);
    assertEquals(output.includes("高"), true);
    assertEquals(output.includes("#test"), true);
    assertEquals(output.includes("#sample"), true);
    assertEquals(output.includes("This is a test task body"), true);
  }
});

Deno.test("DefaultFormatService - formatMarkdownBasic", () => {
  const i18n = new MockI18nService();
  const service = new DefaultFormatService(i18n);

  const markdown = `# Header 1
## Header 2
### Header 3

Regular text

- List item 1
- List item 2

1. Numbered item
2. Another numbered item

\`\`\`
code block
\`\`\`

> Blockquote
`;

  const formatted = service.formatMarkdownBasic(markdown);

  // Check that headers are formatted
  assertEquals(formatted.includes("Header 1"), true);
  assertEquals(formatted.includes("Header 2"), true);
  assertEquals(formatted.includes("Header 3"), true);

  // Check that lists are formatted
  assertEquals(formatted.includes("•"), true);
  assertEquals(formatted.includes("List item 1"), true);

  // Check that numbered lists are preserved
  assertEquals(formatted.includes("1. Numbered item"), true);

  // Check that blockquotes are formatted
  assertEquals(formatted.includes("│"), true);
});

