#!/usr/bin/env bash
set -e

MODELS_DIR="$(dirname "$0")/../docker/models"
mkdir -p "$MODELS_DIR"

# whisper.cpp — multilingual small model (~250 MB)
WHISPER_MODEL="$MODELS_DIR/ggml-small.bin"
if [ ! -f "$WHISPER_MODEL" ]; then
  echo "Downloading whisper model (ggml-small.bin, ~250 MB)..."
  curl -L --progress-bar -o "$WHISPER_MODEL" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
  echo "✓ whisper model downloaded"
else
  echo "✓ whisper model already present"
fi

# piper TTS — fr_FR-upmc-medium (Jessica, ~60 MB)
PIPER_ONNX="$MODELS_DIR/fr_FR-upmc-medium.onnx"
PIPER_JSON="$MODELS_DIR/fr_FR-upmc-medium.onnx.json"

if [ ! -f "$PIPER_ONNX" ]; then
  echo "Downloading piper model (fr_FR-upmc-medium.onnx, ~60 MB)..."
  curl -L --progress-bar -o "$PIPER_ONNX" \
    "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx"
  echo "✓ piper model downloaded"
else
  echo "✓ piper model already present"
fi

if [ ! -f "$PIPER_JSON" ]; then
  echo "Downloading piper model config..."
  curl -L --progress-bar -o "$PIPER_JSON" \
    "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json"
  echo "✓ piper config downloaded"
else
  echo "✓ piper config already present"
fi

echo ""
echo "All models ready. Run: docker compose up -d"
