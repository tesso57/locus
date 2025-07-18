import { FileNameComponents } from "../types.ts";
import { Result } from "../utils/result.ts";

/**
 * Service for handling filename generation and parsing operations.
 */
export interface FileNameService {
  /**
   * Generates a URL-safe slug from a title.
   *
   * @param title - The title to convert to a slug
   * @returns A URL-safe slug string
   */
  generateSlug(title: string): string;

  /**
   * Generates a random hash string for unique identification.
   *
   * @param length - The desired length of the hash (default: 8)
   * @returns A random alphanumeric hash string
   */
  generateHash(length?: number): string;

  /**
   * Formats a date according to the specified pattern.
   *
   * @param date - The date to format
   * @param pattern - The format pattern (e.g., "YYYY-MM-DD")
   * @returns The formatted date string
   */
  formatDate(date: Date, pattern: string): string;

  /**
   * Generates all components needed for creating a task filename.
   *
   * @param title - The task title to generate components from
   * @returns Result containing FileNameComponents or error
   */
  generateFileNameComponents(title: string): Result<FileNameComponents, Error>;

  /**
   * Generates a complete task filename based on the configured pattern.
   *
   * @param title - The task title
   * @returns Result containing the generated filename or error
   */
  generateFileName(title: string): Result<string, Error>;

  /**
   * Parses a filename to extract its components.
   *
   * @param fileName - The filename to parse (with or without .md extension)
   * @returns Result containing partial FileNameComponents or error
   */
  parseFileName(fileName: string): Result<Partial<FileNameComponents>, Error>;
}
