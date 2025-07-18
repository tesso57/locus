import { err, ok, Result } from "../../src/utils/result.ts";
import { FileNameComponents } from "../../src/types.ts";
import { FileNameService } from "../../src/services/filename-service.ts";

/**
 * Mock implementation of FileNameService for testing
 */
export class MockFileNameService implements FileNameService {
  private mockSlug = "test-task";
  private mockHash = "abc123";
  private mockDate = "2024-01-15";
  private mockFileName = "test-task.md";
  private shouldFail = false;

  generateSlug(title: string): string {
    return this.mockSlug;
  }

  generateHash(length?: number): string {
    return this.mockHash.substring(0, length || 8);
  }

  formatDate(date: Date, pattern: string): string {
    return this.mockDate;
  }

  generateFileNameComponents(title: string): Result<FileNameComponents, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock error"));
    }
    return ok({
      date: this.mockDate,
      slug: this.mockSlug,
      hash: this.mockHash,
    });
  }

  generateFileName(title: string): Result<string, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock error"));
    }
    return ok(this.mockFileName);
  }

  parseFileName(fileName: string): Result<Partial<FileNameComponents>, Error> {
    if (this.shouldFail) {
      return err(new Error("Mock error"));
    }
    return ok({
      slug: this.mockSlug,
      date: this.mockDate,
      hash: this.mockHash,
    });
  }

  // Test helpers
  setMockSlug(slug: string): void {
    this.mockSlug = slug;
  }

  setMockFileName(fileName: string): void {
    this.mockFileName = fileName;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}