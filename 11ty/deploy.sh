#!/usr/bin/env sh

git worktree remove ../pages 2>/dev/null || true

git worktree add ../pages pages

./build.sh

cp -r _site/* ../pages/

git --git-dir ../.git/worktrees/pages --work-tree ../pages add .

if git --git-dir ../.git/worktrees/pages --work-tree ../pages diff --cached --quiet; then
  echo "No changes to deploy."
else
  git --git-dir ../.git/worktrees/pages --work-tree ../pages commit -m "$(jq -r '.version' package.json) $(git log --pretty=format:'%h' -n 1)"
  git --git-dir ../.git/worktrees/pages --work-tree ../pages push origin pages
fi

git worktree prune
