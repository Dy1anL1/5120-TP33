<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <h1 class="hero-title">Welcome to HealthyEats</h1>
        <p class="hero-description">
          Your personalized companion for healthy eating designed specifically for seniors. Discover
          nutritious recipes, get daily recommendations, and plan meals that support your wellness
          journey.
        </p>
      </div>
    </section>

    <!-- Feature Cards Section -->
    <section class="features">
      <div class="features-container">
        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
          </div>
          <h3>Explore Recipes</h3>
          <p>Browse thousands of senior-friendly recipes tailored to your health needs.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </div>
          <h3>Daily Tips</h3>
          <p>Get personalized health tips and meal recommendations every day.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
              />
            </svg>
          </div>
          <h3>Meal Planning</h3>
          <p>Create weekly meal plans based on your dietary preferences and health goals.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
              />
            </svg>
          </div>
          <h3>Smart Shopping</h3>
          <p>Generate organized shopping lists from your meal plans and track your ingredients.</p>
        </div>
      </div>
    </section>

    <!-- Call to Action Section -->
    <section class="cta">
      <div class="cta-container">
        <button class="cta-button">Start Your Healthy Journey Today</button>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
}
</script>

<style scoped>
/* Home Container */
.home {
  min-height: 100vh;
  background-color: #f8f9fa;
}

/* Hero Section */
.hero {
  padding: 4rem 0;
  text-align: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e8f5e8 100%);
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.hero-title {
  font-size: 3.5rem;
  color: #4caf50;
  margin-bottom: 2rem;
  font-weight: bold;
  line-height: 1.1;
}

.hero-description {
  font-size: 1.3rem;
  color: #666;
  max-width: 900px;
  margin: 0 auto;
  line-height: 1.7;
}

/* Feature Cards Section */
.features {
  padding: 4rem 0;
}

.features-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2.5rem 2rem;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #4caf50, #2e7d32);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-icon {
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  color: #4caf50;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  transform: scale(1.1);
}

.feature-icon svg {
  width: 45px;
  height: 45px;
}

.feature-card h3 {
  color: #333;
  font-size: 1.4rem;
  margin-bottom: 1rem;
  font-weight: bold;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
  font-size: 1.05rem;
}

/* Call to Action Section */
.cta {
  padding: 4rem 0;
  text-align: center;
  background: linear-gradient(135deg, #e8f5e8 0%, #f8f9fa 100%);
}

.cta-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.cta-button {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  border: none;
  padding: 1.25rem 3rem;
  font-size: 1.3rem;
  font-weight: bold;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
  position: relative;
  overflow: hidden;
}

.cta-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
}

.cta-button:hover::before {
  left: 100%;
}

/* Bootstrap-like responsive breakpoints */
/* Extra small devices (phones, 576px and down) */
@media (max-width: 575.98px) {
  .hero {
    padding: 2rem 0;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-description {
    font-size: 1.1rem;
  }

  .features {
    padding: 2rem 0;
  }

  .features-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .feature-card {
    padding: 2rem 1.5rem;
  }

  .feature-icon {
    width: 70px;
    height: 70px;
  }

  .feature-icon svg {
    width: 35px;
    height: 35px;
  }

  .cta {
    padding: 2rem 0;
  }

  .cta-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }
}

/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .hero {
    padding: 3rem 0;
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-description {
    font-size: 1.2rem;
  }

  .features {
    padding: 3rem 0;
  }

  .features-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    padding: 0 1.5rem;
  }

  .feature-card {
    padding: 2rem 1.5rem;
  }

  .cta {
    padding: 3rem 0;
  }

  .cta-button {
    padding: 1.125rem 2.5rem;
    font-size: 1.2rem;
  }
}

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) and (max-width: 991.98px) {
  .hero {
    padding: 3.5rem 0;
  }

  .hero-title {
    font-size: 3.25rem;
  }

  .hero-description {
    font-size: 1.25rem;
  }

  .features {
    padding: 3.5rem 0;
  }

  .features-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.75rem;
    padding: 0 2rem;
  }

  .cta {
    padding: 3.5rem 0;
  }
}

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .hero {
    padding: 4rem 0;
  }

  .hero-title {
    font-size: 3.5rem;
  }

  .hero-description {
    font-size: 1.3rem;
  }

  .features {
    padding: 4rem 0;
  }

  .features-container {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
    padding: 0 2rem;
  }

  .cta {
    padding: 4rem 0;
  }
}

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) {
  .hero {
    padding: 4rem 0;
  }

  .hero-title {
    font-size: 3.5rem;
  }

  .hero-description {
    font-size: 1.3rem;
  }

  .features {
    padding: 4rem 0;
  }

  .features-container {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
    padding: 0 2rem;
  }

  .cta {
    padding: 4rem 0;
  }
}
</style>
