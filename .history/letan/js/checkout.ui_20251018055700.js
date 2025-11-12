// ============================
//  checkout.ui.js
// ============================

import {
    fetchPendingCheckouts,
    fetchServiceHistory,
    fetchHotelEquipment,
    fetchDamageCompensation,
    recordEquipmentDamage,
    getRemainingAmount,
    executeCheckout,
    calculateTotalServiceAmount,
    formatCurrency,
    formatDate,
    computeTotal
} from './checkout.api.js';

// --- Khởi tạo trang ---
document.addEventListener('DOMContentLoaded', async() => {
    await loadCheckouts();
    document.getElementById('searchBtn').addEventListener('click', searchCheckout);
});

// --- Hiển thị danh sách checkout ---
async function loadCheckouts() {
    try {
        const bookings = await fetchPendingCheckouts();
        displayBookings(bookings);
    } catch (e) {
        console.error(e);
        showError('Không thể tải danh sách checkout.');
    }
}

function displayBookings(bookings) {
    const tbody = document.getElementById('checkoutList');
    if (!bookings.length) {
        tbody.innerHTML = `<tr><td colspan="8">Không có khách checkout hôm nay</td></tr>`;
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
            <td><button class="btn btn-primary" onclick="openCheckOutModal(${b.maDatPhong})">Checkout</button></td>
        </tr>
    `).join('');
}

// --- Modal checkout ---
window.openCheckOutModal = async function(bookingId) {
    const modal = document.getElementById('checkOutModal');
    modal.classList.add('show');
    document.getElementById('modalBookingCode').textContent = bookingId;

    const serviceCharge = await calculateTotalServiceAmount(bookingId);
    document.getElementById('serviceCharge').textContent = formatCurrency(serviceCharge);

    updateTotal();
};

// --- Tính tổng tiền ---
function updateTotal() {
    const serviceCharge = parseFloat(document.getElementById('serviceCharge').textContent.replace(/[^\d]/g, '')) || 0;
    const extra = parseFloat(document.getElementById('extraCharge').value || 0);
    const discount = parseFloat(document.getElementById('discount').value || 0);
    const total = computeTotal(serviceCharge, extra, discount);

    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// --- Xác nhận checkout ---
window.confirmCheckOut = async function() {
    const bookingId = document.getElementById('modalBookingCode').textContent;
    const remaining = await getRemainingAmount(bookingId);
    await executeCheckout(bookingId);
    alert(`Checkout thành công! Còn thiếu: ${formatCurrency(remaining.sotienthieu)}`);
    closeCheckOutModal();
};

// --- Đóng modal ---
window.closeCheckOutModal = function() {
    document.getElementById('checkOutModal').classList.remove('show');
};

// --- Tìm kiếm ---
async function searchCheckout() {
    const term = document.getElementById('searchName').value.trim();
    const all = await fetchPendingCheckouts();
    const filtered = all.filter(b => b.tenKhachHang.toLowerCase().includes(term.toLowerCase()));
    displayBookings(filtered);
}

// --- Hiển thị lỗi ---
function showError(msg) {
    document.getElementById('checkoutList').innerHTML = `<tr><td colspan="8" class="error">${msg}</td></tr>`;
}