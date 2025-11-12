// ============================
//  service.ui.js
// ============================

document.addEventListener('DOMContentLoaded', async() => {
    console.log(' service.ui.js loaded');

    showLoading('Đang tải dữ liệu...');
    try {
        const [guests, services] = await Promise.all([
            api.loadCurrentGuests(),
            api.loadAvailableServices()
        ]);
        displayGuests(guests);
        // cache globally for search/reset compatibility
        window.currentGuestsData = guests;
        availableServices = services;
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

// Helpers to safely read guest properties across different API shapes
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

// Populate modal details when opening services
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
    // clear inputs and reload full list
    const codeEl = document.getElementById('searchBookingCode');
    if (codeEl) codeEl.value = '';
    const roomEl = document.getElementById('searchRoomNumber');
    if (roomEl) roomEl.value = '';
    const nameEl = document.getElementById('searchCustomerName');
    if (nameEl) nameEl.value = '';
    // reload from API if available, otherwise attempt to display cached currentGuestsData
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

// Alias expected by HTML: closeServicesModal (plural)
function closeServicesModal() {
    const el = document.getElementById('servicesModal');
    if (el) el.style.display = 'none';
}

function openServiceModal(bookingId) {
    currentBookingId = bookingId;
    const modal = document.getElementById('servicesModal');
    // populate modal with customer/room info then display
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
    const s = availableServices.find(x => x.madv === id);
    if (!s) return;
    selectedServices.push({...s, quantity: 1 });
    updateSelectedList();
}

function updateSelectedList() {
    const list = document.getElementById('selectedServicesList');
    const total = selectedServices.reduce((sum, s) => sum + s.giatien * s.quantity, 0);
    list.innerHTML = selectedServices.map(s => `
        <div class="selected-item">
            <span>${s.tendv} (x${s.quantity})</span>
            <span>${api.formatCurrency(s.giatien * s.quantity)}</span>
        </div>
    `).join('');
    document.getElementById('totalServiceAmount').textContent = api.formatCurrency(total);
}

// ----------------------------
// Xác nhận đặt dịch vụ
// ----------------------------
async function confirmServices() {
    if (!currentBookingId || selectedServices.length === 0) {
        alert('Chưa chọn dịch vụ!');
        return;
    }

    for (const s of selectedServices) {
        await api.addServiceToBooking(currentBookingId, s.madv, s.quantity);
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
    modal.style.display = 'flex';
    const body = document.getElementById('serviceHistoryBody');
    body.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';

    const data = await api.getServiceHistory(bookingId);
    body.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${item.tenDichVu}</td>
            <td>${item.soLuong}</td>
            <td>${api.formatCurrency(item.donGia)}</td>
            <td>${api.formatCurrency(item.thanhTien)}</td>
        </tr>
    `).join('');
}

function closeServiceHistoryModal() {
    const modal = document.getElementById('serviceHistoryModal');
    if (modal) modal.style.display = 'none';
}

function printServiceHistory() {
    const table = document.getElementById('serviceHistoryTable');
    if (!table) {
        alert('Không có dữ liệu để in');
        return;
    }
    const w = window.open('', '_blank');
    const title = 'Lịch sử dịch vụ';
    w.document.write(`<!doctype html><html><head><title>${title}</title><meta charset="utf-8"><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body><h3>${title}</h3>` + table.outerHTML + '</body></html>');
    w.document.close();
    w.focus();
    w.print();
    // optionally close after printing
    // w.close();
}

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
window.printServiceHistory = printServiceHistory;