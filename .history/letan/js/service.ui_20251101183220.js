// ============================
//  service.ui.js
// ============================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: services.html');
    checkUserLogin();
    setupEventListeners();
});
//  Kiểm tra đăng nhập
function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../khachhang/login.html";
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
                window.location.href = '../khachhang/login.html';
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
// Compatibility shim: if older scripts expect window.currentBookingId, keep it in sync
if (typeof window.currentBookingId === 'undefined' && typeof window.serviceCurrentBookingId !== 'undefined') {
    window.currentBookingId = window.serviceCurrentBookingId;
}
if (typeof window.selectedServices === 'undefined' && Array.isArray(window.selectedServices) === false) {
    window.selectedServices = window.selectedServices || [];
}

document.addEventListener('DOMContentLoaded', async() => {
    console.log(' service.ui.js loaded');

    showLoading('Đang tải dữ liệu...');
    try {
        const [guests, services] = await Promise.all([
            api.loadCurrentGuests(),
            api.loadAvailableServices()
        ]);
        displayGuests(guests);
        // dữ liệu cache toàn cục để tìm kiếm / đặt lại tương thích
        window.currentGuestsData = guests;
        window.availableServices = services;
        hideLoading();
    } catch (e) {
        console.error('Lỗi khởi tạo:', e);
        showError('Không thể tải dữ liệu ban đầu');
    }
});

// ----------------------------
// Hiển thị danh sách khách
// ----------------------------
function displayGuests(guests) {
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!guests || guests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">Không có khách nào đang ở</td></tr>`;
        return;
    }

    guests.forEach(guest => {
        const row = document.createElement('tr');
        const bookingId = guest.maDatPhong || guest.madatphong || guest.madatPhuong || guest.Madatphong || guest.madat || guest.maDatPhong;
        const bookingIdLiteral = JSON.stringify(bookingId);
        const name = getGuestName(guest);
        const phone = getGuestPhone(guest);
        const rooms = getGuestRooms(guest);
        const checkIn = api.formatDate(guest.ngaynhanphong || guest.ngayNhanPhong || guest.checkInDate);
        const checkOut = api.formatDate(guest.ngaytraphong || guest.ngayTraPhong || guest.checkOutDate);

        row.innerHTML = `
            <td>${bookingId || 'N/A'}</td>
            <td>${name}</td>
            <td>${phone}</td>
            <td>${rooms}</td>
            <td>${checkIn}</td>
            <td>${checkOut}</td>
            <td><span class="status-badge status-checkedin">Đang ở</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openServiceModal(${bookingIdLiteral})">
                    <i class="fas fa-concierge-bell"></i> Dịch vụ
                </button>
                <button class="btn btn-sm btn-secondary" onclick="showServiceHistory(${bookingIdLiteral})">
                    <i class="fas fa-history"></i> Lịch sử
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// thông tin khách helper
function getGuestName(g) {
    return g.tenKhachHang || g.tenkhachhang || g.Hoten || g.hoten || (g.khachHang && (g.khachHang.hoten || g.khachHang.Hoten)) || (g.makhNavigation && (g.makhNavigation.Hoten || g.makhNavigation.hoten)) || 'N/A';
}

function getGuestPhone(g) {
    return g.soDienThoai || g.sodienthoai || g.Sdt || g.sdt || (g.khachHang && (g.khachHang.sdt || g.khachHang.Sdt)) || (g.makhNavigation && (g.makhNavigation.Sdt || g.makhNavigation.sdt)) || 'N/A';
}

function getGuestRooms(g) {
    const list = g.danhSachPhong || g.danhsachphong || g.danhSachPhong || g.DanhSachPhong || g.rooms || [];
    if (!Array.isArray(list)) return String(list || 'N/A');
    return list.map(p => (p.soPhong || p.sophong || p.SoPhong || p.soPhong || p)).join(', ');
}

function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Try to find a date-like value in an object by scanning keys and nested objects
function findDateInObject(obj, depth = 0) {
    if (!obj || depth > 2) return undefined;
    if (typeof obj === 'string' || typeof obj === 'number' || obj instanceof Date) return obj;
    if (typeof obj !== 'object') return undefined;

    const dateKeyPatterns = [/ngay/i, /date/i, /time/i, /created/i, /thoigian/i, /gio/i];
    // First pass: look for keys that match common date names
    for (const k of Object.keys(obj)) {
        if (dateKeyPatterns.some(p => p.test(k))) {
            const v = obj[k];
            if (v) return v;
        }
    }

    // Second pass: try known variants explicitly
    const candidates = ['ngaySuDung', 'ngaysudung', 'ngaydung', 'ngaySD', 'NgaySuDung', 'createdAt', 'created_at', 'date', 'thoigian', 'time', 'ngay', 'ngaytao'];
    for (const c of candidates) {
        if (c in obj && obj[c]) return obj[c];
    }

    // Third pass: recurse into nested objects (shallow)
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v === 'object') {
            const found = findDateInObject(v, depth + 1);
            if (found) return found;
        }
    }

    return undefined;
}

// phổ biến thông tin modal dịch vụ
async function populateServiceModal(bookingId) {
    try {
        let guest = (window.currentGuestsData || []).find(g => {
            const id = g.maDatPhong || g.madatphong || g.Madatphong || g.madat || g.maDatPhong;
            return String(id) === String(bookingId);
        });
        if (!guest) {
            // try reloading guests
            const guests = await api.loadCurrentGuests();
            guest = guests.find(g => {
                const id = g.maDatPhong || g.madatphong || g.Madatphong || g.madat || g.maDatPhong;
                return String(id) === String(bookingId);
            });
            window.currentGuestsData = guests;
        }

        const name = guest ? getGuestName(guest) : 'N/A';
        const phone = guest ? getGuestPhone(guest) : 'N/A';
        const rooms = guest ? getGuestRooms(guest) : 'N/A';

        safeSetText('modalBookingCode', bookingId || 'N/A');
        safeSetText('modalCustomerName', name);
        safeSetText('modalPhone', phone);
        safeSetText('modalRoomNumber', rooms);
    } catch (e) {
        console.warn('populateServiceModal error', e);
    }
}

// ----------------------------
// Modal hiển thị dịch vụ
// ----------------------------
// Tìm kiếm khách (được gọi từ form trên page)
async function searchGuest() {
    try {
        const codeEl = document.getElementById('searchBookingCode');
        const code = ((codeEl && codeEl.value) || '').trim().toLowerCase();
        const roomEl = document.getElementById('searchRoomNumber');
        const room = ((roomEl && roomEl.value) || '').trim().toLowerCase();
        const nameEl = document.getElementById('searchCustomerName');
        const name = ((nameEl && nameEl.value) || '').trim().toLowerCase();

        let data = [];
        if (window.currentGuestsData && Array.isArray(window.currentGuestsData)) {
            data = window.currentGuestsData;
        } else {
            try {
                data = await api.loadCurrentGuests();
            } catch (e) {
                console.warn('Could not load guests for search, falling back to empty', e);
                data = [];
            }
        }

        const filtered = data.filter(g => {
            const matchesCode = code ? (String(g.maDatPhong || g.madatphong || '')).toLowerCase().includes(code) : true;
            const roomList = (g.danhSachPhong || g.danhsachphong || []).map(p => p.soPhong || p.sophong).join(', ');
            const matchesRoom = room ? (String(roomList)).toLowerCase().includes(room) : true;
            const matchesName = name ? (String(g.tenKhachHang || g.tenkhachhang || '')).toLowerCase().includes(name) : true;
            return matchesCode && matchesRoom && matchesName;
        });

        displayGuests(filtered);
    } catch (e) {
        console.error('searchGuest error', e);
        alert('Lỗi khi tìm kiếm');
    }
}

function resetSearch() {
    // xóa input và tải lại danh sách đầy đủ
    const codeEl = document.getElementById('searchBookingCode');
    if (codeEl) codeEl.value = '';
    const roomEl = document.getElementById('searchRoomNumber');
    if (roomEl) roomEl.value = '';
    const nameEl = document.getElementById('searchCustomerName');
    if (nameEl) nameEl.value = '';
    // tải lại danh sách đầy đủ từ cache hoặc API nếu cần
    (async() => {
        try {
            showLoading('Lấy lại dữ liệu...');
            const guests = await api.loadCurrentGuests();
            displayGuests(guests);
        } catch (e) {
            console.warn('resetSearch fallback to cache', e);
            displayGuests(window.currentGuestsData || []);
        } finally {
            hideLoading();
        }
    })();
}

// ----------------------------
// Modal đặt dịch vụ
// ----------------------------
// Note: `currentBookingId` and `selectedServices` are managed in `service.api.js` to avoid duplicate global lets.
function closeServicesModal() {
    const el = document.getElementById('servicesModal');
    if (el) el.style.display = 'none';
}

function openServiceModal(bookingId) {
    window.serviceCurrentBookingId = bookingId;

    // ✅ Xóa danh sách dịch vụ đã chọn của lần trước
    window.selectedServices = [];
    updateSelectedList();

    const modal = document.getElementById('servicesModal');
    displayServices();
    populateServiceModal(bookingId);
    modal.style.display = 'flex';
}


function displayServices() {
    const grid = document.getElementById('servicesGrid');
    grid.innerHTML = availableServices.map(s => `
        <div class="service-card" onclick="selectService(${s.madv})">
            <h4>${s.tendv}</h4>
            <p>${s.mota}</p>
            <div class="price">${api.formatCurrency(s.giatien)}</div>
        </div>
    `).join('');
}

function selectService(id) {
    const s = (window.availableServices || []).find(x => x.madv === id);
    if (!s) return;
    window.selectedServices = window.selectedServices || [];

    // Kiểm tra nếu dịch vụ đã chọn trước đó
    const existing = window.selectedServices.find(x => x.madv === id);
    if (existing) {
        existing.quantity += 1; // tăng số lượng
    } else {
        window.selectedServices.push({...s, quantity: 1 });
    }

    updateSelectedList();
}


function updateSelectedList() {
    const list = document.getElementById('selectedServicesList');
    const sel = window.selectedServices || [];
    const total = sel.reduce((sum, s) => sum + (s.giatien || 0) * (s.quantity || 0), 0);

    list.innerHTML = sel.length > 0 ? sel.map((s, index) => `
        <div class="selected-item">
            <div class="service-info">
                <span class="service-name">${s.tendv}</span>
                <span class="service-price">${api.formatCurrency((s.giatien || 0) * s.quantity)}</span>
            </div>
            <div class="quantity-controls">
                <button class="btn-quantity btn-decrease" onclick="decreaseQuantity(${index})" ${s.quantity <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-minus"></i>
                </button>
                <span class="quantity-display">${s.quantity}</span>
                <button class="btn-quantity btn-increase" onclick="increaseQuantity(${index})">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-remove" onclick="removeService(${index})" title="Xóa dịch vụ">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('') : '<div class="empty">Chưa chọn dịch vụ nào</div>';

    const totalEl = document.getElementById('totalServiceAmount');
    if (totalEl) totalEl.textContent = api.formatCurrency(total);
}

// ----------------------------
// Điều khiển số lượng dịch vụ đã chọn
// ----------------------------
function increaseQuantity(index) {
    if (!window.selectedServices || !window.selectedServices[index]) return;
    window.selectedServices[index].quantity += 1;
    updateSelectedList();
}

function decreaseQuantity(index) {
    if (!window.selectedServices || !window.selectedServices[index]) return;
    if (window.selectedServices[index].quantity > 1) {
        window.selectedServices[index].quantity -= 1;
        updateSelectedList();
    }
}

function removeService(index) {
    if (!window.selectedServices || !window.selectedServices[index]) return;
    if (confirm('Bạn có chắc muốn xóa dịch vụ này?')) {
        window.selectedServices.splice(index, 1);
        updateSelectedList();
    }
}

// ----------------------------
// Xác nhận đặt dịch vụ
// ----------------------------
async function confirmServices() {
    const bookingId = window.serviceCurrentBookingId;
    const sel = window.selectedServices || [];
    if (!bookingId || sel.length === 0) {
        alert('Chưa chọn dịch vụ!');
        return;
    }

    for (const s of sel) {
        await api.addServiceToBooking(bookingId, s.madv, s.quantity);
    }

    alert('✓ Đặt dịch vụ thành công!');
    closeServiceModal();
    const guests = await api.loadCurrentGuests();
    displayGuests(guests);
}

// ----------------------------
// Lịch sử dịch vụ
// ----------------------------
async function showServiceHistory(bookingId) {
    const modal = document.getElementById('serviceHistoryModal');
    if (modal) modal.style.display = 'flex';
    const body = document.getElementById('serviceHistoryBody');
    if (body) body.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';

    // thông tin header
    try {
        let guest = (window.currentGuestsData || []).find(g => {
            const id = g.maDatPhong || g.madatphong || g.Madatphong || g.madat || g.maDatPhong;
            return String(id) === String(bookingId);
        });
        if (!guest) {
            const guests = await api.loadCurrentGuests();
            guest = guests.find(g => {
                const id = g.maDatPhong || g.madatphong || g.Madatphong || g.madat || g.maDatPhong;
                return String(id) === String(bookingId);
            });
            window.currentGuestsData = guests;
        }

        safeSetText('historyBookingCode', bookingId || 'N/A');
        safeSetText('historyCustomerName', guest ? getGuestName(guest) : 'N/A');
        safeSetText('historyRoomNumber', guest ? getGuestRooms(guest) : 'N/A');
    } catch (e) {
        console.warn('populate history header error', e);
    }

    const data = await api.getServiceHistory(bookingId);

    // Hiển thị dịch vụ đã thanh toán
    renderTable('paidServiceTable', data.daThanhToan, 'Đã thanh toán');

    // Hiển thị dịch vụ chưa thanh toán
    renderTable('unpaidServiceTable', data.chuaThanhToan, 'Chưa thanh toán');

    // Cập nhật tổng
    document.getElementById('totalPaid').textContent = api.formatCurrency(data.tongDaThanhToan);
    document.getElementById('totalUnpaid').textContent = api.formatCurrency(data.tongChuaThanhToan);

    function renderTable(tableId, list, label) {
        const body = document.getElementById(tableId);
        if (!body) return;

        if (!list || list.length === 0) {
            body.innerHTML = `<tr><td colspan="5">Không có dịch vụ ${label}</td></tr>`;
            return;
        }

        body.innerHTML = list.map((x, i) => `
        <tr>
        <td>${i + 1}</td>
            <td>${x.tenDichVu}</td>
            <td>${x.soLuong}</td>
            <td>${api.formatCurrency(x.donGia)}</td>
            <td>${api.formatCurrency(x.thanhTien)}</td>
            <td>${x.trangThai}</td>
        </tr>
    `).join('');
    }
}

function closeServiceHistoryModal() {
    const modal = document.getElementById('serviceHistoryModal');
    if (modal) modal.style.display = 'none';
}

// printServiceHistory removed per request

// ----------------------------
// Loading / Error
// ----------------------------
function showLoading(msg) {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');
    if (!overlay || !messageEl) {
        console.warn('Loading elements not found:', { overlay: !!overlay, message: !!messageEl });
        return;
    }
    overlay.style.display = 'flex';
    messageEl.textContent = msg || '';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
}

function showError(msg) {
    alert(msg);
}

// Export UI handlers
window.openServiceModal = openServiceModal;
window.confirmServices = confirmServices;
window.showServiceHistory = showServiceHistory;
window.closeServiceModal = () => document.getElementById('servicesModal').style.display = 'none';
window.closeServiceHistoryModal = closeServiceHistoryModal;
// printServiceHistory intentionally removed