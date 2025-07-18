# Locus

[![Version](https://img.shields.io/badge/version-0.1.6-blue.svg)](https://github.com/tesso57/locus)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CI](https://github.com/tesso57/locus/actions/workflows/ci.yml/badge.svg)](https://github.com/tesso57/locus/actions/workflows/ci.yml)
[![Deno](https://img.shields.io/badge/Deno-2.x-000000?logo=deno)](https://deno.com)
[![JSR](https://jsr.io/badges/@tesso/locus)](https://jsr.io/@tesso/locus)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](https://github.com/tesso57/locus)

_Locus_ is a Git-aware, local-first task management CLI, designed to streamline your development workflow, especially when working with **AI coding assistants**.

Born from extensive collaboration with AI coding assistants, Locus solves a fundamental problem: to get high-quality work from an agent, you need well-structured Markdown briefs for every task. And when running multiple agents in parallel, you need a fast, local way to manage those files. While GitHub Issues is conceptually close, it lives in the cloud and is awkward to drive from a CLI that an agent can call.

Locus is the solution: a Git-native, local-first CLI task manager where each task lives in its own Markdown file that an AI assistant can read and write. Think of it as a **simple, local version of GitHub Issues** that helps you break down complex work into small, manageable pieces, enabling agents to work more autonomously and produce higher-quality results for tasks like large-scale refactoring or test generation.

Of course, it's also a great tool for managing your own daily tasks without cluttering up your official project boards.

[日本語版 README](docs/README_ja.md)

## Usecase

<details>
<summary>AI-Assisted Development Workflow</summary>

_Locus_ is useful for AI-assisted development workflows. By breaking down complex work into a series of well-defined tasks, you can more effectively guide an AI to perform large-scale or repetitive work.

Here's a common workflow for generating test files using _Locus_ and an AI assistant:

### 1. Create a Task Template

First, create a generic template for the task. This template can include placeholders like `$FILE_NAME`.

**`test_template.md`**:

```markdown
# Create tests for $FILE_NAME

- [ ] Read `docs/testing.md` to understand our testing strategy.
- [ ] Scan the entire repository to grasp the project's context.
- [ ] Read the code in `$FILE_NAME` to understand its responsibilities and goals.
- [ ] Based on the above, create a new test file for `$FILE_NAME`.
- [ ] For each function in the file, write test cases for both happy paths and edge cases.
- [ ] Review and improve the tests you've written from the perspective of `docs/testing.md`.
- [ ] Finally, use the `gh` command to create a Pull Request.
```

### 2. Bulk-Generate Tasks with _Locus_

Next, use a simple shell script to generate a task for every file you want to target.

```bash
# Generate a task for every .ts file in the `src` directory
for FILE in src/**/*.ts; do
  # Replace the placeholder in the template with the actual filename
  TASK_BODY=$(sed "s/\\$FILE_NAME/$FILE/g" test_template.md)
  
  # Create the task using `locus add` with --body option
  locus add "Create tests for $FILE" --tags test,autogen --body "$TASK_BODY"
done
```

### 3. Provide Tasks to the Agent

Now you have a list of clearly defined tasks. You can pass them one by one to your AI agent of choice.

```bash
# Get the content of a specific task and pipe it to your agent
locus read "Create-tests-for-src-services-user-service.ts" | your-ai-agent
```

This method provides the AI agent with a narrow, well-defined scope for each run, which can help improve the consistency and reliability of its output.

</details>

<details>
<summary>Advanced Use Cases</summary>

### Task Workflow Automation

```bash
#!/bin/bash
# Script to create tasks from GitHub issues

# Fetch open issues and create tasks
gh issue list --json number,title,labels,body --jq '.[] | select(.state == "open")' | \
while IFS= read -r issue; do
  number=$(echo "$issue" | jq -r '.number')
  title=$(echo "$issue" | jq -r '.title')
  labels=$(echo "$issue" | jq -r '.labels[].name' | tr '\n' ',')
  body=$(echo "$issue" | jq -r '.body')
  
  locus add "Issue #$number: $title" \
    --tags "$labels,github-issue" \
    --body "$body"
done
```

### Daily Standup Report

```bash
#!/bin/bash
# Generate daily standup report

echo "## Daily Standup - $(date +%Y-%m-%d)"
echo ""

echo "### Completed Yesterday"
locus list --status done --json | \
  jq -r '.[] | select(.created | startswith("'$(date -d yesterday +%Y-%m-%d)'")) | "- \(.title)"'

echo ""
echo "### In Progress"
locus list --status in-progress --table

echo ""
echo "### Blocked/High Priority"
locus list --priority high --status todo
```

### Task Templates

```bash
# Create a function for common task types
function create_bug_task() {
  local title="$1"
  local component="$2"
  
  locus add "BUG: $title" \
    --tags "bug,$component" \
    --priority high \
    --body "## Description
    
## Steps to Reproduce
1. 

## Expected Behavior

## Actual Behavior

## Environment
- OS: 
- Version: "
}

# Usage
create_bug_task "Login fails with special characters" "auth"
```

### Integration with Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
# Auto-update task status when committing

# Get list of modified files
modified_files=$(git diff --cached --name-only)

# Check if any task files were modified
for file in $modified_files; do
  if [[ $file == *.md ]] && locus path "$file" >/dev/null 2>&1; then
    # Update status to in-progress
    locus tags set "$file" status in-progress
    echo "Updated task status: $file"
  fi
done
```

### Task Analytics

```bash
# Task completion rate
total=$(locus list --json | jq 'length')
completed=$(locus list --status done --json | jq 'length')
echo "Completion rate: $completed/$total ($(( completed * 100 / total ))%)"

# Tasks by priority
echo "Tasks by priority:"
for priority in high normal low; do
  count=$(locus list --priority $priority --json | jq 'length')
  echo "  $priority: $count"
done

# Aging tasks
echo "Tasks older than 7 days:"
locus list --json | jq -r '.[] | select(
  (.created | fromdateiso8601) < (now - 604800)
) | "\(.created | split("T")[0]) \(.priority) \(.title)"'
```

</details>

## Features

- **Git-aware organization**: Tasks are automatically organized by Git repository (`~/locus/<username>/<repo>/`)
- **Markdown-based**: Tasks are stored as Markdown files with YAML frontmatter
- **Flexible tagging**: Support for tags, status, priority, and custom properties
- **Smart file naming**: Automatic file naming with date, slug, and hash
- **Task property management**: Update tags, status, priority without editing files
- **fzf-friendly output**: Default oneline format optimized for command-line filtering
- **JSON output**: Machine-readable output for scripting and automation
- **Internationalization**: Full support for English and Japanese interfaces
- **Cross-platform**: Works on macOS, Linux, and Windows

## Installation

### Using Deno

```bash
# Install from JSR
deno install -g -A -n locus jsr:@tesso/locus
```

### Using NPM/NPX

```bash
# Run without installation
npx @tesso/locus --version

# Install globally
npm install -g @tesso/locus
```

## Quick Start

```bash
# 1. Initialize configuration (optional)
locus setup

# 2. Add your first task
locus add "Fix authentication bug" --tags bug,urgent --priority high

# 3. List your tasks
locus list

# 4. View a task
locus read "Fix authentication bug"

# 5. Update task status
locus tags set "Fix authentication bug" status done

# 6. Find tasks interactively with fzf
locus list | fzf --preview='locus read {7} --raw'
```

## Usage

```
Commands:

  add     <title>     - Add a new task
  edit    <fileName>  - Edit task content
  list                - List tasks (default: oneline format)
  tags                - Manage task file properties
  config              - Manage configuration
  setup               - Interactive setup wizard
  read    <fileName>  - Display task content (supports full paths)
  path    <fileName>  - Show absolute path of task file
  help                - Show help
```

<details>
<summary>Command Examples</summary>

### Add a new task

```bash
# Basic usage
locus add "Fix authentication bug"

# With body content using command substitution
TASK_BODY="Need to fix the JWT token validation"
locus add "Fix authentication bug" --body "$TASK_BODY"

# With body content directly
locus add "Fix bug" --body "Details about the bug fix"

# With tags and properties
locus add "Implement dark mode" --tags ui,feature --priority high --status in-progress

# Create task without Git context
locus add "Personal task" --no-git

# Output task info as JSON
locus add "New feature" --json
```

### Edit task content

```bash
# Edit existing task (appends by default)
locus edit "fix-auth-bug" --body "Additional notes about the fix"

# Create new task if it doesn't exist
locus edit "new-task" --body "Task description"

# Overwrite entire task content
locus edit "update-readme" --body "New content" --overwrite

# Edit from stdin
echo "Task updates from script" | locus edit "automated-task" --body -

# Edit without Git context
locus edit "personal-note" --body "Update" --no-git

# Output result as JSON
locus edit "task" --body "content" --json
```

### List tasks

```bash
# List all tasks in current repository (default: oneline format)
locus list

# Output format: [repository] [status] [priority] [title] [tags] [created] [path]
# Example: myproject/api	todo	high	Fix auth bug	bug,security	2024-01-15	/home/user/locus/myproject/api/fix-auth-bug.md

# Use table format (previous default)
locus list --table

# Filter by status
locus list --status todo
locus list --status in-progress
locus list --status done

# Filter by priority
locus list --priority high
locus list --priority normal
locus list --priority low

# Filter by tags
locus list --tags bug,critical

# Sort tasks
locus list --sort created    # Sort by creation date (default)
locus list --sort status     # Sort by status
locus list --sort priority   # Sort by priority
locus list --sort title      # Sort by title

# Group by repository
locus list --group-by-repo

# Show detailed view
locus list --detail

# List all tasks across repositories
locus list --all

# Output as JSON
locus list --json
```

### Integration with fzf

The default oneline format is optimized for use with command-line filtering tools like [fzf](https://github.com/junegunn/fzf):

```bash
# Interactive task selection with preview
locus list | fzf --delimiter=$'\t' \
  --with-nth=1,2,3,4 \
  --preview='locus read {7} --raw' \
  --bind='enter:execute(${EDITOR:-vim} {7})'

# Filter todo tasks and open selected file
locus list --status todo | fzf | cut -f7 | xargs -I{} ${EDITOR:-vim} {}

# Quick navigation to task directory
cd $(locus list | fzf | cut -f7 | xargs dirname)

# Search tasks by content and open
locus list | fzf --preview='locus read {7} --raw | head -20' | cut -f7 | xargs open

# Copy task path to clipboard (macOS)
locus list | fzf | cut -f7 | pbcopy

# Copy task path to clipboard (Linux)
locus list | fzf | cut -f7 | xclip -selection clipboard
```

### Manage task properties with tags command

```bash
# List all task files
locus tags list

# Show properties of a specific file
locus tags list "fix-auth-bug"

# Get a specific property
locus tags get "fix-auth-bug" status

# Set/update a property
locus tags set "fix-auth-bug" status done
locus tags set "fix-auth-bug" priority high

# Remove a property
locus tags rm "fix-auth-bug" assignee

# Clear all properties
locus tags clear "fix-auth-bug"
```

### Read task content

```bash
# Read a task file (automatic pager for long content)
locus read "fix-auth-bug"

# Read with raw markdown (including frontmatter)
locus read "implement-dark-mode" --raw

# Read without pager
locus read "update-readme" --pager never

# Use specific pager
locus read "long-task" --pager less

# Disable colored output
locus read "task" --no-color

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

# Work without Git context
locus path "task" --no-git

# Use in scripts or with other commands
cat $(locus path "my-task")
editor $(locus path "todo-task")
```

### Configuration

```bash
# Show current configuration
locus config show
locus config show --json  # JSON output

# Show configuration file path
locus config path

# Initialize configuration file
locus config init
locus config init --force  # Overwrite existing config
```

### Language Settings

Locus supports both English and Japanese interfaces. The language can be configured in multiple ways:

```bash
# Set language via environment variable (highest priority)
locus add "New task"

# Set language in configuration file
locus config init
# Edit ~/.config/locus/settings.yml and set language.default to "en" or "ja"

# The language detection order is:
# 1. LOCUS_LANG environment variable
# 2. Configuration file setting
# 3. System LANG environment variable
# 4. Default to English ("en")
```

### Output Formats

Most commands support JSON output with the `--json` flag for scripting and automation:

```bash
locus add "task" --json
locus list --json
locus read "task" --json
locus path "task" --json
locus config show --json
```

</details>

## Configuration

Configuration is stored in `~/.config/locus/settings.yml` (follows XDG Base Directory specification).

For detailed configuration documentation, see:

- **[Configuration Guide](docs/configuration.md)** - Complete configuration reference
- **[設定ガイド](docs/configuration_ja.md)** - 日本語版設定ガイド

### Configuration Example

```yaml
# Task storage directory
task_directory: "~/locus"

# Language settings
language:
  default: "en" # Available: "en" (English) or "ja" (Japanese)

# Git integration settings
git:
  extract_username: true
  username_from_remote: true

# File naming configuration
file_naming:
  pattern: "{slug}.md"
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
deno run src/cli.ts

# Run with npx (if Deno is installed via npm)
npx deno run src/cli.ts

# Run directly from JSR
deno run jsr:@tesso/locus

# Run with npx from JSR
npx @tesso/locus
```

## Documentation

- **[Configuration Guide](docs/configuration.md)** - Comprehensive guide to configuring Locus
- **[日本語版 README](docs/README_ja.md)** - Japanese version of this README
- **[設定ガイド](docs/configuration_ja.md)** - Configuration guide in Japanese

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[tesso57](https://github.com/tesso57)
