# Automatic Push & Deploy Setup

## Current Setup

✅ **GitHub Actions Workflow**: `.github/workflows/deploy.yml`
- Automatically runs on every push to `main` branch
- Builds and validates the project
- If Vercel is connected to GitHub, it will auto-deploy

## How It Works

1. **You make changes** → Commit and push to `main`
2. **GitHub Actions** → Automatically builds and validates
3. **Vercel** → Automatically deploys (if connected to GitHub)

## Vercel Auto-Deploy Setup

To enable automatic Vercel deployments:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Git**
4. Ensure **Production Branch** is set to `main`
5. Enable **Automatic deployments from Git**

## Manual Deployment

If you need to deploy manually:
```bash
npm run deploy
```

## Status

- ✅ GitHub Actions workflow created
- ✅ Auto-builds on push to main
- ⚠️ Verify Vercel is connected to GitHub for auto-deploy

