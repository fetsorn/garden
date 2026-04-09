#!/usr/bin/env sh

git worktree remove ../pages 2>/dev/null || true

git worktree add ../pages pages

./build.sh

cp -r _site/* ../pages/

git --git-dir ../.git/worktrees/pages --work-tree ../pages add .

git --git-dir ../.git/worktrees/pages --work-tree ../pages commit -m "$(jq -r '.version' package.json) $(git log --pretty=format:'%h' -n 1)"

git --git-dir ../.git/worktrees/pages --work-tree ../pages push origin pages

git worktree prune
