#!/bin/bash
# Block dangerous commands

CMD=$(jq -r '.tool_input.command // ""' <<< "$(cat)")

# List of dangerous patterns
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf .git"
  "dd if="
  ":(){:|:&};:"
  "chmod -R 777"
  "chown -R"
  "curl.*|bash"
  "wget.*|bash"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$CMD" | grep -qF "$pattern"; then
    echo "BLOCKED: Dangerous command pattern detected: $pattern"
    exit 2
  fi
done

exit 0