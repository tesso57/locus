# Locus Configuration Guide

This guide covers all aspects of configuring Locus, including configuration files, environment variables, and the interactive setup wizard.

## Table of Contents

- [Configuration Overview](#configuration-overview)
- [Configuration File](#configuration-file)
- [Environment Variables](#environment-variables)
- [Interactive Setup](#interactive-setup)
- [Configuration Options](#configuration-options)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Configuration Overview

Locus uses a hierarchical configuration system with three levels of precedence:

1. **Environment Variables** (highest priority)
2. **Configuration File** (`~/.config/locus/settings.yml`)
3. **Default Values** (lowest priority)

This allows you to:

- Override specific settings temporarily using environment variables
- Set persistent preferences in the configuration file
- Rely on sensible defaults without any configuration

## Configuration File

### Location

The configuration file is stored at:

- **Unix/Linux/macOS**: `~/.config/locus/settings.yml`
- **Windows**: `%USERPROFILE%\.config\locus\settings.yml`

This follows the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html).

### Creating the Configuration File

You have three ways to create a configuration file:

#### 1. Interactive Setup (Recommended)

```bash
locus config setup
```

This launches an interactive wizard that guides you through all configuration options.

#### 2. Initialize with Defaults

```bash
locus config init
```

This creates a configuration file with default values that you can edit manually.

#### 3. Manual Creation

Create the directory and file manually:

```bash
mkdir -p ~/.config/locus
touch ~/.config/locus/settings.yml
```

Then edit the file with your preferred text editor.

### File Format

The configuration file uses YAML format:

```yaml
# Task storage directory
task_directory: "~/locus"

# Language settings
language:
  default: "en" # Available: "en" (English) or "ja" (Japanese)

# Git integration settings
git:
  extract_username: true # Extract username from Git config
  username_from_remote: true # Use username from remote URL

# File naming configuration
file_naming:
  pattern: "{slug}.md" # File naming pattern
  date_format: "YYYY-MM-DD" # Date format in filenames
  hash_length: 8 # Length of random hash

# Default values for new tasks
defaults:
  status: "todo" # Default task status
  priority: "normal" # Default task priority
  tags: [] # Default tags (empty array)
```

## Environment Variables

Environment variables override configuration file settings. They are useful for:

- Temporary overrides
- CI/CD environments
- Testing different configurations

### Available Environment Variables

| Variable                         | Description                         | Example                                                         |
| -------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `LOCUS_LANG`                     | Override language setting           | `LOCUS_LANG=en locus list`                                      |
| `LOCUS_TASK_DIRECTORY`           | Override task directory             | `LOCUS_TASK_DIRECTORY=/tmp/tasks locus add "Test"`              |
| `LOCUS_GIT_EXTRACT_USERNAME`     | Enable/disable username extraction  | `LOCUS_GIT_EXTRACT_USERNAME=false locus add "Task"`             |
| `LOCUS_GIT_USERNAME_FROM_REMOTE` | Enable/disable username from remote | `LOCUS_GIT_USERNAME_FROM_REMOTE=false locus add "Task"`         |
| `LOCUS_FILE_NAMING_PATTERN`      | File naming pattern                 | `LOCUS_FILE_NAMING_PATTERN="{date}-{slug}.md" locus add "Task"` |
| `LOCUS_FILE_NAMING_DATE_FORMAT`  | Date format for filenames           | `LOCUS_FILE_NAMING_DATE_FORMAT="YYYYMMDD" locus add "Task"`     |
| `LOCUS_FILE_NAMING_HASH_LENGTH`  | Hash length for unique identifiers  | `LOCUS_FILE_NAMING_HASH_LENGTH=12 locus add "Task"`             |
| `LOCUS_DEFAULTS_STATUS`          | Override default status             | `LOCUS_DEFAULTS_STATUS=in-progress locus add "Task"`            |
| `LOCUS_DEFAULTS_PRIORITY`        | Override default priority           | `LOCUS_DEFAULTS_PRIORITY=high locus add "Urgent"`               |
| `LOCUS_DEFAULTS_TAGS`            | Default tags (comma-separated)      | `LOCUS_DEFAULTS_TAGS="work,urgent" locus add "Task"`            |
| `LOCUS_LANGUAGE_DEFAULT`         | Default language (en/ja)            | `LOCUS_LANGUAGE_DEFAULT=ja locus config show`                   |

### Environment Variable Format

Boolean values can be specified as:

- `true`, `1`, `yes`, `on` for true
- `false`, `0`, `no`, `off` for false

### Configuration Directory

The configuration directory location can be overridden using standard XDG environment variables:

- `XDG_CONFIG_HOME`: Override the base config directory (default: `~/.config`)
- `XDG_CONFIG_DIRS`: Additional config directories to search (default: `/etc/xdg`)

## Interactive Setup

The interactive setup wizard (`locus config setup`) provides a user-friendly way to configure Locus:

```bash
$ locus config setup
🚀 Welcome to the Locus Setup Wizard!

? Where would you like to store your tasks? (~/locus) › ~/my-tasks
? Which language would you like to use? › English
? Extract Git user ID automatically? (Y/n) › Yes
? Use username from remote URL? (Y/n) › Yes
? Select file naming pattern › {date}-{slug}-{hash}.md (e.g., 2024-01-15-my-task-a1b2c3d4.md)
? Select date format › YYYY-MM-DD (2024-01-15)
? Hash length? (4-32) › 8
? Default status? › todo
? Default priority? › normal
? Default tags (comma-separated, optional) › 

📋 Configuration preview:

task_directory: ~/my-tasks
language:
  default: en
git:
  extract_username: true
  username_from_remote: true
file_naming:
  pattern: '{date}-{slug}-{hash}.md'
  date_format: YYYY-MM-DD
  hash_length: 8
defaults:
  status: todo
  priority: normal
  tags: []

? Save this configuration? (Y/n) › Yes
✅ Configuration saved: /Users/username/.config/locus/settings.yml
```

## Configuration Options

### Task Directory

**Key**: `task_directory`\
**Default**: `~/locus`\
**Environment**: `LOCUS_TASK_DIRECTORY`

The base directory where all task files are stored. Tasks are organized by Git repository under this directory.

Example structure:

```
~/locus/
├── github-username/
│   ├── project-a/
│   │   ├── 2024-01-15-fix-bug-a1b2c3d4.md
│   │   └── 2024-01-16-add-feature-e5f6g7h8.md
│   └── project-b/
│       └── 2024-01-17-update-docs-i9j0k1l2.md
└── default/  # Tasks created outside Git repositories
    └── 2024-01-18-personal-task-m3n4o5p6.md
```

### Language Settings

**Key**: `language.default`\
**Default**: `en`\
**Environment**: `LOCUS_LANG`\
**Options**: `en` (English), `ja` (Japanese)

Controls the display language for all command output, error messages, and prompts.

Language detection priority:

1. `LOCUS_LANG` environment variable
2. Configuration file setting
3. System `LANG` environment variable
4. Default to English

### Git Integration

#### Extract Username

**Key**: `git.extract_username`\
**Default**: `true`\
**Environment**: `LOCUS_GIT_EXTRACT_USERNAME`

When enabled, Locus extracts the Git username to organize tasks by repository owner.

#### Username from Remote

**Key**: `git.username_from_remote`\
**Default**: `true`

When enabled, Locus extracts the username from the Git remote URL. This is useful when your local Git username differs from your GitHub/GitLab username.

Example:

- Remote URL: `https://github.com/john-doe/project.git`
- Extracted username: `john-doe`
- Task location: `~/locus/john-doe/project/`

### File Naming

#### Pattern

**Key**: `file_naming.pattern`\
**Default**: `{slug}.md`

Available placeholders:

- `{date}`: Current date formatted according to `date_format`
- `{slug}`: Sanitized task title (lowercase, alphanumeric, hyphens)
- `{hash}`: Random alphanumeric string for uniqueness

Common patterns:

- `{date}-{slug}-{hash}.md` → `2024-01-15-fix-auth-bug-a1b2c3d4.md`
- `{slug}-{date}-{hash}.md` → `fix-auth-bug-2024-01-15-a1b2c3d4.md`
- `{date}-{slug}.md` → `2024-01-15-fix-auth-bug.md`
- `{slug}.md` → `fix-auth-bug.md`

#### Date Format

**Key**: `file_naming.date_format`\
**Default**: `YYYY-MM-DD`

Supported formats:

- `YYYY-MM-DD` → `2024-01-15`
- `YYYYMMDD` → `20240115`
- `YYYY/MM/DD` → `2024/01/15`
- `DD-MM-YYYY` → `15-01-2024`

#### Hash Length

**Key**: `file_naming.hash_length`\
**Default**: `8`\
**Range**: 4-32

The length of the random hash appended to filenames. Longer hashes reduce the chance of collisions.

### Default Task Properties

#### Status

**Key**: `defaults.status`\
**Default**: `todo`\
**Environment**: `LOCUS_DEFAULTS_STATUS`

Common values:

- `todo` - Task not started
- `in-progress` - Currently working on
- `done` - Completed
- `cancelled` - No longer needed

#### Priority

**Key**: `defaults.priority`\
**Default**: `normal`\
**Environment**: `LOCUS_DEFAULTS_PRIORITY`

Common values:

- `high` - Urgent tasks
- `normal` - Regular priority
- `low` - Can be deferred

#### Tags

**Key**: `defaults.tags`\
**Default**: `[]` (empty array)

An array of default tags applied to all new tasks. Can be overridden per task.

Example:

```yaml
defaults:
  tags: ["work", "current-sprint"]
```

## Examples

### Development Environment Configuration

```yaml
task_directory: "~/dev/tasks"
language:
  default: "en"
git:
  extract_username: true
  username_from_remote: true
file_naming:
  pattern: "{date}-{slug}-{hash}.md" # Include hash to avoid conflicts
  date_format: "YYYYMMDD"
  hash_length: 8
defaults:
  status: "todo"
  priority: "normal"
  tags: ["dev"]
```

### Team Configuration

```yaml
task_directory: "/shared/team-tasks"
language:
  default: "en"
git:
  extract_username: false # Don't organize by user
  username_from_remote: false
file_naming:
  pattern: "{slug}-{hash}.md" # No date for better sorting
  date_format: "YYYY-MM-DD"
  hash_length: 12 # Longer hash for more uniqueness
defaults:
  status: "todo"
  priority: "normal"
  tags: ["team"]
```

### Personal Task Management

```yaml
task_directory: "~/Documents/tasks"
language:
  default: "en"
git:
  extract_username: false # Don't use Git organization
  username_from_remote: false
file_naming:
  pattern: "{date}-{slug}.md"
  date_format: "YYYY-MM-DD"
  hash_length: 8
defaults:
  status: "todo"
  priority: "normal"
  tags: ["personal"]
```

## Troubleshooting

### Configuration Not Loading

1. Check file location:
   ```bash
   locus config path
   ```

2. Verify file exists:
   ```bash
   ls -la ~/.config/locus/settings.yml
   ```

3. Validate YAML syntax:
   ```bash
   locus config show
   ```

### Environment Variables Not Working

1. Verify variable is set:
   ```bash
   echo $LOCUS_LANG
   ```

2. Check for typos in variable names (must start with `LOCUS_`)

3. Ensure boolean values are correctly formatted

### Permission Issues

1. Check directory permissions:
   ```bash
   ls -la ~/.config/locus/
   ```

2. Ensure write permissions:
   ```bash
   chmod 755 ~/.config/locus
   chmod 644 ~/.config/locus/settings.yml
   ```

### Configuration Conflicts

If settings aren't applying as expected:

1. Check all configuration sources:
   ```bash
   locus config show
   ```

2. Look for environment variable overrides:
   ```bash
   env | grep LOCUS_
   ```

3. Remember the precedence order:
   - Environment variables (highest)
   - Configuration file
   - Defaults (lowest)

## See Also

- [Locus README](../README.md) - General usage and commands
- [Task File Format](../README.md#task-file-format) - Task file structure
- [Command Reference](../README.md#usage) - All available commands
