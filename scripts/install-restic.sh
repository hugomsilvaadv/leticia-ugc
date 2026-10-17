#!/usr/bin/env bash
set -euo pipefail
# Pinned official v0.19.1 SHA256SUMS. Do not bypass checksum or TLS verification.
case "$(uname -m)" in
 x86_64) restic_arch=amd64; restic_sha=f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c ;;
 aarch64|arm64) restic_arch=arm64; restic_sha=a5f64aaab53d51e311fa3829124c5b703f2d14cf187d8640b6be3b2b49376465 ;;
 *) echo 'Unsupported restic architecture' >&2; exit 1 ;;
esac
restic_destination="${1:-/usr/local/bin/restic}"
restic_temp="$(mktemp -d)"
trap 'rm -rf "$restic_temp"' EXIT
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 120 --retry 2 \
 "https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_${restic_arch}.bz2" --output "$restic_temp/restic.bz2"
printf '%s  %s\n' "$restic_sha" "$restic_temp/restic.bz2" | sha256sum --check --status
bzip2 -dc "$restic_temp/restic.bz2" > "$restic_temp/restic"
install -m 0755 "$restic_temp/restic" "$restic_destination"
"$restic_destination" version
