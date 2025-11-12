// ============================================
// BOOKING PAGE - JAVASCRIPT
// ============================================

const API_BASE_URL = "https://localhost:7076/api";

// Support multiple selected rooms for receptionist
let selectedRooms = [];
let availableRooms = [];
let bookingData = {
    checkInDate: null,
    checkOutDate: null,
    guestCount: 2,
    roomType: '',
    nights: 0,
    roomPrice: 0,
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    depositAmount: 0,
    remainingAmount: 0
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    setupEventListeners();
    setDefaultDates();
    // Load room types from API and populate the roomType select
    try {
        loadRoomTypes();
    } catch (e) {
        console.warn('Failed to load room types on init:', e);
    }
    // Initialize Litepicker for receptionist booking page if available
    try {
        const dr = document.getElementById('date-range-picker');
        if (dr && typeof Litepicker !== 'undefined') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            // Allow selecting today regardless of current hour
            const minDate = today;

            window.receptionPicker = new Litepicker({
                element: dr,
                singleMode: false,
                numberOfMonths: 2,
                numberOfColumns: 2,
                format: 'DD/MM/YYYY',
                lang: 'vi-VN',
                minDate: minDate,
                startDate: today,
                endDate: tomorrow
            });

            console.log('Litepicker receptionist initialized, minDate =', minDate.toISOString().split('T')[0]);

            // Set initial input value
            const fmt = d => (`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
            dr.value = `${fmt(today)} - ${fmt(tomorrow)}`;

            // When user selects dates, update hidden inputs and bookingData
            window.receptionPicker.on('selected', function(date1, date2) {
                // date1 and date2 are Luxon Date objects from Litepicker; convert to yyyy-MM-dd for hidden inputs
                const toInputDate = (d) => {
                    const dt = new Date(d.year, d.month - 1, d.day);
                    return dt.toISOString().split('T')[0];
                };
                const inEl = document.getElementById('checkInDate');
                const outEl = document.getElementById('checkOutDate');
                if (inEl && outEl) {
                    inEl.value = toInputDate(date1);
                    outEl.value = toInputDate(date2);
                    // Update bookingData.nights
                    const ci = new Date(inEl.value);
                    const co = new Date(outEl.value);
                    bookingData.checkInDate = inEl.value;
                    bookingData.checkOutDate = outEl.value;
                    bookingData.nights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
                    // Recalculate pricing if a room is selected
                    if (selectedRooms && selectedRooms.length > 0) calculatePricing();
                }
            });
        }
    } catch (e) {
        console.warn('Litepicker init for receptionist failed:', e);
    }
});

// Check user login
function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");

    if (!currentUser) {
        alert("Bạn cần đăng nhập để truy cập trang này!");
        window.location.href = "../login.html";
        return;
    }

    try {
        const userData = JSON.parse(currentUser);
        document.getElementById("userName").textContent = userData.hoTen || userData.name || "Nhân Viên";
    } catch (error) {
        console.error("Lỗi parse user data:", error);
        document.getElementById("userName").textContent = "Nhân Viên";
    }
}

// Setup event listeners
function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('currentUser');
            window.location.href = '../login.html';
        });
    }

    // Other bindings (search, filters) – omitted for brevity
}

// (file truncated in restore)