// ui.js — Quản lý giao diện check-in
let currentBookingsData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: checkin.html');
    checkUserLogin();
    loadPendingCheckIns();
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

// Tải danh sách booking chờ check-in
async function loadPendingCheckIns() {
    try {
        const data = await api.getPendingCheckIns();
        currentBookingsData = data;
        // Render immediately with whatever we have
        displayPendingCheckIns(data);

        // Begin background enrichment for missing customer/room details
        // Use Promise.allSettled to avoid failing the whole batch if some requests fail
        (async function backgroundEnrich() {
            try {
                const enrichPromises = currentBookingsData.map(b => enrichBookingData(b));
                const results = await Promise.allSettled(enrichPromises);
                const anyFulfilled = results.some(r => r.status === 'fulfilled');
                if (anyFulfilled) {
                    // Re-render to show enriched info
                    displayPendingCheckIns(currentBookingsData);
                    console.log('✅ Pending check-ins enriched and re-rendered');
                }
            } catch (e) {
                console.warn('Background enrichment failed', e);
            }
        })();
    } catch (error) {
        console.error('Lỗi tải danh sách:', error);
        const tbody = document.getElementById('pendingCheckInsList');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
        }
    }
}

//  Hiển thị danh sách booking
function displayPendingCheckIns(bookings) {
    const tbody = document.getElementById('pendingCheckInsList');
    if (!tbody) return;

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">Không có booking nào chờ check-in</td></tr>`;
        return;
    }

    // Helper: normalize status text to badge class
    function statusToClass(statusText) {
        if (!statusText) return 'status-pending';
        const s = statusText.toString().toLowerCase();
        if (s.includes('check-in') || s.includes('chờ') || s.includes('pending')) return 'status-pending';
        if (s.includes('confirmed') || s.includes('xác nhận') || s.includes('đã xác nhận')) return 'status-confirmed';
        if (s.includes('đang') || s.includes('ở') || s.includes('checkedin') || s.includes('checked-in')) return 'status-checkedin';
        if (s.includes('completed') || s.includes('hoàn thành') || s.includes('xong')) return 'status-completed';
        return 'status-pending';
    }

    tbody.innerHTML = bookings.map(booking => {
        const bookingCode = booking.maDatPhong || booking.madatphong;
        const customerName = booking.tenKhachHang || booking.Hoten || 'N/A';
        const phone = booking.soDienThoai || booking.Sdt || 'N/A';
        const room = booking.phong || 'N/A';
        const checkInDate = formatDate(booking.ngaynhanphong);
        const checkOutDate = formatDate(booking.ngaytraphong);
        const status = booking.trangthai || booking.trangThai || 'Chờ check-in';
        const statusClass = statusToClass(status);

        return `
            <tr>
                <td>${bookingCode}</td>
                <td>${customerName}</td>
                <td>${phone}</td>
                <td>${room}</td>
                <td>${checkInDate}</td>
                <td>${checkOutDate}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="openCheckInModal('${bookingCode}')">Check-in</button></td>
            </tr>`;
    }).join('');
}

// Mở modal check-in
async function openCheckInModal(bookingId) {
    const booking = currentBookingsData.find(b =>
        (b.maDatPhong && b.maDatPhong.toString() === bookingId.toString()) ||
        (b.madatphong && b.madatphong.toString() === bookingId.toString())
    );

    if (!booking) {
        alert('Không tìm thấy thông tin booking!');
        return;
    }

    // Try to enrich the booking with customer and room details if missing
    await enrichBookingData(booking);

    populateCheckInModal(booking);
    const modal = document.getElementById('checkInModal');
    if (modal) modal.style.display = 'flex';
}

// Enrich booking object using API helpers when some fields are missing
async function enrichBookingData(booking) {
    try {
        // Fetch customer info if missing
        if ((!booking.tenKhachHang || !booking.soDienThoai || !booking.cccd) && booking.makh) {
            try {
                const customer = await api.getCustomerById(booking.makh);
                if (customer) {
                    booking.tenKhachHang = booking.tenKhachHang || customer.Hoten || customer.hoten || customer.TenKhachHang;
                    booking.soDienThoai = booking.soDienThoai || customer.Sdt || customer.sdt;
                    booking.cccd = booking.cccd || customer.Cccd || customer.cccd;
                }
            } catch (e) {
                console.warn('Không lấy được thông tin khách:', e);
            }
        }

        // Fetch room details if missing
        if ((!booking.chitietdatphongs || booking.chitietdatphongs.length === 0) && (booking.madatphong || booking.maDatPhong)) {
            try {
                const details = await api.getRoomDetailsByBookingId(booking.madatphong || booking.maDatPhong);
                if (details && details.length) {
                    booking.chitietdatphongs = details;
                    // For each detail try to fetch room navigation if absent
                    for (let d of booking.chitietdatphongs) {
                        if (d.maphong && !d.maphongNavigation) {
                            try {
                                const room = await api.getRoomById(d.maphong);
                                if (room) d.maphongNavigation = room;
                            } catch (e) {
                                console.warn('Không lấy được thông tin phòng:', e);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Không lấy được chi tiết phòng:', e);
            }
        }

    } catch (err) {
        console.warn('enrichBookingData error', err);
    }
}

//  Điền dữ liệu vào modal
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

// Thực hiện check-in
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
        // alert('Check-in thành công!');
        closeCheckInModal();
        loadPendingCheckIns();
    } catch (error) {
        // alert('Lỗi check-in: ' + error.message);
    }
}

// Đóng modal
function closeCheckInModal() {
    document.getElementById('checkInModal').style.display = 'none';
}

// Format ngày
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Set giờ mặc định
function setDefaultCheckInTime() {
    const now = new Date();
    document.getElementById('checkInTime').value = now.toTimeString().slice(0, 5);
}

// Đăng xuất
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('currentUser');
        window.location.href = '../login.html';
    }
}

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

    displayPendingCheckIns(filtered);

    if (!filtered || filtered.length === 0) {
        alert('Không tìm thấy booking nào phù hợp trong danh sách check-in!');
    }
}

// Đặt lại tìm kiếm
function resetSearch() {
    const searchInputs = ['searchBookingCode', 'searchPhone', 'searchName'];
    searchInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    displayPendingCheckIns(currentBookingsData);
}

// Export global
window.openCheckInModal = openCheckInModal;
window.confirmCheckIn = confirmCheckIn;
window.closeCheckInModal = closeCheckInModal;
window.searchBooking = searchBooking;
window.resetSearch = resetSearch;
window.logout = logout;