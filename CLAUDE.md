# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Locus is a Git-aware task management CLI tool built with Deno that creates and manages Markdown files with YAML frontmatter. Tasks are automatically organized by Git repository in `~/locus/<git-username>/<repo-name>/`.

## Development Commands

```bash
# Development
deno task dev          # Run in development mode
deno task test         # Run tests with coverage
deno task lint         # Run linter
deno task fmt          # Format code
deno task check        # Run format check, lint, and tests

# Build & Install
deno task compile      # Compile to binary for all platforms
deno task install-local # Install locally as 'locus' command
deno task npm          # Build npm package

# Running specific tests
deno test test/commands/add.test.ts  # Run single test file
deno test --filter "add command"      # Run tests matching pattern

# Direct execution (without tasks)
deno run --allow-all src/cli.ts       # Run CLI directly
npx deno run --allow-all src/cli.ts   # Run via npx (if Deno is installed via npm)
```

## Internationalization (i18n)

The project supports multiple languages (Japanese and English) through a custom i18n service:

- **I18nService**: Manages translations and language switching
- **Embedded messages**: All translations are embedded in the binary (src/i18n/messages.ts)
- **Language detection**: Automatic detection from environment variables and config
- **Consistent formatting**: Formatters support i18n for dates, status, and priorities

Language priority order:

1. `LOCUS_LANG` environment variable
2. Configuration file `language.default` setting
3. System `LANG` environment variable
4. Default to English ("en")

## Architecture

The project is transitioning from a utility-based approach to a service-oriented architecture with dependency injection:

### Core Architecture Patterns

1. **Result<T,E> Error Handling**: All service methods return `Result<T, Error>` for explicit error handling
   ```typescript
   const result = await gitService.getRepoInfo();
   if (!result.ok) {
     console.error(result.error.message);
     return;
   }
   const repoInfo = result.value;
   ```

2. **Service Layer**: Interface-based services for testability
   - `PathResolver`: Handles all path operations (task dirs, config paths)
   - `GitService`: Encapsulates Git operations
   - `ConfigLoader`: Manages configuration with Zod validation
   - `FileSystem`: Abstracts file system operations
   - `TaskService`: Manages task creation and updates
   - `I18nService`: Handles internationalization
   - `FormatService`: Formats output for display
   - `SearchService`: Searches for tasks across repositories
   - `TagsService`: Manages task properties

3. **Dependency Injection**: Services are injected into commands (in progress)
   - Mock implementations for testing
   - `InMemoryFileSystem` for file system operations
   - `MockGitService` and `MockPathResolver` for unit tests

### Directory Structure

- **`src/cli.ts`**: Main CLI entry point using Cliffy command framework
- **`src/commands/`**: Command implementations (add, tags, config, list, update, read, path, edit, setup)
- **`src/services/`**: Service interfaces and implementations
- **`src/utils/`**: Utilities including Result type, errors, and legacy functions
- **`src/config/`**: Configuration schemas and loader
- **`src/i18n/`**: Internationalization messages
- **`test/mocks/`**: Mock implementations for testing

## Key Implementation Details

### Task File Structure

Tasks are stored as Markdown files with YAML frontmatter:

```markdown
---
date: 2024-01-15
created: 2024-01-15T10:30:00Z
tags: [feature, backend]
status: todo
priority: high
---

# Task Title

Task description and details...
```

### File Naming Pattern

Tasks use a configurable naming pattern (default: `{slug}.md`):

- `{slug}`: Sanitized title (lowercase, hyphens, alphanumeric)
- `{date}`: Current date in YYYY-MM-DD format (optional, not in default pattern)
- `{hash}`: Random 8-character hash for uniqueness (optional, not in default pattern)

### Configuration System

Configuration follows a three-level hierarchy:

1. **Default values** from Zod schema
2. **File configuration** from `~/.config/locus/settings.yml`
3. **Environment variables** (highest priority, e.g., `LOCUS_TASK_DIRECTORY`)

```typescript
// Configuration is loaded and validated with Zod
const config = await loadConfig();
// Returns validated Config object with deep-merged values
```

### Error Handling Strategy

The codebase uses custom error classes for different scenarios:

- `GitNotRepoError`: Not in a Git repository
- `GitNoRemoteError`: No remote configured
- `ConfigValidationError`: Invalid configuration format
- `FileSystemError`: File operation failures
- `TaskError`: Task-related errors

### Testing Approach

- **Unit tests**: Use mock services and in-memory file system
- **Test structure**: Arrange-Act-Assert pattern
- **Mocking strategy**: Interface-based mocks for all external dependencies
- **Test files**: Located in `test/` directory, matching `*.test.ts`

## Git Commit Guidelines

When making commits to this repository, follow these rules:

1. **Commit in meaningful chunks**: Each commit should represent a complete, logical change
   - One feature/fix per commit
   - All tests passing before commit
   - No mixing of unrelated changes

2. **Use Gitemoji prefixes**: Start every commit message with an appropriate gitemoji
   - ✨ `:sparkles:` - New feature
   - 🐛 `:bug:` - Bug fix
   - 📝 `:memo:` - Documentation changes
   - ♻️ `:recycle:` - Code refactoring
   - ✅ `:white_check_mark:` - Adding tests
   - 🎨 `:art:` - Improving structure/format
   - ⚡️ `:zap:` - Performance improvements
   - 🔧 `:wrench:` - Configuration changes
   - 🚀 `:rocket:` - Deploying stuff
   - 💚 `:green_heart:` - Fixing CI
   - ➕ `:heavy_plus_sign:` - Adding dependencies
   - ➖ `:heavy_minus_sign:` - Removing dependencies
   - 🏗️ `:building_construction:` - Architectural changes

3. **Commit message format**:
   ```
   <gitemoji> <type>: <subject>

   <body>

   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

## Working with Services

When implementing new features or fixing bugs in commands:

1. **Use service interfaces** instead of direct utility functions:
   ```typescript
   // Good: Use injected services
   const repoResult = await gitService.getRepoInfo();

   // Bad: Direct utility function call
   const repoInfo = await getGitRepoInfo();
   ```

2. **Handle Result types** properly:
   ```typescript
   const result = await pathResolver.getTaskDir(repoInfo);
   if (!result.ok) {
     console.error(result.error.message);
     return;
   }
   const taskDir = result.value;
   ```

3. **Create mock implementations** for new services:
   - Implement the service interface
   - Add configurable behavior for testing
   - Store in `test/mocks/` directory

## Common Development Tasks

### Adding a New Command

1. Create command file in `src/commands/`
2. Implement the command using Cliffy's Command class
3. Use dependency injection for services
4. Add the command to `src/cli.ts`
5. Create tests in `test/commands/`
6. Update i18n messages in `src/i18n/messages.ts` for both languages

### Updating Task Schema

1. Modify the Zod schema in `src/config/schema.ts`
2. Update TypeScript types in `src/types.ts`
3. Update any affected services or utilities
4. Add migration logic if needed for existing tasks

### Running Tests for Specific Components

```bash
# Test a specific command
deno test test/commands/add.test.ts

# Test services
deno test test/services/

# Test with filter pattern
deno test --filter "GitService"

# Run tests in watch mode during development
deno test --watch
```

## Important Files

- **`docs/locus-specification.md`**: Original specification with command details
- **`src/utils/result.ts`**: Result type implementation and utilities
- **`src/config/schema.ts`**: Zod schemas defining configuration structure
- **`test/mocks/in-memory-fs.ts`**: In-memory file system for testing

## Environment Variables

- `LOCUS_TASK_DIRECTORY`: Override default task directory
- `LOCUS_CONFIG_DIR`: Override config directory (default: `~/.config/locus`)
- `LOCUS_DEFAULTS_STATUS`: Override default task status
- `LOCUS_DEFAULTS_PRIORITY`: Override default task priority
- `LOCUS_GIT_EXTRACT_USERNAME`: Enable/disable username extraction (true/false)
- `LOCUS_LANG`: Override language setting (en/ja)

## Debugging Tips

- Use `console.error()` for error messages (goes to stderr)
- Result types include error stack traces in development
- Mock services can be configured with specific behaviors for testing edge cases
- The `--debug` flag (when implemented) should increase verbosity

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- **Matrix testing**: Tests on Ubuntu, macOS, and Windows with Deno 2.x and canary
- **Code quality**: Format check, lint, and tests run on every push/PR
- **Coverage**: Generated and uploaded to Codecov on Ubuntu/Deno 2.x
- **Compilation test**: Verifies binary compilation on all platforms
- **Publishing**: Automatic publishing to JSR and npm on main branch pushes
