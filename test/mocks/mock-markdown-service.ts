import { err, ok, Result } from "../../src/utils/result.ts";
import { FrontMatter, ParsedMarkdown } from "../../src/types.ts";
import { MarkdownService } from "../../src/services/markdown-service.ts";

/**
 * Mock implementation of MarkdownService for testing
 */
export class MockMarkdownService implements MarkdownService {
  private shouldFail = false;

  parseMarkdown(content: string): Result<ParsedMarkdown, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock parse error"));
    }
    
    const lines = content.split("\n");
    
    if (lines[0] !== "---") {
      return ok({ frontmatter: null, body: content });
    }
    
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        endIndex = i;
        break;
      }
    }
    
    if (endIndex === -1) {
      return ok({ frontmatter: null, body: content });
    }
    
    const yamlContent = lines.slice(1, endIndex).join("\n");
    const body = lines.slice(endIndex + 1).join("\n");
    
    // Simple mock YAML parsing
    const frontmatter: FrontMatter = {};
    yamlContent.split("\n").forEach(line => {
      const [key, value] = line.split(":").map(s => s.trim());
      if (key && value) {
        if (key === "tags") {
          frontmatter[key] = value.replace(/[\[\]]/g, "").split(",").map(s => s.trim());
        } else {
          frontmatter[key] = value.replace(/['"]/g, "");
        }
      }
    });
    
    return ok({ frontmatter, body });
  }

  generateMarkdown(
    frontmatter: FrontMatter | null,
    body: string,
  ): Result<string, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock generate error"));
    }
    
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
      return ok(body);
    }
    
    const yamlLines: string[] = [];
    Object.entries(frontmatter).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        yamlLines.push(`${key}: [${value.join(", ")}]`);
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    });
    
    return ok(`---\n${yamlLines.join("\n")}\n---\n${body}`);
  }

  ensureMarkdownExtension(fileName: string): string {
    return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  }

  validateFileName(fileName: string): Result<void, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock validation error"));
    }
    
    if (fileName.includes("/") || fileName.includes("\\")) {
      return err(new Error("ファイル名にパス区切り文字（/や\\）を含めることはできません"));
    }
    
    return ok(undefined);
  }

  mergeFrontmatter(
    existing: FrontMatter | null,
    updates: Partial<FrontMatter>,
  ): FrontMatter {
    const base = existing || {};
    return { ...base, ...updates };
  }

  extractTitle(body: string): Result<string | null, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock extract error"));
    }
    
    const lines = body.trim().split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return ok(trimmed.substring(2).trim());
      }
    }
    
    return ok(null);
  }

  createTaskMarkdown(
    title: string,
    body?: string,
    frontmatter?: FrontMatter,
  ): Result<string, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock create error"));
    }
    
    const now = new Date().toISOString();
    
    const defaultFrontmatter: FrontMatter = {
      date: now.split("T")[0],
      created: now,
      ...frontmatter,
    };
    
    const markdownBody = body || `# ${title}\n\n`;
    
    return this.generateMarkdown(defaultFrontmatter, markdownBody);
  }

  // Test helpers
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}