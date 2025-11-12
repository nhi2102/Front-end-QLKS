// js/checkin.ui.js
let currentBookingsData = [];

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 checkin.html loaded');
    checkUserLogin();
    setupEventListeners();
    loadPendingCheckIns();
});

// =========================
// 🔹 Kiểm tra đăng nhập
// =========================
function checkUserLogin() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        return (window.location.href = '../login.html');
    }
    const user = JSON.parse(currentUser);
    document.getElementById('userName').textContent = user.name || user.username;
}

// =========================
// 🔹 Gọi danh sách chờ check-in
// =========================
async function loadPendingCheckIns() {
    try {
        const data = await apiGetPendingCheckIns();
        currentBookingsData = data;
        displayPendingCheckIns(data);
    } catch (error) {
        console.error('❌ loadPendingCheckIns error:', error);
        const tbody = document.getElementById('pendingCheckInsList');
        tbody.innerHTML = `
            <tr><td colspan="8" class="no-data error">
                <i class="fas fa-exclamation-triangle"></i> ${error.message}
            </td></tr>`;
    }
}

// =========================
// 🔹 Hiển thị danh sách
// =========================
function displayPendingCheckIns(bookings) {
    const tbody = document.getElementById('pendingCheckInsList');
    if (!bookings ? .length) {
        tbody.innerHTML = `<tr><td colspan="8" class="no-data">Không có booking nào chờ check-in hôm nay</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.maDatPhong || b.madatphong}</td>
            <td>${b.tenKhachHang || b.Hoten || 'N/A'}</td>
            <td>${b.soDienThoai || b.Sdt || 'N/A'}</td>
            <td>${b.phong || (b.chitietdatphongs?.[0]?.maphongNavigation?.Sophong ?? 'N/A')}</td>
            <td>${formatDate(b.ngaynhanphong)}</td>
            <td>${formatDate(b.ngaytraphong)}</td>
            <td><span class="status-badge status-pending">${b.trangthai || 'Chờ check-in'}</span></td>
            <td><button class="btn btn-sm btn-primary" onclick="openCheckInModal('${b.madatphong}')">
                <i class="fas fa-calendar-check"></i> Check-in</button></td>
        </tr>`).join('');
}

// =========================
// 🔹 Mở modal check-in
// =========================
async function openCheckInModal(bookingId) {
    const booking = currentBookingsData.find(b =>
        (b.maDatPhong || b.madatphong) ? .toString() === bookingId.toString()
    );
    if (!booking) return alert('Không tìm thấy booking');

    populateCheckInModal(booking);
    document.getElementById('checkInModal').style.display = 'flex';
}

// =========================
// 🔹 Điền thông tin vào modal
// =========================
function populateCheckInModal(booking) {
    document.getElementById('modalBookingCode').textContent = booking.maDatPhong || booking.madatphong;
    document.getElementById('modalCustomerName').textContent = booking.tenKhachHang || 'N/A';
    document.getElementById('modalPhone').textContent = booking.soDienThoai || 'N/A';
    document.getElementById('modalRoomNumber').textContent =
        booking.phong || booking.chitietdatphongs ? .[0] ? .maphongNavigation ? .Sophong || 'N/A';
    document.getElementById('modalCheckInDate').textContent = formatDate(booking.ngaynhanphong);
    document.getElementById('modalCheckOutDate').textContent = formatDate(booking.ngaytraphong);
    document.getElementById('modalTotalAmount').textContent = formatCurrency(booking.tongtien);
    document.getElementById('checkInModal').setAttribute('data-booking-id', booking.madatphong);
}

// =========================
// 🔹 Xác nhận Check-in
// =========================
async function confirmCheckIn() {
    const modal = document.getElementById('checkInModal');
    const bookingId = modal.getAttribute('data-booking-id');
    const checkInTime = document.getElementById('checkInTime').value;
    const actualGuests = parseInt(document.getElementById('actualGuests').value);
    const specialRequests = document.getElementById('specialRequests').value;
    const idCardVerified = document.getElementById('idCardVerified').checked;

    const payload = { checkInTime, actualGuests, specialRequests, idCardVerified };

    try {
        await apiConfirmCheckIn(bookingId, payload);
        alert('✅ Check-in thành công!');
        closeCheckInModal();
        loadPendingCheckIns();
    } catch (err) {
        alert('❌ Lỗi check-in: ' + err.message);
    }
}

// =========================
// 🔹 Tiện ích
// =========================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatCurrency(amount) {
    return (amount ? ? 0).toLocaleString('vi-VN') + ' ₫';
}

function closeCheckInModal() {
    document.getElementById('checkInModal').style.display = 'none';
}

function setupEventListeners() {
    document.getElementById('menuToggle').addEventListener('click', () =>
        document.querySelector('.sidebar').classList.toggle('active')
    );
}