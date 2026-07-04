---
description: Cancel an active background Claude Code job. Optional task id argument.
---

# Claude Code cancel

Cancel an active background Claude Code job.

## Examples

```bash
/cc:cancel
/cc:cancel <task-id>
```

Parse `$ARGUMENTS`: if a single token that looks like a task id is present, pass it as `task_id`.

Call:

```
cc_cancel({})
// or
cc_cancel({ task_id: "<task-id>" })
```

Defaults to the most recent running job for this repo.