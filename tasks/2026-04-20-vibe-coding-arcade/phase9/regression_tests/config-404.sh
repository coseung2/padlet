#!/usr/bin/env bash
# phase9 Q-1 regression — /api/vibe/config returns 404 for non-existent boardId.
# Run against a local dev server: `PORT=3000 npm run dev` + seed DB first.
set -eu

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/vibe/config?boardId=does_not_exist_board_id")
if [ "$STATUS" != "404" ]; then
  echo "FAIL: expected 404, got $STATUS"
  exit 1
fi
echo "PASS: /api/vibe/config 404 on missing boardId"
