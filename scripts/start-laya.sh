#!/usr/bin/env bash
# Starts the local Laya server on http://127.0.0.1:8000 (macOS / Linux).
# First run downloads the English checkpoint (~1.5 GB) into ~/.cache/huggingface.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/laya-serve ]; then
  echo "Laya is not installed. Run: python3 -m venv .venv && .venv/bin/pip install -r requirements-laya.txt" >&2
  exit 1
fi
export LAYA_DEVICE="${LAYA_DEVICE:-cpu}"   # 'cuda' (NVIDIA) or 'mps' (Apple Silicon) are faster
export LAYA_PRELOAD=1 LAYA_MODELS=english LAYA_HOST=127.0.0.1 LAYA_PORT=8000
exec .venv/bin/laya-serve
