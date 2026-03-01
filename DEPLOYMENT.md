# GitHub Pages Deployment Guide

## Your Site URL
```
https://haa-gg.github.io/Liars-Dice/
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

### 3. Enable GitHub Pages
1. Go to your repository on GitHub: https://github.com/haa-gg/Liars-Dice
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**
4. The workflow will automatically run on push

### 4. Access Your Site
After the workflow completes (check the Actions tab), your site will be available at:
```
https://haa-gg.github.io/Liars-Dice/
```

## Manual Deployment (Alternative)

If you prefer manual deployment:

1. Deploy:
```bash
npm run deploy
```

2. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / **(root)**

## Configuration

All URLs have been configured for:
- Base path: `/Liars-Dice/`
- Full URL: `https://haa-gg.github.io/Liars-Dice/`
- Open Graph images use absolute URLs for social media previews

## Troubleshooting

### Assets not loading?
- The base path is already set to `/Liars-Dice/` in `vite.config.js`
- All paths should work automatically

### Workflow failing?
- Check the Actions tab for error details
- Ensure GitHub Pages is enabled in repository settings
- Verify the workflow has proper permissions

### 404 errors?
- GitHub Pages can take a few minutes to deploy
- Clear your browser cache
- Check that the repository is public

## Local Testing

Test the production build locally:
```bash
npm run build
npm run preview
```

This will serve the built files at `http://localhost:4173` with the correct base path.
