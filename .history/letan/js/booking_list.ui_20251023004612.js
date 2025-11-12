// ==========================================
// Booking List UI (Lễ tân quản lý đặt phòng)
// ==========================================


// Global state
let allBookings = [];
let filteredBookings = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 10;

// Init
document.addEventListener('DOMContentLoaded', async() => {
    initializeEventListeners();
    checkUserLogin();
    setupEventListeners();
    await loadBookings();
});
// Kiểm tra đăng nhập

function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
        return;
    }

    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || user.username;
}

// Thiết lập sự kiện
function setupEventListeners() {
    const logoutBtn = document.querySelector('a[href="#"]:has(i.fa-sign-out-alt)');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                window.location.href = '../login.html';
            }
        });
    }

    const searchInputs = ['searchBookingCode', 'searchPhone', 'searchName'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchBooking();
            });
        }
    });
}
// Load data
async function loadBookings() {
    try {
        showLoading();
        allBookings = await BookingAPI.fetchBookings();
        filteredBookings = [...allBookings];
        updateStatistics(allBookings);
        displayBookings();
    } catch (err) {
        console.error(" Lỗi tải đặt phòng:", err);
        showError("Không thể tải danh sách đặt phòng.");
    }
}

// ==========================================
// Event Handlers & Filters
// ==========================================
function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => handleSearch(e.target.value));
    }

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => filterBookings(tab.dataset.filter));
    });
}

function handleSearch(term) {
    const keyword = term.trim().toLowerCase();
    filteredBookings = !keyword ? [...allBookings] :
        allBookings.filter(b =>
            b.id.toString().includes(keyword) ||
            b.customerName.toLowerCase().includes(keyword) ||
            b.customerPhone.includes(keyword)
        );
    displayBookings();
}

function filterBookings(filter) {
    currentFilter = filter;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
        case 'staying':
            filteredBookings = allBookings.filter(b => b.status === 'Đang ở');
            break;
        case 'checkin-today':
            filteredBookings = allBookings.filter(b =>
                sameDay(b.checkinDate, today) && b.status === 'Đã đặt'
            );
            break;
        case 'checkout-today':
            filteredBookings = allBookings.filter(b =>
                sameDay(b.checkoutDate, today) && b.status === 'Đang ở'
            );
            break;
        default:
            filteredBookings = [...allBookings];
    }

    displayBookings();
}

// ==========================================
// Display bookings table
// ==========================================
function displayBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    if (filteredBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">Không có đặt phòng nào</td></tr>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filteredBookings.slice(start, start + itemsPerPage);

    tbody.innerHTML = paginated.map(b => `
        <tr>
            <td>${b.id}</td>
            <td>${b.customerName}</td>
            <td>${b.customerPhone}</td>
            <td>${b.roomNumber}</td>
            <td>${b.roomType}</td>
            <td>${formatDate(b.checkinDate)}</td>
            <td>${formatDate(b.checkoutDate)}</td>
            <td>${formatCurrency(b.totalAmount)}</td>
            <td>${getStatusBadge(b.status)}</td>
            <td>${getActionButtons(b)}</td>
        </tr>
    `).join('');
}

// ==========================================
// Actions
// ==========================================
async function checkinBooking(id) {
    if (confirm("Xác nhận check-in cho booking này?")) {
        await BookingAPI.checkinBooking(id);
        alert("Check-in thành công!");
        await loadBookings();
    }
}

async function checkoutBooking(id) {
    if (confirm("Xác nhận check-out?")) {
        await BookingAPI.checkoutBooking(id);
        alert("Check-out thành công!");
        await loadBookings();
    }
}

async function cancelBooking(id) {
    if (confirm("Bạn có chắc muốn hủy booking này?")) {
        await BookingAPI.cancelBooking(id);
        alert("Đã hủy đặt phòng!");
        await loadBookings();
    }
}

// ==========================================
// Helpers
// ==========================================
function sameDay(dateStr, today) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
}

function formatDate(date) {
    return date ? new Date(date).toLocaleDateString('vi-VN') : '-';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function getStatusBadge(status) {
    const colors = {
        'Đang ở': 'badge-staying',
        'Đã đặt': 'badge-booked',
        'Đã trả': 'badge-completed',
        'Đã hủy': 'badge-cancelled'
    };
    return `<span class="status-badge ${colors[status] || ''}">${status}</span>`;
}

function getActionButtons(b) {
    if (b.status === 'Đã đặt') {
        return `<button onclick="checkinBooking(${b.id})" class="btn-action"><i class="fas fa-sign-in-alt"></i></button>`;
    }
    if (b.status === 'Đang ở') {
        return `<button onclick="checkoutBooking(${b.id})" class="btn-action"><i class="fas fa-sign-out-alt"></i></button>`;
    }
    return '';
}

function showLoading() {
    document.getElementById('bookingsTableBody').innerHTML =
        `<tr><td colspan="10"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>`;
}

function showError(msg) {
    alert(msg);
}

function updateStatistics(bookings) {
    const staying = bookings.filter(b => b.status === 'Đang ở').length;
    const booked = bookings.filter(b => b.status === 'Đã đặt').length;
    const cancelled = bookings.filter(b => b.status === 'Đã hủy').length;
    document.getElementById('currentStaying').textContent = staying;
    document.getElementById('totalBookings').textContent = booked + staying + cancelled;
}