// ============================================
// ROOMS MANAGEMENT - API & UI Logic
// ============================================

const API_BASE_URL = 'https://localhost:7076/api';

let allRooms = [];
let filteredRooms = [];
let currentView = 'grid';
let currentRoom = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    loadRooms();
    setupEventListeners();
});

function checkUserLogin() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.hoten) {
        const el = document.getElementById('userName');
        if (el) el.textContent = user.hoten;
    }
}

function setupEventListeners() {
    // View toggle buttons
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            setView(view);
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Filter buttons
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    // Filter changes
    const filterType = document.getElementById('filterRoomType');
    const filterStatus = document.getElementById('filterStatus');
    const filterFloor = document.getElementById('filterFloor');
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (filterFloor) filterFloor.addEventListener('change', applyFilters);

    // Update status button
    const updateBtn = document.getElementById('updateRoomStatusBtn');
    if (updateBtn) updateBtn.addEventListener('click', updateRoomStatus);

    // Modal tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ============================================
// DATA LOADING
// ============================================

async function loadRooms() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/Phong`);
        if (!response.ok) throw new Error('Không thể tải dữ liệu phòng');
        
        allRooms = await response.json();
        filteredRooms = [...allRooms];

        updateStats();
        renderRooms();
    } catch (error) {
        console.error('Error loading rooms:', error);
        showError('Không thể tải dữ liệu phòng. Vui lòng thử lại.');
    } finally {
        showLoading(false);
    }
}

// ============================================
// STATISTICS
// ============================================

function updateStats() {
    const available = allRooms.filter(r => r.trangthai === 'Trống').length;
    const occupied = allRooms.filter(r => r.trangthai === 'Đang sử dụng').length;
    const cleaning = allRooms.filter(r => r.trangthai === 'Đang dọn dẹp').length;
    const maintenance = allRooms.filter(r => r.trangthai === 'Bảo trì').length;

    const availEl = document.getElementById('availableRooms');
    const occEl = document.getElementById('occupiedRooms');
    const cleanEl = document.getElementById('cleaningRooms');
    const maintEl = document.getElementById('maintenanceRooms');

    if (availEl) availEl.textContent = available;
    if (occEl) occEl.textContent = occupied;
    if (cleanEl) cleanEl.textContent = cleaning;
    if (maintEl) maintEl.textContent = maintenance;
}

// ============================================
// FILTERS
// ============================================

function applyFilters() {
    const type = document.getElementById('filterRoomType')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const floor = document.getElementById('filterFloor')?.value || '';

    filteredRooms = allRooms.filter(room => {
        if (type && room.loaiPhong?.tenloaiphong !== type) return false;
        if (status && room.trangthai !== status) return false;
        if (floor && String(room.tang) !== String(floor)) return false;
        return true;
    });

    renderRooms();
}

function resetFilters() {
    const filterType = document.getElementById('filterRoomType');
    const filterStatus = document.getElementById('filterStatus');
    const filterFloor = document.getElementById('filterFloor');
    
    if (filterType) filterType.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterFloor) filterFloor.value = '';

    filteredRooms = [...allRooms];
    renderRooms();
}

// ============================================
// VIEW RENDERING
// ============================================

function setView(view) {
    currentView = view;
    const gridView = document.getElementById('roomsGrid');
    const listView = document.getElementById('roomsList');

    if (view === 'grid') {
        if (gridView) gridView.style.display = 'grid';
        if (listView) listView.style.display = 'none';
    } else {
        if (gridView) gridView.style.display = 'none';
        if (listView) listView.style.display = 'block';
    }
}

function renderRooms() {
    const roomCount = document.getElementById('roomCount');
    if (roomCount) roomCount.textContent = filteredRooms.length;

    if (currentView === 'grid') {
        renderGridView();
    } else {
        renderListView();
    }
}

function renderGridView() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;

    if (filteredRooms.length === 0) {
        grid.innerHTML = `
            <div class="no-data">
                <i class="fas fa-door-open"></i>
                <p>Không có phòng nào</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredRooms.map(room => {
        const statusClass = getStatusClass(room.trangthai);
        return `
            <div class="room-card ${statusClass}" onclick="viewRoomDetail(${room.maphong})">
                <div class="room-card-header">
                    <span class="room-number">${room.sophong}</span>
                    <span class="room-status-badge ${statusClass}">${room.trangthai || 'N/A'}</span>
                </div>
                <div class="room-card-body">
                    <div class="room-info-item">
                        <i class="fas fa-layer-group"></i>
                        <span>${room.loaiPhong?.tenloaiphong || 'N/A'}</span>
                    </div>
                    <div class="room-info-item">
                        <i class="fas fa-building"></i>
                        <span>Tầng ${room.tang || '-'}</span>
                    </div>
                    <div class="room-info-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>${formatCurrency(room.loaiPhong?.giacoban || 0)}</span>
                    </div>
                    <div class="room-info-item">
                        <i class="fas fa-users"></i>
                        <span>${room.loaiPhong?.succhua || '-'} người</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderListView() {
    const tbody = document.getElementById('roomsTableBody');
    if (!tbody) return;

    if (filteredRooms.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fas fa-door-open"></i>
                    <p>Không có phòng nào</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredRooms.map(room => {
        const statusClass = getStatusClass(room.trangthai);
        return `
            <tr onclick="viewRoomDetail(${room.maphong})">
                <td><strong>${room.sophong}</strong></td>
                <td>${room.loaiPhong?.tenloaiphong || 'N/A'}</td>
                <td>${room.tang || '-'}</td>
                <td>${formatCurrency(room.loaiPhong?.giacoban || 0)}</td>
                <td>${room.loaiPhong?.succhua || '-'} người</td>
                <td>${room.dientich ? room.dientich + ' m²' : '-'}</td>
                <td><span class="status-badge ${statusClass}">${room.trangthai || '-'}</span></td>
                <td>
                    <button class="btn-icon" onclick="event.stopPropagation(); viewRoomDetail(${room.maphong})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusClass(status) {
    if (!status) return '';
    if (status.includes('Trống')) return 'status-available';
    if (status.includes('Đang sử dụng')) return 'status-occupied';
    if (status.includes('Đang dọn dẹp')) return 'status-cleaning';
    if (status.includes('Bảo trì')) return 'status-maintenance';
    return '';
}

// ============================================
// ROOM DETAIL MODAL
// ============================================

async function viewRoomDetail(roomId) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/Phong/${roomId}`);
        if (!response.ok) throw new Error('Không thể tải thông tin phòng');
        
        currentRoom = await response.json();
        displayRoomDetail(currentRoom);
        
        // Try to load guest info if room is occupied
        if (currentRoom.trangthai === 'Đang sử dụng') {
            await loadGuestInfo(roomId);
        }
        
        openRoomDetailModal();
    } catch (error) {
        console.error('Error loading room detail:', error);
        showError('Không thể tải thông tin phòng');
    } finally {
        showLoading(false);
    }
}

function displayRoomDetail(room) {
    const infoGrid = document.getElementById('roomInfoGrid');
    if (!infoGrid) return;

    infoGrid.innerHTML = `
        <div class="info-item">
            <label><i class="fas fa-door-closed"></i> Số Phòng:</label>
            <span class="info-value"><strong>${room.sophong}</strong></span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-layer-group"></i> Loại Phòng:</label>
            <span class="info-value">${room.loaiPhong?.tenloaiphong || 'N/A'}</span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-building"></i> Tầng:</label>
            <span class="info-value">${room.tang || '-'}</span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-money-bill-wave"></i> Giá Phòng:</label>
            <span class="info-value">${formatCurrency(room.loaiPhong?.giacoban || 0)}</span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-users"></i> Sức Chứa:</label>
            <span class="info-value">${room.loaiPhong?.succhua || '-'} người</span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-expand"></i> Diện Tích:</label>
            <span class="info-value">${room.dientich ? room.dientich + ' m²' : '-'}</span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-info-circle"></i> Trạng Thái:</label>
            <span class="info-value"><span class="status-badge ${getStatusClass(room.trangthai)}">${room.trangthai || '-'}</span></span>
        </div>
        <div class="info-item">
            <label><i class="fas fa-sticky-note"></i> Ghi Chú:</label>
            <span class="info-value">${room.ghichu || '-'}</span>
        </div>
    `;

    // Set current status in update form
    const newStatus = document.getElementById('newStatus');
    const statusNote = document.getElementById('statusNote');
    if (newStatus) newStatus.value = room.trangthai || 'Trống';
    if (statusNote) statusNote.value = room.ghichu || '';
}

async function loadGuestInfo(roomId) {
    try {
        // Try to get current booking for this room
        const response = await fetch(`${API_BASE_URL}/DatPhong?maphong=${roomId}`);
        if (!response.ok) return;
        
        const bookings = await response.json();
        const activeBooking = bookings.find(b => b.trangthai === 'Đang sử dụng');
        
        if (activeBooking) {
            displayGuestInfo(activeBooking);
        } else {
            displayNoGuestInfo();
        }
    } catch (error) {
        console.error('Error loading guest info:', error);
        displayNoGuestInfo();
    }
}

function displayGuestInfo(booking) {
    const guestInfo = document.getElementById('guestInfo');
    if (!guestInfo) return;

    guestInfo.innerHTML = `
        <div class="guest-info-grid">
            <div class="info-item">
                <label><i class="fas fa-hashtag"></i> Mã Booking:</label>
                <span class="info-value">${booking.madatphong || '-'}</span>
            </div>
            <div class="info-item">
                <label><i class="fas fa-user"></i> Tên Khách:</label>
                <span class="info-value">${booking.khachHang?.hoten || '-'}</span>
            </div>
            <div class="info-item">
                <label><i class="fas fa-phone"></i> Số Điện Thoại:</label>
                <span class="info-value">${booking.khachHang?.sdt || '-'}</span>
            </div>
            <div class="info-item">
                <label><i class="fas fa-id-card"></i> CCCD:</label>
                <span class="info-value">${booking.khachHang?.cccd || '-'}</span>
            </div>
            <div class="info-item">
                <label><i class="fas fa-calendar-check"></i> Check-in:</label>
                <span class="info-value">${booking.ngaynhanphong ? formatDate(booking.ngaynhanphong) : '-'}</span>
            </div>
            <div class="info-item">
                <label><i class="fas fa-calendar-times"></i> Check-out:</label>
                <span class="info-value">${booking.ngaytraphong ? formatDate(booking.ngaytraphong) : '-'}</span>
            </div>
        </div>
    `;
}

function displayNoGuestInfo() {
    const guestInfo = document.getElementById('guestInfo');
    if (!guestInfo) return;

    guestInfo.innerHTML = `
        <div class="no-data">
            <i class="fas fa-user-slash"></i>
            <p>Không có thông tin khách hàng</p>
        </div>
    `;
}

function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active'));

    const tabContent = document.getElementById(tab + 'Tab');
    if (tabContent) tabContent.classList.add('active');
}

function openRoomDetailModal() {
    const modal = document.getElementById('roomDetailModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeRoomDetailModal() {
    const modal = document.getElementById('roomDetailModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    currentRoom = null;
}

// ============================================
// UPDATE ROOM STATUS
// ============================================

async function updateRoomStatus() {
    if (!currentRoom) return;

    const newStatus = document.getElementById('newStatus')?.value;
    const statusNote = document.getElementById('statusNote')?.value;

    if (!newStatus) {
        showError('Vui lòng chọn trạng thái mới');
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/Phong/${currentRoom.maphong}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...currentRoom,
                trangthai: newStatus,
                ghichu: statusNote
            })
        });

        if (!response.ok) throw new Error('Cập nhật thất bại');

        showSuccess('Cập nhật trạng thái phòng thành công');
        closeRoomDetailModal();
        await loadRooms(); // Reload data
    } catch (error) {
        console.error('Error updating room status:', error);
        showError('Không thể cập nhật trạng thái phòng');
    } finally {
        showLoading(false);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Make functions globally accessible
window.viewRoomDetail = viewRoomDetail;
window.closeRoomDetailModal = closeRoomDetailModal;
