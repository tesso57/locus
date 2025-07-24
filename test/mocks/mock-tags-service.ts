import {
  ClearTagsOptions,
  GetTagOptions,
  ListTagsOptions,
  RemoveTagOptions,
  SetTagOptions,
  TagInfo,
  TagsService,
} from "../../src/services/tags-service.ts";
import { err, ok, Result } from "../../src/utils/result.ts";
import { PropertyNotFoundError, TaskNotFoundError } from "../../src/utils/errors.ts";
import { FrontMatter } from "../../src/types.ts";

/**
 * Mock implementation of TagsService for testing
 */
export class MockTagsService implements TagsService {
  private tasks: Map<string, { path: string; frontmatter: FrontMatter }> = new Map();
  private methodCalls: Map<string, any[]> = new Map();

  constructor() {
    this.reset();
  }

  /**
   * Set up a mock task with frontmatter
   */
  setTask(fileName: string, path: string, frontmatter: FrontMatter): void {
    this.tasks.set(fileName, { path, frontmatter });
  }

  /**
   * Get all method calls for a specific method
   */
  getMethodCalls(method: string): any[] {
    return this.methodCalls.get(method) || [];
  }

  /**
   * Reset all mock data
   */
  reset(): void {
    this.tasks.clear();
    this.methodCalls.clear();
  }

  async listTags(options: ListTagsOptions): Promise<Result<TagInfo[], Error>> {
    this.recordCall("listTags", options);

    if (options.fileName) {
      const task = this.tasks.get(options.fileName);
      if (!task) {
        return ok([]);
      }
      return ok([{
        fileName: options.fileName,
        path: task.path,
        frontmatter: task.frontmatter,
      }]);
    }

    const results: TagInfo[] = [];
    for (const [fileName, task] of this.tasks.entries()) {
      results.push({
        fileName,
        path: task.path,
        frontmatter: task.frontmatter,
      });
    }
    return ok(results);
  }

  async getTag(options: GetTagOptions): Promise<Result<unknown, Error>> {
    this.recordCall("getTag", options);

    const task = this.tasks.get(options.fileName);
    if (!task) {
      return err(new TaskNotFoundError(options.fileName));
    }

    const value = task.frontmatter[options.property as keyof FrontMatter];
    if (value === undefined) {
      return err(new PropertyNotFoundError(options.property));
    }

    return ok(value);
  }

  async setTag(options: SetTagOptions): Promise<Result<void, Error>> {
    this.recordCall("setTag", options);

    const task = this.tasks.get(options.fileName);
    if (!task) {
      return err(new TaskNotFoundError(options.fileName));
    }

    // Update the frontmatter
    (task.frontmatter as any)[options.property] = options.value;

    return ok(undefined);
  }

  async removeTag(options: RemoveTagOptions): Promise<Result<void, Error>> {
    this.recordCall("removeTag", options);

    const task = this.tasks.get(options.fileName);
    if (!task) {
      return err(new TaskNotFoundError(options.fileName));
    }

    delete (task.frontmatter as any)[options.property];

    return ok(undefined);
  }

  async clearTags(options: ClearTagsOptions): Promise<Result<void, Error>> {
    this.recordCall("clearTags", options);

    const task = this.tasks.get(options.fileName);
    if (!task) {
      return err(new TaskNotFoundError(options.fileName));
    }

    // Clear all properties except required ones
    const newFrontmatter: FrontMatter = {
      date: task.frontmatter.date,
      created: task.frontmatter.created,
    };
    task.frontmatter = newFrontmatter;

    return ok(undefined);
  }

  async getAllTaskFiles(): Promise<Result<TagInfo[], Error>> {
    this.recordCall("getAllTaskFiles", {});

    const results: TagInfo[] = [];
    for (const [fileName, task] of this.tasks.entries()) {
      results.push({
        fileName,
        path: task.path,
        frontmatter: task.frontmatter,
      });
    }
    return ok(results);
  }

  private recordCall(method: string, args: any): void {
    if (!this.methodCalls.has(method)) {
      this.methodCalls.set(method, []);
    }
    this.methodCalls.get(method)!.push(args);
  }
}
