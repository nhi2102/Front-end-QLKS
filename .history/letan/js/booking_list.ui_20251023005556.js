// =============================================
// Booking List UI (dùng dữ liệu thật từ backend)
// =============================================

// --- Biến toàn cục ---
let allBookings = [];
let filteredBookings = [];
let currentFilter = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let selectedBooking = null;

// --- Khởi tạo ---
document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    initializeEventListeners();
    updateCurrentDate();
});

// --- Gắn sự kiện tìm kiếm, menu ---
function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            handleSearch(this.value);
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
}

// --- Hiển thị ngày hiện tại ---
function updateCurrentDate() {
    const today = new Date();
    console.log('Hôm nay:', formatDate(today));
}

// --- Gọi API để tải danh sách đặt phòng ---
async function loadBookings() {
    try {
        showLoading();
        const data = await BookingAPI.fetchBookings();
        allBookings = data;
        filteredBookings = [...data];
        updateStatistics(allBookings);
        displayBookings();
    } catch (err) {
        console.error("❌ Lỗi tải đặt phòng:", err);
        showError("Không thể tải danh sách đặt phòng từ máy chủ.");
    }
}

// ============================
// XỬ LÝ HIỂN THỊ & LỌC DỮ LIỆU
// ============================

// Lọc theo trạng thái
function filterBookings(filter) {
    currentFilter = filter;
    currentPage = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-filter') === filter) tab.classList.add('active');
    });

    switch (filter) {
        case 'staying':
            filteredBookings = allBookings.filter(b => b.status === 'Đang ở');
            setFilterTitle('Đang Ở');
            break;
        case 'checkin-today':
            filteredBookings = allBookings.filter(b => {
                const checkin = new Date(b.checkinDate);
                checkin.setHours(0, 0, 0, 0);
                return checkin.getTime() === today.getTime() && b.status !== 'Đã hủy';
            });
            setFilterTitle('Check-in Hôm Nay');
            break;
        case 'checkout-today':
            filteredBookings = allBookings.filter(b => {
                const checkout = new Date(b.checkoutDate);
                checkout.setHours(0, 0, 0, 0);
                return checkout.getTime() === today.getTime() && b.status === 'Đang ở';
            });
            setFilterTitle('Check-out Hôm Nay');
            break;
        case 'upcoming':
            filteredBookings = allBookings.filter(b => {
                const checkin = new Date(b.checkinDate);
                checkin.setHours(0, 0, 0, 0);
                return checkin > today && b.status === 'Đã đặt';
            });
            setFilterTitle('Sắp Tới');
            break;
        case 'completed':
            filteredBookings = allBookings.filter(b => b.status === 'Đã trả');
            setFilterTitle('Đã Trả');
            break;
        case 'cancelled':
            filteredBookings = allBookings.filter(b => b.status === 'Đã hủy');
            setFilterTitle('Đã Hủy');
            break;
        default:
            filteredBookings = [...allBookings];
            setFilterTitle('Tất Cả Đặt Phòng');
    }

    displayBookings();
}

function setFilterTitle(text) {
    document.getElementById('currentFilterTitle').textContent = text;
}

// Tìm kiếm
function handleSearch(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    if (!searchTerm) return filterBookings(currentFilter);

    filteredBookings = allBookings.filter(b =>
        b.id.toString().includes(searchTerm) ||
        b.customerName.toLowerCase().includes(searchTerm) ||
        b.customerPhone.includes(searchTerm) ||
        (b.roomNumber || '').toString().includes(searchTerm)
    );

    currentPage = 1;
    displayBookings();
}

// ==========================
// BẢNG HIỂN THỊ DANH SÁCH
// ==========================
function displayBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredBookings.slice(start, end);

    document.getElementById('bookingCount').textContent = `(${filteredBookings.length})`;

    if (!filteredBookings.length) {
        tbody.innerHTML = `
            <tr><td colspan="11" class="empty-state">
                <i class="fas fa-inbox"></i><h3>Không có dữ liệu</h3>
                <p>Không tìm thấy đặt phòng nào phù hợp.</p>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = pageData.map(b => `
        <tr>
            <td><span class="booking-code" onclick="viewBookingDetail('${b.id}')">${b.id}</span></td>
            <td>${b.customerName}</td>
            <td>${b.customerPhone}</td>
            <td>${b.roomNumber}</td>
            <td>${b.roomType}</td>
            <td>${formatDate(b.checkinDate)}</td>
            <td>${formatDate(b.checkoutDate)}</td>
            <td>${b.paymentStatus}</td>
            <td><span class="price-amount">${formatCurrency(b.totalAmount)}</span></td>
            <td>${getStatusBadge(b.status)}</td>
            <td>${getActionButtons(b)}</td>
        </tr>
    `).join('');

    updatePagination();
}

// Trạng thái màu
function getStatusBadge(status) {
    const map = {
        'Đang ở': 'status-staying',
        'Đã đặt': 'status-confirmed',
        'Đã trả': 'status-completed',
        'Đã hủy': 'status-cancelled'
    };
    const icons = {
        'Đang ở': 'fa-bed',
        'Đã đặt': 'fa-check-circle',
        'Đã trả': 'fa-check-double',
        'Đã hủy': 'fa-times-circle'
    };
    return `<span class="status-badge ${map[status] || ''}">
        <i class="fas ${icons[status] || 'fa-info-circle'}"></i> ${status}
    </span>`;
}

// Nút thao tác
function getActionButtons(b) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkin = new Date(b.checkinDate);
    checkin.setHours(0, 0, 0, 0);
    const checkout = new Date(b.checkoutDate);
    checkout.setHours(0, 0, 0, 0);

    if (b.status === 'Đã đặt' && checkin.getTime() === today.getTime()) {
        return `<button class="btn-action btn-checkin" onclick="checkinBooking('${b.id}')">
            <i class="fas fa-sign-in-alt"></i></button>`;
    }
    if (b.status === 'Đang ở' && checkout.getTime() === today.getTime()) {
        return `<button class="btn-action btn-checkout" onclick="checkoutBooking('${b.id}')">
            <i class="fas fa-sign-out-alt"></i></button>`;
    }
    if (b.status === 'Đã đặt') {
        return `<button class="btn-action btn-cancel" onclick="confirmCancelBooking('${b.id}')">
            <i class="fas fa-ban"></i></button>`;
    }
    return '';
}

// ==========================
// MODAL CHI TIẾT ĐẶT PHÒNG
// ==========================
function viewBookingDetail(id) {
    selectedBooking = allBookings.find(b => b.id == id);
    if (!selectedBooking) return;

    document.getElementById('modalBookingCode').textContent = selectedBooking.id;
    document.getElementById('modalBookingDate').textContent = formatDateTime(selectedBooking.bookingDate);
    document.getElementById('modalStatus').innerHTML = getStatusBadge(selectedBooking.status);
    document.getElementById('modalSource').textContent = selectedBooking.source;

    document.getElementById('modalCustomerName').textContent = selectedBooking.customerName;
    document.getElementById('modalCustomerPhone').textContent = selectedBooking.customerPhone;
    document.getElementById('modalCustomerEmail').textContent = selectedBooking.customerEmail;
    document.getElementById('modalCustomerID').textContent = selectedBooking.customerID;

    document.getElementById('modalRoomNumber').textContent = selectedBooking.roomNumber;
    document.getElementById('modalRoomType').textContent = selectedBooking.roomType;
    document.getElementById('modalCheckin').textContent = formatDate(selectedBooking.checkinDate);
    document.getElementById('modalCheckout').textContent = formatDate(selectedBooking.checkoutDate);

    document.getElementById('modalGrandTotal').textContent = formatCurrency(selectedBooking.totalAmount);
    document.getElementById('modalRemaining').textContent = selectedBooking.paymentStatus;

    document.getElementById('modalNotes').textContent = selectedBooking.notes || 'Không có ghi chú';
    document.getElementById('bookingDetailModal').classList.add('show');
}

function closeBookingDetailModal() {
    document.getElementById('bookingDetailModal').classList.remove('show');
    selectedBooking = null;
}

window.onclick = function(event) {
    const modal = document.getElementById('bookingDetailModal');
    if (event.target === modal) closeBookingDetailModal();
};

// ==========================
// THAO TÁC API (Check-in/out/Hủy)
// ==========================
async function checkinBooking(id) {
    if (!confirm('Xác nhận Check-in cho khách này?')) return;
    try {
        const res = await BookingAPI.checkinBooking(id);
        showNotification(' Check-in thành công');
        loadBookings();
    } catch (err) {
        showNotification(' Lỗi khi check-in: ' + err.message, 'error');
    }
}

async function checkoutBooking(id) {
    if (!confirm('Xác nhận Check-out cho khách này?')) return;
    try {
        const res = await BookingAPI.checkoutBooking(id);
        showNotification(' Check-out thành công');
        loadBookings();
    } catch (err) {
        showNotification(' Lỗi khi check-out: ' + err.message, 'error');
    }
}

async function confirmCancelBooking(id) {
    if (!confirm('Bạn có chắc muốn hủy đặt phòng này?')) return;
    try {
        await BookingAPI.cancelBooking(id);
        showNotification(' Đã hủy đặt phòng');
        loadBookings();
    } catch (err) {
        showNotification(' Lỗi khi hủy: ' + err.message, 'error');
    }
}

// ==========================
// TIỆN ÍCH CHUNG
// ==========================
function updateStatistics(bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
        checkinToday: bookings.filter(b => new Date(b.checkinDate).toDateString() === today.toDateString()).length,
        checkoutToday: bookings.filter(b => new Date(b.checkoutDate).toDateString() === today.toDateString()).length,
        currentStaying: bookings.filter(b => b.status === 'Đang ở').length,
        upcoming: bookings.filter(b => new Date(b.checkinDate) > today && b.status === 'Đã đặt').length,
        completed: bookings.filter(b => b.status === 'Đã trả').length
    };

    document.getElementById('checkinToday').textContent = stats.checkinToday;
    document.getElementById('checkoutToday').textContent = stats.checkoutToday;
    document.getElementById('currentStaying').textContent = stats.currentStaying;
    document.getElementById('upcomingBookings').textContent = stats.upcoming;
    document.getElementById('completedBookings').textContent = stats.completed;
}

function showNotification(message, type = 'success') {
    const color = type === 'error' ? '#dc2626' : '#16a34a';
    const note = document.createElement('div');
    note.className = 'notify';
    note.textContent = message;
    note.style.cssText = `
        position:fixed;top:20px;right:20px;padding:10px 20px;
        background:${color};color:white;border-radius:8px;z-index:9999;
    `;
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3000);
}

function showLoading() {
    document.getElementById('bookingsTableBody').innerHTML = `
        <tr><td colspan="11" class="loading">
            <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
        </td></tr>`;
}

function showError(msg) { alert(msg); }

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
}

function formatDateTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('vi-VN');
}

function formatCurrency(val) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
}

// ==========================
// PHÂN TRANG
// ==========================
function updatePagination() {
    const total = Math.ceil(filteredBookings.length / itemsPerPage);
    const container = document.getElementById('pageNumbers');
    container.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-number' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            displayBookings();
        };
        container.appendChild(btn);
    }
}