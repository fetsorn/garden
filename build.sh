#!/usr/bin/env sh

# turtle in ~/mm/lodes/crater/garden.ttl
# turned to json in _data/garden.json

# csvs in ~/mm/lodes/quarry
# turned to _data/quarry.json

rm -R _site

git worktree remove ./_site

git worktree add ./_site pages

npx @11ty/eleventy

git --git-dir ./.git/worktrees/_site --work-tree ./_site add .

git --git-dir ./.git/worktrees/_site --work-tree ./_site commit -m "$(cat package.json | jq '.version')""$(git log --pretty=format:'%h' -n 1)"

git --git-dir ./.git/worktrees/_site --work-tree ./_site push origin pages

git worktree prune

