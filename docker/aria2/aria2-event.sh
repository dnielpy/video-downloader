#!/bin/sh
set -eu

command_name="$(basename "$0")"
case "$command_name" in
  *-complete) status="complete" ;;
  *-error) status="error" ;;
  *-removed) status="removed" ;;
  *) exit 0 ;;
esac

gid="${1:-}"
file_path="${3:-}"

case "$gid" in
  *[!0-9a-fA-F]*|'') exit 0 ;;
esac

temporary_file="/state/events/.${gid}.${status}.$$"
final_file="/state/events/${gid}.${status}"
printf '%s' "$file_path" > "$temporary_file"
mv "$temporary_file" "$final_file"

for previous_status in complete error removed; do
  if [ "$previous_status" != "$status" ]; then
    rm -f "/state/events/${gid}.${previous_status}"
  fi
done
