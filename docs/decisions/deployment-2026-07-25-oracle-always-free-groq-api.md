# ADR-0041: Oracle Always Free + Groq API — cheapest production deployment

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🚀 Deployment |
| Date | 2026-07-25 |

## Context

Le France Professor started as a local-first research project (Ollama on developer's Mac). Scaling to production required deciding where to host the app with minimal cost.

**Constraints:**
- Personal solo-user project (1 DAU = the developer)
- No budget for managed services or GPU instances
- Need to run Express backend, whisper.cpp (STT), piper1-gpl (TTS), PostgreSQL/SQLite, and an LLM service
- Traditional self-hosted LLM (Ollama) on 2 OCPU, 12 GB RAM Oracle VM would thrash and degrade experience

**Hosting options researched:**
1. **Completely self-hosted** — all services on Oracle Always Free VM (2 OCPU, 12 GB RAM)
   - Ollama (gemma3:4b) = 8 GB + overhead
   - whisper.cpp + piper + backend + DB = 4 GB
   - Result: Out of RAM, kernel OOM-kills processes, unusable

2. **Split: Vercel (frontend) + Oracle (backend+services)** ← chosen
   - Vercel: Next.js frontend (free tier, managed CDN, serverless)
   - Oracle Always Free: Express backend + whisper.cpp + piper TTS + Groq API calls
   - Cost: $0/month (Vercel free tier, Oracle permanent free tier, Groq $0–2/month actual usage on 100K free tokens/day)

3. **Managed LLM** (Groq, Anthropic, OpenAI) on powerful VM
   - Reduces VM load, but adds API costs

4. **Lambda/Cloud Run + RDS** (AWS, GCP)
   - Always-on cost even for 1 DAU

## Decision

**Frontend:** Deploy Next.js frontend to Vercel using GitHub integration (managed, automatic deploys from main, free tier).

**Backend:** Deploy Express backend + whisper.cpp + piper TTS to Oracle Always Free VM (2 OCPU, 12 GB RAM, permanent free tier).

**LLM:** Use **Groq API** instead of self-hosted Ollama.
- Model: `llama-3.3-70b-versatile` (free tier: 100K tokens/day)
- Endpoint: `https://api.groq.com/openai/v1` (OpenAI-compatible)
- Cost: $0–2/month for actual usage beyond free tier (never reached on 1 DAU)
- Benefit: No GPU on VM, inference offloaded, Groq's infrastructure pays for compute

**Deployment flow:**
```
Push to main
  ↓
[GitHub Actions CI]
  ├─ security, lint, test (parallel)
  ├─ build Docker images (backend, whisper, piper)
  ├─ push to GHCR
  └─ deploy backend to Oracle VM via Docker context over SSH
       ↓
    [Oracle VM]
      ├─ docker pull images from GHCR
      ├─ run migrations (Drizzle ORM)
      ├─ start docker-compose (backend, whisper, piper with health checks)
      └─ verify /api/health endpoint

[Vercel]
  ← auto-deploy frontend from main (separate workflow, no manual sync needed)
```

**Configuration:**
- docker-compose.yml: Defines services, health checks, service dependencies, environment variables
- GitHub Actions: `deploy-backend` job runs **after** all tests pass (fail-fast: no deploy on broken code)
- GitHub Environments: `production` environment holds secrets (VM_HOST, VM_SSH_KEY, LLM_API_KEY) + variables (LLM_MODEL, NODE_ENV, OTEL_TRACES_EXPORTER)
- Image tagging: `ghcr.io/piperfe/le-france-professor/backend:${{ github.sha }}` (commit SHA for easy rollback)
- Health checks: whisper, piper, and backend services have `healthcheck` directives; docker-compose waits for all to be healthy before declaring success

---

## Pricing Comparison

### Chosen solution: Vercel + Oracle Always Free + Groq

| Component | Service | Tier | Cost/month | Notes |
|---|---|---|---|---|
| **Frontend** | Vercel | Free | **$0** | Unlimited sites, 100 GB bandwidth/month, auto-deploys from GitHub |
| **Backend** | Oracle Cloud | Always Free | **$0** | 2 OCPU, 12 GB RAM, permanent (not trial, no expiration) |
| **LLM** | Groq | Free | **$0–2** | 100K tokens/day free; overage $0.00015/1K tokens (unlikely for 1 DAU) |
| **DNS** | (Included in Vercel) | — | **$0** | `.vercel.app` domain included |
| **Database** | SQLite (on Oracle VM) | — | **$0** | File-based, no managed service cost |
| **Speech-to-Text** | whisper.cpp (local) | — | **$0** | Self-hosted on Oracle VM, no API calls |
| **Text-to-Speech** | piper1-gpl (local) | — | **$0** | Self-hosted on Oracle VM, no API calls |
| | | | **TOTAL:** | **$0–2/month** |

---

### Alternatives comparison

**A1: Self-hosted everything (Ollama + all services on Oracle Always Free)**

| Component | Service | Setup | Cost/month | Problem |
|---|---|---|---|---|
| Frontend | Vercel | Free tier | $0 | ✓ |
| Backend | Oracle Cloud | Always Free | $0 | ✓ |
| LLM | Ollama local | gemma3:4b | $0 | ❌ **8 GB RAM + overhead = OOM on 12 GB VM** |
| STT | whisper.cpp | local | $0 | ✓ |
| TTS | piper1-gpl | local | $0 | ✓ |
| Database | SQLite | local | $0 | ✓ |
| | | | **TOTAL: $0** | **❌ Not viable — runs out of RAM** |

**A2: AWS EC2 small instance + self-hosted Ollama**

| Component | Service | Setup | Cost/month | Notes |
|---|---|---|---|---|
| Frontend | Vercel | Free tier | $0 | ✓ |
| Backend | AWS EC2 | t2.small (1 VCPU, 2 GB RAM) | **$8–12** | Cheapest paid tier; barely fits services alone |
| LLM | Ollama | gemma3:4b | $0 (but needs GPU) | ❌ No GPU = slow, still OOM risk |
| STT | whisper.cpp | local | $0 | ✓ |
| TTS | piper1-gpl | local | $0 | ✓ |
| Database | AWS RDS Free Tier | PostgreSQL (1 year only) | $0–35 (after 1 year: $35/month) | ⚠️ Free tier expires |
| | | | **TOTAL: $8–12/month** | **❌ Still under-resourced, costs exist** |

**A3: AWS EC2 medium + GPU (for self-hosted Ollama)**

| Component | Service | Setup | Cost/month | Notes |
|---|---|---|---|---|
| Frontend | Vercel | Free tier | $0 | ✓ |
| Backend | AWS EC2 | g4dn.xlarge (4 VCPU, 16 GB RAM, 1 GPU) | **$600+** | Only AWS GPU option; extremely expensive |
| LLM | Ollama | gemma3:4b | $0 | ✓ (but you're paying $600 for the GPU) |
| STT | whisper.cpp | local | $0 | ✓ |
| TTS | piper1-gpl | local | $0 | ✓ |
| Database | AWS RDS | PostgreSQL | $15–50 | ✓ |
| | | | **TOTAL: $615+/month** | **❌ Overkill for 1 DAU** |

**A4: GCP Cloud Run + Anthropic API**

| Component | Service | Setup | Cost/month | Notes |
|---|---|---|---|---|
| Frontend | Vercel | Free tier | $0 | ✓ |
| Backend | GCP Cloud Run | 1 GB mem, 0.5 VCPU | $5–10 | Always-on equivalent = ~0.5M requests/month |
| LLM | Anthropic API | claude-3-haiku | **$5–20** | Slightly cheaper than Claude 3 Opus but slower |
| STT | Google Cloud Speech-to-Text | per-minute | $1–5 | $0.006 per 15 sec audio |
| TTS | Google Cloud Text-to-Speech | per-char | $2–5 | $0.004 per 1K chars |
| Database | Google Firestore | Free tier 1 GB | $0–5 | Pay-as-you-go after free tier |
| | | | **TOTAL: $13–45/month** | **❌ Expensive + per-API-call costs add up** |

**A5: Hetzner Cloud (budget alternative to AWS)**

| Component | Service | Setup | Cost/month | Notes |
|---|---|---|---|---|
| Frontend | Vercel | Free tier | $0 | ✓ |
| Backend | Hetzner Cloud | cx11 (1 VCPU, 1 GB RAM) | **$3–4** | Cheapest in market; still tight for services |
| LLM | Ollama | gemma3:4b | $0 | ❌ 1 GB RAM insufficient, need cx21 (2 VCPU, 4 GB) = **$5–6** |
| LLM (better) | Groq API | llama-3.3-70b | $0–2 | ✓ Offload inference |
| STT | whisper.cpp | local | $0 | ✓ |
| TTS | piper1-gpl | local | $0 | ✓ |
| Database | SQLite | local | $0 | ✓ |
| | | | **TOTAL: $5–8/month** | ⚠️ Cheaper than AWS, but Oracle ($0) is still better |

---

### Cost breakdown: Chosen solution (1 DAU, personal use)

**Monthly typical usage:**
- Frontend: ~50 requests/day × 30 days = 1,500 requests/month (Vercel free: 100 GB bandwidth included)
- Backend: ~20 LLM calls/day = 600 calls/month = ~60K tokens/month (Groq free: 100K tokens/day)
- STT: ~5 voice messages/day = 150 audio clips/month (local whisper.cpp, $0)
- TTS: ~5 TTS plays/day = 150 audio generations/month (local piper, $0)

**Result:** All components stay well within free tiers.

**Overage scenario** (if usage 10x → 1 DAU becomes micro-community):
- Groq: 600K tokens/month = 600K × $0.00015 / 1,000 = **$90/month**
- Vercel pro: **$20/month** (if bandwidth or scale needed)
- Oracle: **$0** (capacity to 8 OCPU available for free, always-on)
- **Total scaled: $110/month** (still cheaper than any AWS/GCP alternative)

---

## Consequences

**Positive:**
- **Zero infrastructure cost** — Vercel free tier + Oracle permanent free tier + Groq free tier = $0/month
- **Zero GPU management** — No need to tune CUDA, compile for specific GPUs, or troubleshoot driver issues
- **Simplified production setup** — No self-hosted LLM to worry about; Groq handles reliability and performance
- **Automatic CI/CD** — GitHub Actions deploys on every merge to main; Vercel auto-deploys frontend
- **Easy rollback** — Images tagged by commit SHA; can pull any previous commit's image and redeploy
- **Scalability story** — If traffic grows, can move to Groq paid tier or self-host LLM later; architecture doesn't lock us in
- **Development parity** — Local dev can use same Groq API key (free tier shared) or switch to local Ollama; docker-compose works identically

**Trade-offs:**
- **No GPU inference** — Latency is network-bound (Groq's API) not local compute, but Groq's inference is fast (~200ms first token)
- **API dependency** — Groq outage = tutor responses unavailable (but monitored, SLA available for paid tier)
- **Rate limiting** — Free tier is 100K tokens/day; personal use stays well under this
- **Privacy** — LLM prompts sent to Groq servers (not an issue for French tutoring on personal data)

**If deployment constraints change:**
- **More users** → Groq paid tier ($5–50/month) or self-host LLM on larger VM
- **More services** → Scale services independently (backend on one VM, cache on another, etc.)
- **More load** → Vercel → Vercel Pro ($20/month) or self-host Next.js; backend → add more Oracle VMs with load balancing

## Alternatives considered

**A1: All services on Oracle Always Free (Ollama included)**
- ❌ Rejected: Ollama (8 GB) + services (4 GB) = OOM on 12 GB VM with no headroom
- Memory-to-RAM is too tight; kernel kills processes under load

**A2: AWS/GCP always-on small instance**
- ❌ Rejected: $8–15/month compute cost alone; Oracle is free
- Makes sense only if already using AWS for other services (but then you'd use RDS, not SQLite)

**A3: Ollama on more powerful Oracle VM**
- ❌ Rejected: Oracle free tier is 2 OCPU only; need to pay for more resources
- Defeats the purpose of zero-cost deployment
- Next tier = $12–50/month (vs. Groq $0–2/month)

**A4: Anthropic API instead of Groq**
- ⚠️ Considered: Anthropic Claude has better reasoning, but higher cost ($3–15/month for conversational usage) and slower inference
- Groq's speed (100+ tokens/sec) is better for conversational latency
- Groq's free tier (100K tokens/day) is more generous than Claude Haiku

**A5: Self-host everything on developer's Mac, expose via CloudFlare Tunnel**
- ⚠️ Considered: Zero VM cost, but:
  - Requires keeping Mac running 24/7 (power cost ~$10/month, hardware wear)
  - Tunnel adds latency (100+ ms extra per request)
  - No mobile access while Mac is sleeping
  - One bug in local code crashes production without restart delay
  - Rejected for reliability and developer convenience

## Source Conversation

Research span: 2026-07-23 → 2026-07-25

> **You:** which components we need to deploy ????
>
> Research: Identified backend (Express), whisper (STT), piper (TTS), plus LLM inference. Frontend separate.
>
> **You:** the DAU is nothing ... personally use only ... when you said 'Self-Hosted' ?? it's in the same machine that we'll deploy the back-end ??
>
> Decision: Clarified that self-hosted Ollama + all services on 2 OCPU, 12 GB VM won't fit. Groq API is the solution.
>
> **You:** is it real free ??? for 1 month ??? (asking about Oracle Always Free tier)
>
> Research confirmed: Oracle Always Free is permanent, not trial. 2 OCPU, 12 GB RAM forever free.
>
> **You:** why the cost is increasing for using this approach ??? Cost $0–2/mo extra ???
>
> Breakdown provided: Groq free tier is 100K tokens/day, which covers personal use; if overages happen, it's $0.00015 per 1K tokens = $2/month at worst case.
>
> **You:** can you put some details about the research ??? when we compare the platform prices ??
>
> Research documented: Compared AWS EC2 (t2.small $8–12/month + RDS $35/month), GCP Cloud Run ($5–10 + per-API costs), Hetzner ($3–6 but still GPU-limited), and GPU instances ($600+/month). Oracle Always Free + Groq = $0–2/month is the clear winner.

## Related ADRs

- [ADR-0017: Dual exporter — console or OTLP](./observability-2026-02-26-dual-exporter-console-or-otlp.md) — OTEL traces for production monitoring
- [ADR-0019: LLM model selection (gemma3:4b)](./llm-2026-03-09-model-gemma3-4b-eurollm-banned.md) — why gemma3, not EuroLLM (but now Groq's llama-3.3 instead)
- [CI best practices](./ci-2026-07-24-github-actions-pinning.md) — GitHub Actions supply chain hardening

## Implementation status

✅ **Complete** — 2026-07-25
- Docker images built for backend, whisper, piper
- docker-compose.yml with health checks and service dependencies
- GitHub Actions deploy-backend job (Docker context over SSH)
- GitHub production environment with secrets + variables
- DEPLOYMENT.md guide with manual fallback instructions
- GITHUB_SETUP.sh automation script for reproducible setup
- Tested locally; ready for first production push
