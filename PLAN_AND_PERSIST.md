# Claude-Flow: Phase-Orchestrated Worktrees + Planning/Persistence

This bundle contains:

- `wtctl.sh` — manage per-Objective×Phase **git worktrees** (`init|ensure|cd|cleanup`).
- `plan-and-persist.sh` — spawn **planning-only** sessions and **persist** SAVE BLOCKS, plus phase actions:
  - `ACTION=phase-start|phase-persist|phase-finish|plan|persist|check|plan+persist|wt-help`

## Quick start

```bash
# 1) Ensure a dedicated worktree for SPEC
OBJECTIVE="OAuth login" PHASE=SPEC bash wtctl.sh init
eval "$(OBJECTIVE='OAuth login' PHASE=SPEC bash wtctl.sh cd)"

# 2) Plan (no writes)
OBJECTIVE="OAuth login" PHASE=SPEC SAVE_STYLE=multi bash plan-and-persist.sh ACTION=plan | tee /tmp/spec.txt

# 3) Persist SAVE BLOCKS
OBJECTIVE="OAuth login" PHASE=SPEC ACTION=persist ROADMAP_SRC=/tmp/spec.txt bash plan-and-persist.sh

# Plan only (no writes). Choose SAVE_STYLE=index or multi.
OBJECTIVE="Baseline the repo; derive stack docs " PHASE="SPEC"  QUALITY_LEVEL=thorough PROFILE=auto PROJECT_KIND=auto STACK_HINTS="" SAVE_STYLE=index USE_SERENA=1 ROADMAP_PATH=roadmap/plan-output.txt bash plan-and-persist.sh ACTION=plan+persist

# 1) Plan (no writes)
OBJECTIVE="Add OAuth login (PKCE) to Service X" PHASE="SPEC" bash plan-and-persist.sh

# 2) Persist from a saved output file
OBJECTIVE="Add OAuth login (PKCE) to Service X" ACTION=persist ROADMAP_SRC=roadmap/plan-output.txt bash plan-and-persist.sh

# 3) Dry-run what would be written
OBJECTIVE="Add OAuth login (PKCE) to Service X" ACTION=check ROADMAP_SRC=roadmap/plan-output.txt bash plan-and-persist.sh

# 4) Plan now, then immediately persist (keeps phases explicit)
OBJECTIVE="Stack docs for all projects" PHASE="SPEC" SAVE_STYLE=multi ACTION=plan+persist bash plan-and-persist.sh > /dev/null
```

### Phase-orchestrated (managed by Claude)

```bash
# Plan inside the worktree & persist later
OBJECTIVE="OAuth login" PHASE=SPEC SAVE_STYLE=multi ACTION=phase-start  bash plan-and-persist.sh | tee /tmp/spec.txt
OBJECTIVE="OAuth login" PHASE=SPEC ACTION=phase-persist ROADMAP_SRC=/tmp/spec.txt bash plan-and-persist.sh
OBJECTIVE="OAuth login" PHASE=SPEC ACTION=phase-finish bash plan-and-persist.sh
```

### Worktree help

```bash
ACTION=wt-help bash plan-and-persist.sh
```

### Options

- `TRACK=backend|frontend|...` to create parallel lanes (`SPEC/<objective>-backend`, etc.).
- `USE_SERENA=1` to include Serena MCP onboarding in the plan prompt.
- `SAVE_STYLE=index|multi` for single-file or multi-file SAVE BLOCK output.
