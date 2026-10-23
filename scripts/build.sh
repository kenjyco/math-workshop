#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
version=$(node scripts/version.mjs)
digest=${SOURCE_DIGEST:-development}
case "$digest" in
  development) ;;
  *) if ! printf '%s\n' "$digest" | LC_ALL=C grep -Eq '^[0-9a-f]{64}$'; then
       echo 'SOURCE_DIGEST must be development or a SHA-256 digest.' >&2; exit 2
     fi ;;
esac
npm --prefix web ci
npm --prefix web run check
npm --prefix web test
npm --prefix web run build
test -s web/dist/index.html
go test -race ./...
go vet ./...
mkdir -p .output
go build -trimpath -ldflags "-X main.version=$version -X main.sourceDigest=$digest" -o .output/math-workshop ./cmd/math-workshop
