// Booking List API - Data Management
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let allBookings = [];
let filteredBookings = [];
let currentFilter = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let selectedBooking = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    initializeEventListeners();
    updateCurrentDate();
});

// Initialize event listeners
function initializeEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            handleSearch(this.value);
        });
    }

    // Menu toggle for mobile
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
}

// Update current date display
function updateCurrentDate() {
    const today = new Date();
    console.log('Hôm nay:', formatDate(today));
}

// Load bookings data
async function loadBookings() {
    try {
        showLoading();

        // Mock API call - Replace with actual API endpoint
        const response = await fetchBookingsData();
        allBookings = response;
        filteredBookings = allBookings;

        updateStatistics(allBookings);
        displayBookings();

    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('Không thể tải dữ liệu đặt phòng. Vui lòng thử lại sau.');
    }
}

// ============================================
// Booking List API (Dùng dữ liệu thật từ backend ASP.NET)
// ============================================

const API_BASE_URL = "https://localhost:7076/api"; // đổi cổng nếu cần

// Gọi API thật để lấy danh sách đặt phòng
async function fetchBookingsData() {
    const res = await fetch(`${API_BASE_URL}/Datphongs/letan-list`, {
        method: "GET",
        headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
        throw new Error("Không thể tải danh sách đặt phòng từ API");
    }

    const data = await res.json();

    return data.map(item => ({
        id: item.maDatPhong || item.MaDatPhong,
        bookingDate: item.ngayDat || item.NgayDat,
        customerName: item.tenKhachHang || item.TenKhachHang,
        customerPhone: item.soDienThoai || item.SoDienThoai,
        customerEmail: item.email || item.Email,
        customerID: item.cccd || item.Cccd,
        roomNumber: item.phong || item.Phong,
        roomType: item.loaiPhong || item.LoaiPhong,
        checkinDate: item.ngayNhanPhong || item.NgayNhanPhong,
        checkoutDate: item.ngayTraPhong || item.NgayTraPhong,
        nights: calculateNights(item.NgayNhanPhong, item.NgayTraPhong),
        guests: item.soNguoi || 1,
        roomPrice: item.tongTien / (calculateNights(item.NgayNhanPhong, item.NgayTraPhong) || 1),
        totalAmount: item.tongTien || item.TongTien,
        paidAmount: 0,
        status: normalizeStatus(item.trangThai || item.TrangThai),
        source: "Trực tiếp",
        notes: item.ghiChu || item.GhiChu || ""
    }));
}

// Tính số đêm giữa 2 ngày
function calculateNights(checkin, checkout) {
    try {
        const inDate = new Date(checkin);
        const outDate = new Date(checkout);
        return Math.max(1, Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24)));
    } catch {
        return 1;
    }
}

// Chuẩn hóa trạng thái tiếng Việt
function normalizeStatus(status) {
    const s = (status || "").trim().toLowerCase();
    if (s.includes("đang ở")) return "Đang ở";
    if (s.includes("đã đặt")) return "Đã xác nhận";
    if (s.includes("đã hủy")) return "Đã hủy";
    if (s.includes("đã thanh toán")) return "Đã hoàn thành";
    return "Chờ xác nhận";
}




// Get room price by type
function getRoomPrice(roomType) {
    const prices = {
        'Standard': 500000,
        'Deluxe': 800000,
        'Suite': 1200000,
        'VIP': 2000000
    };
    return prices[roomType] || 500000;
}

// Filter bookings
function filterBookings(filter) {
    currentFilter = filter;
    currentPage = 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-filter') === filter) {
            tab.classList.add('active');
        }
    });

    // Apply filter
    switch (filter) {
        case 'staying':
            filteredBookings = allBookings.filter(b => b.status === 'Đang ở');
            document.getElementById('currentFilterTitle').textContent = 'Đang Ở';
            break;
        case 'checkin-today':
            filteredBookings = allBookings.filter(b => {
                const checkin = new Date(b.checkinDate);
                checkin.setHours(0, 0, 0, 0);
                return checkin.getTime() === today.getTime() && b.status !== 'Đã hủy';
            });
            document.getElementById('currentFilterTitle').textContent = 'Check-in Hôm Nay';
            break;
        case 'checkout-today':
            filteredBookings = allBookings.filter(b => {
                const checkout = new Date(b.checkoutDate);
                checkout.setHours(0, 0, 0, 0);
                return checkout.getTime() === today.getTime() && b.status === 'Đang ở';
            });
            document.getElementById('currentFilterTitle').textContent = 'Check-out Hôm Nay';
            break;
        case 'upcoming':
            filteredBookings = allBookings.filter(b => {
                const checkin = new Date(b.checkinDate);
                checkin.setHours(0, 0, 0, 0);
                return checkin > today && (b.status === 'Đã xác nhận' || b.status === 'Chờ xác nhận');
            });
            document.getElementById('currentFilterTitle').textContent = 'Sắp Tới';
            break;
        case 'completed':
            filteredBookings = allBookings.filter(b => b.status === 'Đã hoàn thành');
            document.getElementById('currentFilterTitle').textContent = 'Đã Hoàn Thành';
            break;
        case 'cancelled':
            filteredBookings = allBookings.filter(b => b.status === 'Đã hủy');
            document.getElementById('currentFilterTitle').textContent = 'Đã Hủy';
            break;
        default:
            filteredBookings = allBookings;
            document.getElementById('currentFilterTitle').textContent = 'Tất Cả Đặt Phòng';
    }

    displayBookings();
}

// Handle search
function handleSearch(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();

    if (!searchTerm) {
        filterBookings(currentFilter);
        return;
    }

    filteredBookings = allBookings.filter(booking =>
        booking.id.toLowerCase().includes(searchTerm) ||
        booking.customerName.toLowerCase().includes(searchTerm) ||
        booking.customerPhone.includes(searchTerm) ||
        booking.roomNumber.toString().includes(searchTerm)
    );

    currentPage = 1;
    displayBookings();
}

// Display bookings
function displayBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedBookings = filteredBookings.slice(start, end);

    document.getElementById('bookingCount').textContent = `(${filteredBookings.length})`;

    if (filteredBookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Không tìm thấy đặt phòng</h3>
                    <p>Không có đặt phòng nào phù hợp với bộ lọc</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = paginatedBookings.map(booking => `
        <tr>
            <td>
                <span class="booking-code" onclick="viewBookingDetail('${booking.id}')">
                    ${booking.id}
                </span>
            </td>
            <td>
                <div class="customer-info">
                    <span class="customer-name">${booking.customerName}</span>
                </div>
            </td>
            <td>${booking.customerPhone}</td>
            <td><span class="room-number">${booking.roomNumber}</span></td>
            <td>${booking.roomType}</td>
            <td>${formatDate(booking.checkinDate)}</td>
            <td>${formatDate(booking.checkoutDate)}</td>
            <td>${booking.nights} đêm</td>
            <td><span class="price-amount">${formatCurrency(booking.totalAmount)}</span></td>
            <td>${getStatusBadge(booking.status)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewBookingDetail('${booking.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${getActionButtons(booking)}
                </div>
            </td>
        </tr>
    `).join('');

    updatePagination();
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusMap = {
        'Đang ở': 'status-staying',
        'Đã xác nhận': 'status-confirmed',
        'Chờ xác nhận': 'status-pending',
        'Đã hoàn thành': 'status-completed',
        'Đã hủy': 'status-cancelled'
    };

    const iconMap = {
        'Đang ở': 'fa-bed',
        'Đã xác nhận': 'fa-check-circle',
        'Chờ xác nhận': 'fa-clock',
        'Đã hoàn thành': 'fa-check-double',
        'Đã hủy': 'fa-times-circle'
    };

    return `<span class="status-badge ${statusMap[status]}">
        <i class="fas ${iconMap[status]}"></i> ${status}
    </span>`;
}

// Get action buttons based on status
function getActionButtons(booking) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(booking.checkinDate);
    checkinDate.setHours(0, 0, 0, 0);

    if (booking.status === 'Đã xác nhận' && checkinDate.getTime() === today.getTime()) {
        return `<button class="btn-action btn-checkin" onclick="checkinBooking('${booking.id}')">
            <i class="fas fa-sign-in-alt"></i>
        </button>`;
    }

    if (booking.status === 'Đang ở') {
        const checkoutDate = new Date(booking.checkoutDate);
        checkoutDate.setHours(0, 0, 0, 0);
        if (checkoutDate.getTime() === today.getTime()) {
            return `<button class="btn-action btn-checkout" onclick="checkoutBooking('${booking.id}')">
                <i class="fas fa-sign-out-alt"></i>
            </button>`;
        }
    }

    if (booking.status === 'Chờ xác nhận' || booking.status === 'Đã xác nhận') {
        return `<button class="btn-action btn-cancel" onclick="confirmCancelBooking('${booking.id}')">
            <i class="fas fa-ban"></i>
        </button>`;
    }

    return '';
}

// Update statistics
function updateStatistics(bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
        todayTotal: 0,
        checkinToday: 0,
        checkoutToday: 0,
        currentStaying: 0,
        upcoming: 0,
        completed: 0
    };

    bookings.forEach(booking => {
        const checkin = new Date(booking.checkinDate);
        checkin.setHours(0, 0, 0, 0);
        const checkout = new Date(booking.checkoutDate);
        checkout.setHours(0, 0, 0, 0);

        // Today's bookings (check-in or checkout today)
        if (checkin.getTime() === today.getTime() || checkout.getTime() === today.getTime()) {
            stats.todayTotal++;
        }

        // Check-in today
        if (checkin.getTime() === today.getTime() && booking.status !== 'Đã hủy') {
            stats.checkinToday++;
        }

        // Check-out today
        if (checkout.getTime() === today.getTime() && booking.status === 'Đang ở') {
            stats.checkoutToday++;
        }

        // Currently staying
        if (booking.status === 'Đang ở') {
            stats.currentStaying++;
        }

        // Upcoming
        if (checkin > today && (booking.status === 'Đã xác nhận' || booking.status === 'Chờ xác nhận')) {
            stats.upcoming++;
        }

        // Completed
        if (booking.status === 'Đã hoàn thành') {
            stats.completed++;
        }
    });

    document.getElementById('todayTotal').textContent = stats.todayTotal;
    document.getElementById('checkinToday').textContent = stats.checkinToday;
    document.getElementById('checkoutToday').textContent = stats.checkoutToday;
    document.getElementById('currentStaying').textContent = stats.currentStaying;
    document.getElementById('upcomingBookings').textContent = stats.upcoming;
    document.getElementById('completedBookings').textContent = stats.completed;
}

// Pagination functions
function updatePagination() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');

    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;

    let pages = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pages += '<span>...</span>';
        }
    }

    pageNumbers.innerHTML = pages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayBookings();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayBookings();
    }
}

function goToPage(page) {
    currentPage = page;
    displayBookings();
}

// View booking detail
function viewBookingDetail(bookingId) {
    selectedBooking = allBookings.find(b => b.id === bookingId);
    if (!selectedBooking) return;

    // Populate modal
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
    document.getElementById('modalNights').textContent = selectedBooking.nights + ' đêm';
    document.getElementById('modalGuests').textContent = selectedBooking.guests + ' người';

    document.getElementById('modalRoomPrice').textContent = formatCurrency(selectedBooking.roomPrice);
    document.getElementById('modalRoomTotal').textContent = formatCurrency(selectedBooking.roomPrice * selectedBooking.nights);
    document.getElementById('modalServiceFee').textContent = formatCurrency(selectedBooking.servicesFee);
    document.getElementById('modalGrandTotal').textContent = formatCurrency(selectedBooking.totalAmount);
    document.getElementById('modalPaid').textContent = formatCurrency(selectedBooking.paidAmount);
    document.getElementById('modalRemaining').textContent = formatCurrency(selectedBooking.totalAmount - selectedBooking.paidAmount);

    document.getElementById('modalNotes').textContent = selectedBooking.notes || 'Không có ghi chú';

    // Show/hide buttons based on status
    document.getElementById('btnEdit').style.display =
        (selectedBooking.status === 'Chờ xác nhận' || selectedBooking.status === 'Đã xác nhận') ? 'flex' : 'none';
    document.getElementById('btnCancel').style.display =
        (selectedBooking.status === 'Chờ xác nhận' || selectedBooking.status === 'Đã xác nhận' || selectedBooking.status === 'Đang ở') ? 'flex' : 'none';

    document.getElementById('bookingDetailModal').classList.add('show');
}

function closeBookingDetailModal() {
    document.getElementById('bookingDetailModal').classList.remove('show');
    selectedBooking = null;
}

// Action functions
function checkinBooking(bookingId) {
    if (confirm('Xác nhận check-in cho booking này?')) {
        console.log('Check-in booking:', bookingId);
        // TODO: Implement check-in logic
        alert('Chức năng check-in đang được phát triển');
    }
}

function checkoutBooking(bookingId) {
    if (confirm('Xác nhận check-out cho booking này?')) {
        console.log('Check-out booking:', bookingId);
        // TODO: Implement check-out logic
        alert('Chức năng check-out đang được phát triển');
    }
}

function confirmCancelBooking(bookingId) {
    if (confirm('Bạn có chắc muốn hủy booking này?')) {
        cancelBookingById(bookingId);
    }
}

function cancelBooking() {
    if (selectedBooking && confirm('Bạn có chắc muốn hủy booking này?')) {
        cancelBookingById(selectedBooking.id);
        closeBookingDetailModal();
    }
}

function cancelBookingById(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = 'Đã hủy';
        filterBookings(currentFilter);
        updateStatistics(allBookings);
        alert('Đã hủy booking thành công');
    }
}

function editBooking() {
    alert('Chức năng sửa booking đang được phát triển');
}

function printBooking() {
    window.print();
}

function refreshBookings() {
    loadBookings();
}

function exportToExcel() {
    alert('Chức năng xuất Excel đang được phát triển');
}

// Utility functions
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function showLoading() {
    document.getElementById('bookingsTableBody').innerHTML = `
        <tr>
            <td colspan="11" class="loading">
                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
            </td>
        </tr>
    `;
}

function showError(message) {
    alert(message);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bookingDetailModal');
    if (event.target === modal) {
        closeBookingDetailModal();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeBookingDetailModal();
    }
});