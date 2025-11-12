// ui.js — Quản lý giao diện check-in
let currentBookingsData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Page loaded: checkin.html');
    checkUserLogin();
    loadPendingCheckIns();
    setupEventListeners();
});

// 🔹 Kiểm tra đăng nhập
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

// 🔹 Thiết lập sự kiện
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

// 🔹 Tải danh sách booking chờ check-in
async function loadPendingCheckIns() {
    try {
        const data = await api.getPendingCheckIns();
        currentBookingsData = data;
        displayPendingCheckIns(data);
    } catch (error) {
        console.error('❌ Lỗi tải danh sách:', error);
        const tbody = document.getElementById('pendingCheckInsList');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
        }
    }
}

// 🔹 Hiển thị danh sách booking
function displayPendingCheckIns(bookings) {
    const tbody = document.getElementById('pendingCheckInsList');
    if (!tbody) return;

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">Không có booking nào chờ check-in</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(booking => {
        const bookingCode = booking.maDatPhong || booking.madatphong;
        const customerName = booking.tenKhachHang || booking.Hoten || 'N/A';
        const phone = booking.soDienThoai || booking.Sdt || 'N/A';
        const room = booking.phong || 'N/A';
        const checkInDate = formatDate(booking.ngaynhanphong);
        const checkOutDate = formatDate(booking.ngaytraphong);
        const status = booking.trangthai || 'Chờ check-in';

        return `
            <tr>
                <td>${bookingCode}</td>
                <td>${customerName}</td>
                <td>${phone}</td>
                <td>${room}</td>
                <td>${checkInDate}</td>
                <td>${checkOutDate}</td>
                <td><span class="status-badge">${status}</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="openCheckInModal('${bookingCode}')">Check-in</button></td>
            </tr>`;
    }).join('');
}

// 🔹 Mở modal check-in
function openCheckInModal(bookingId) {
    const booking = currentBookingsData.find(b =>
        b.maDatPhong ? .toString() === bookingId.toString() ||
        b.madatphong ? .toString() === bookingId.toString()
    );

    if (!booking) {
        alert('Không tìm thấy thông tin booking!');
        return;
    }

    populateCheckInModal(booking);
    document.getElementById('checkInModal').style.display = 'flex';
}

// 🔹 Điền dữ liệu vào modal
function populateCheckInModal(booking) {
    document.getElementById('modalBookingCode').textContent = booking.maDatPhong || booking.madatphong;
    document.getElementById('modalCustomerName').textContent = booking.tenKhachHang || booking.Hoten || 'N/A';
    document.getElementById('modalPhone').textContent = booking.soDienThoai || booking.Sdt || 'N/A';
    document.getElementById('modalRoomNumber').textContent = booking.phong || 'N/A';
    document.getElementById('modalCheckInDate').textContent = formatDate(booking.ngaynhanphong);
    document.getElementById('modalCheckOutDate').textContent = formatDate(booking.ngaytraphong);
    setDefaultCheckInTime();
    document.getElementById('checkInModal').setAttribute('data-booking-id', booking.maDatPhong || booking.madatphong);
}

// 🔹 Thực hiện check-in
async function confirmCheckIn() {
    const modal = document.getElementById('checkInModal');
    const bookingId = modal.getAttribute('data-booking-id');
    const checkInTime = document.getElementById('checkInTime').value || new Date().toTimeString().slice(0, 5);

    const checkInData = {
        GioCheckin: checkInTime,
        SoNguoiThucTe: parseInt(document.getElementById('actualGuests').value) || 1,
        YeucauDacBiet: document.getElementById('specialRequests').value || '',
        GhiChu: document.getElementById('checkInNotes').value || '',
        DaThuCoc: document.getElementById('depositPaid').checked,
        DaXacMinhCmnd: document.getElementById('idCardVerified').checked,
        NgayCheckin: new Date().toISOString().split('T')[0]
    };

    try {
        await api.checkInBooking(bookingId, checkInData);
        alert('✅ Check-in thành công!');
        closeCheckInModal();
        loadPendingCheckIns();
    } catch (error) {
        alert('❌ Lỗi check-in: ' + error.message);
    }
}

// 🔹 Đóng modal
function closeCheckInModal() {
    document.getElementById('checkInModal').style.display = 'none';
}

// 🔹 Format ngày
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// 🔹 Set giờ mặc định
function setDefaultCheckInTime() {
    const now = new Date();
    document.getElementById('checkInTime').value = now.toTimeString().slice(0, 5);
}

// Export global
window.openCheckInModal = openCheckInModal;
window.confirmCheckIn = confirmCheckIn;
window.closeCheckInModal = closeCheckInModal;
window.searchBooking = searchBooking;
window.resetSearch = resetSearch;