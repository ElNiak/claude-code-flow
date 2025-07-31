# CLAUDE.md — Claude Code Configuration for Claude Flow

> Grounded generation (Serena LSP + Context7), safety-first concurrency, verification-first,
> and repository governance (no unverifiable claims; clear file placement rules).

---

## Core Principles

- **Grounded, not guessed**: Retrieve context (Context7) and resolve symbols (Serena/LSP) **before** coding.
- **Safety-first concurrency**: Batch **independent, idempotent** operations; pipeline **dependent** ones.
- **Smallest reasonable change**: Prefer minimal diffs over rewrites.
- **Verification gate**: Typecheck/lint/tests must pass before finalization.
- **Factual outputs only**: No numeric claims without measured artifacts.
- **Repository hygiene**: No analysis/plan/report files in repo root.

---

## Concurrency Policy (Safety-First)

**Rule**: Use batching/parallelism **only** for operations that are independent and idempotent (e.g., multiple reads).
Use **sequential/pipelined** steps when any of the following are true:

- Ordering/causal dependencies exist.
- External rate-limits or side effects could conflict.
- A later step depends on results from an earlier step.
- Error isolation is needed to avoid cascading failures.

**Guideline**: “**One message = all independent related operations**.”
If any operation needs a prior result, **split** into a short pipeline.

**Do (Batch)**: multiple Reads, non-conflicting Writes, stateless Bash, independent Task spawns.
**Don’t batch**: migrations, build→test→deploy chains, network-limited installs, writes with causal deps.

---

## Concurrency After Swarm Init (Safety-First)

After `swarm_init`, **prefer** parallel execution **only when** operations are independent and idempotent.
If any dependency/order/side-effect exists, use a **short pipeline** of messages.

- **Batch examples (OK)**: independent Reads; non-conflicting Writes; stateless Bash; agent spawns with no cross-deps.
- **Pipeline examples (split)**: migrations; build→test→deploy; multiple `install`/`migrate` steps; dependent Writes.

---

## MCP Usage Policy (Grounding-First)

**Order of operations**

1) **Plan briefly** (bullets): intent, scope, success checks.
2) **Retrieve context** with **Context7**: top-k files/snippets relevant to the task.
3) **Resolve identifiers** with **Serena (LSP)**: jump-to-definition for every new API/class/symbol.
4) **Generate minimal change-set** (avoid gratuitous edits).
5) **Verify**: run typecheck/lint/tests; iterate until green.
6) **Finalize explanation** referencing file paths and test names (no invented numbers).

**Hard rules**

- **Do not** call APIs/classes that do not exist via Serena/LSP or retrieved context.
- If a symbol is missing: **define it explicitly** in-scope or **ask** for guidance. Do **not** invent it.
- MCP tools are for **coordination/memory**; **Claude Code** performs file/command work.

---

## Separation of Concerns

**Claude Code executes (the hands)**
File ops (Read/Write/Edit/MultiEdit/Glob/Grep), code generation, Bash, Git, package management, tests/debugging.

**MCP tools coordinate (the brain)**
Planning/decomposition, context retrieval, orchestration, memory, progress tracking.
**MCP tools do not** write files, run Bash, or generate code.

---

## Grounded Code-Generation Checklist

Before writing:

- [ ] **Context7**: Retrieve top-k relevant files/snippets.
- [ ] **Serena/LSP**: Jump-to-definition for each intended identifier.
- [ ] **Plan** with short bullet points.

While writing:

- [ ] Match surrounding code’s style/patterns.
- [ ] Make the **smallest** change to reach the goal.
- [ ] Keep to scope; unrelated issues → open an issue.

After writing:

- [ ] **Typecheck / lint / unit + integration + e2e tests**.
- [ ] Fix based on **concrete** errors; repeat until green.
- [ ] Commit message: factual, with file/test references.

---

## Chain-of-Verification (CoVe)

Before finalizing:

- [ ] **List** new/changed identifiers; confirm each exists in retrieved/modified files.
- [ ] For each factual statement, **attach a source** (file path, test id, or benchmark artifact).
- [ ] Re-run lint/typecheck/tests after fixes until all green.
- [ ] If a required fact cannot be supported, **omit it** or request guidance.

---

## Measurement & Reporting (Replaces Performance Prose)

Do **not** state numeric improvements in prose without artifacts.

When reporting performance, include a table:

- **Command(s)** and dataset/fixture
- **Baseline** commit/branch
- **N runs** and **stdev** (if applicable)
- **Link** to CI artifact or reproducible log

If no artifact exists, **omit numbers** (use qualitative description only).

**Template**

Benchmark
	•	Command(s):
	•	Dataset/Fixture:
	•	Baseline: <commit/branch>
	•	Runs: N=, stdev=
	•	Artifact:

Metric	Baseline	Candidate	Δ

---

## Root Artifacts Policy (Strict)

**Interdiction**: Do **not** create or commit *analysis*, *plan*, or *report* files in the repository **root**.

- **Forbidden root patterns**: `*analysis*.md|txt`, `*plan*.md|txt`, `*report*.md|txt`
- **Allowed locations**: `docs/analysis/`, `docs/plans/`, `docs/reports/`
- **Agent behavior**: On attempted root write matching a forbidden pattern, **do not write**; propose a `docs/…` path instead.
- **Exceptions**: None without a maintainer-approved ticket naming the exact path.

---

## Writing Code

- **CRITICAL**: NEVER USE `--no-verify` WHEN COMMITTING CODE.
- Prefer **simple, clean, maintainable** solutions over clever/complex ones.
- Make the **smallest reasonable changes**; ask permission before re-implementing systems.
- Match the **style/format** of surrounding code (local consistency > external guides).
- Never change **outside current task**; file an issue instead.
- **Do not remove comments** unless **provably false**.
- All **code files** start with two brief comment lines prefixed `ABOUTME: ` describing file purpose.
- Comments should be **evergreen** (describe current behavior, not history).
- **No mock mode**: use real data/APIs unless the human explicitly authorizes an exception.
- Never toss an implementation to rewrite from scratch **without explicit permission**.
- Avoid names like `improved/new/enhanced`; use **evergreen** names.

---

## Getting Help

- Always **ask for clarification** rather than assume.
- If stuck, stop and ask; the human may be better suited to the obstacle.

---

## Testing

- Tests **must** cover implemented functionality.
- Never ignore system/test output; logs often contain **critical** info.
- **Test output must be pristine** to pass.
- If errors are expected, **capture and assert** them.
- **No exceptions policy**: Every project must have **unit**, **integration**, and **end-to-end** tests.
  To skip any, the human must say exactly:
  **“I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME”**

### We Practice TDD

- Write tests **before** implementation.
- Only write enough code to make the failing test pass.
- Refactor continually while keeping tests green.

**TDD Cycle**

1) Write a failing test defining desired behavior.
2) Run to confirm it fails.
3) Implement the **minimum** to pass.
4) Run to confirm success.
5) Refactor while keeping green.
6) Repeat per feature/bugfix.

---

## Git Guardrails

### 1) Mandatory Pre-Commit Failure Protocol

When pre-commit hooks fail, follow this sequence **before any commit**:

1) Read the complete error output (explain what you see).
2) Identify which tool failed (biome, ruff, tests, etc.) and **why**.
3) Explain the fix you will apply and **why** it addresses root cause.
4) Apply the fix and **re-run hooks**.
5) **Only** commit after all hooks pass.

Never commit with failing hooks. Never use `--no-verify`. If you cannot fix the hooks, **ask** for help.

### 2) Explicit Git Flag Prohibition

**Forbidden flags**: `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.

Before using **any** git flag:

- State the flag and why you need it.
- Confirm it’s **not** forbidden.
- Get explicit permission for any bypass flags.

If you’re about to use a forbidden flag, **stop** and follow the pre-commit failure protocol.

### 3) Pressure Response Protocol

If asked to “commit” or “push” while hooks are failing:

- Do **not** bypass quality checks.
- State: “Pre-commit hooks are failing; I need to fix those first.”
- Work through failures systematically.
- Quality over speed, even under pressure.

### 4) Accountability Checkpoint

Before any git command, ask:

- “Am I bypassing a safety mechanism?”
- “Would this violate `CLAUDE.md`?”
- “Am I choosing convenience over quality?”

If any answer is “yes/maybe”, explain the concern and pause.

### 5) Learning-Focused Error Response

For tool failures (biome, ruff, pytest, etc.):

- Treat failures as learning opportunities.
- Research the **specific** error before changing code.
- Explain what you learned.
- Build competence deliberately.

---

## Coordination Patterns (MCP & Swarms)

- Start simple: a single agent often performs the full grounded cycle.
- Add agents only when the task demonstrably benefits (distinct, independent subtasks).
- When batching with swarms, apply the **Concurrency Policy**: batch only **independent, idempotent** steps.
- Keep messages focused; avoid unrelated tool calls in the same message.

---

## Workflow Templates

**Dependent pipeline (correct)**

1) MCP: plan → Context7 retrieve → Serena/LSP resolve
2) Claude Code: implement minimal change-set
3) Claude Code: typecheck/lint/tests → fix until green
4) Claude Code: finalize with file/test references

**Independent batch (correct)**

- Single message containing several **independent** Reads/Writes or Task spawns,
  followed by verification.

**Incorrect**

- Forcing dependent steps into one message when results are needed between steps.
