# HealthyEats - Silver Spoon Society

A modern, responsive website designed for healthy eating, specifically targeting seniors. Built with Vue.js 3 and featuring a clean, accessible design that works perfectly across all devices.

## 🎯 Features

### 🏠 Home Page

- **Hero Section**: Welcoming introduction with clear value proposition
- **Feature Cards**: Four key features with icons and descriptions
- **Call to Action**: Engaging button to start the healthy journey

### 🧭 Navigation

- **Top Header Bar**: Fixed horizontal navigation with logo and menu
- **Responsive Design**: Adapts seamlessly to all screen sizes
- **Mobile Menu**: Hamburger menu for mobile devices

### 📱 Responsive Design

- **Bootstrap Breakpoints**: Uses industry-standard responsive breakpoints
- **Mobile-First**: Optimized for all device types
- **Touch-Friendly**: Designed for both desktop and mobile users

## 🚀 Technology Stack

- **Frontend Framework**: Vue.js 3 (Composition API)
- **Build Tool**: Vite
- **Routing**: Vue Router 4
- **Styling**: CSS3 with modern features
- **Icons**: SVG icons for crisp display
- **Responsive**: Bootstrap-compatible breakpoint system

## 📱 Bootstrap Responsive Breakpoints

### Extra Small Devices (phones, 576px and down)

- Single column layout for feature cards
- Compact spacing and typography
- Mobile-optimized navigation

### Small Devices (landscape phones, 576px and up)

- Two-column grid for feature cards
- Balanced spacing and typography
- Touch-optimized interface

### Medium Devices (tablets, 768px and up)

- Two-column grid for feature cards
- Tablet-optimized spacing
- Enhanced touch interactions

### Large Devices (desktops, 992px and up)

- Four-column grid for feature cards
- Full desktop experience
- Hover effects and animations

### Extra Large Devices (large desktops, 1200px and up)

- Maximum content width utilization
- Optimal spacing for large screens
- Enhanced visual hierarchy

## 🎨 Design Features

### Color Scheme

- **Primary Green**: #4CAF50 (health and wellness)
- **Dark Green**: #2E7D32 (accent and buttons)
- **Light Green**: #E8F5E8 (backgrounds and highlights)
- **Neutral Grays**: #666, #333 (text and borders)
- **White**: #FFFFFF (cards and backgrounds)

### Typography

- **Font Family**: System fonts for optimal performance
- **Hierarchy**: Clear heading and body text distinction
- **Readability**: Optimized for senior users
- **Accessibility**: High contrast ratios

### Visual Elements

- **Gradient Backgrounds**: Subtle color transitions
- **Card Shadows**: Depth and visual separation
- **Hover Effects**: Interactive feedback
- **Smooth Animations**: CSS transitions and transforms

## 🏗️ Project Structure

```
src/
├── components/
│   └── Header.vue          # Top navigation bar
├── views/
│   ├── Home.vue            # Homepage with hero and features
│   ├── Recipes.vue         # Recipe exploration page
│   ├── Recommendations.vue # Daily recommendations
│   ├── MealPlanner.vue     # Weekly meal planning
│   └── ShoppingList.vue    # Shopping list management
├── router/
│   └── index.js            # Vue Router configuration
├── App.vue                 # Main application shell
└── main.js                 # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd iteration1

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🌐 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers

## 📱 Device Compatibility

### Smartphones

- **Portrait & Landscape**: Optimized layouts for both orientations
- **Touch Interactions**: Large touch targets and smooth gestures
- **Performance**: Optimized for mobile processors

### Tablets

- **Responsive Grid**: Adapts to tablet screen sizes
- **Touch & Mouse**: Supports both input methods
- **Orientation**: Handles rotation seamlessly

### Desktop Computers

- **Full Experience**: Complete feature set with hover effects
- **Keyboard Navigation**: Accessible via keyboard
- **High Resolution**: Optimized for Retina and 4K displays

## 🎯 Accessibility Features

- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and descriptions
- **Color Contrast**: WCAG AA compliant color ratios
- **Focus Management**: Clear focus indicators

## 🔧 Development

### Code Style

- **Vue 3 Composition API**: Modern Vue.js patterns
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Component Naming**: Multi-word component names

### Performance

- **Lazy Loading**: Route-based code splitting
- **Optimized Images**: SVG icons for scalability
- **CSS Optimization**: Efficient selectors and properties
- **Bundle Size**: Minimal JavaScript footprint

## 📈 Future Enhancements

- **Dark Mode**: User preference-based theme switching
- **PWA Features**: Offline support and app-like experience
- **Internationalization**: Multi-language support
- **Advanced Animations**: Enhanced micro-interactions
- **Performance Monitoring**: Real user metrics tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across different devices
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Vue.js Team**: For the amazing framework
- **Design Community**: For inspiration and best practices
- **Accessibility Advocates**: For inclusive design guidance

---

**HealthyEats** - Making healthy eating accessible for everyone, especially seniors. 🥗✨
