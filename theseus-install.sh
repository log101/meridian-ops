#!/bin/bash
# Installs what a fresh sandbox needs before `npm ci && npm run build`:
# Node.js 24 (node:sqlite is built in, so there are no native modules).
# Idempotent: skips anything already present.
set -euo pipefail

need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
  if [ "$major" -ge 24 ]; then need_node=0; fi
fi

if [ "$need_node" = 1 ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    mkdir -p "$NVM_DIR"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install 24
  nvm alias default 24
  if ! grep -q 'NVM_DIR' "$HOME/.profile" 2>/dev/null; then
    cat >> "$HOME/.profile" <<'PROFILE'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
PROFILE
  fi
fi

echo "node $(node -v), npm $(npm -v)"
