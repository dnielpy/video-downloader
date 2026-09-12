#!/bin/sh
set -eu

: "${ARIA2_RPC_SECRET:?ARIA2_RPC_SECRET must be set}"

mkdir -p /config /state/events "${DOWNLOAD_DIR:-/downloads}"
touch /config/aria2.session

exec aria2c \
  --conf-path=/etc/aria2/aria2.conf \
  --dir="${DOWNLOAD_DIR:-/downloads}" \
  --input-file=/config/aria2.session \
  --save-session=/config/aria2.session \
  --rpc-secret="$ARIA2_RPC_SECRET"
