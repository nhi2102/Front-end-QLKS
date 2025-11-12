// ===============================
// checkout.ui.js
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    loadCurrentGuests();
});

let currentBooking = null;
let originalRoomCharge = 0;
//  Kiểm tra đăng nhập
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

    const searchInputs = ['searchBookingCode', 'searchRoomNumber', 'searchName'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchBooking();
            });
        }
    });
}
// Tìm kiếm booking
function searchBooking() {
    const bookingCodeEl = document.getElementById('searchBookingCode');
    const bookingCode = bookingCodeEl && bookingCodeEl.value ? bookingCodeEl.value.trim() : '';
    const roomNumberEl = document.getElementById('searchRoomNumber');
    const roomNumber = roomNumberEl && roomNumberEl.value ? roomNumberEl.value.trim() : '';
    const nameEl = document.getElementById('searchName');
    const name = nameEl && nameEl.value ? nameEl.value.trim() : '';

    if (!bookingCode && !roomNumber && !name) {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm!');
        return;
    }

    const filtered = currentBookingsData.filter(booking => {
        let matches = true;
        if (bookingCode) {
            const id = (booking.madatphong || booking.maDatPhong || '').toString();
            matches = matches && id.toLowerCase().includes(bookingCode.toLowerCase());
        }
        if (roomNumber) {
            let bookingRoom = booking.soPhong || booking.Sophong || booking.sophong || '';
            if (!bookingRoom && booking.makhNavigation) bookingRoom = booking.makhNavigation.Sophong || booking.makhNavigation.sophong || '';
            matches = matches && bookingRoom.toString().includes(roomNumber);
        }
        if (name) {
            let customerName = booking.tenKhachHang || booking.Hoten || booking.hoten || '';
            if (!customerName && booking.makhNavigation) customerName = booking.makhNavigation.Hoten || booking.makhNavigation.hoten || '';
            matches = matches && customerName.toLowerCase().includes(name.toLowerCase());
        }
        return matches;
    });

    displayPendingCheckIns(filtered);

    if (!filtered || filtered.length === 0) {
        alert('Không tìm thấy booking nào phù hợp trong danh sách check-in!');
    }
}
// Tải danh sách khách đang ở
async function loadCurrentGuests() {
    try {
        const bookings = await CheckoutAPI.getPendingCheckouts();
        displayCurrentGuests(bookings);
        document.getElementById('guestCount').textContent = `${bookings.length} khách`;
    } catch (e) {
        console.error(e);
        showError('Không thể tải danh sách khách checkout hôm nay');
    }
}

// Hiển thị danh sách khách
function displayCurrentGuests(bookings) {
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) return;
    if (!bookings.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="no-data">Không có khách hôm nay</td></tr>`;
        return;
    }
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.maDatPhong}</td>
            <td>${b.tenKhachHang}</td>
            <td>${b.soDienThoai}</td>
            <td>${b.phong || '-'}</td>
            <td>${formatDate(b.ngayNhanPhong)}</td>
            <td>${formatDate(b.ngayTraPhong)}</td>
            <td><span class="status-badge status-checkedin">Đang ở</span></td>
            <td>
                <button class="btn btn-checkout" onclick='openCheckOutModal(${JSON.stringify(b)})'>
                    <i class="fas fa-sign-out-alt"></i> Check-out
                </button>
            </td>
        </tr>`).join('');
}

// Mở modal checkout
async function openCheckOutModal(booking) {
    currentBooking = booking;
    document.getElementById('modalBookingCode').textContent = booking.maDatPhong;
    document.getElementById('modalCustomerName').textContent = booking.tenKhachHang; {
        const phoneEl = document.getElementById('modalPhoneNumber');
        const phoneVal = booking.soDienThoai;
        if (phoneVal === undefined || phoneVal === null || phoneVal === '') {
            phoneEl.textContent = '-';
        } else {
            phoneEl.textContent = phoneVal.toString();
        }
    }
    const modalCCCDEl = document.getElementById('modalCCCD');
    const cccd = booking.cccd;
    if (cccd !== undefined && cccd !== null && cccd !== '') {
        modalCCCDEl.textContent = cccd.toString();
    } else {
        modalCCCDEl.textContent = '-';
    }
    document.getElementById('modalRoomNumber').textContent = booking.phong;
    document.getElementById('modalCheckInDate').textContent = formatDate(booking.ngayNhanPhong);
    document.getElementById('modalCheckOutDate').textContent = formatDate(booking.ngayTraPhong);
    document.getElementById('modalRoomType').textContent = booking.loaiPhong || '-';
    document.getElementById('checkOutModal').classList.add('show');

    // Tiền phòng
    originalRoomCharge = booking.tongTienDatPhong || booking.tongTien || 0;
    document.getElementById('roomCharge').textContent = formatCurrency(originalRoomCharge);

    // Dịch vụ
    const services = await CheckoutAPI.getServiceHistory(booking.maDatPhong);
    const totalService = services.reduce((s, v) => s + (v.thanhTien || 0), 0);
    document.getElementById('serviceCharge').textContent = formatCurrency(totalService);
    document.getElementById('serviceHistoryList').innerHTML =
        services.map(s => `<div>${s.tenDichVu} - ${formatCurrency(s.thanhTien)}</div>`).join('');

    calculateTotal();
}

// 🟢 Tính tổng tiền
function calculateTotal() {
    const serviceCharge = parseCurrency(document.getElementById('serviceCharge').textContent);
    const extra = parseFloat(document.getElementById('extraCharge').value || 0);
    const discount = parseFloat(document.getElementById('discount').value || 0);
    const total = originalRoomCharge + serviceCharge + extra - discount;
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// 🟢 Xác nhận checkout
async function confirmCheckOut() {
    if (!currentBooking) return alert("Không có booking nào");

    const id = currentBooking.maDatPhong;
    const remain = await CheckoutAPI.getRemainingAmount(id);
    const soTienThieu = remain.SoTienThieu || 0;

    if (soTienThieu > 0 && !confirm(`Khách còn thiếu ${formatCurrency(soTienThieu)}.\nTiếp tục checkout?`)) return;

    const result = await CheckoutAPI.executeCheckout(id);
    alert(result.message || "Checkout hoàn tất");
    closeCheckOutModal();
    loadCurrentGuests();
}

// 🧾 Format helpers
function formatCurrency(v) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
}

function parseCurrency(txt) {
    return parseFloat(txt.replace(/[^\d]/g, '')) || 0;
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('vi-VN') : '-';
}

function showError(msg) { alert(msg); }

// 🧩 Modal close
function closeCheckOutModal() {
    document.getElementById('checkOutModal').classList.remove('show');
}