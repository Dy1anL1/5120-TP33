# Silver Spoon Society Frontend

This is the frontend part of the Silver Spoon Society website, designed for healthy aging and nutrition management, featuring modern responsive layout and interactive elements.

## Main Features

- Home page, recipe search, daily recommendations, nutrition dashboard, shopping list, and other pages
- Responsive design supporting desktop, tablet, and mobile devices
- Dynamic recipe card rendering with popup details and nutrition information
- Nutrition dashboard automatically tracks daily nutrition intake
- Local storage (localStorage) support for user menu records
- Password protection system for secure access

## File Structure

```
netlify-deploy/
├── index.html                  # Main landing page
├── login.html                  # Password protection page
├── explore-recipes.html        # Recipe search page
├── daily-recommendations.html  # Daily recommendations
├── nutrition-dashboard.html    # Nutrition data dashboard
├── shopping-list.html          # Shopping list
├── meal-planning.html          # Meal planning
├── seasonal-produce.html       # Seasonal produce
├── styles.css                  # Site-wide styles
├── script.js                   # Main JS logic (dynamic rendering, API calls, dashboard)
├── config.js                   # API configuration
├── password-protection.js      # Authentication system
├── netlify.toml               # Netlify deployment configuration
├── _redirects                  # URL routing rules
├── assets/                     # Images and static resources
└── README.md                   # Frontend documentation
```

## Usage Instructions

1. **Direct Deployment**: Simply drag this entire folder to Netlify for instant deployment
2. **Local Testing**: Open `index.html` or other pages directly (recommended with local server)
3. **Recommended Local Server**:
    ```bash
    python3 -m http.server 8000
    # or
    npx serve .
    ```
4. **Online Deployment**: Supports GitHub Pages, Netlify, Vercel, and other static hosting platforms

## Technology Stack

- HTML5 / CSS3 / JavaScript (ES6+)
- Font Awesome icon library
- Responsive design (Flexbox, Grid, media queries)
- Dynamic API calls (integrated with backend Serverless API)
- Netlify deployment optimization

## Customization and Extension

- Modify theme colors and styles in `styles.css`
- Add new features or integrate more APIs in `script.js`
- Page content and structure can be freely adjusted
- Password protection can be customized in `login.html`

## Deployment Features

- **Netlify Ready**: Optimized configuration for instant deployment
- **Performance**: Caching headers and compression configured
- **Security**: Security headers and password protection
- **Mobile**: Fully responsive design
- **SEO**: Proper meta tags and structure

## Access Information

- **Default Password**: `tp33`
- **Login Page**: `/login.html`
- **Main Platform**: Accessible after authentication

## License

MIT License, free to use and modify.

---
For questions, please contact the project maintainer.
