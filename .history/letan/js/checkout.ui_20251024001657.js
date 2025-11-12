// ===============================
// checkout.ui.js
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    loadCurrentGuests();
});

let currentBooking = null;
let originalRoomCharge = 0;

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
            <td>${b.soPhong}</td>
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
    document.getElementById('modalCustomerName').textContent = booking.tenKhachHang;
    document.getElementById('modalRoomNumber').textContent = booking.soPhong;
    document.getElementById('modalCheckInDate').textContent = formatDate(booking.ngayNhanPhong);
    document.getElementById('modalCheckOutDate').textContent = formatDate(booking.ngayTraPhong);
    document.getElementById('checkOutModal').classList.add('show');

    // Tiền phòng
    originalRoomCharge = booking.tongTienDatPhong || booking.tongtien || 0;
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