# Locus

A Git-aware task management CLI tool that organizes your tasks by repository.

[日本語版 README](docs/README_ja.md)

## Features

- **Git-aware organization**: Tasks are automatically organized by Git repository (`~/locus/<username>/<repo>/`)
- **Markdown-based**: Tasks are stored as Markdown files with YAML frontmatter
- **Flexible tagging**: Support for tags, status, priority, and custom properties
- **Smart file naming**: Automatic file naming with date, slug, and hash
- **Cross-platform**: Works on macOS, Linux, and Windows

## Installation

### Using Deno (Recommended)

```bash
# Install globally
deno install --allow-read --allow-write --allow-env --allow-run --name locus https://deno.land/x/locus/src/cli.ts

# Or install from local source
deno task install-local
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

### List and search tasks

```bash
# List all tasks
locus list

# Filter by tags
locus tags ui

# Search by multiple tags (OR operation)
locus tags ui,backend

# Show tasks with specific status
locus list --status todo
```

### Update task properties

```bash
# Update single property
locus update task-name --status done

# Update multiple properties
locus update task-name --priority low --tags bug,fixed

# Add new tags (append mode)
locus update task-name --tags +security,+reviewed

# Remove tags
locus update task-name --tags -wip,-draft
```

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

- [Deno](https://deno.land/) >= 1.40

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[tesso57](https://github.com/tesso57)