#!/bin/sh
set -eu

payload="{\"jsonrpc\":\"2.0\",\"id\":\"health\",\"method\":\"aria2.getVersion\",\"params\":[\"token:${ARIA2_RPC_SECRET}\"]}"
curl --fail --silent --show-error \
  --header 'content-type: application/json' \
  --data "$payload" \
  http://127.0.0.1:6800/jsonrpc >/dev/null
