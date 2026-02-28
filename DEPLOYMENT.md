# GitHub Pages Deployment Guide

## Setup Steps

### 1. Update Configuration
In `vite.config.js`, replace `'liars-dice'` with your actual repository name:
```javascript
base: '/your-repo-name/',
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Push to GitHub
```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

### 4. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**
4. The workflow will automatically run on push

### 5. Access Your Site
After the workflow completes (check the Actions tab), your site will be available at:
```
https://your-username.github.io/your-repo-name/
```

## Manual Deployment (Alternative)

If you prefer manual deployment:

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Deploy:
```bash
npm run deploy
```

3. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / **(root)**

## Update Meta Tags

Don't forget to update the URLs in `index.html`:
- Replace `https://yourdomain.com/` with your GitHub Pages URL
- Update both Open Graph and Twitter meta tags

## Troubleshooting

### Assets not loading?
- Make sure `base` in `vite.config.js` matches your repo name exactly
- Check that the path includes leading and trailing slashes: `/repo-name/`

### Workflow failing?
- Check the Actions tab for error details
- Ensure GitHub Pages is enabled in repository settings
- Verify the workflow has proper permissions

### 404 errors?
- GitHub Pages can take a few minutes to deploy
- Clear your browser cache
- Check that the repository is public (or you have GitHub Pro for private repos)

## Local Testing

Test the production build locally:
```bash
npm run build
npm run preview
```

This will serve the built files at `http://localhost:4173` with the correct base path.
