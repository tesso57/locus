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
```

## Architecture

The project follows a modular architecture:

- **`src/cli.ts`**: Main CLI entry point using Cliffy command framework
- **`src/commands/`**: Command implementations (add, tags, etc.)
- **`src/utils/`**: Utility modules for Git operations and Markdown parsing
- **`src/types.ts`**: TypeScript type definitions
- **`src/mod.ts`**: Library exports for programmatic usage

## Key Implementation Details

### Task File Structure
Tasks are stored as Markdown files with YAML frontmatter:
```markdown
---
date: 2024-01-15
tags: [feature, backend]
status: todo
priority: high
---

# Task Title

Task description and details...
```

### Git Integration
The tool automatically detects Git repositories and organizes tasks accordingly:
- Uses `git rev-parse` to detect repository info
- Extracts username and repo name from remote URL
- Creates directory structure: `~/locus/<username>/<repo>/`

### Command Structure
Commands are implemented using Cliffy's command pattern:
```typescript
new Command()
  .name("locus")
  .version("1.0.0")
  .description("Git-aware task management")
  .command("add", addCommand)
  .command("tags", tagsCommand)
```

## Testing Approach

- Use Deno's built-in test runner
- Test files in `test/` directory matching `*_test.ts`
- Mock file system operations and Git commands for unit tests
- Integration tests for CLI commands

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

## Important Specifications

Refer to `docs/locus-specification.md` for detailed implementation requirements including:
- Exact command syntax and options
- File naming conventions (e.g., `YYYY-MM-DD-<hash>.md`)
- Supported frontmatter properties
- Tag management rules
- Cross-platform compatibility requirements