#!/usr/bin/env bash
# Docs link-check: every relative markdown link in *.md must resolve.
# Run: bash scripts/check-docs.sh   (repo has no code/tests; this is the
# regression check for docs edits.)
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
while IFS= read -r -d '' f; do
  dir=$(dirname "$f")
  while IFS= read -r link; do
    target="${link%%#*}"
    [ -z "$target" ] && continue
    case "$link" in
      http://*|https://*|mailto:*|"#"*) continue ;;
    esac
    if [ ! -e "$dir/$target" ]; then
      echo "BROKEN: $f -> $link"
      fail=1
    fi
  done < <(grep -oE '\]\([^)]+\)' "$f" | sed -E 's/^\]\(//; s/\)$//')
done < <(find . -name '*.md' -not -path './.git/*' -print0)
if [ "$fail" -eq 0 ]; then echo "docs links OK"; else echo "docs link check FAILED"; fi
exit "$fail"
