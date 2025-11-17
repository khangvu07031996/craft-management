# GitHub Actions CI/CD Setup Guide

## Overview

This repository uses GitHub Actions to automatically deploy the backend to DigitalOcean droplet when code is pushed to the `main` branch.

## Prerequisites

1. DigitalOcean Droplet running at `138.68.228.14`
2. SSH access to the droplet
3. GitHub repository with Actions enabled

## Setup Instructions

### 1. Generate SSH Key Pair

On your local machine, generate a new SSH key pair specifically for GitHub Actions:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github-actions-do
```

This will create two files:
- `~/.ssh/github-actions-do` (private key)
- `~/.ssh/github-actions-do.pub` (public key)

### 2. Add Public Key to Droplet

Copy the public key to the droplet:

```bash
ssh-copy-id -i ~/.ssh/github-actions-do.pub root@138.68.228.14
```

Or manually add it:

```bash
cat ~/.ssh/github-actions-do.pub | ssh root@138.68.228.14 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Add Private Key to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DO_SSH_PRIVATE_KEY`
5. Value: Copy the entire contents of `~/.ssh/github-actions-do` (the private key)
   ```bash
   cat ~/.ssh/github-actions-do
   ```
6. Click **Add secret**

### 4. Verify Setup

Test SSH connection from GitHub Actions:

1. Push a commit to the `main` branch
2. Go to **Actions** tab in GitHub
3. Check if the workflow runs successfully

## Workflow Details

### Trigger

The workflow triggers automatically when:
- Code is pushed to `main` branch
- Changes are made to:
  - `src/**` (source code)
  - `package*.json` (dependencies)
  - `Dockerfile` (Docker configuration)
  - `tsconfig.json` (TypeScript configuration)
  - `.github/workflows/deploy.yml` (workflow itself)

### Deployment Steps

1. **Checkout code**: Gets the latest code from the repository
2. **Setup SSH**: Configures SSH key from GitHub Secrets
3. **Deploy to Droplet**:
   - SSH into the droplet
   - Pull latest code from `main` branch
   - Check for database migration changes
   - Build Docker image (no cache)
   - Restart backend service
   - Run database migrations if SQL files changed

### Database Migrations

The workflow automatically detects if any SQL files in `src/database/` have changed. If migrations are detected, it runs:

```bash
docker exec deploy-backend-1 node dist/database/setup.js
```

This uses the existing `setup.ts` script which handles all migrations automatically.

## Troubleshooting

### Workflow Fails with SSH Connection Error

- Verify the SSH key is correctly added to GitHub Secrets
- Check that the public key is in `~/.ssh/authorized_keys` on the droplet
- Test SSH connection manually: `ssh -i ~/.ssh/github-actions-do root@138.68.228.14`

### Build Fails

- Check Docker is running on the droplet: `docker ps`
- Verify docker-compose file exists: `ls /opt/craft/deploy/docker-compose.prod.yml`
- Check logs: `docker logs deploy-backend-1`

### Migration Fails

- Check backend container is running: `docker ps | grep backend`
- View migration logs: `docker logs deploy-backend-1`
- Run migrations manually if needed: `docker exec deploy-backend-1 node dist/database/setup.js`

## Security Notes

- The SSH private key is stored securely in GitHub Secrets
- Only repository administrators can view or modify secrets
- The key should have minimal permissions (only deploy access)
- Consider using a dedicated deploy user instead of root for better security

