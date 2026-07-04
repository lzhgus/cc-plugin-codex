---
description: Show the final stored Claude Code output for a finished job, plus a `claude --resume` command. Optional task id argument.
---

# Claude Code result

Show the final stored output of a finished Claude Code job. When available, it also includes the Claude Code session id so you can reopen that run in Claude Code with `claude --resume <session-id>`.

## Examples

```bash
/cc:result
/cc:result <task-id>
```

Parse `$ARGUMENTS`: if a single token that looks like a task id is present, pass it as `task_id`.

Call:

```
cc_result({})
// or
cc_result({ task_id: "<task-id>" })
```

Defaults to the most recent job for this repo.