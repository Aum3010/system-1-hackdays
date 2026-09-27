# Starts the local Laya server on http://127.0.0.1:8000 (Windows PowerShell).
# First run downloads the English checkpoint (~1.5 GB) into ~/.cache/huggingface.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$serve = Join-Path $root '.venv\Scripts\laya-serve.exe'
if (-not (Test-Path $serve)) { throw 'Laya is not installed. Run: py -3.12 -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements-laya.txt' }
if (-not $env:LAYA_DEVICE) { $env:LAYA_DEVICE = 'cpu' }   # set to 'cuda' on an NVIDIA machine with CUDA PyTorch
$env:LAYA_PRELOAD = '1'
$env:LAYA_MODELS = 'english'
$env:LAYA_HOST = '127.0.0.1'
$env:LAYA_PORT = '8000'
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = '1'
& $serve
