#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$#" -ne 1 ]; then echo 'Usage: WORKSHOP_VERSION=X.Y.Z-dev.N sh scripts/package.sh ABSOLUTE_PACKAGE_OUTPUT' >&2; exit 2; fi
case "$1" in /*) ;; *) echo 'Use an absolute package output directory.' >&2; exit 2;; esac
output=$(node --input-type=module -e 'import { externalPath } from "./scripts/external-output.mjs"; console.log(externalPath(process.argv[1]));' "$1")
version=$(node scripts/version.mjs --package)
platform="$(go env GOOS)-$(go env GOARCH)"
name="math-workshop-$version-$platform"
destination="$output/$name"
for target in "$destination" "$output/$name.tar.gz" "$output/$name.tar.gz.sha256"; do
  if [ -e "$target" ] || [ -L "$target" ]; then echo "Package output already exists: $target" >&2; exit 1; fi
done
test -s SOURCE-MANIFEST.sha256
test -s SOURCE-DIGEST
actual=$(node scripts/source.mjs)
expected=$(cat SOURCE-DIGEST)
manifest=$(shasum -a 256 SOURCE-MANIFEST.sha256 | cut -d ' ' -f 1)
if [ "$actual" != "$expected" ] || [ "$manifest" != "$expected" ]; then echo 'Source differs from the clean export manifest.' >&2; exit 1; fi
node scripts/check-source.mjs
node scripts/check-docs.mjs
SOURCE_DIGEST="$actual" WORKSHOP_VERSION="$version" sh scripts/build.sh
node scripts/notices.mjs
mkdir -p "$output"
# Atomic directory reservation also refuses concurrent reuse of this version.
mkdir "$destination"
cp .output/math-workshop .output/THIRD-PARTY-NOTICES.txt "$destination/"
cp scripts/package-readme.md "$destination/README.md"
cp SOURCE-MANIFEST.sha256 SOURCE-DIGEST "$destination/"
{
  echo "version=$version"
  echo "platform=$platform"
  echo "source_sha256=$actual"
  echo 'git_revision=none (uncommitted clean-source export)'
  go version
  node --version
  npm --version
} > "$destination/VERSION.txt"
(cd "$destination" && shasum -a 256 math-workshop README.md VERSION.txt THIRD-PARTY-NOTICES.txt SOURCE-MANIFEST.sha256 SOURCE-DIGEST > SHA256SUMS)
tar -czf "$output/$name.tar.gz" -C "$output" "$name"
(cd "$output" && shasum -a 256 "$name.tar.gz" > "$name.tar.gz.sha256")
echo "$destination"
