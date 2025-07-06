/**
 * Base error class for Locus
 */
export class LocusError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Git-related errors
 */
export class GitError extends LocusError {
  constructor(message: string, code = "GIT_ERROR") {
    super(message, code);
  }
}

export class GitNotRepoError extends GitError {
  constructor(message = "Not in a git repository") {
    super(message, "GIT_NOT_REPO");
  }
}

export class GitNoRemoteError extends GitError {
  constructor(message = "No git remote configured") {
    super(message, "GIT_NO_REMOTE");
  }
}

export class GitCommandError extends GitError {
  constructor(message: string, public readonly command: string) {
    super(message, "GIT_COMMAND_FAILED");
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends LocusError {
  constructor(message: string, code = "CONFIG_ERROR") {
    super(message, code);
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(message: string, public readonly errors: unknown[]) {
    super(message, "CONFIG_VALIDATION");
  }
}

export class ConfigNotFoundError extends ConfigError {
  constructor(path: string) {
    super(`Configuration file not found: ${path}`, "CONFIG_NOT_FOUND");
  }
}

/**
 * File system errors
 */
export class FileSystemError extends LocusError {
  constructor(message: string, code = "FS_ERROR") {
    super(message, code);
  }
}

export class FileNotFoundError extends FileSystemError {
  constructor(path: string) {
    super(`File not found: ${path}`, "FILE_NOT_FOUND");
  }
}

export class FileAlreadyExistsError extends FileSystemError {
  constructor(path: string) {
    super(`File already exists: ${path}`, "FILE_EXISTS");
  }
}

/**
 * Task-related errors
 */
export class TaskError extends LocusError {
  constructor(message: string, code = "TASK_ERROR") {
    super(message, code);
  }
}

export class InvalidTaskNameError extends TaskError {
  constructor(message: string) {
    super(message, "INVALID_TASK_NAME");
  }
}

export class TaskNotFoundError extends TaskError {
  constructor(identifier: string) {
    super(`Task not found: ${identifier}`, "TASK_NOT_FOUND");
  }
}
