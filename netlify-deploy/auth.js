// Password protection script for all pages
(function() {
    // Only run on pages that are not the login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }

    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
    const authTime = sessionStorage.getItem('authTime');
    const currentTime = Date.now();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    // Check if user is authenticated and session hasn't expired
    if (!isAuthenticated || !authTime || (currentTime - parseInt(authTime)) > sessionTimeout) {
        // Clear any existing auth data
        sessionStorage.removeItem('authenticated');
        sessionStorage.removeItem('authTime');
        // Redirect to login page
        window.location.href = 'login.html';
        return;
    }
})();
