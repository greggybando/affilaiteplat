#!/bin/bash

# Auto Push & Deploy Script
# Usage: ./scripts/push-and-deploy.sh [commit-message]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting push and deploy process...${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${BLUE}📝 Staging all changes...${NC}"
    git add -A
    
    # Get commit message
    if [ -z "$1" ]; then
        echo -e "${BLUE}💬 Enter commit message (or press Enter for default):${NC}"
        read -r COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
    else
        COMMIT_MSG="$1"
    fi
    
    echo -e "${BLUE}💾 Committing changes...${NC}"
    git commit -m "$COMMIT_MSG"
else
    echo -e "${YELLOW}ℹ️  No changes to commit${NC}"
fi

# Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
if git push origin main; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
    echo -e "${BLUE}🔨 GitHub Actions will now build the project...${NC}"
    echo -e "${BLUE}🚀 If Vercel is connected, it will auto-deploy${NC}"
    echo -e "${GREEN}✨ Done! Check GitHub Actions and Vercel dashboard for status${NC}"
else
    echo -e "${YELLOW}❌ Push failed. Check your git credentials and try again.${NC}"
    exit 1
fi

