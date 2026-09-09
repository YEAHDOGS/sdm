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
# Waitlist-consistency guard: waitlist is ON HOLD pending Brando's shared
# Cloudflare design (docs/WAITLIST.md). Every waitlist mention outside
# WAITLIST.md must carry a hold marker within +/-4 lines, so stale
# "build the waitlist" language can't drift back in.
hold_fail=0
while IFS= read -r -d '' f; do
  [ "$f" = "./docs/WAITLIST.md" ] && continue
  while IFS= read -r line; do
    n="${line%%:*}"
    lo=$((n > 4 ? n - 4 : 1))
    ctx=$(sed -n "${lo},$((n + 4))p" "$f")
    case "$ctx" in
      *"ON HOLD"*|*"on hold"*|*"pending"*|*"Pending"*|*"shared"*|*"Shared"*|*"WAITLIST.md"*|*\~*) ;;
      *) echo "WAITLIST-GUARD: $f -> $line"; hold_fail=1 ;;
    esac
  done < <(grep -niE 'waitlist' "$f")
done < <(find . -name '*.md' -not -path './.git/*' -print0)
if [ "$hold_fail" -ne 0 ]; then echo "waitlist guard FAILED"; fi

if [ "$fail" -eq 0 ] && [ "$hold_fail" -eq 0 ]; then
  echo "docs links OK, waitlist guard OK"
else
  echo "docs check FAILED"
  exit 1
fi
