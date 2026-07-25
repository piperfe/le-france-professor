# Deployment Guide — le-france-professor

Automated deployment to Oracle Cloud VM using GitHub Actions + Docker context over SSH.

---

## **Architecture**

```
GitHub Push (main)
  ↓
GitHub Actions CI (tests + build backend image)
  ↓
Push backend image to ghcr.io
  ↓
GitHub Actions Deploy
  ├─ SSH into Oracle VM
  ├─ Write runtime secrets to .env.docker
  ├─ Pull backend image from ghcr.io
  ├─ Build piper + whisper locally (PULL_POLICY=build)
  ├─ Create docker network
  ├─ Start services with docker-compose
  │  ├─ whisper (STT) — built locally
  │  ├─ piper (TTS) — built locally
  │  └─ backend (API) — pulled from ghcr.io
  ├─ Run database migrations
  ├─ Health checks
  └─ Done! ✅

Frontend: Deployed separately on Vercel (see FRONTEND.md)
```

---

## **Prerequisites**

- ✅ Oracle Cloud VM with Docker + docker-compose installed
- ✅ SSH access to VM (ubuntu user)
- ✅ GitHub repository set up with this workflow
- ✅ Images pushed to ghcr.io (happens automatically on push)

---

## **Step 0: Install Docker & Docker Compose on Oracle VM**

SSH into your Oracle VM and install Docker:

```bash
ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_IP

# On the VM — update package manager
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose

# Add ubuntu user to docker group (avoid sudo)
sudo usermod -aG docker ubuntu

# Verify installation (logout and login again for group changes to take effect)
exit
ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_IP
docker --version
docker-compose --version
```

Expected output:
```
Docker version 24.x.x
Docker Compose version 2.x.x
```

If docker-compose is not found, install via pip:
```bash
sudo apt install -y python3-pip
sudo pip3 install docker-compose
```

---

## **Step 1: Generate SSH Keys**

Generate an **Ed25519** key for GitHub Actions to use:

```bash
ssh-keygen -t ed25519 -f ~/gh-actions-oracle -C "github-actions"
```

This creates:
- `~/gh-actions-oracle` (private key — goes to GitHub)
- `~/gh-actions-oracle.pub` (public key — goes to Oracle VM)

---

## **Step 2: Add Public Key to Oracle VM**

Add the public key to the VM's authorized_keys:

```bash
cat ~/gh-actions-oracle.pub | ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_IP \
  'cat >> ~/.ssh/authorized_keys'
```

Verify it worked:

```bash
ssh -i ~/gh-actions-oracle ubuntu@YOUR_VM_IP "echo 'SSH access works!'"
```

---

## **Step 3: Get VM Host Key**

Get the SSH host key fingerprint (for MITM protection):

```bash
ssh-keyscan -t ed25519 YOUR_VM_IP 2>/dev/null
```

Output will look like:

```
YOUR_VM_IP ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
```

Save the entire line (you'll need it for GitHub).

---

## **Step 4: Create GitHub Production Environment**

1. Go to: **GitHub repo → Settings → Environments**
2. Click **"New environment"**
3. Name it: `production`
4. Click **"Configure environment"**
5. (Optional) Check "Require reviewers" if you want approval before deploy

---

## **Step 5: Add Environment Secrets**

In the `production` environment, add these secrets:

### **Required Secrets:**

| Name | Value | Source |
|------|-------|--------|
| `VM_HOST` | `YOUR_VM_IP` | Your Oracle VM public IP |
| `VM_USER` | `ubuntu` | SSH username on Oracle VM |
| `VM_SSH_KEY` | (private key content) | Paste entire content of `~/gh-actions-oracle` |
| `VM_HOST_KEY` | (host key line) | From Step 3 output (entire line) |

### **How to add them:**

```bash
# Using GitHub CLI (easiest):
gh secret set --env production VM_HOST --body "YOUR_VM_IP"
gh secret set --env production VM_USER --body "ubuntu"
gh secret set --env production VM_SSH_KEY < ~/gh-actions-oracle
gh secret set --env production VM_HOST_KEY --body "YOUR_VM_IP ssh-ed25519 AAAAC3NzaC..."
```

Or manually via GitHub UI:
1. Click **"Add secret"** for each one
2. Paste the value
3. Click **"Add secret"**

---

## **Step 6: Verify Secrets Are Set**

```bash
gh secret list --env production
```

Should show:
```
VM_HOST
VM_USER
VM_SSH_KEY
VM_HOST_KEY
```

---

## **How Environment Variables Work**

### **.env.docker file (created by GitHub Actions)**

During deployment, GitHub Actions creates a `.env.docker` file on the runner with all production secrets and variables:

```bash
# GitHub Actions creates this file automatically
cat > .env.docker << 'EOF'
LLM_MODEL=llama-3.3-70b-versatile
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
OTEL_TRACES_EXPORTER=none
NODE_ENV=production
WHISPER_URL=http://whisper:7600
PIPER_URL=http://piper:7602
EOF
```

**docker-compose.yml** then reads this file:
```yaml
backend:
  env_file:
    - .env.docker
```

This means:
- ✅ All runtime config in one file
- ✅ Secrets are masked in GitHub Actions logs
- ✅ No hardcoded secrets in code
- ✅ Same pattern used by production projects (e.g., pti-salmoneras)

### **Image Building Strategy (PULL_POLICY=build)**

- **backend**: Pulled from ghcr.io (built in CI, pushed to registry)
- **whisper** & **piper**: Built locally on VM (no registry push needed)

This saves CI time and registry space for utility services that don't change often.

---

## **Step 7: Test the Deployment**

Push a commit to `main` branch:

```bash
git add .
git commit -m "chore: trigger deployment"
git push origin main
```

Then watch the GitHub Actions run:

```bash
# Watch in terminal
gh run watch --exit-status

# Or view in GitHub UI
# Go to: repo → Actions → Deploy · Backend to Oracle Cloud
```

**First run will take ~5 minutes:**
- Pull images: 2-3 min
- Run migrations: 30 sec
- Start services: 30 sec
- Health checks: 1 min
- Verify endpoint: 30 sec

---

## **Step 8: Verify on Oracle VM**

SSH into the VM and check services are running:

```bash
ssh -i ~/gh-actions-oracle ubuntu@YOUR_VM_IP

# Check running containers
docker ps

# Expected output:
# le-france-backend (running)
# le-france-piper (running)
# le-france-whisper (running)

# Check logs
docker compose logs backend
docker compose logs whisper
docker compose logs piper
```

---

## **Accessing Services from Oracle VM**

```bash
# Backend API
curl http://localhost:3001/api/health

# Whisper (STT)
curl http://localhost:7600/health

# Piper (TTS)
curl http://localhost:7602/
```

---

## **Troubleshooting**

### **SSH connection fails**

```
ERROR: Permission denied (publickey)
```

**Fix:**
```bash
# Check if key is on VM
ssh -i ~/gh-actions-oracle ubuntu@YOUR_VM_IP "grep YOUR_KEY ~/.ssh/authorized_keys"

# If not there, add it again
cat ~/gh-actions-oracle.pub | ssh -i ~/.ssh/your-existing-key ubuntu@YOUR_VM_IP \
  'cat >> ~/.ssh/authorized_keys'
```

---

### **Backend fails to start**

```
ERROR: backend failed to become healthy
```

**Check logs:**
```bash
ssh -i ~/gh-actions-oracle ubuntu@YOUR_VM_IP "docker compose logs backend | tail -50"
```

Common issues:
- Database migration failed → check `/data/le-france.db` permissions
- Whisper/Piper not healthy → check they started first
- API endpoint unreachable → check backend logs for errors

---

### **Images not pulling**

```
ERROR: unauthorized: authentication required
```

**Fix:** GitHub Actions must be logged into ghcr.io. The workflow does this automatically, but if it fails:

1. Check that `docker/login-action@v3` step ran successfully
2. Verify `GITHUB_TOKEN` has `packages:read` permission (should be automatic)

---

## **Rollback to Previous Deployment**

If a deployment breaks production, rollback quickly:

```bash
ssh -i ~/gh-actions-oracle ubuntu@YOUR_VM_IP

# Stop current services
docker compose down

# Pull previous image tag (use git log to find old commit SHA)
IMAGE_TAG=<old-commit-sha> docker compose pull backend whisper piper

# Start old version
docker compose up -d whisper piper backend

# Verify
docker compose ps
curl http://localhost:3001/api/health
```

---

## **Manual Deployment (if needed)**

If GitHub Actions fails and you need to deploy manually:

```bash
ssh -i ~/gh-actions-oracle ubuntu@YOUR_VM_IP

# Clone the repo if not already present (GitHub Actions does this automatically)
git clone https://github.com/YOUR_USERNAME/le-france-professor.git
cd le-france-professor

# Set environment variables
export IMAGE_TAG=YOUR_COMMIT_SHA  # or: $(git rev-parse HEAD)
export PULL_POLICY=always
export NODE_ENV=production
export LLM_MODEL=llama-3.3-70b-versatile
export LLM_BASE_URL=https://api.groq.com/openai/v1
export LLM_API_KEY=YOUR_GROQ_API_KEY
export WHISPER_URL=http://whisper:7600
export PIPER_URL=http://piper:7602
export OTEL_TRACES_EXPORTER=none

# Log into ghcr.io (need Personal Access Token with read:packages scope)
export GITHUB_TOKEN=YOUR_GITHUB_TOKEN
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull and deploy
docker compose pull backend whisper piper
docker compose run --rm backend npm run db:migrate
docker compose up -d whisper piper backend

# Verify
docker compose ps
curl http://localhost:3001/api/health
```

---

## **Local Development (No Deployment)**

For local development, everything works as before:

```bash
docker compose up -d

# It builds images locally (doesn't pull from ghcr.io)
# All services start: frontend, backend, whisper, piper
```

---

## **Environment Variables**

### **Local Development** (`.env` or shell exports)

```
LLM_MODEL=gemma3:4b
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=
WHISPER_URL=http://127.0.0.1:7600
PIPER_URL=http://127.0.0.1:7602
```

### **Production** (Oracle VM, set on deployment)

```
IMAGE_TAG=${{ github.sha }}
PULL_POLICY=always
NODE_ENV=production
```

(Actual app env vars like `LLM_MODEL`, etc. come from your local `.env` file — copy them to the VM)

---

## **Next: Deploy Frontend**

Frontend is deployed separately to Vercel. See `FRONTEND.md` for those instructions.

---

## **Maintenance**

### **View Deployment History**

```bash
gh run list --limit 10 --status completed
```

### **View Recent Logs**

```bash
gh run view <run-id> --log
```

### **Rotate SSH Key** (quarterly recommended)

1. Generate new key: `ssh-keygen -t ed25519 -f ~/gh-actions-oracle-v2`
2. Add new public key to VM: `cat ~/gh-actions-oracle-v2.pub | ssh ... 'cat >> ~/.ssh/authorized_keys'`
3. Update GitHub secret `VM_SSH_KEY` with new private key
4. Remove old key from `~/.ssh/authorized_keys` on VM
5. Test deployment works
6. Delete old key: `rm ~/gh-actions-oracle`

---

## **Security Checklist**

- ✅ SSH key is Ed25519 (not RSA)
- ✅ Private key only in GitHub Secrets (not in repo)
- ✅ Host key fingerprint verification enabled
- ✅ Docker context uses SSH (no exposed ports)
- ✅ Only production environment has deploy permissions
- ✅ Secrets are environment-scoped (not repo-scoped)
- ✅ Old images pruned after each deploy

---

**Questions?** Check GitHub Actions logs for detailed errors, or ask the team.
