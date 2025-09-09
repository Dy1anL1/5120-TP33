// Password protection system
(function() {
    const CORRECT_PASSWORD = 'tp33';
    const STORAGE_KEY = 'silver_spoon_auth';
    const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

    // Check if user is already authenticated
    function checkAuth() {
        const authData = localStorage.getItem(STORAGE_KEY);
        if (authData) {
            try {
                const { timestamp, authenticated } = JSON.parse(authData);
                const now = Date.now();
                
                // Check if session is still valid
                if (authenticated && (now - timestamp) < SESSION_TIMEOUT) {
                    return true;
                } else {
                    // Session expired, clear auth data
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (e) {
                // Invalid auth data, clear it
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        return false;
    }

    // Save authentication data
    function saveAuth() {
        const authData = {
            authenticated: true,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    }

    // Create password modal
    function createPasswordModal() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'passwordModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 400px;
            width: 90%;
            animation: modalSlideIn 0.3s ease-out;
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .shake { animation: shake 0.5s ease-in-out; }
        `;
        document.head.appendChild(style);

        modalContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; background: #4CAF50; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <img src="logo.jpg" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;">
                </div>
                <h2 style="color: #2E7D32; margin: 0; font-size: 1.5rem;">Silver Spoon Society</h2>
                <p style="color: #666; margin: 0.5rem 0 0; font-size: 0.9rem;">Enter password to access the platform</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <div style="position: relative; margin-bottom: 1rem;">
                    <input type="password" id="passwordInput" placeholder="Enter password" 
                           style="width: 100%; padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.3s;"
                           autocomplete="current-password">
                </div>
                <button id="submitBtn" style="width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.3s;">
                    Access Platform
                </button>
            </div>
            
            <div id="errorMessage" style="color: #e53935; font-size: 0.9rem; margin-top: 1rem; display: none; padding: 8px; background: #ffebee; border-radius: 5px; border: 1px solid #ffcdd2;">
                Incorrect password. Please try again.
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Focus on password input
        const passwordInput = document.getElementById('passwordInput');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');

        passwordInput.focus();

        // Handle form submission
        function handleSubmit() {
            const password = passwordInput.value.trim();
            
            if (password === '') {
                showError('Please enter a password');
                return;
            }

            if (password === CORRECT_PASSWORD) {
                // Correct password
                saveAuth();
                modal.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(modal);
                }, 300);
            } else {
                // Wrong password
                showError('Incorrect password. Please try again.');
                passwordInput.value = '';
                passwordInput.focus();
            }
        }

        // Show error message
        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            modalContent.classList.add('shake');
            setTimeout(() => {
                modalContent.classList.remove('shake');
            }, 500);
        }

        // Event listeners
        submitBtn.addEventListener('click', handleSubmit);
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });

        // Clear error when typing
        passwordInput.addEventListener('input', function() {
            if (errorMessage.style.display === 'block') {
                errorMessage.style.display = 'none';
            }
        });
    }

    // Initialize password protection
    function init() {
        // Only show password modal if not authenticated
        if (!checkAuth()) {
            // Wait for page to load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createPasswordModal);
            } else {
                createPasswordModal();
            }
        }
    }

    // Start the protection
    init();
})();
