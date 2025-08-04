# scripts/resolve_claude_flow_cli.sh
# Purpose: Pick the most reliable claude-flow CLI for this checkout or fall back to npx.
set -Eeuo pipefail

detect_npx_tsx() {
  if command -v npx >/dev/null 2>&1 && npx -y tsx --version >/dev/null 2>&1; then
    echo "npx -y tsx"; return 0
  fi; return 1
}

is_exec() { [ -f "$1" ] && [ -x "$1" ]; }

try_cli() { local c="$1"; $c --help >/dev/null 2>&1 && echo "$c" && return 0 || return 1; }

resolve_claude_flow_cli() {
  local candidates=() tsx_cmd bin_map path
  # 1) package.json bin -> prefer Node dispatcher or wrapper
  if [ -f package.json ] && command -v node >/dev/null 2>&1; then
    bin_map=$(node -e "try{const p=require('./package.json');const b=p.bin; if(!b) process.exit(1);
      if(typeof b==='string'){console.log(b)} else if(b['claude-flow']){console.log(b['claude-flow'])}
      else {console.log(Object.values(b)[0]||'');}}catch{process.exit(1)}" 2>/dev/null || true)
    if [ -n "${bin_map:-}" ]; then
      path="${bin_map#./}"; [ -f "$path" ] || path="./$path"
      if [ -f "$path" ]; then
        head -n1 "$path" | grep -qi "node" && candidates+=("node $path")
        candidates+=("$path")
      fi
    fi
  fi
  # 2) common local bins
  [ -f "bin/claude-flow.js" ] && candidates+=("node bin/claude-flow.js")
  is_exec "bin/claude-flow" && candidates+=("./bin/claude-flow")
  is_exec "./claude-flow" && candidates+=("./claude-flow")
  # 3) TS sources (dev)
  if tsx_cmd=$(detect_npx_tsx); then
    [ -f "src/cli/index.ts" ] && candidates+=("$tsx_cmd src/cli/index.ts")
    [ -f "src/cli/simple-cli.ts" ] && candidates+=("$tsx_cmd src/cli/simple-cli.ts")
    [ -f "src/cli/index-remote.ts" ] && candidates+=("$tsx_cmd src/cli/index-remote.ts")
  fi
  # 4) fallback: published npx
  candidates+=("npx claude-flow@alpha")

  # dedupe and probe
  local seen="" chosen=""
  for c in "${candidates[@]}"; do
    grep -qxF "$c" <<<"$seen" || { seen+=$'\n'"$c"; if chosen=$(try_cli "$c"); then echo "$chosen"; return 0; fi; }
  done
  echo "npx claude-flow@alpha"
}

# Print the resolved command when executed directly
[[ "${BASH_SOURCE[0]}" == "$0" ]] && resolve_claude_flow_cli
