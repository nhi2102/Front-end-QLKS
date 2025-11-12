// ============================
// 🎨 service.ui.js
// ============================

document.addEventListener('DOMContentLoaded', async() => {
    console.log('⚡ service.ui.js loaded');

    showLoading('Đang tải dữ liệu...');
    try {
        const [guests, services] = await Promise.all([
            api.loadCurrentGuests(),
            api.loadAvailableServices()
        ]);
        displayGuests(guests);
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
            <td>${api.formatDate(guest.ngayNhanPhong)}</td>
            <td>${api.formatDate(guest.ngayTraPhong)}</td>
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
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('loadingMessage').textContent = msg;
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showError(msg) {
    alert(msg);
}

// Export UI handlers
window.openServiceModal = openServiceModal;
window.confirmServices = confirmServices;
window.showServiceHistory = showServiceHistory;
window.closeServiceModal = () => document.getElementById('servicesModal').style.display = 'none';