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
        console.warn('displayBookings: tbody #currentGuestsList not found');
        return;
    }

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">Không có khách checkout hôm nay</td></tr>`;
        return;
    }

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