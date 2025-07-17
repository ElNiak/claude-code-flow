#!/bin/bash

# Simple tmux validation test
echo "🧪 Simple tmux validation test"

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux is not installed"
    exit 1
fi

echo "✅ tmux is available: $(tmux -V)"

# Test session creation
SESSION_NAME="claude-flow-test-$(date +%s)"
echo "🎯 Creating test session: $SESSION_NAME"

# Create session
tmux new-session -d -s "$SESSION_NAME" -x 120 -y 30 'echo "Test session created"'

# Wait a bit
sleep 0.5

# Check if session exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "✅ Session created successfully"

    # Test window rename
    tmux rename-window -t "$SESSION_NAME:0" "test-window"
    echo "✅ Window renamed"

    # Test pane split
    tmux split-window -t "$SESSION_NAME:0" -h -p 40
    echo "✅ Pane split successful"

    # Test another split
    tmux split-window -t "$SESSION_NAME:0.0" -v -p 40
    echo "✅ Second pane split successful"

    # Clean up
    tmux kill-session -t "$SESSION_NAME"
    echo "✅ Session cleaned up"

    echo "🎉 All tmux tests passed!"
else
    echo "❌ Session creation failed"
    exit 1
fi
