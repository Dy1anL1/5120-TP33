// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }
    
    // Search functionality for Explore Recipes page
    const searchInput = document.querySelector('.search-input');
    const recipeCards = document.querySelectorAll('.recipe-card');
    const resultsHeader = document.querySelector('.results-header h2');
    
    if (searchInput && recipeCards.length > 0) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            let visibleCount = 0;
            
            recipeCards.forEach(card => {
                const title = card.querySelector('.recipe-title').textContent.toLowerCase();
                const description = card.querySelector('.recipe-description').textContent.toLowerCase();
                const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());
                
                const isVisible = title.includes(searchTerm) || 
                                description.includes(searchTerm) || 
                                tags.some(tag => tag.includes(searchTerm));
                
                if (isVisible) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            if (resultsHeader) {
                resultsHeader.textContent = `${visibleCount} Recipe${visibleCount !== 1 ? 's' : ''} Found`;
            }
        });
    }
    
    // Filter functionality
    const recipeCategorySelect = document.getElementById('recipe-category');
    const dietTypeSelect = document.getElementById('diet-type');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    
    if (applyFiltersBtn && recipeCards.length > 0) {
        applyFiltersBtn.addEventListener('click', function() {
            const category = recipeCategorySelect.value;
            const dietType = dietTypeSelect.value;
            
            let visibleCount = 0;
            
            recipeCards.forEach(card => {
                // This is a simplified filter - in a real app you'd have data attributes
                // or API calls to filter by actual recipe data
                const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());
                
                let isVisible = true;
                
                // Simple category filtering based on tags
                if (category !== 'all') {
                    const categoryMatch = {
                        'breakfast': ['protein', 'iron', 'calcium'],
                        'lunch': ['heart health', 'fiber', 'protein'],
                        'dinner': ['heart health', 'complete protein', 'mediterranean'],
                        'snacks': ['antioxidants', 'vitamin c', 'immunity'],
                        'desserts': ['antioxidants', 'vitamin c']
                    };
                    
                    if (categoryMatch[category]) {
                        isVisible = tags.some(tag => categoryMatch[category].some(cat => tag.includes(cat)));
                    }
                }
                
                // Simple diet type filtering based on tags
                if (dietType !== 'all' && isVisible) {
                    const dietMatch = {
                        'vegetarian': ['protein', 'iron', 'calcium', 'fiber'],
                        'vegan': ['plant-based', 'fiber', 'antioxidants'],
                        'gluten-free': ['protein', 'iron', 'calcium'],
                        'low-sodium': ['low sodium', 'heart health'],
                        'heart-healthy': ['heart health', 'omega-3', 'mediterranean']
                    };
                    
                    if (dietMatch[dietType]) {
                        isVisible = tags.some(tag => dietMatch[dietType].some(diet => tag.includes(diet)));
                    }
                }
                
                if (isVisible) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            if (resultsHeader) {
                resultsHeader.textContent = `${visibleCount} Recipe${visibleCount !== 1 ? 's' : ''} Found`;
            }
        });
    }
    
    // Recipe card click functionality
    recipeCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('.recipe-title').textContent;
            alert(`Recipe: ${title}\n\nThis would open the full recipe details in a real application.`);
        });
    });
    
    // Smooth scrolling for navigation links
    const anchorLinks = document.querySelectorAll('.nav-link[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Nutrition Dashboard functionality
    const nutritionCards = document.querySelectorAll('.nutrition-card');
    const overallProgressFill = document.querySelector('.overall-progress-section .progress-fill');
    
    if (nutritionCards.length > 0) {
        // Animate progress bars on page load
        setTimeout(() => {
            nutritionCards.forEach((card, index) => {
                const progressFill = card.querySelector('.progress-fill');
                if (progressFill) {
                    const width = progressFill.style.width;
                    progressFill.style.width = '0%';
                    
                    setTimeout(() => {
                        progressFill.style.width = width;
                    }, index * 200);
                }
            });
            
            // Animate overall progress bar
            if (overallProgressFill) {
                const width = overallProgressFill.style.width;
                overallProgressFill.style.width = '0%';
                
                setTimeout(() => {
                    overallProgressFill.style.width = width;
                }, 1000);
            }
        }, 500);
        
        // Add click functionality to nutrition cards
        nutritionCards.forEach(card => {
            card.addEventListener('click', function() {
                const title = this.querySelector('h3').textContent;
                const currentValue = this.querySelector('.current-value').textContent;
                const goalValue = this.querySelector('.goal-value').textContent;
                const unit = this.querySelector('.unit').textContent;
                
                alert(`${title} Progress\n\nCurrent: ${currentValue} ${unit}\nGoal: ${goalValue} ${unit}\n\nThis would open detailed nutrition tracking in a real application.`);
            });
        });
        
        // Add hover effects for progress bars
        nutritionCards.forEach(card => {
            const progressBar = card.querySelector('.progress-bar');
            const progressFill = card.querySelector('.progress-fill');
            
            if (progressBar && progressFill) {
                card.addEventListener('mouseenter', function() {
                    progressFill.style.transform = 'scaleY(1.2)';
                });
                
                card.addEventListener('mouseleave', function() {
                    progressFill.style.transform = 'scaleY(1)';
                });
            }
        });
    }
    
    // Goals section functionality
    const goalItems = document.querySelectorAll('.goal-item');
    
    if (goalItems.length > 0) {
        goalItems.forEach((item, index) => {
            // Add staggered animation
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 150);
            
            // Add click functionality
            item.addEventListener('click', function() {
                const goalName = this.querySelector('.goal-name').textContent;
                const goalProgress = this.querySelector('.goal-progress').textContent;
                
                alert(`${goalName} Goal\n\nProgress: ${goalProgress}\n\nThis would open detailed goal tracking in a real application.`);
            });
            
            // Animate progress bars in goals
            const progressFill = item.querySelector('.progress-fill');
            if (progressFill) {
                const width = progressFill.style.width;
                progressFill.style.width = '0%';
                
                setTimeout(() => {
                    progressFill.style.width = width;
                }, 1000 + (index * 200));
            }
        });
    }
});

// Add loading animation for recipe cards
window.addEventListener('load', function() {
    const recipeCards = document.querySelectorAll('.recipe-card');
    recipeCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Add loading animation for nutrition dashboard
    const nutritionCards = document.querySelectorAll('.nutrition-card');
    nutritionCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });
});
