#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! command -v "${BLENDER_BIN:-blender}" >/dev/null; then
  echo 'Install Blender 4.5 LTS and set BLENDER_BIN to its executable first.' >&2
  exit 1
fi
if ! command -v nvidia-smi >/dev/null || ! nvidia-smi --query-gpu=name --format=csv,noheader; then
  echo 'No NVIDIA GPU is visible in this instance. Check the rental configuration.' >&2
  exit 1
fi
umask 077
if [[ ! -f .worker-token ]]; then
  python3 -c 'import secrets; print(secrets.token_urlsafe(48))' > .worker-token
fi
export GPU_WORKER_TOKEN
GPU_WORKER_TOKEN="$(cat .worker-token)"
export GPU_WORKER_BIND=127.0.0.1
export GPU_WORKER_DATA="${GPU_WORKER_DATA:-./render-jobs}"
echo 'Token saved in .worker-token. Enter that token in application Settings; never put it in a URL.'
exec python3 -u http_worker.py
