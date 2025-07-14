# Locus

A Git-aware task management CLI tool that organizes your tasks by repository. Each task is stored as a Markdown file with YAML frontmatter, automatically organized by Git repository.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/tesso57/locus)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[日本語版 README](docs/README_ja.md)

## Features

- **Git-aware organization**: Tasks are automatically organized by Git repository (`~/locus/<username>/<repo>/`)
- **Markdown-based**: Tasks are stored as Markdown files with YAML frontmatter
- **Flexible tagging**: Support for tags, status, priority, and custom properties
- **Smart file naming**: Automatic file naming with date, slug, and hash
- **Internationalization**: Full support for English and Japanese interfaces
- **Cross-platform**: Works on macOS, Linux, and Windows

## Installation

### Using Deno (Recommended)

```bash
# Install from JSR
deno install -n locus jsr:@tesso/locus

# Install from local source
deno task install-local

# Or install manually
deno install --allow-read --allow-write --allow-env --allow-run -n locus -f src/cli.ts
```

### Pre-built Binaries

Download the latest release for your platform from the [releases page](https://github.com/tesso57/locus/releases).

## Usage

### Add a new task

```bash
# Basic usage
locus add "Fix authentication bug"

# With body content from stdin
echo "Need to fix the JWT token validation" | locus add "Fix authentication bug" -

# With tags and properties
locus add "Implement dark mode" --tags ui,feature --priority high --status in-progress
```

### List tasks

```bash
# List all tasks in current repository
locus list

# Filter by status
locus list --status todo
locus list --status in_progress

# Filter by priority
locus list --priority high

# Filter by tags
locus list --tags bug,critical

# Sort tasks
locus list --sort created    # Sort by creation date (default)
locus list --sort status     # Sort by status
locus list --sort priority   # Sort by priority

# Show detailed view
locus list --detail

# List all tasks across repositories
locus list --all

# Output as JSON
locus list --json
```

### Language Settings

Locus supports both English and Japanese interfaces. The language can be configured in multiple ways:

```bash
# Set language via environment variable (highest priority)
export LOCUS_LANG=en  # or "ja" for Japanese
locus add "New task"

# Set language in configuration file
locus config init
# Edit ~/.config/locus/settings.yml and set language.default to "en" or "ja"

# The language detection order is:
# 1. LOCUS_LANG environment variable
# 2. Configuration file setting
# 3. System LANG environment variable
# 4. Default to Japanese ("ja")
```

### Search by tags

```bash
# Search tasks by tag
locus tags ui

# Search by multiple tags (OR operation)
locus tags ui,backend
```

### Read task content

```bash
# Read a task file (automatic pager for long content)
locus read "fix-auth-bug"

# Read with raw markdown (including frontmatter)
locus read "implement-dark-mode" --raw

# Read without pager
locus read "update-readme" --pager never

# Output as JSON for scripting
locus read "add-tests" --json

# Read by absolute path
locus read /path/to/task.md
```

### Find task file paths

```bash
# Get the absolute path of a task
locus path "fix-auth-bug"

# Search for task across all repositories
locus path "implement-feature" --all

# Search by partial filename or title
locus path "auth"  # Finds files matching "auth" in name or title

# Output as JSON with additional metadata
locus path "task-name" --json

# Use in scripts or with other commands
cat $(locus path "my-task")
editor $(locus path "todo-task")
```

### Update tasks (Coming Soon)

The update command is planned for a future release. It will allow you to modify existing task properties.

### Configuration

```bash
# Show current configuration
locus config

# Set configuration values
locus config set task_directory "~/my-tasks"
locus config set defaults.status "backlog"
locus config set git.extract_username false
```

## Configuration File

Configuration is stored in `~/.config/locus/settings.yml` (follows XDG Base Directory specification):

```yaml
# Task storage directory
task_directory: "~/locus"

# Language settings
language:
  default: "ja" # Available: "ja" (Japanese) or "en" (English)

# Git integration settings
git:
  extract_username: true
  username_from_remote: true

# File naming configuration
file_naming:
  pattern: "{date}-{slug}-{hash}.md"
  date_format: "YYYY-MM-DD"
  hash_length: 8

# Default values for new tasks
defaults:
  status: "todo"
  priority: "normal"
  tags: []
```

## Task File Format

Tasks are stored as Markdown files with YAML frontmatter:

```markdown
---
date: 2024-01-15
created: 2024-01-15T10:30:00Z
tags:
  - feature
  - backend
status: in-progress
priority: high
assignee: john
---

# Implement user authentication

Add JWT-based authentication to the API endpoints.

## Requirements

- [ ] Login endpoint
- [ ] Token refresh mechanism
- [ ] Logout functionality
```

## Development

### Prerequisites

- [Deno](https://deno.com/) >= 2.0

### Setup

```bash
# Clone the repository
git clone https://github.com/tesso57/locus.git
cd locus

# Run in development mode
deno task dev

# Run tests
deno task test

# Build binaries
deno task compile
```

### Available Tasks

- `deno task dev` - Run in development mode
- `deno task test` - Run tests with coverage
- `deno task lint` - Run linter
- `deno task fmt` - Format code
- `deno task check` - Run format check, lint, and tests
- `deno task compile` - Build binaries for all platforms
- `deno task install-local` - Install locally as 'locus' command

### Direct Execution

You can also run the CLI directly without using tasks:

```bash
# Run with deno
deno run --allow-all src/cli.ts

# Run with npx (if Deno is installed via npm)
npx deno run --allow-all src/cli.ts

# Run directly from JSR
deno run jsr:@tesso/locus

# Run with npx from JSR
npx @tesso/locus
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[tesso57](https://github.com/tesso57)
