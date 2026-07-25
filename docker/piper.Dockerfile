FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then \
        pip install --no-cache-dir "https://github.com/OHF-Voice/piper1-gpl/releases/download/v1.4.1/piper_tts-1.4.1-cp39-abi3-manylinux_2_17_aarch64.manylinux2014_aarch64.manylinux_2_28_aarch64.whl"; \
    else \
        pip install --no-cache-dir "https://github.com/OHF-Voice/piper1-gpl/releases/download/v1.4.1/piper_tts-1.4.1-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.manylinux_2_28_x86_64.whl"; \
    fi && \
    pip install --no-cache-dir flask

WORKDIR /models
RUN echo "Downloading piper voice model (fr_FR-upmc-medium)..." && \
    curl -L -o fr_FR-upmc-medium.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx" && \
    curl -L -o fr_FR-upmc-medium.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json"

EXPOSE 7602
CMD ["python3", "-m", "piper.http_server", "-m", "fr_FR-upmc-medium", "--data-dir", "/models", "--port", "7602"]
