// Services Navigation Preloader
// Add this script to dashboard, checkin, checkout pages for faster services loading

(function() {
    'use strict';

    const API_BASE = 'https://localhost:7076/api';
    let preloadStarted = false;

    // Clear customer data from localStorage when accessing receptionist pages
    function clearCustomerData() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                // Only clear if the stored user is a customer (has makh)
                if (user.makh && user.role !== 'receptionist' && user.role !== 'manager' && user.role !== 'admin') {
                    console.log('🗑️ Clearing customer data from localStorage');
                    localStorage.removeItem('currentUser');
                }
            } catch (error) {
                console.error('Error clearing customer data:', error);
            }
        }
    }

    // Run on page load
    clearCustomerData();

    // Preload services data in background
    async function preloadServicesData() {
        if (preloadStarted) return;
        preloadStarted = true;

        try {
            console.log(' Background preloading services data...');

            const promises = [];

            // Check if data already exists and is fresh (< 2 minutes old)
            const timestamp = sessionStorage.getItem('preload_timestamp');
            const maxAge = 2 * 60 * 1000; // 2 minutes
            const isDataFresh = timestamp && (Date.now() - parseInt(timestamp)) < maxAge;

            if (isDataFresh) {
                console.log(' Services data already preloaded and fresh');
                return;
            }

            // Preload guests data
            if (!sessionStorage.getItem('preloaded_guests') || !isDataFresh) {
                promises.push(
                    fetch(`${API_BASE}/Datphongs/checked-in`, {
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(response => {
                        if (response.ok) return response.json();
                        throw new Error(`HTTP ${response.status}`);
                    })
                    .then(data => {
                        sessionStorage.setItem('preloaded_guests', JSON.stringify(data));
                        console.log(` Preloaded ${data.length} guests`);
                    })
                    .catch(error => {
                        console.log('Failed to preload guests:', error.message);
                    })
                );
            }

            // Preload services data
            if (!sessionStorage.getItem('preloaded_services') || !isDataFresh) {
                promises.push(
                    fetch(`${API_BASE}/Dichvus`, {
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(response => {
                        if (response.ok) return response.json();
                        throw new Error(`HTTP ${response.status}`);
                    })
                    .then(data => {
                        const activeServices = data.filter(service => service.trangthai === "Hiệu lực");
                        sessionStorage.setItem('preloaded_services', JSON.stringify(activeServices));
                        console.log(` Preloaded ${activeServices.length} active services`);
                    })
                    .catch(error => {
                        console.log('Failed to preload services:', error.message);
                    })
                );
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                sessionStorage.setItem('preload_timestamp', Date.now().toString());
                console.log(' Services data preloading completed');
            }

        } catch (error) {
            console.error('Background preload failed:', error);
        }
    }

    // Add hover event listeners when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Find services menu link
        const servicesLink = document.querySelector('a[href="services.html"], a[href*="services"]');

        if (servicesLink) {
            console.log(' Services navigation preloader attached');

            // Start preloading on hover
            servicesLink.addEventListener('mouseenter', function() {
                console.log(' Hover detected on services link - starting preload');
                preloadServicesData();
            });

            // Also preload on focus (keyboard navigation)
            servicesLink.addEventListener('focus', function() {
                console.log(' Focus detected on services link - starting preload');
                preloadServicesData();
            });

            // Preload after 3 seconds if user is idle (optional)
            setTimeout(() => {
                if (!preloadStarted) {
                    console.log(' Auto-preloading services data after 3s');
                    preloadServicesData();
                }
            }, 3000);
        }
    });

    // Expose function globally for manual preloading
    window.preloadServicesData = preloadServicesData;

})();