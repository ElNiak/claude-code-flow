# /run_repo_hygiene.sh
# Purpose: Orchestrate a multi-agent repo hygiene audit (mixed JS/TS) using claude-flow@alpha.
# - Creates a workflow file if missing
# - Runs analyzers in parallel (typecheck, orphans/cycles, unused files/exports/deps, dupes, coverage, bundling)
# - Aggregates results into ./reports and stores a summary in Claude-Flow memory

set -euo pipefail

### ---------- configuration (overridable via env or flags) ----------
REPO="${REPO:-}"                   # auto-detected from git if empty
ROOT="${ROOT:-.}"                  # path to analyze (default: repo root)
TSCONFIG="${TSCONFIG:-}"           # auto-picks tsconfig.cli.json or tsconfig.json if empty
CLI_ENTRY="${CLI_ENTRY:-}"         # auto-picks src/cli/index.ts or src/index.ts if empty
MAX_CONCURRENT="${MAX_CONCURRENT:-5}"
INSTALL_TOOLS=0                    # set to 1 or pass --install to add dev deps
WORKFLOW_PATH="workflows/repo-hygiene.json"
REPORT_DIR="reports"

### ---------- helpers ----------
log() { printf "\033[1;34m[repo-hygiene]\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [--install]

Environment overrides:
  REPO=owner/name           (default: auto from git remote origin)
  ROOT=path                 (default: .)
  TSCONFIG=path             (default: tsconfig.cli.json or tsconfig.json)
  CLI_ENTRY=path            (default: src/cli/index.ts or src/index.ts)
  MAX_CONCURRENT=N          (default: 5)
EOF
}

detect_repo() {
  if [ -n "${REPO}" ]; then return 0; fi
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local url; url="$(git config --get remote.origin.url || true)"
    case "$url" in
      git@github.com:*) REPO="${url#git@github.com:}"; REPO="${REPO%.git}";;
      https://github.com/*) REPO="${url#https://github.com/}"; REPO="${REPO%.git}";;
      *) REPO="ElNiak/claude-code-flow";;
    esac
  else
    REPO="ElNiak/claude-code-flow"
  fi
}

detect_tsconfig() {
  if [ -n "${TSCONFIG}" ]; then return 0; fi
  if [ -f "tsconfig.cli.json" ]; then TSCONFIG="tsconfig.cli.json"
  elif [ -f "tsconfig.json" ]; then TSCONFIG="tsconfig.json"
  else TSCONFIG="tsconfig.json"; warn "No tsconfig found; defaulting to ${TSCONFIG}."
  fi
}

detect_cli_entry() {
  if [ -n "${CLI_ENTRY}" ]; then return 0; fi
  if [ -f "src/cli/index.ts" ]; then CLI_ENTRY="src/cli/index.ts"
  elif [ -f "src/index.ts" ]; then CLI_ENTRY="src/index.ts"
  else CLI_ENTRY="src/cli/index.ts"; warn "No CLI entry found; defaulting to ${CLI_ENTRY}."
  fi
}

pm_run() {
  # Purpose: run a script with whichever package manager is available (pnpm > yarn > npm)
  local cmd="$1"; shift || true
  if command -v pnpm >/dev/null 2>&1; then pnpm -s $cmd "$@" || true
  elif command -v yarn >/dev/null 2>&1; then yarn -s $cmd "$@" || true
  else npm run -s $cmd "$@" || true
  fi
}

install_tools() {
  log "Installing dev tools (typescript, dep-cruiser, madge, knip, ts-prune, depcheck, jscpd, c8, esbuild)…"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm add -D typescript dependency-cruiser madge knip ts-prune depcheck jscpd c8 esbuild
  elif command -v yarn >/dev/null 2>&1; then
    yarn add -D typescript dependency-cruiser madge knip ts-prune depcheck jscpd c8 esbuild
  else
    npm i -D typescript dependency-cruiser madge knip ts-prune depcheck jscpd c8 esbuild
  fi
}

ensure_dirs() {
  mkdir -p "${REPORT_DIR}" "$(dirname "${WORKFLOW_PATH}")"
}

write_workflow_if_missing() {
  if [ -f "${WORKFLOW_PATH}" ]; then return 0; fi
  log "Creating default workflow at ${WORKFLOW_PATH}"
  cat > "${WORKFLOW_PATH}" <<EOF
{
  "name": "repo-hygiene-audit",
  "description": "Parallel repo hygiene analysis for mixed TS/JS.",
  "memory": { "namespace": "repo-hygiene", "persist": true },
  "params": {
    "repo": "${REPO}",
    "path": "${ROOT}",
    "tsconfig": "${TSCONFIG}",
    "cliEntry": "${CLI_ENTRY}"
  },
  "tasks": {
    "typecheck": {
      "agent": "code-analyzer",
      "task": "TypeScript typecheck only (no emit)",
      "command": "npx tsc -p ${TSCONFIG} --noEmit > ${REPORT_DIR}/typecheck.txt || true"
    },
    "ts-listfiles": {
      "agent": "code-analyzer",
      "task": "List files and trace module resolution",
      "command": "npx tsc -p ${TSCONFIG} --noEmit --listFiles > ${REPORT_DIR}/ts-listfiles.txt && npx tsc -p ${TSCONFIG} --noEmit --traceResolution > ${REPORT_DIR}/ts-trace-resolution.txt"
    },
    "graph-orphans": {
      "agent": "code-analyzer",
      "task": "Orphans & cycles via dependency-cruiser and Madge",
      "command": "npx depcruise ${ROOT} --config .dependency-cruiser.cjs --output-type err > ${REPORT_DIR}/depcruise.txt || true && npx madge --extensions ts,tsx,js,jsx --circular --orphans ${ROOT} > ${REPORT_DIR}/madge.txt || true"
    },
    "unused-files-exports": {
      "agent": "code-analyzer",
      "task": "Unused files/exports via Knip + ts-prune",
      "command": "npx knip --reporter json > ${REPORT_DIR}/knip.json || true && npx ts-prune -p ${TSCONFIG} > ${REPORT_DIR}/ts-prune.txt || true"
    },
    "unused-deps": {
      "agent": "code-analyzer",
      "task": "Unused dependencies via depcheck",
      "command": "npx depcheck ${ROOT} > ${REPORT_DIR}/depcheck.txt || true"
    },
    "duplicates": {
      "agent": "code-analyzer",
      "task": "Copy/paste detection via jscpd",
      "command": "npx jscpd --reporters json --threshold 3 --pattern \\"${ROOT}/**/*.{ts,tsx,js,jsx}\\" --output ${REPORT_DIR}/jscpd || true"
    },
    "bundle-reachability": {
      "agent": "system-architect",
      "task": "Emit esbuild metafile to confirm reachability from CLI entry",
      "command": "npx esbuild ${CLI_ENTRY} --bundle --platform=node --metafile=${REPORT_DIR}/esbuild.meta.json --outfile=/dev/null"
    },
    "coverage": {
      "agent": "tester",
      "task": "Run tests with V8 coverage; 0%-loaded files are suspects",
      "command": "npx c8 --all $(command -v pnpm >/dev/null 2>&1 && echo pnpm -s test || (command -v yarn >/dev/null 2>&1 && echo yarn -s test || echo npm -s test)) || true && npx c8 report --reporter=text-summary --report-dir=${REPORT_DIR}/coverage || true"
    },
    "github-remote-scan": {
      "agent": "github-modes",
      "task": "Remote GitHub repo code_quality & security analysis (best-effort)",
      "command": "npx claude-flow github repo analyze ${REPO} --analysis-type code_quality --depth deep > ${REPORT_DIR}/github-code-quality.txt || true && npx claude-flow github repo analyze ${REPO} --analysis-type security --depth deep > ${REPORT_DIR}/github-security.txt || true"
    },
    "reduce-and-report": {
      "agent": "report-generator",
      "dependencies": [
        "typecheck","ts-listfiles","graph-orphans","unused-files-exports",
        "unused-deps","duplicates","bundle-reachability","coverage","github-remote-scan"
      ],
      "task": "Summarize artefacts and store in memory namespace repo-hygiene",
      "command": "node -e \\"const fs=require('fs');const d='${REPORT_DIR}';const out=d+'/repo-hygiene.md';const parts=['typecheck.txt','ts-listfiles.txt','ts-trace-resolution.txt','depcruise.txt','madge.txt','ts-prune.txt','depcheck.txt','coverage/coverage-summary.json','github-code-quality.txt','github-security.txt'];let s='# Repo Hygiene Report\\\\n\\\\n';for(const p of parts){try{s+=\\\\`\\\\n## ${p}\\\\n\\\\n\\\\`+fs.readFileSync(d+'/'+p,'utf8');}catch{}}fs.writeFileSync(out,s);\\" && npx claude-flow memory store repo-hygiene \\"$(head -c 45000 ${REPORT_DIR}/repo-hygiene.md || true)\\" && npx claude-flow memory export ${REPORT_DIR}/repo-hygiene.memory.json --namespace repo-hygiene || true"
    }
  },
  "strategy": "parallel",
  "maxConcurrent": ${MAX_CONCURRENT}
}
EOF
}

spawn_hive() {
  log "Spawning hive (persistent multi-agent session)…"
  # Note: --agents list may be partially ignored on some alpha builds; workflow still runs fine.
  npx claude-flow@alpha hive-mind spawn "Repo hygiene audit for ${REPO}" \
    --namespace repo-hygiene \
    --agents researcher,code-analyzer,tester,system-architect,github-modes,report-generator \
    --claude | tee "${REPORT_DIR}/hive-spawn.txt" || true
}

execute_workflow() {
  log "Executing workflow (parallel)…"
  npx claude-flow@alpha workflow execute \
    --definition "${WORKFLOW_PATH}" \
    --async=false || true

  npx claude-flow@alpha memory stats | tee "${REPORT_DIR}/memory-stats.txt" || true
  npx claude-flow@alpha hive-mind status | tee "${REPORT_DIR}/hive-status.txt" || true
  log "Done. See ${REPORT_DIR}/"
}

### ---------- main ----------
while [ "${1:-}" != "" ]; do
  case "$1" in
    --install) INSTALL_TOOLS=1 ;;
    -h|--help) usage; exit 0 ;;
    *) err "Unknown arg: $1"; usage; exit 2 ;;
  esac
  shift
done

detect_repo
detect_tsconfig
detect_cli_entry
ensure_dirs

log "Repo:       ${REPO}"
log "Root path:  ${ROOT}"
log "tsconfig:   ${TSCONFIG}"
log "CLI entry:  ${CLI_ENTRY}"
log "Reports:    ${REPORT_DIR}"
log "Workflow:   ${WORKFLOW_PATH}"

if [ "${INSTALL_TOOLS}" -eq 1 ]; then install_tools; fi
write_workflow_if_missing
spawn_hive
execute_workflow
