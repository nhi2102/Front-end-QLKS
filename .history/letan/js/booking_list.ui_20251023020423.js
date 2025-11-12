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

function viewBookingDetail(id) {
    selectedBooking = allBookings.find(b => b.id == id);
    if (!selectedBooking) return;

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

    //  Dữ liệu tiền phòng và dịch vụ
    const roomPrice = selectedBooking.tienPhong || selectedBooking.TienPhong || 0;
    const serviceFee = selectedBooking.tienDichVu || selectedBooking.TienDichVu || 0;
    const total = selectedBooking.totalAmount || selectedBooking.TongTien || roomPrice + serviceFee;
    const paid = (selectedBooking.paymentStatus === 'Đã thanh toán') ? total : 0;
    const remaining = total - paid;

    document.getElementById('modalRoomPrice').textContent = formatCurrency(roomPrice);
    document.getElementById('modalServiceFee').textContent = formatCurrency(serviceFee);
    document.getElementById('modalGrandTotal').textContent = formatCurrency(total);
    document.getElementById('modalPaid').textContent = formatCurrency(paid);
    document.getElementById('modalRemaining').textContent = formatCurrency(remaining);

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

//in phiếu
async function printBooking() {
    if (!selectedBooking) {
        alert("Vui lòng chọn đặt phòng để in.");
        return;
    }

    // Gán dữ liệu
    document.getElementById('p_maDatPhong').textContent = selectedBooking.id;
    document.getElementById('p_ngayDat').textContent = formatDate(selectedBooking.bookingDate);
    document.getElementById('p_trangThai').textContent = selectedBooking.status;
    document.getElementById('p_trangThaiTT').textContent = selectedBooking.paymentStatus;
    document.getElementById('p_khachHang').textContent = selectedBooking.customerName;
    document.getElementById('p_sdt').textContent = selectedBooking.customerPhone;
    document.getElementById('p_email').textContent = selectedBooking.customerEmail;
    document.getElementById('p_cccd').textContent = selectedBooking.customerID;
    document.getElementById('p_phong').textContent = selectedBooking.roomNumber;
    document.getElementById('p_loaiPhong').textContent = selectedBooking.roomType;
    document.getElementById('p_checkin').textContent = formatDate(selectedBooking.checkinDate);
    document.getElementById('p_checkout').textContent = formatDate(selectedBooking.checkoutDate);
    document.getElementById('p_tienPhong').textContent = formatCurrency(selectedBooking.tienPhong || 0);
    document.getElementById('p_tienDichVu').textContent = formatCurrency(selectedBooking.tienDichVu || 0);
    document.getElementById('p_tongTien').textContent = formatCurrency(selectedBooking.totalAmount || 0);
    document.getElementById('p_ghiChu').textContent = selectedBooking.notes || "Không có ghi chú";
    document.getElementById('p_ngayIn').textContent = formatDateTime(new Date());

    // ✅ Clone template sang một vùng hiển thị tạm thời (để html2pdf render được)
    const element = document.getElementById('printBookingTemplate').cloneNode(true);
    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-9999px'; // ẩn khỏi màn hình nhưng vẫn render được
    document.body.appendChild(element);

    // ✅ Cấu hình html2pdf
    const opt = {
        margin: 10,
        filename: `Phieu_Dat_Phong_${selectedBooking.id}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // ✅ In PDF (phải await)
    await html2pdf().set(opt).from(element).save();

    // ✅ Xóa vùng in tạm sau khi xong
    document.body.removeChild(element);
}



function formatDateTime(d) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return d ? new Date(d).toLocaleString('vi-VN', options) : '-';
}