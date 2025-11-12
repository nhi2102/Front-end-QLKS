import {
    fetchCurrentGuests,
    fetchAvailableServices,
    bookServiceForGuest,
    fetchServiceHistory
} from './services.api.js';

// ------- Biến toàn cục -------
let currentGuestsData = [];
let availableServices = [];
let selectedServices = [];
let currentBookingId = null;

// ------- Khởi tạo khi DOM load -------
document.addEventListener('DOMContentLoaded', () => initPage());

async function initPage() {
    checkUserLogin();
    setupEventListeners();
    await Promise.allSettled([loadCurrentGuests(), loadAvailableServices()]);
}

// Kiểm tra đăng nhập
function checkUserLogin() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Vui lòng đăng nhập để tiếp tục!');
        window.location.href = '../login.html';
        return;
    }
    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || user.username;
}

// Thiết lập sự kiện cơ bản
function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => forceRefresh());
}

// Load guests
async function loadCurrentGuests() {
    try {
        showLoadingState('Đang tải danh sách khách...');
        const data = await fetchCurrentGuests();
        currentGuestsData = data;
        displayCurrentGuests(data);
    } catch (error) {
        console.error('Lỗi tải khách:', error);
        showErrorState('Lỗi tải danh sách khách: ' + (error.message || error));
    } finally {
        hideLoadingState();
    }
}

// Load services
async function loadAvailableServices() {
    try {
        const services = await fetchAvailableServices();
        availableServices = services.filter(s => s.trangthai === 'Hiệu lực' || s.trangthai === 'active' || !s.trangthai);
        displayAvailableServices();
    } catch (error) {
        console.error('Lỗi tải dịch vụ:', error);
        availableServices = [];
        displayAvailableServices();
    }
}

// Hiển thị danh sách khách
function displayCurrentGuests(guests) {
    const tbody = document.getElementById('currentGuestsList');
    const guestCountEl = document.getElementById('guestCount');
    if (!tbody) return;
    if (guestCountEl) guestCountEl.textContent = `${guests.length} khách`;
    if (!guests || guests.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="no-data">Không có khách nào đang ở</td></tr>`; return; }

    const fragment = document.createDocumentFragment();
    guests.forEach(guest => {
        const bookingCode = guest.madatphong || guest.maDatPhong || '';
        const customerName = (guest.khachHang && guest.khachHang.hoten) || guest.tenKhachHang || 'N/A';
        let roomNumber = 'N/A';
        if (guest.danhSachPhong && guest.danhSachPhong.length > 0) roomNumber = guest.danhSachPhong.map(r => r.sophong || r.soPhong || r.roomNumber || '').join(', ');
        else roomNumber = guest.phong || guest.sophong || guest.soPhong || 'N/A';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${bookingCode}</strong></td>
            <td>${customerName}</td>
            <td>${guest.soDienThoai || (guest.khachHang && guest.khachHang.sdt) || 'N/A'}</td>
            <td class="room-number">${roomNumber}</td>
            <td>${formatDate(guest.ngaynhanphong || guest.ngayNhanPhong)}</td>
            <td>${formatDate(guest.ngaytraphong || guest.ngayTraPhong)}</td>
            <td><span class="status-badge status-checkedin">Đang ở</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-primary" onclick="openServicesModal('${bookingCode}')">
                        <i class="fas fa-concierge-bell"></i> Dịch vụ
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="showServiceHistory('${bookingCode}')" style="margin-left:5px;">
                        <i class="fas fa-history"></i> Lịch sử
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// Hiển thị dịch vụ
function displayAvailableServices() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    if (!availableServices || availableServices.length === 0) { grid.innerHTML = '<p class="no-data">Không có dịch vụ nào</p>'; return; }
    grid.innerHTML = availableServices.map(s => `
        <div class="service-card" onclick="addService(${s.madv || s.id})">
            <h4>${s.tendv || s.tenDichVu || s.name}</h4>
            <div class="price">${formatCurrency(s.giatien || s.giaDichVu || s.price || 0)}</div>
            <div class="description">${s.mota || s.moTa || s.description || ''}</div>
        </div>
    `).join('');
}

// Thao tác chọn dịch vụ
function addService(serviceId) {
    const service = availableServices.find(s => (s.madv || s.id) === serviceId);
    if (!service) return;
    const idField = service.madv || service.id;
    const existing = selectedServices.find(s => (s.madv || s.id) === idField);
    if (existing) existing.quantity += 1; else selectedServices.push({ ...service, quantity: 1 });
    updateSelectedServicesList();
    updateTotalAmount();
}

function updateSelectedServicesList() {
    const list = document.getElementById('selectedServicesList'); if (!list) return;
    if (selectedServices.length === 0) { list.innerHTML = '<p class="no-data">Chưa có dịch vụ nào được chọn</p>'; return; }
    list.innerHTML = selectedServices.map((service, idx) => `
        <div class="selected-item">
            <div class="selected-item-info">
                <div class="selected-item-name">${service.tendv || service.tenDichVu || service.name}</div>
                <div class="selected-item-qty">Số lượng: ${service.quantity}</div>
            </div>
            <div class="selected-item-price">${formatCurrency((service.giatien || service.giaDichVu || service.price || 0) * service.quantity)}</div>
            <div class="selected-item-actions">
                <div class="qty-control">
                    <button class="qty-btn" onclick="changeQuantity(${idx}, -1)">-</button>
                    <input type="number" class="qty-input" value="${service.quantity}" onchange="setQuantity(${idx}, this.value)" min="1">
                    <button class="qty-btn" onclick="changeQuantity(${idx}, 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeService(${idx})"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `).join('');
}

function changeQuantity(index, delta) { if (!selectedServices[index]) return; selectedServices[index].quantity = Math.max(1, selectedServices[index].quantity + delta); updateSelectedServicesList(); updateTotalAmount(); }
function setQuantity(index, value) { const qty = Math.max(1, parseInt(value) || 1); if (!selectedServices[index]) return; selectedServices[index].quantity = qty; updateSelectedServicesList(); updateTotalAmount(); }
function removeService(index) { selectedServices.splice(index, 1); updateSelectedServicesList(); updateTotalAmount(); }
function updateTotalAmount() { const total = selectedServices.reduce((sum, s) => sum + ((s.giatien || s.giaDichVu || s.price || 0) * s.quantity), 0); const el = document.getElementById('totalServiceAmount'); if (el) el.textContent = formatCurrency(total); }

// Xác nhận đặt dịch vụ
async function confirmServices() {
    if (!currentBookingId) { alert('Lỗi: Không tìm thấy thông tin booking!'); return; }
    if (selectedServices.length === 0) { alert('Vui lòng chọn ít nhất một dịch vụ!'); return; }
    try {
        for (const s of selectedServices) { const id = s.madv || s.id; await bookServiceForGuest(currentBookingId, id, s.quantity); }
        alert('✓ Đặt dịch vụ thành công!'); closeServicesModal(); await loadCurrentGuests();
    } catch (error) { console.error('Lỗi đặt dịch vụ:', error); alert('❌ Lỗi đặt dịch vụ: ' + (error.message || error)); }
}

// Lịch sử dịch vụ
async function showServiceHistory(bookingId) {
    try {
        const history = await fetchServiceHistory(bookingId);
        const modal = document.getElementById('serviceHistoryModal');
        const body = document.getElementById('serviceHistoryBody');
        if (!modal || !body) return;
        document.getElementById('historyBookingCode').textContent = bookingId;
        if (!history || history.length === 0) body.innerHTML = '<tr><td colspan="6" class="no-data">Không có lịch sử dịch vụ</td></tr>';
        else body.innerHTML = history.map((h, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${h.tendv || h.tenDichVu || h.name}</td>
                    <td>${h.soluong || h.soLuong || 1}</td>
                    <td>${formatCurrency(h.dongia || h.donGia || h.giatien || 0)}</td>
                    <td>${formatCurrency((h.dongia || h.donGia || h.giatien || 0) * (h.soluong || h.soLuong || 1))}</td>
                    <td>${formatDate(h.ngayGhiNhan || h.ngaySuDung || h.ngay || h.createdAt)}</td>
                </tr>
            `).join('');
        modal.style.display = 'flex';
    } catch (error) { console.error('Lỗi tải lịch sử dịch vụ:', error); alert('Lỗi tải lịch sử dịch vụ: ' + (error.message || error)); }
}

// Helper UI & utils
function closeServicesModal() { const modal = document.getElementById('servicesModal'); if (modal) modal.style.display = 'none'; currentBookingId = null; selectedServices = []; updateSelectedServicesList(); updateTotalAmount(); }
function showLoadingState(msg = 'Đang tải...') { const tbody = document.getElementById('currentGuestsList'); if (!tbody) return; tbody.innerHTML = `<tr><td colspan="8" class="loading-state">${msg}</td></tr>`; }
function hideLoadingState() {}
function showErrorState(msg) { const tbody = document.getElementById('currentGuestsList'); if (!tbody) return; tbody.innerHTML = `<tr><td colspan="8" class="no-data error">${msg}</td></tr>`; }
function formatDate(dateString) { if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleDateString('vi-VN'); } catch (e) { return 'N/A'; } }
function formatCurrency(amount) { if (!amount || isNaN(amount)) return '0 VNĐ'; return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); }
function forceRefresh() { loadCurrentGuests(); loadAvailableServices(); }

// Expose for legacy HTML
window.openServicesModal = function(bookingId) {
    const guest = currentGuestsData.find(g => (g.madatphong || g.maDatPhong || '').toString() === bookingId.toString());
    if (!guest) { alert('Không tìm thấy booking.'); return; }
    currentBookingId = bookingId;
    const modal = document.getElementById('servicesModal'); if (modal) modal.style.display = 'flex';
    const bookingEl = document.getElementById('modalBookingCode'); if (bookingEl) bookingEl.textContent = bookingId;
    const nameEl = document.getElementById('modalCustomerName'); if (nameEl) nameEl.textContent = (guest.khachHang && guest.khachHang.hoten) || guest.tenKhachHang || '';
    const roomEl = document.getElementById('modalRoomNumber'); if (roomEl) roomEl.textContent = (guest.danhSachPhong && guest.danhSachPhong[0] && (guest.danhSachPhong[0].sophong || guest.danhSachPhong[0].soPhong)) || guest.phong || guest.sophong || 'N/A';
    displayAvailableServices();
};

window.closeServicesModal = closeServicesModal;
window.confirmServices = confirmServices;
window.addService = addService;
window.changeQuantity = changeQuantity;
window.setQuantity = setQuantity;
window.removeService = removeService;
window.showServiceHistory = showServiceHistory;
window.loadCurrentGuests = loadCurrentGuests;
window.loadAvailableServices = loadAvailableServices;
