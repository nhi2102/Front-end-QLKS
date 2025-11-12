// ============================
// checkout.ui.js
// ============================

// --- Khởi tạo trang ---
document.addEventListener('DOMContentLoaded', async() => {
    console.log("Trang checkout đã load");
    await loadCheckouts();
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', searchCheckout);
});
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: checkout.html');
    checkUserLogin();
    setupEventListeners();
});
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
// --- Hiển thị danh sách checkout ---
async function loadCheckouts() {
    try {
        const bookings = await fetchPendingCheckouts();
        // keep a local copy so search can filter client-side
        window.currentBookingsData = bookings || [];
        displayBookings(window.currentBookingsData);
    } catch (e) {
        console.error(e);
        showError('Không thể tải danh sách checkout.');
    }
}

function displayBookings(bookings) {
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) {
        console.warn('displayBookings: tbody #currentGuestsList not found');
        return;
    }

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">Không có khách checkout hôm nay</td></tr>`;
        return;
    }

    // update guest count badge if present
    const guestCountEl = document.getElementById('guestCount');
    if (guestCountEl) guestCountEl.textContent = `${bookings.length} khách`;

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.maDatPhong || b.maDatphong || ''}</td>
            <td>${b.tenKhachHang || b.tenkhachhang || b.hoTen || ''}</td>
            <td>${b.soDienThoai || b.sodienthoai || b.soDt || ''}</td>
            <td>${b.soPhong || b.sophong || ''}</td>
            <td>${formatDate(b.ngayNhanPhong || b.Ngaynhanphong || b.ngaynhanphong)}</td>
            <td>${formatDate(b.ngayTraPhong || b.Ngaytraphong || b.ngaytraphong)}</td>
            <td>${b.soDem || ''}</td>
            <td>${b.trangThai || b.trangthai || ''}</td>
            <td><button class="btn btn-primary" onclick="openCheckOutModal(${b.maDatPhong || b.maDatphong || b.madatphong})">Checkout</button></td>
        </tr>
    `).join('');
}

// --- Mở modal checkout ---
window.openCheckOutModal = async function(bookingId) {
    const modal = document.getElementById('checkOutModal');
    modal.classList.add('show');
    document.getElementById('modalBookingCode').textContent = bookingId;

    try {
        // Populate booking/customer/room info from preloaded data where possible
        let booking = null;
        const all = window.currentBookingsData || [];
        booking = all.find(b => String(b.maDatPhong || b.maDatphong || b.madatphong || b.Madatphong) === String(bookingId));
        if (!booking) {
            // fallback: refetch pending checkouts and search
            try {
                const fresh = await fetchPendingCheckouts();
                booking = (fresh || []).find(b => String(b.maDatPhong || b.maDatphong || b.madatphong || b.Madatphong) === String(bookingId));
            } catch (e) {
                console.warn('Could not refetch bookings for modal population', e);
            }
        }

        // Fill customer info
        try {
            const nameEl = document.getElementById('modalCustomerName');
            const phoneEl = document.getElementById('modalPhone');
            const idEl = document.getElementById('modalIdCard');
            if (booking) {
                if (nameEl) nameEl.textContent = booking.tenKhachHang || booking.hoTen || (booking.makhNavigation && (booking.makhNavigation.Hoten || booking.makhNavigation.hoten)) || '-';
                if (phoneEl) phoneEl.textContent = booking.soDienThoai || booking.Sdt || booking.sdt || (booking.makhNavigation && (booking.makhNavigation.Sdt || booking.makhNavigation.sdt)) || '-';
                if (idEl) idEl.textContent = booking.cmnd || booking.CMND || booking.cccd || booking.CCCD || '-';

                // Room number(s)
                const modalRoomEl = document.getElementById('modalRoomNumber');
                let roomText = booking.soPhong || booking.sophong || '';
                if (!roomText && Array.isArray(booking.chiTietPhong) && booking.chiTietPhong.length > 0) {
                    roomText = booking.chiTietPhong.map(ct => ct.sophong || ct.soPhong || ct.phong || ct.maphong || '').filter(x=>x).join(', ');
                }
                if (modalRoomEl) modalRoomEl.textContent = roomText || '-';

                // Dates and nights
                const inEl = document.getElementById('modalCheckInDate');
                const outEl = document.getElementById('modalCheckOutDate');
                const nightsEl = document.getElementById('modalNights');
                if (inEl) inEl.textContent = formatDate(booking.ngayNhanPhong || booking.Ngaynhanphong || booking.ngaynhanphong || booking.ngayDen || booking.ngayden || booking.ngayNhan);
                if (outEl) outEl.textContent = formatDate(booking.ngayTraPhong || booking.Ngaytraphong || booking.ngaytraphong || booking.ngayDi || booking.ngaydi || booking.ngayTra);
                if (nightsEl) nightsEl.textContent = (booking.soDem !== undefined && booking.soDem !== '') ? booking.soDem : (booking.soDem === 0 ? 0 : '-');
            } else {
                if (nameEl) nameEl.textContent = '-';
                if (phoneEl) phoneEl.textContent = '-';
                if (idEl) idEl.textContent = '-';
            }
        } catch (e) {
            console.warn('Error populating modal customer info', e);
        }

        // 1️⃣ Tiền dịch vụ chưa thanh toán (also render service history list)
        try {
            const serviceCharge = await calculateTotalServiceAmount(bookingId);
            const serviceChargeEl = document.getElementById('serviceCharge');
            if (serviceChargeEl) serviceChargeEl.textContent = formatCurrency(serviceCharge);

            // render service history entries
            const history = await fetchServiceHistory(bookingId);
            const historyContainer = document.getElementById('serviceHistoryList');
            if (historyContainer) {
                if (!history || history.length === 0) {
                    historyContainer.innerHTML = `<div class="no-service-history"><span>Không có dịch vụ chưa thanh toán</span></div>`;
                } else {
                    historyContainer.innerHTML = `<table class="service-history-table"><thead><tr><th>Dịch Vụ</th><th>Ngày</th><th>Số Lượng</th><th>Thành Tiền</th></tr></thead><tbody>${history.map(s => `
                        <tr>
                            <td>${s.tenDichVu || s.tendv || s.tendichvu || s.DichVu || ''}</td>
                            <td>${formatDate(s.ngaySuDung || s.Ngay || s.ngay)}</td>
                            <td>${s.soLuong || s.soluong || s.sl || ''}</td>
                            <td>${formatCurrency(s.thanhTien || s.thanhTienDV || s.thanhtien || 0)}</td>
                        </tr>
                    `).join('')}</tbody></table>`;
                }
            }
        } catch (e) {
            console.error('Error loading service history or calculating service charge', e);
        }

        // 2️⃣ Tiền đền bù
        try {
            const damageList = await fetchDamageCompensation(bookingId);
            let totalDamage = 0;
            if (damageList && damageList.length > 0) {
                totalDamage = damageList.reduce((sum, d) => sum + (d.thanhtien || d.thanhTien || 0), 0);
            }
            const damageEl = document.getElementById('damageCharge');
            if (damageEl) damageEl.textContent = formatCurrency(totalDamage);
        } catch (e) {
            console.warn('Error loading damage compensations', e);
            const damageEl = document.getElementById('damageCharge');
            if (damageEl) damageEl.textContent = formatCurrency(0);
        }

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

// Tìm kiếm booking
function searchBooking() {
    const bookingCodeEl = document.getElementById('searchBookingCode');
    const bookingCode = bookingCodeEl && bookingCodeEl.value ? bookingCodeEl.value.trim() : '';
    const phoneEl = document.getElementById('searchPhone');
    const phone = phoneEl && phoneEl.value ? phoneEl.value.trim() : '';
    const nameEl = document.getElementById('searchName');
    const name = nameEl && nameEl.value ? nameEl.value.trim() : '';

    if (!bookingCode && !phone && !name) {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm!');
        return;
    }

    const filtered = currentBookingsData.filter(booking => {
        let matches = true;
        if (bookingCode) {
            const id = (booking.madatphong || booking.maDatPhong || '').toString();
            matches = matches && id.toLowerCase().includes(bookingCode.toLowerCase());
        }
        if (phone) {
            let bookingPhone = booking.soDienThoai || booking.Sdt || booking.sdt || '';
            if (!bookingPhone && booking.makhNavigation) bookingPhone = booking.makhNavigation.Sdt || booking.makhNavigation.sdt || '';
            matches = matches && bookingPhone.toString().includes(phone);
        }
        if (name) {
            let customerName = booking.tenKhachHang || booking.Hoten || booking.hoten || '';
            if (!customerName && booking.makhNavigation) customerName = booking.makhNavigation.Hoten || booking.makhNavigation.hoten || '';
            matches = matches && customerName.toLowerCase().includes(name.toLowerCase());
        }
        return matches;
    });

    fetchPendingCheckouts(filtered);

    if (!filtered || filtered.length === 0) {
        alert('Không tìm thấy booking nào phù hợp trong danh sách check-in!');
    }
}


// --- Hiển thị lỗi ---
function showError(msg) {
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) {
        console.error('showError: tbody #currentGuestsList not found');
        return;
    }
    tbody.innerHTML = `<tr><td colspan="9" class="error">${msg}</td></tr>`;
}
window.searchBooking = searchBooking;

// Backwards-compatible alias: HTML used `searchCheckout()` and `loadCurrentGuests()`
window.searchCheckout = function(event) {
    // If called from onsubmit inline handler, event may be provided; prevent default if present
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    return searchBooking();
};

window.loadCurrentGuests = function() {
    return loadCheckouts();
};