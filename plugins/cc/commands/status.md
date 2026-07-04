---
description: Show running and recent Claude Code jobs for the current repository. Optional task id argument.
---

# Claude Code status

Show running and recent background Claude Code jobs for the current repository.

## Examples

```bash
/cc:status
/cc:status <task-id>
```

Parse `$ARGUMENTS`: if a single token that looks like a task id is present, pass it as `task_id`.

Call:

```
cc_status({})
// or
cc_status({ task_id: "<task-id>" })
```

Use it to:

- check progress on background work
- see the latest completed job
- confirm whether a task is still running