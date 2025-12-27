#!/bin/sh
#
# Setup git hooks script
# This script installs git hooks from .githooks directory

echo "🔧 Setting up git hooks..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GITHOOKS_DIR="$PROJECT_ROOT/.githooks"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Check if .githooks directory exists
if [ ! -d "$GITHOOKS_DIR" ]; then
  echo "❌ Error: .githooks directory not found!"
  exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Copy all hooks from .githooks to .git/hooks
for hook in "$GITHOOKS_DIR"/*; do
  if [ -f "$hook" ]; then
    hook_name=$(basename "$hook")
    target_hook="$GIT_HOOKS_DIR/$hook_name"
    
    echo "  📝 Installing $hook_name..."
    cp "$hook" "$target_hook"
    chmod +x "$target_hook"
  fi
done

echo "✅ Git hooks installed successfully!"
echo ""
echo "Available hooks:"
ls -1 "$GIT_HOOKS_DIR" | grep -v ".sample" | sed 's/^/  - /'
