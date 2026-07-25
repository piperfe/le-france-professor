FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
    git cmake build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git .
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF && \
    cmake --build build -j$(nproc) && \
    find build -name "whisper-server" -type f -exec cp {} /usr/local/bin/whisper-server \;

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl libgomp1 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/whisper-server /usr/local/bin/whisper-server

WORKDIR /models
RUN echo "Downloading whisper multilingual model..." && \
    curl -L -o ggml-small.bin \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"

EXPOSE 7600
ENTRYPOINT ["whisper-server", "--model", "/models/ggml-small.bin", "--host", "0.0.0.0", "--port", "7600"]
