# ADR-0042: Embed voice models in Docker images at build-time

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🐳 Docker / Deployment |
| Date | 2026-07-25 |

## Context

Voice services (whisper.cpp for STT and piper1-gpl for TTS) require large model files:
- whisper multilingual model: ~250 MB (`ggml-small.bin`)
- piper French voice: ~60 MB (`fr_FR-upmc-medium.onnx` + `.onnx.json`)

**Total: ~310 MB**

Previously, models were either:
1. Downloaded manually on the VM using `npm run models:download` (local dev and production)
2. Mounted from a `./docker/models/` directory on the host

This created:
- **Runtime complexity**: Deployment required pre-downloading models on the Oracle VM
- **Inconsistency**: Models could drift between local dev and production
- **Deployment overhead**: Extra setup step and network I/O during deployment

## Decision

Embed voice models directly in Docker images during the CI build phase.

**Changes:**
- `docker/whisper.Dockerfile`: Added model download in final stage
- `docker/piper.Dockerfile`: Added model download in final stage
- `docker-compose.yml`: Removed external volume mounts (`./docker/models:/models:ro`)
- `.github/workflows/ci.yml`: Changed `PULL_POLICY=build` → `PULL_POLICY=always` (pull pre-built images)

**Local development:**
- `docker compose up` now downloads models automatically on first build (~5–10 min)
- Models are cached in Docker layers (subsequent builds are fast)

**Production deployment:**
- GitHub Actions CI builds complete images with models included
- Oracle VM simply pulls pre-built images from GHCR
- No runtime model downloads on the VM
- Deployment is faster (models already in image)

## Consequences

### ✅ Benefits

1. **Models versioned with image tag** — Same model versions across all deployments
2. **Reproducible builds** — Image commit SHA guarantees exact model versions
3. **Faster deployments** — No runtime downloads on the VM (2–4 min instead of 5–10 min)
4. **Simpler VM setup** — No need for `./docker/models/` directory on host
5. **Consistent dev/prod** — Local Docker development uses same models as production
6. **Better caching** — Docker layer caching makes subsequent builds fast

### ⚠️ Trade-offs

1. **Larger images** — Whisper + Piper images each grow by ~250–60 MB
   - Whisper: ~450 MB (was ~200 MB)
   - Piper: ~200 MB (was ~140 MB)
   - First pull from GHCR takes slightly longer (~2–3 min on a typical VM)

2. **Model updates** — Changing voice models requires rebuilding images
   - Workaround: Set model path as environment variable (not currently needed)
   - Alternative: Use a volume mount only if models change frequently

3. **Build time** — CI image builds now include ~5 min of model downloads
   - Mitigation: GitHub Actions caching keeps subsequent builds fast (~2–5 min)

## Rationale

For this project's constraints:
- **Static models** (whisper small + piper fr_FR-upmc-medium) — unlikely to change frequently
- **Resource-constrained VM** (Oracle Always Free 2 OCPU) — network bandwidth is precious
- **Zero-downtime deployment goal** — faster deployments improve reliability

The benefit of reproducibility, consistency, and faster deployments outweighs the cost of slightly larger images.

**Alternative considered:** Keep runtime downloads
- ❌ Adds complexity to deployment workflow
- ❌ Network failures during deployment are harder to debug
- ❌ Different models on VM vs local dev if scripts drift
- ❌ Slower overall deployment time

## Related ADRs

- [ADR-0021: STT — whisper.cpp local (multilingual small model)](./voice-2026-03-06-stt-whisper-cpp-local.md)
- [ADR-0022: TTS — piper1-gpl fr_FR-upmc-medium (Jessica)](./voice-2026-03-11-tts-piper-upmc-medium-jessica.md)
- [ADR-0023: WebM → WAV conversion in BFF](./voice-2026-03-06-webm-wav-conversion-in-bff.md)
- [ADR-0041: Oracle Always Free + Groq API deployment](./deployment-2026-07-25-oracle-always-free-groq-api.md)

## Source Conversation

> **Jul 25 — Friday**
>
> **User:** `can we fix that ??? the unhealthy ... why we're building in the deploy time the back-end ??? we're doing the same task double`
>
> **Claude:** Excellent catch! Two real issues:
> 1. Missing models on VM (piper/whisper looking for files that don't exist)
> 2. Double building (backend built in CI, rebuilt again at deploy)
>
> **User:** `what about to change the approach and build the images with the content that they need ....`
>
> **Claude:** Excellent idea! Baking models into images is cleaner and more efficient...
>
> Solution implemented: Models download during Docker build, not at deployment time.
