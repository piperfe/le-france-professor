#!/bin/bash
# GitHub Production Environment Setup
# This script creates the production environment and all required secrets/variables
# Run this from your le-france-professor repository

set -e

echo "🔧 Setting up GitHub production environment for le-france-professor"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get repository in format owner/repo
REPO=$(git config --get remote.origin.url | sed 's/.*github.com:\(.*\)\.git/\1/' | sed 's/.*github.com\/\(.*\)\.git/\1/')

if [ -z "$REPO" ]; then
  echo "❌ Error: Could not determine repository from git remote. Make sure you're in the repo directory."
  exit 1
fi

echo "📦 Repository: $REPO"
echo ""

# Step 1: Create production environment
echo "📍 Step 1: Creating 'production' environment..."
gh api repos/$REPO/environments -X POST -f name="production" 2>/dev/null || echo "✓ Environment already exists or created"
echo ""

# Step 2: Add secrets (PLACEHOLDER VALUES - USER MUST REPLACE)
echo "🔐 Step 2: Adding secrets to production environment..."
echo "   ⚠️  REMINDER: Replace placeholder values with your actual values!"
echo ""

echo "   Adding VM_HOST..."
gh secret set VM_HOST --env production --body "xxx.xxx.xxx.xxx" 2>/dev/null && echo "   ✓ VM_HOST added" || echo "   ✓ VM_HOST exists"

echo "   Adding VM_USER..."
gh secret set VM_USER --env production --body "ubuntu" 2>/dev/null && echo "   ✓ VM_USER added" || echo "   ✓ VM_USER exists"

echo "   Adding VM_SSH_KEY..."
echo "   ⚠️  Waiting for VM_SSH_KEY input..."
echo "   Paste your SSH private key (from ~/gh-actions-oracle), then press Ctrl+D on a new line:"
gh secret set VM_SSH_KEY --env production 2>/dev/null && echo "   ✓ VM_SSH_KEY added" || echo "   ✓ VM_SSH_KEY exists"

echo "   Adding VM_HOST_KEY..."
echo "   ⚠️  Waiting for VM_HOST_KEY input..."
echo "   Paste your host key (from ssh-keyscan), then press Ctrl+D on a new line:"
gh secret set VM_HOST_KEY --env production 2>/dev/null && echo "   ✓ VM_HOST_KEY added" || echo "   ✓ VM_HOST_KEY exists"

echo "   Adding LLM_API_KEY..."
echo "   ⚠️  Waiting for LLM_API_KEY input..."
echo "   Paste your Groq API key (gsk_...), then press Ctrl+D on a new line:"
gh secret set LLM_API_KEY --env production 2>/dev/null && echo "   ✓ LLM_API_KEY added" || echo "   ✓ LLM_API_KEY exists"

echo ""

# Step 3: Add variables (NON-SENSITIVE)
echo "📋 Step 3: Adding variables to production environment..."
echo ""

echo "   Adding LLM_MODEL..."
gh variable set LLM_MODEL --env production --body "llama-3.3-70b-versatile" 2>/dev/null && echo "   ✓ LLM_MODEL added" || echo "   ✓ LLM_MODEL exists"

echo "   Adding LLM_BASE_URL..."
gh variable set LLM_BASE_URL --env production --body "https://api.groq.com/openai/v1" 2>/dev/null && echo "   ✓ LLM_BASE_URL added" || echo "   ✓ LLM_BASE_URL exists"

echo "   Adding NODE_ENV..."
gh variable set NODE_ENV --env production --body "production" 2>/dev/null && echo "   ✓ NODE_ENV added" || echo "   ✓ NODE_ENV exists"

echo "   Adding OTEL_TRACES_EXPORTER..."
gh variable set OTEL_TRACES_EXPORTER --env production --body "none" 2>/dev/null && echo "   ✓ OTEL_TRACES_EXPORTER added" || echo "   ✓ OTEL_TRACES_EXPORTER exists"

echo "   Adding WHISPER_URL..."
gh variable set WHISPER_URL --env production --body "http://whisper:7600" 2>/dev/null && echo "   ✓ WHISPER_URL added" || echo "   ✓ WHISPER_URL exists"

echo "   Adding PIPER_URL..."
gh variable set PIPER_URL --env production --body "http://piper:7602" 2>/dev/null && echo "   ✓ PIPER_URL added" || echo "   ✓ PIPER_URL exists"

echo ""

# Step 4: Verify
echo "✅ Step 4: Verifying setup..."
echo ""
echo "Secrets in production environment:"
gh secret list --env production

echo ""
echo "Variables in production environment:"
gh variable list --env production

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Verify all secrets are set correctly (especially VM_SSH_KEY and VM_HOST_KEY)"
echo "2. Update placeholder values if needed:"
echo "   - VM_HOST: Replace 'xxx.xxx.xxx.xxx' with your actual Oracle VM IP"
echo "   - LLM_API_KEY: Replace with your actual Groq API key"
echo ""
echo "3. Push your code to main branch:"
echo "   git add -A"
echo "   git commit -m 'chore: add backend deployment setup'"
echo "   git push origin main"
echo ""
echo "4. Watch the deployment:"
echo "   gh run list --limit 1"
echo "   gh run view <run-id> --log"
