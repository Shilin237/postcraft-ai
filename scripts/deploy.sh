#!/usr/bin/env bash
# PostCraft AI — Build & Push to GitHub
# Usage: bash scripts/deploy.sh "your commit message"
# First-time setup: bash scripts/deploy.sh "Initial commit" --repo postcraft-ai --private

set -e

COMMIT_MSG="${1:-update}"
REPO_NAME="${3:-postcraft-ai}"
VISIBILITY="${4:---private}"
GITHUB_USER="Shilin237"
REMOTE_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo ""
echo "=== PostCraft AI Deploy ==="

# 1. Type-check
echo "[1/5] Type-checking..."
npx tsc --noEmit && echo "  OK" || { echo "  FAIL: fix TypeScript errors first"; exit 1; }

# 2. Init git if needed
if [ ! -d ".git" ]; then
  echo "[2/5] Initializing git repo..."
  git init
  git branch -M main
else
  echo "[2/5] Git repo exists — skipping init"
fi

# 3. Create GitHub repo if gh CLI available and no remote yet
if ! git remote get-url origin &>/dev/null; then
  if command -v gh &>/dev/null; then
    echo "[3/5] Creating GitHub repo '$REPO_NAME'..."
    gh repo create "$REPO_NAME" $VISIBILITY --source=. --remote=origin --push
    echo "  Done — repo created and pushed!"
    exit 0
  else
    echo "[3/5] No remote set. Adding: $REMOTE_URL"
    git remote add origin "$REMOTE_URL"
  fi
else
  echo "[3/5] Remote already set: $(git remote get-url origin)"
fi

# 4. Stage & commit
echo "[4/5] Staging files..."
git add -A
git status --short

echo ""
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" || echo "  Nothing new to commit"

# 5. Push
echo "[5/5] Pushing to GitHub..."
git push -u origin HEAD
echo ""
echo "Done! View at: https://github.com/$GITHUB_USER/$REPO_NAME"
