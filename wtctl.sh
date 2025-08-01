# cli/wtctl.sh
#!/usr/bin/env bash
# Purpose: Manage per-Objective×Phase git worktrees for Claude-managed phases.
# Phases: SPEC | DESIGN | IMPL | REVIEW
# Naming:  dir  = ../<repo>-<obj-slug>-<phase>[-<track>]
#          branch = <phase>/<obj-slug>[-<track>]
# BASE_BRANCH: main (default) or override via env.

set -euo pipefail
CMD="${1:-}" ; shift || true

: "${OBJECTIVE:?Set OBJECTIVE, e.g., OBJECTIVE='Add OAuth login (PKCE)'}"
PHASE="${PHASE:-SPEC}"             # SPEC|DESIGN|IMPL|REVIEW
TRACK="${TRACK:-}"                 # optional parallel lane name (e.g., backend/frontend)
BASE_BRANCH="${BASE_BRANCH:-main}" # base for new branches

slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[[:space:][:punct:]]+/-/g; s/^-+|-+$//g'; }
OBJ_SLUG="$(slug "${OBJECTIVE}")"
REPO_SLUG="$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g')"
SUFFIX="${TRACK:+-${TRACK}}"
DIR="../${REPO_SLUG}-${OBJ_SLUG}-${PHASE}${SUFFIX}"
BRANCH="${PHASE}/${OBJ_SLUG}${SUFFIX}"

ensure_clean_git() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "[ERR] Not in a git repository."; exit 2; }
  git fetch --all --prune >/dev/null 2>&1 || true
}

cmd_init() {
  ensure_clean_git
  if git show-ref --quiet --heads "${BRANCH}"; then
    echo "[INFO] Branch exists: ${BRANCH}"
  else
    echo "[INFO] Creating branch ${BRANCH} from ${BASE_BRANCH}"
  fi
  if [ -d "${DIR}" ]; then
    echo "[OK] Worktree dir exists: ${DIR}"
  else
    if git show-ref --quiet --heads "${BRANCH}"; then
      git worktree add "${DIR}" "${BRANCH}"
    else
      git worktree add "${DIR}" -b "${BRANCH}" "${BASE_BRANCH}"
    fi
  fi
  echo "[NEXT] cd ${DIR}"
  echo "[TIP ] Install tooling per worktree (npm i / venv) before running Claude."
}

cmd_ensure() {
  ensure_clean_git
  if [ ! -d "${DIR}" ]; then
    cmd_init
  else
    echo "[OK] Worktree present: ${DIR}"
  fi
  if ! git -C "${DIR}" rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
    echo "[ERR] ${DIR} is not a git worktree; consider removing and re-creating."; exit 3
  fi
  echo "${DIR}"
}

cmd_cd() {
  # Print an eval'able cd command
  echo "cd ${DIR}"
}

cmd_cleanup() {
  ensure_clean_git
  if [ -d "${DIR}" ]; then
    echo "[INFO] Removing worktree: ${DIR}"
    git worktree remove "${DIR}" || { echo "[WARN] Worktree not clean; use: git worktree remove -f ${DIR}"; exit 4; }
  else
    echo "[INFO] Worktree dir not found: ${DIR}"
  fi
  echo "[INFO] Pruning stale records"
  git worktree prune
}

case "${CMD}" in
  init)     cmd_init ;;
  ensure)   cmd_ensure ;;
  cd)       cmd_cd ;;
  cleanup)  cmd_cleanup ;;
  ""|help)  cat <<'EOT'
Usage: wtctl.sh <init|ensure|cd|cleanup>
  ENV: OBJECTIVE (required), PHASE (SPEC|DESIGN|IMPL|REVIEW), TRACK (optional), BASE_BRANCH (default: main)
  Examples:
    OBJECTIVE="OAuth login" PHASE=SPEC bash cli/wtctl.sh init
    OBJECTIVE="OAuth login" PHASE=DESIGN TRACK=backend bash cli/wtctl.sh ensure
    OBJECTIVE="OAuth login" PHASE=SPEC bash -c "$(bash cli/wtctl.sh cd)" && pwd
    OBJECTIVE="OAuth login" PHASE=REVIEW bash cli/wtctl.sh cleanup
EOT
  ;;
  *) echo "[ERR] Unknown cmd: ${CMD}"; exit 2 ;;
esac
