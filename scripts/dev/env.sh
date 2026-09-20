#!/bin/sh
# Shared prelude for every `pnpm dev` pane (mprocs.yaml → scripts/dev/*.sh).
# Sourcing this loads the ONE env every pane must agree on:
#   .env.development  (committed, non-secret — the team-wide contract)
#   .env.local        (gitignored secrets; must not re-define committed keys —
#                      the doctor enforces that before mprocs starts)
# and exposes the tiny helpers panes share. Always `. scripts/dev/env.sh`
# from a script whose cwd is the repo root (mprocs runs panes from there).

TILINX_DEV_ROOT="$(pwd)"
# Sibling cloud checkout (gettilinx/cloud) — same convention for canonical
# checkouts and _agent-tasks worktrees alike. Override with CLOUD_DIR=.
CLOUD_DIR="${CLOUD_DIR:-$(cd "$TILINX_DEV_ROOT/.." && pwd)/cloud}"
export TILINX_DEV_ROOT CLOUD_DIR

set -a
[ -f "$TILINX_DEV_ROOT/.env.development" ] && . "$TILINX_DEV_ROOT/.env.development"
[ -f "$TILINX_DEV_ROOT/.env.local" ] && . "$TILINX_DEV_ROOT/.env.local"
set +a

# wait_pg — block until the dev Postgres container answers pg_isready (the
# docker-proxy accepts TCP before the server is up, so a bare port probe lies).
wait_pg() {
  printf 'waiting for postgres (tilinx-dev-pg)'
  i=0
  until docker exec tilinx-dev-pg pg_isready -U postgres -q 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -gt 120 ]; then
      printf '\npostgres did not become ready in 120s — check the pg pane\n' >&2
      exit 1
    fi
    printf '.'
    sleep 1
  done
  printf ' ready\n'
}
