# Silver Spoon Society - Netlify Deployment

This folder contains all the files needed to deploy the Silver Spoon Society website to Netlify.

## How to Deploy to Netlify

### Method 1: Drag and Drop (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Sign up or log in to your account
3. Drag and drop this entire `netlify-deploy` folder onto the Netlify dashboard
4. Your site will be automatically deployed!

### Method 2: Git Integration
1. Push this folder to a GitHub repository
2. Connect your GitHub account to Netlify
3. Select the repository and deploy

### Method 3: Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy from this folder
netlify deploy --prod --dir=.
```

## What's Included

- **HTML Files**: All page templates (cta.html as landing page, index.html, explore-recipes.html, etc.)
- **CSS**: Complete styling with responsive design
- **JavaScript**: Interactive functionality
- **Images**: All assets including logos and background images
- **Configuration**: 
  - `netlify.toml`: Deployment configuration
  - `_redirects`: URL routing rules (root path serves cta.html, others serve index.html)

## Features

- ✅ Responsive design for all devices
- ✅ Single-page application routing
- ✅ Optimized caching for static assets
- ✅ Security headers configured
- ✅ SEO-friendly structure

## Custom Domain

After deployment, you can:
1. Go to your site settings in Netlify
2. Add a custom domain
3. Configure DNS settings

## Support

The website includes:
- Recipe exploration and search
- Nutrition tracking dashboard
- Meal planning tools
- Shopping list functionality
- Daily recommendations

All features are fully functional in the deployed version.