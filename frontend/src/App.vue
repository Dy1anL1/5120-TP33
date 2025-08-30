<template>
  <div id="app">
    <!-- Header Component -->
    <AppHeader />

    <!-- Main Content Area -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
import AppHeader from './components/Header.vue'

export default {
  name: 'App',
  components: {
    AppHeader,
  },
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f8f9fa;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
}

.main-content {
  min-height: 100vh;
  padding-top: 80px; /* Space for fixed header */
  background-color: #f8f9fa;
}

/* Bootstrap-like responsive breakpoints */
/* Extra small devices (phones, 576px and down) */
@media (max-width: 575.98px) {
  .main-content {
    padding-top: 70px;
  }
}

/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .main-content {
    padding-top: 75px;
  }
}

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) and (max-width: 991.98px) {
  .main-content {
    padding-top: 80px;
  }
}

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .main-content {
    padding-top: 80px;
  }
}

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) {
  .main-content {
    padding-top: 80px;
  }
}
</style>
