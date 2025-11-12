// ============================
// checkout.ui.js
// ============================

// --- Khởi tạo trang ---
document.addEventListener('DOMContentLoaded', async() => {
    console.log("🔹 Trang checkout đã load");
    await loadCheckouts();
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', searchCheckout);
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
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) {
        console.warn('displayBookings: target tbody #currentGuestsList not found');
        return;
    }

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">Không có khách checkout hôm nay</td></tr>`;
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
            <td>${b.soDem || ''}</td>
            <td>${b.trangThai || ''}</td>
            <td><button class="btn btn-primary" onclick="openCheckOutModal(${b.maDatPhong})">Checkout</button></td>
        </tr>
    `).join('');
}

// --- Mở modal checkout ---
window.openCheckOutModal = async function(bookingId) {
    const modal = document.getElementById('checkOutModal');
    modal.classList.add('show');
    document.getElementById('modalBookingCode').textContent = bookingId;

    try {
            // Populate modal fields from pending-checkouts if available
            let booking = null;
            try {
                const all = await fetchPendingCheckouts();
                booking = (all || []).find(b => String(b.maDatPhong || b.maDatphong || b.madatphong) === String(bookingId));
            } catch (e) {
                // ignore - we'll try room/customer endpoints below
                booking = null;
            }

            // Customer name/phone/id
            if (booking) {
                document.getElementById('modalCustomerName').textContent = booking.tenKhachHang || booking.tenkhachhang || booking.hoten || '-';
                document.getElementById('modalPhone').textContent = booking.soDienThoai || booking.soDt || booking.sodienthoai || '-';
                document.getElementById('modalIdCard').textContent = booking.cmnd || booking.cccd || booking.cmt || booking.cMND || '-';
            } else {
                // try to fetch customer info via booking details if needed (skipped for performance)
            }

            // Room details and nights: prefer booking.chiTietPhong / booking.soPhong / booking.soDem
            let soPhong = '';
            let soDem = '';
            if (booking) {
                soPhong = booking.soPhong || booking.soPhong || booking.soPhong || '';
                soDem = (typeof booking.soDem !== 'undefined') ? booking.soDem : '';
            }

            // if not present, fetch room details directly
            if ((!soPhong || soPhong === '') || (!soDem && soDem !== 0)) {
                try {
                    const details = await getRoomDetailsByBookingId(bookingId);
                    if (details) {
                        const arr = Array.isArray(details) ? details : [details];
                        const nums = arr.map(d => d.soPhong || d.sophong || d.phong || d.tenPhong || d.tenphong || d.phongso).filter(Boolean);
                        soPhong = soPhong || nums.join(', ');

                        // compute nights from booking or details
                        if (!soDem) {
                            const bcheckin = booking?.ngayNhanPhong || booking?.Ngaynhanphong || booking?.ngaynhanphong || arr[0].ngayNhanPhong || arr[0].Ngaynhanphong || arr[0].ngaynhanphong;
                            const bcheckout = booking?.ngayTraPhong || booking?.Ngaytraphong || booking?.ngaytraphong || arr[0].ngayTraPhong || arr[0].Ngaytraphong || arr[0].ngaytraphong;
                            if (bcheckin && bcheckout) {
                                const ci = new Date(bcheckin);
                                const co = new Date(bcheckout);
                                if (!isNaN(ci) && !isNaN(co)) {
                                    const msPerDay = 24 * 60 * 60 * 1000;
                                    soDem = Math.max(0, Math.ceil((co - ci) / msPerDay));
                                }
                            }
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            document.getElementById('modalRoomNumber').textContent = soPhong || '-';
            document.getElementById('modalCheckInDate').textContent = booking ? formatDate(booking.ngayNhanPhong || booking.Ngaynhanphong || booking.ngaynhanphong) : '-';
            document.getElementById('modalCheckOutDate').textContent = booking ? formatDate(booking.ngayTraPhong || booking.Ngaytraphong || booking.ngaytraphong) : '-';
            document.getElementById('modalNights').textContent = (soDem || soDem === 0) ? soDem : '-';

        // 1️⃣ Tiền dịch vụ chưa thanh toán
        const serviceCharge = await calculateTotalServiceAmount(bookingId);
        document.getElementById('serviceCharge').textContent = formatCurrency(serviceCharge);

        // 2️⃣ Tiền đền bù
        const damageList = await fetchDamageCompensation(bookingId);
        let totalDamage = 0;
        if (damageList.length > 0) {
            totalDamage = damageList.reduce((sum, d) => sum + (d.thanhtien || 0), 0);
        }
        document.getElementById('damageCharge').textContent = formatCurrency(totalDamage);

        // Tính tổng
        updateTotal();
    } catch (err) {
        console.error(err);
        alert('Lỗi khi tải dữ liệu checkout: ' + err.message);
    }
};

// --- Cập nhật tổng tiền ---
function updateTotal() {
    const serviceCharge = parseFloat(document.getElementById('serviceCharge').textContent.replace(/[^\d]/g, '')) || 0;
    const damageCharge = parseFloat(document.getElementById('damageCharge').textContent.replace(/[^\d]/g, '')) || 0;
    const extra = parseFloat(document.getElementById('extraCharge').value || 0);
    const discount = parseFloat(document.getElementById('discount').value || 0);
    const total = computeTotal(serviceCharge + damageCharge, extra, discount);

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
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) {
        console.error('showError: target tbody #currentGuestsList not found');
        return;
    }
    tbody.innerHTML = `<tr><td colspan="9" class="error">${msg}</td></tr>`;
}