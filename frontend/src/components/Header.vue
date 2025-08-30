<template>
  <header class="header">
    <div class="header-container">
      <!-- Logo Section -->
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13.34z"
            />
          </svg>
        </div>
        <div class="logo-text">
          <h1>Silver Spoon Society</h1>
          <p>For Healthy Living</p>
        </div>
      </div>

      <!-- Desktop Navigation -->
      <nav class="desktop-navigation">
        <router-link to="/" class="nav-link" active-class="active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>Home</span>
        </router-link>
        <router-link to="/recipes" class="nav-link" active-class="active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <span>Explore Recipes</span>
        </router-link>
        <router-link to="/recommendations" class="nav-link" active-class="active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
          <span>Daily Recommendations</span>
        </router-link>
        <router-link to="/meal-planner" class="nav-link" active-class="active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
            />
          </svg>
          <span>Meal Planner</span>
        </router-link>
        <router-link to="/shopping-list" class="nav-link" active-class="active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
            />
          </svg>
          <span>Shopping List</span>
        </router-link>
      </nav>

      <!-- Mobile Menu Toggle -->
      <button class="mobile-menu-toggle" @click="toggleMobileMenu">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>
    </div>

    <!-- Mobile Navigation Overlay -->
    <div class="mobile-overlay" :class="{ active: mobileMenuOpen }" @click="closeMobileMenu">
      <div class="mobile-nav" @click.stop>
        <div class="mobile-nav-header">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13.34z"
                />
              </svg>
            </div>
            <div class="logo-text">
              <h1>Silver Spoon Society</h1>
              <p>For Healthy Living</p>
            </div>
          </div>
          <button class="close-btn" @click="closeMobileMenu">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
        <nav class="mobile-navigation">
          <router-link to="/" class="nav-link" active-class="active" @click="closeMobileMenu">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span>Home</span>
          </router-link>
          <router-link
            to="/recipes"
            class="nav-link"
            active-class="active"
            @click="closeMobileMenu"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
            <span>Explore Recipes</span>
          </router-link>
          <router-link
            to="/recommendations"
            class="nav-link"
            active-class="active"
            @click="closeMobileMenu"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            <span>Daily Recommendations</span>
          </router-link>
          <router-link
            to="/meal-planner"
            class="nav-link"
            active-class="active"
            @click="closeMobileMenu"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
              />
            </svg>
            <span>Meal Planner</span>
          </router-link>
          <router-link
            to="/shopping-list"
            class="nav-link"
            active-class="active"
            @click="closeMobileMenu"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
              />
            </svg>
            <span>Shopping List</span>
          </router-link>
        </nav>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'AppHeader',
  data() {
    return {
      mobileMenuOpen: false,
    }
  },
  methods: {
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen
    },
    closeMobileMenu() {
      this.mobileMenuOpen = false
    },
  },
}
</script>

<style scoped>
/* Header Container */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  height: 80px;
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo Section */
.logo {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: #4caf50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.logo-icon svg {
  width: 28px;
  height: 28px;
}

.logo-text h1 {
  color: #4caf50;
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0;
  line-height: 1.2;
}

.logo-text p {
  color: #666;
  font-size: 0.8rem;
  margin: 0;
  line-height: 1.2;
}

/* Desktop Navigation */
.desktop-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: #666;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
}

.nav-link:hover {
  color: #4caf50;
  background: #f0f8f0;
}

.nav-link.active {
  background: #4caf50;
  color: white;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.nav-link svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-link span {
  font-weight: 500;
}

/* Mobile Menu Toggle */
.mobile-menu-toggle {
  display: none;
  background: #4caf50;
  border: none;
  color: white;
  width: 45px;
  height: 45px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  transition: all 0.3s ease;
}

.mobile-menu-toggle:hover {
  background: #2e7d32;
  transform: scale(1.05);
}

.mobile-menu-toggle svg {
  width: 24px;
  height: 24px;
}

/* Mobile Navigation Overlay */
.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.mobile-overlay.active {
  opacity: 1;
  visibility: visible;
}

.mobile-nav {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: white;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
}

.mobile-overlay.active .mobile-nav {
  transform: translateX(0);
}

.mobile-nav-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-navigation {
  padding: 1rem 0;
}

.mobile-navigation .nav-link {
  padding: 1rem 1.5rem;
  border-radius: 0;
  border-bottom: 1px solid #f0f0f0;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

/* Bootstrap-like responsive breakpoints */
/* Extra small devices (phones, 576px and down) */
@media (max-width: 575.98px) {
  .header {
    height: 70px;
  }

  .header-container {
    padding: 0 1rem;
  }

  .logo-text h1 {
    font-size: 1.1rem;
  }

  .logo-text p {
    font-size: 0.75rem;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
  }

  .logo-icon svg {
    width: 24px;
    height: 24px;
  }
}

/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .header {
    height: 75px;
  }

  .header-container {
    padding: 0 1.5rem;
  }

  .logo-text h1 {
    font-size: 1.15rem;
  }

  .logo-text p {
    font-size: 0.8rem;
  }
}

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) and (max-width: 991.98px) {
  .header-container {
    padding: 0 2rem;
  }

  .nav-link {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }

  .nav-link svg {
    width: 18px;
    height: 18px;
  }
}

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .header-container {
    padding: 0 2rem;
  }
}

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) {
  .header-container {
    padding: 0 2rem;
  }
}

/* Hide desktop navigation on mobile */
@media (max-width: 991.98px) {
  .desktop-navigation {
    display: none;
  }

  .mobile-menu-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-overlay {
    display: block;
  }
}
</style>
