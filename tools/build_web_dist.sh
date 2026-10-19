#!/usr/bin/env bash
# Strike Legends (browser game) - the two things to hand out (docs/DETTAGLI.md, "Distribuzione"):
#   strikelegends-web.zip   web/ with index.html at the root, the format itch.io asks for an HTML game
#   StrikeLegendsWeb.exe    tools/web_launcher with web/ inside, for Windows (GOOS=windows)
# Both get index.html with a doctype in front: the artifact page gets its skeleton from the
# publisher, a file opened on its own would render in quirks mode without one.
# Usage: bash tools/build_web_dist.sh [output dir, default ./dist-web]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mkdir -p "${1:-$ROOT/dist-web}" && cd "${1:-$ROOT/dist-web}" && pwd)"
GO="${GO:-$(command -v go || echo /usr/local/go/bin/go)}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# the game, without the briefs and the README
mkdir -p "$TMP/site"
cp -r "$ROOT/web/js" "$ROOT/web/assets" "$TMP/site/"
{ printf '<!doctype html>\n'; grep -v -i '^<!doctype' "$ROOT/web/index.html"; } > "$TMP/site/index.html"

rm -f "$OUT/strikelegends-web.zip"
(cd "$TMP/site" && zip -qr -X "$OUT/strikelegends-web.zip" index.html js assets)

mkdir -p "$TMP/build"
cp "$ROOT"/tools/web_launcher/*.go "$ROOT/tools/web_launcher/go.mod" "$TMP/build/"
cp -r "$TMP/site" "$TMP/build/site"
(cd "$TMP/build" && "$GO" test ./... >/dev/null && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 "$GO" build -trimpath -ldflags "-H windowsgui -s -w" -o "$OUT/StrikeLegendsWeb.exe" .)
# a Linux build of the same program, for the checks run in the cloud (not handed out)
(cd "$TMP/build" && CGO_ENABLED=0 "$GO" build -trimpath -o "$OUT/strikelegends-web-linux" .)

echo "zip: $OUT/strikelegends-web.zip ($(unzip -l "$OUT/strikelegends-web.zip" | tail -1 | awk '{print $2}') file, $(du -h "$OUT/strikelegends-web.zip" | cut -f1))"
echo "exe: $OUT/StrikeLegendsWeb.exe ($(du -h "$OUT/StrikeLegendsWeb.exe" | cut -f1))"
