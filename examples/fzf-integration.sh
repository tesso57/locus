#!/bin/bash
# Example: Using locus with fzf for interactive task selection

# Select a task and open it in your editor
locus list --oneline | fzf --delimiter=$'\t' \
  --with-nth=1,2,3,4 \
  --preview='locus read {7} --raw' \
  --bind='enter:execute(${EDITOR:-vim} {7})'

# Example with custom formatting:
# Column 1: Repository
# Column 2: Status  
# Column 3: Priority
# Column 4: Title
# Column 5: Tags
# Column 6: Created date
# Column 7: Full path

# You can also filter by status before selecting:
# locus list --oneline --status todo | fzf ...

# Or use it to quickly navigate to a task file:
# cd $(locus list --oneline | fzf | cut -f7 | xargs dirname)