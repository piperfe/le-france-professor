# Use FileReader for Blob→Buffer conversion instead of polyfill

**Date:** 2026-07-24  
**Status:** Accepted  
**Context:** vitest 4 upgrade to address npm audit vulnerabilities

## Context

### Security Driver
Upgraded vitest 3→4, neverthrow 6→8, OpenTelemetry 0.212→0.221 to reduce npm audit vulnerabilities (protobufjs issues exposed by vitest 4). This is a mandatory dependency update for security.

### Problem Exposed
vitest 4's jsdom environment uses an incomplete Blob polyfill missing `.arrayBuffer()` method. Production code in `audio-converter.ts` and `tts/route.ts` calls `await blob.arrayBuffer()` to convert Blob→Buffer/ArrayBuffer. Tests fail because jsdom's Blob is incomplete.

## Decision

Use `FileReader.readAsArrayBuffer()` at the infrastructure boundary to convert Blob data, instead of:
- ❌ **Polyfill** — adds 8 lines to `setup.ts`, masks incomplete jsdom API
- ❌ **busboy/formidable** — adds dependency, requires route refactor to parse multipart at Node level
- ❌ **Keep Blob interface, convert in route** — puts Web API at request boundary (violates infrastructure layer purity)
- ✅ **FileReader** — complete jsdom API, zero dependencies, works in both production and tests

## Implementation

### Audio Converter (infrastructure)
```ts
// audio-converter.ts
async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer))
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}
```

### TTS Route (BFF handler)
```ts
// app/api/tts/route.ts
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}
```

## Why This Works

1. **Production (real Node.js):** Node.js Blob (from undici) has native `arrayBuffer()` method. FileReader also works as a fallback.
2. **Tests (jsdom):** jsdom implements FileReader completely. No polyfill needed.
3. **No dependencies:** FileReader is a standard Web API available everywhere.
4. **Boundary clarity:** Blob→Buffer conversion stays in infrastructure layer, keeps routes pure.

## Trade-offs

| Approach | Pros | Cons |
|---|---|---|
| FileReader | Complete jsdom API, no deps, works everywhere | Extra Promise wrapper |
| Polyfill | Minimal code | Masks incomplete API, may fail if jsdom API gaps widen |
| busboy | Standard for multipart parsing | Adds dependency, requires route refactor |

FileReader chosen for durability: relies on jsdom's strong FileReader implementation, not on brittle Blob polyfill maintenance.
