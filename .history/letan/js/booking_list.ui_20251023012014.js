// =============================================
// Booking List UI (chỉ xem chi tiết & hủy)
// =============================================

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
    checkUserLogin();
    setupEventListeners();
    updateCurrentDate();
});

// --- Kiểm tra đăng nhập ---
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

// --- Đăng xuất ---
function setupEventListeners() {
    const logout = document.querySelector('.logout');
    if (logout) {
        logout.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                window.location.href = '../login.html';
            }
        });
    }
}

// --- Tìm kiếm, menu ---
function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput)
        searchInput.addEventListener('input', e => handleSearch(e.target.value));

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle)
        menuToggle.addEventListener('click', () =>
            document.querySelector('.sidebar').classList.toggle('collapsed'));
}

// --- Hiển thị ngày hiện tại ---
function updateCurrentDate() {
    console.log('Hôm nay:', new Date().toLocaleDateString('vi-VN'));
}

// --- Gọi API ---
async function loadBookings() {
    try {
        showLoading();
        const data = await BookingAPI.fetchBookings();
        allBookings = data;
        filteredBookings = [...data];
        updateStatistics(allBookings);
        displayBookings();
    } catch (err) {
        console.error(" Lỗi tải đặt phòng:", err);
        showError("Không thể tải danh sách đặt phòng từ máy chủ.");
    }
}

// ============================
// Lọc & hiển thị danh sách
// ============================

function filterBookings(filter) {
    currentFilter = filter;
    currentPage = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.filter === filter) t.classList.add('active');
    });

    switch (filter) {
        case 'staying':
            filteredBookings = allBookings.filter(b => b.status === 'Đang ở');
            break;
        case 'checkin-today':
            filteredBookings = allBookings.filter(b => new Date(b.checkinDate).toDateString() === today.toDateString());
            break;
        case 'checkout-today':
            filteredBookings = allBookings.filter(b => new Date(b.checkoutDate).toDateString() === today.toDateString());
            break;
        case 'upcoming':
            filteredBookings = allBookings.filter(b => new Date(b.checkinDate) > today && b.status === 'Đã đặt');
            break;
        case 'completed':
            filteredBookings = allBookings.filter(b => b.status === 'Đã trả');
            break;
        case 'cancelled':
            filteredBookings = allBookings.filter(b => b.status === 'Đã hủy');
            break;
        default:
            filteredBookings = [...allBookings];
    }
    document.getElementById('currentFilterTitle').textContent = filter;
    displayBookings();
}

function handleSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return filterBookings(currentFilter);
    filteredBookings = allBookings.filter(b =>
        b.id.toString().includes(term) ||
        b.customerName.toLowerCase().includes(term) ||
        b.customerPhone.includes(term) ||
        (b.roomNumber || '').toString().includes(term)
    );
    displayBookings();
}

// --- Hiển thị bảng ---
function displayBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filteredBookings.slice(start, start + itemsPerPage);
    document.getElementById('bookingCount').textContent = `(${filteredBookings.length})`;

    if (!filteredBookings.length) {
        tbody.innerHTML = `<tr><td colspan="11" class="empty-state">
            <i class="fas fa-inbox"></i><h3>Không có dữ liệu</h3>
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
            <td>${formatCurrency(b.totalAmount)}</td>
            <td>${getStatusBadge(b.status)}</td>
            <td>${getActionButtons(b)}</td>
        </tr>`).join('');

    updatePagination();
}

// --- Màu trạng thái ---
function getStatusBadge(status) {
    const map = { 'Đang ở': 'staying', 'Đã đặt': 'confirmed', 'Đã trả': 'completed', 'Đã hủy': 'cancelled' };
    return `<span class="status-badge status-${map[status]||''}">
        <i class="fas fa-circle"></i> ${status}
    </span>`;
}

// --- Chỉ còn 2 nút: Xem + Hủy ---
function getActionButtons(b) {
    const cancelBtn = (b.status !== 'Đã hủy' && b.status !== 'Đã trả') ?
        `<button class="btn-action btn-cancel" onclick="confirmCancelBooking('${b.id}')">
               <i class="fas fa-ban"></i></button>` :
        '';
    return `
        <button class="btn-action btn-view" onclick="viewBookingDetail('${b.id}')">
            <i class="fas fa-eye"></i>
        </button>
        ${cancelBtn}
    `;
}

// ============================
// Chi tiết & Hủy
// ============================

ffunction viewBookingDetail(id) {
    selectedBooking = allBookings.find(b => b.id == id);
    if (!selectedBooking) return;

    // --- Thông tin cơ bản ---
    document.getElementById('modalBookingCode').textContent = selectedBooking.id;
    document.getElementById('modalBookingDate').textContent = formatDate(selectedBooking.bookingDate);
    document.getElementById('modalStatus').innerHTML = getStatusBadge(selectedBooking.status);

    document.getElementById('modalCustomerName').textContent = selectedBooking.customerName;
    document.getElementById('modalCustomerPhone').textContent = selectedBooking.customerPhone;
    document.getElementById('modalCustomerEmail').textContent = selectedBooking.customerEmail;
    document.getElementById('modalCustomerID').textContent = selectedBooking.customerID;

    document.getElementById('modalRoomNumber').textContent = selectedBooking.roomNumber;
    document.getElementById('modalRoomType').textContent = selectedBooking.roomType;
    document.getElementById('modalCheckin').textContent = formatDate(selectedBooking.checkinDate);
    document.getElementById('modalCheckout').textContent = formatDate(selectedBooking.checkoutDate);

    // --- Tính toán & hiển thị thanh toán ---
    const roomPrice = selectedBooking.totalAmount || 0; // nếu API chưa tách riêng
    const serviceFee = 0; // tạm thời 0, sau có thể lấy từ API
    const total = roomPrice + serviceFee;
    const paid = (selectedBooking.paymentStatus === 'Đã thanh toán') ? total : 0;
    const remaining = total - paid;

    document.getElementById('modalRoomPrice').textContent = formatCurrency(roomPrice);
    document.getElementById('modalRoomTotal').textContent = formatCurrency(roomPrice);
    document.getElementById('modalServiceFee').textContent = formatCurrency(serviceFee);
    document.getElementById('modalGrandTotal').textContent = formatCurrency(total);
    document.getElementById('modalPaid').textContent = formatCurrency(paid);
    document.getElementById('modalRemaining').textContent = formatCurrency(remaining);

    // --- Ghi chú ---
    document.getElementById('modalNotes').textContent = selectedBooking.notes || 'Không có ghi chú';
    document.getElementById('bookingDetailModal').classList.add('show');
}


function closeBookingDetailModal() {
    document.getElementById('bookingDetailModal').classList.remove('show');
    selectedBooking = null;
}
window.onclick = e => { if (e.target.id === 'bookingDetailModal') closeBookingDetailModal(); };

async function confirmCancelBooking(id) {
    if (!confirm('Bạn có chắc muốn hủy đặt phòng này?')) return;
    try {
        await BookingAPI.cancelBooking(id);
        showNotification('Đã hủy đặt phòng');
        loadBookings();
    } catch (err) {
        showNotification('Lỗi khi hủy: ' + err.message, 'error');
    }
}

// ============================
// Tiện ích chung
// ============================

function updateStatistics(bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    document.getElementById('checkinToday').textContent =
        bookings.filter(b => new Date(b.checkinDate).toDateString() === today.toDateString()).length;
    document.getElementById('checkoutToday').textContent =
        bookings.filter(b => new Date(b.checkoutDate).toDateString() === today.toDateString()).length;
    document.getElementById('currentStaying').textContent =
        bookings.filter(b => b.status === 'Đang ở').length;
    document.getElementById('upcomingBookings').textContent =
        bookings.filter(b => new Date(b.checkinDate) > today && b.status === 'Đã đặt').length;
    document.getElementById('completedBookings').textContent =
        bookings.filter(b => b.status === 'Đã trả').length;
}

function showNotification(msg, type = 'success') {
    const color = type === 'error' ? '#dc2626' : '#16a34a';
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = `position:fixed;top:20px;right:20px;padding:10px 20px;
        background:${color};color:#fff;border-radius:8px;z-index:9999;`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '-'; }

function formatCurrency(v) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0); }

function showLoading() { document.getElementById('bookingsTableBody').innerHTML = '<tr><td colspan="11"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>'; }

function showError(m) { alert(m); }

// --- Phân trang ---
function updatePagination() {
    const total = Math.ceil(filteredBookings.length / itemsPerPage);
    const box = document.getElementById('pageNumbers');
    box.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        const b = document.createElement('button');
        b.className = 'page-number' + (i === currentPage ? ' active' : '');
        b.textContent = i;
        b.onclick = () => {
            currentPage = i;
            displayBookings();
        };
        box.appendChild(b);
    }
}

function refreshBookings() { loadBookings(); }