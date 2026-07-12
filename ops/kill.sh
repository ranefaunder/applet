#!/bin/bash

echo "🔍 Looking for process listening on TCP port 8090..."

PIDS=$(lsof -tiTCP:8090 -sTCP:LISTEN)

if [ -z "$PIDS" ]; then
  echo "❌ No process found listening on port 8090"
  exit 0
fi

SAFE_MATCH='(^|/)(bun|node|deno)($| )'

for PID in $PIDS; do
  CMD=$(ps -p "$PID" -o command=)
  echo "📋 Found process: $PID — $CMD"

  if echo "$CMD" | grep -Eqi "$SAFE_MATCH"; then
    kill "$PID"
    sleep 2
    if ps -p "$PID" > /dev/null 2>&1; then
      kill -9 "$PID"
    fi
    echo "✅ Process $PID killed"
  else
    echo "🛑 Skipping non-server process: $CMD"
  fi
done
