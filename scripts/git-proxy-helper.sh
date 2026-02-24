#!/usr/bin/env bash
set -euo pipefail

# git-proxy-helper.sh
# - Configure proxy env + git proxy settings for current shell/machine
# - Configure origin remote URL in target repo
# - Run connectivity checks for GitHub access

usage() {
  cat <<'USAGE'
Usage:
  git-proxy-helper.sh setup \
    --repo /path/to/repo \
    --remote-url https://github.com/OWNER/REPO.git \
    [--proxy-url http://proxy.company.local:8080] \
    [--no-proxy github.com,api.github.com]

  git-proxy-helper.sh test --repo /path/to/repo
  git-proxy-helper.sh clear-proxy --repo /path/to/repo

Notes:
- setup writes proxy to BOTH environment (current process only) and git config:
  - repo local:  .git/config (http.proxy, https.proxy)
  - global:      ~/.gitconfig (http.proxy, https.proxy)
- If your company requires authenticated proxy, pass URL like:
  http://USERNAME:PASSWORD@proxy.company.local:8080
- For PAT auth, set env var before running test/fetch/push:
  export GITHUB_PAT='ghp_xxx'
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] command not found: $1" >&2
    exit 1
  }
}

log() {
  printf '[INFO] %s\n' "$*"
}

err() {
  printf '[ERROR] %s\n' "$*" >&2
}

ACTION="${1:-}"
shift || true

REPO=""
REMOTE_URL=""
PROXY_URL=""
NO_PROXY_LIST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"; shift 2 ;;
    --remote-url)
      REMOTE_URL="$2"; shift 2 ;;
    --proxy-url)
      PROXY_URL="$2"; shift 2 ;;
    --no-proxy)
      NO_PROXY_LIST="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      err "unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd git

ensure_repo() {
  [[ -n "$REPO" ]] || { err "--repo is required"; exit 1; }
  [[ -d "$REPO/.git" ]] || { err "not a git repo: $REPO"; exit 1; }
}

set_remote() {
  [[ -n "$REMOTE_URL" ]] || { err "--remote-url is required for setup"; exit 1; }
  if git -C "$REPO" remote get-url origin >/dev/null 2>&1; then
    git -C "$REPO" remote set-url origin "$REMOTE_URL"
    log "updated remote origin: $REMOTE_URL"
  else
    git -C "$REPO" remote add origin "$REMOTE_URL"
    log "added remote origin: $REMOTE_URL"
  fi
}

set_proxy() {
  if [[ -z "$PROXY_URL" ]]; then
    log "--proxy-url not set: skipping proxy config"
    return 0
  fi

  export HTTP_PROXY="$PROXY_URL"
  export HTTPS_PROXY="$PROXY_URL"
  export http_proxy="$PROXY_URL"
  export https_proxy="$PROXY_URL"

  if [[ -n "$NO_PROXY_LIST" ]]; then
    export NO_PROXY="$NO_PROXY_LIST"
    export no_proxy="$NO_PROXY_LIST"
    log "set NO_PROXY=$NO_PROXY_LIST"
  fi

  git -C "$REPO" config http.proxy "$PROXY_URL"
  git -C "$REPO" config https.proxy "$PROXY_URL"
  git config --global http.proxy "$PROXY_URL"
  git config --global https.proxy "$PROXY_URL"

  log "proxy configured in repo and global git config"
}

clear_proxy() {
  git -C "$REPO" config --unset-all http.proxy || true
  git -C "$REPO" config --unset-all https.proxy || true
  git config --global --unset-all http.proxy || true
  git config --global --unset-all https.proxy || true
  unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy NO_PROXY no_proxy || true
  log "proxy settings cleared from repo/global and current shell env"
}

test_connectivity() {
  log "remote list"
  git -C "$REPO" remote -v || true

  log "test ls-remote"
  if git -C "$REPO" ls-remote origin >/tmp/git-proxy-helper-lsremote.log 2>&1; then
    log "SUCCESS: ls-remote origin"
    sed -n '1,5p' /tmp/git-proxy-helper-lsremote.log
  else
    err "FAILED: ls-remote origin"
    sed -n '1,40p' /tmp/git-proxy-helper-lsremote.log >&2
    return 1
  fi

  log "test push --dry-run (branch: current HEAD)"
  local current_branch
  current_branch="$(git -C "$REPO" rev-parse --abbrev-ref HEAD)"
  if git -C "$REPO" push --dry-run origin "$current_branch" >/tmp/git-proxy-helper-push.log 2>&1; then
    log "SUCCESS: push --dry-run origin $current_branch"
    sed -n '1,10p' /tmp/git-proxy-helper-push.log
  else
    err "FAILED: push --dry-run origin $current_branch"
    sed -n '1,40p' /tmp/git-proxy-helper-push.log >&2
    return 1
  fi
}

case "$ACTION" in
  setup)
    ensure_repo
    set_remote
    set_proxy
    test_connectivity
    ;;
  test)
    ensure_repo
    test_connectivity
    ;;
  clear-proxy)
    ensure_repo
    clear_proxy
    ;;
  ""|-h|--help)
    usage
    ;;
  *)
    err "unknown action: $ACTION"
    usage
    exit 1
    ;;
esac
