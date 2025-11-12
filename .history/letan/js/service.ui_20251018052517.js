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
        row.innerHTML = `
            <td>${guest.maDatPhong}</td>
            <td>${guest.tenKhachHang}</td>
            <td>${guest.soDienThoai}</td>
            <td>${guest.danhSachPhong.map(p => p.soPhong).join(', ')}</td>
            <td>${api.formatDate(guest.ngaynhanphong || guest.ngayNhanPhong || guest.checkInDate)}</td>
            <td>${api.formatDate(guest.ngaytraphong || guest.ngayTraPhong || guest.checkOutDate)}</td>
            <td><span class="status-badge status-checkedin">Đang ở</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openServiceModal(${guest.maDatPhong})">
                    <i class="fas fa-concierge-bell"></i> Dịch vụ
                </button>
                <button class="btn btn-sm btn-secondary" onclick="showServiceHistory(${guest.maDatPhong})">
                    <i class="fas fa-history"></i> Lịch sử
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ----------------------------
// Modal hiển thị dịch vụ
// ----------------------------
// Tìm kiếm khách (được gọi từ form trên page)
async function searchGuest() {
    try {
        const code = (document.getElementById('searchBookingCode') ? .value || '').trim().toLowerCase();
        const room = (document.getElementById('searchRoomNumber') ? .value || '').trim().toLowerCase();
        const name = (document.getElementById('searchCustomerName') ? .value || '').trim().toLowerCase();

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
    displayServices();
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