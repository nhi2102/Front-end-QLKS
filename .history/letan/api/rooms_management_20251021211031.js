// ==========================================
// 🏨 Rooms Management - Lễ Tân Quản Lý Phòng
// ==========================================

const API_BASE_URL = 'https://localhost:7076/api';

// Biến toàn cục
let allRooms = [];
let currentView = 'grid';
let selectedRoom = null;

// =======================
// Khởi tạo khi tải trang
// =======================
document.addEventListener('DOMContentLoaded', async() => {
    initializeEventListeners();
    await loadRooms();
});

// =======================
// Thiết lập sự kiện giao diện
// =======================
function initializeEventListeners() {
    // Nút toggle menu (mobile)
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }

    // Bộ lọc phòng
    const filterRoomTypeEl = document.getElementById('filterRoomType');
    if (filterRoomTypeEl) filterRoomTypeEl.addEventListener('change', applyFilters);
    const filterStatusEl = document.getElementById('filterStatus');
    if (filterStatusEl) filterStatusEl.addEventListener('change', applyFilters);
    const filterFloorEl = document.getElementById('filterFloor');
    if (filterFloorEl) filterFloorEl.addEventListener('change', applyFilters);
    const resetFiltersBtnEl = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtnEl) resetFiltersBtnEl.addEventListener('click', resetFilters);

    // Chế độ xem Grid/List
    const gridViewBtnEl = document.getElementById('gridViewBtn');
    if (gridViewBtnEl) gridViewBtnEl.addEventListener('click', () => setView('grid'));
    const listViewBtnEl = document.getElementById('listViewBtn');
    if (listViewBtnEl) listViewBtnEl.addEventListener('click', () => setView('list'));

    // Cập nhật trạng thái phòng
    const updateStatusBtnEl = document.getElementById('updateStatusBtn');
    if (updateStatusBtnEl) updateStatusBtnEl.addEventListener('click', updateRoomStatus);
}

// =======================
// Tải dữ liệu phòng từ API
// =======================
async function loadRooms() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/Phongs`);
        if (!response.ok) throw new Error('Lỗi tải danh sách phòng');

        allRooms = await response.json();

        displayRooms(allRooms);
        updateStatistics(allRooms);

    } catch (error) {
        console.error('❌ Lỗi khi tải phòng:', error);
        showError('Không thể tải dữ liệu phòng. Vui lòng thử lại sau.');
    }
}

// =======================
// Hiển thị danh sách phòng
// =======================
function displayRooms(rooms) {
    if (currentView === 'grid') {
        displayGridView(rooms);
    } else {
        displayListView(rooms);
    }
}

// Dạng lưới (Grid)
function displayGridView(rooms) {
    const gridContainer = document.getElementById('roomsGridView');
    if (!gridContainer) return;

    if (rooms.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Không có phòng nào</h3>
            </div>`;
        return;
    }

    gridContainer.innerHTML = rooms.map(room => {
        const statusClass = getStatusClass(room.trangthai);
        return `
        <div class="room-card" onclick="openRoomDetail(${room.maphong})">
            <div class="room-card-header">
                <div class="room-number">${room.sophong}</div>
                <span class="room-status ${statusClass}">${room.trangthai}</span>
            </div>
            <div class="room-type"><i class="fas fa-bed"></i> ${room.maloaiphongNavigation?.tenloaiphong || 'N/A'}</div>
            <div class="room-details">
                <i class="fas fa-building"></i> Tầng ${room.tang || '-'}<br>
                <i class="fas fa-money-bill"></i> ${formatCurrency(room.giaphong || 0)}/đêm
            </div>
        </div>`;
    }).join('');
}

// Dạng bảng (List)
function displayListView(rooms) {
    const tableBody = document.getElementById('roomsListBody');
    if (!tableBody) return;

    if (rooms.length === 0) {
        tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">Không có phòng nào</td>
        </tr>`;
        return;
    }

    tableBody.innerHTML = rooms.map(room => `
        <tr>
            <td>${room.sophong}</td>
            <td>${room.maloaiphongNavigation?.tenloaiphong || 'N/A'}</td>
            <td>${formatCurrency(room.giaphong || 0)}</td>
            <td><span class="room-status ${getStatusClass(room.trangthai)}">${room.trangthai}</span></td>
            <td>${room.tang || '-'}</td>
            <td>${room.ghichu || '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="openRoomDetail(${room.maphong})">
                    <i class="fas fa-eye"></i> Xem
                </button>
            </td>
        </tr>
    `).join('');
}

// =======================
// Bộ lọc phòng
// =======================
function applyFilters() {
    const type = document.getElementById('filterRoomType').value;
    const status = document.getElementById('filterStatus').value;
    const floor = document.getElementById('filterFloor').value;

    let filtered = [...allRooms];
    if (type) filtered = filtered.filter(r => r.maloaiphongNavigation && r.maloaiphongNavigation.tenloaiphong === type);
    if (status) filtered = filtered.filter(r => r.trangthai === status);
    if (floor) filtered = filtered.filter(r => r.tang === parseInt(floor));

    displayRooms(filtered);
}

function resetFilters() {
    document.getElementById('filterRoomType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterFloor').value = '';
    displayRooms(allRooms);
}

// =======================
// Cập nhật thống kê
// =======================
function updateStatistics(rooms) {
    const stats = {
        available: rooms.filter(r => r.trangthai === 'Trống').length,
        occupied: rooms.filter(r => r.trangthai === 'Đang sử dụng').length,
        cleaning: rooms.filter(r => r.trangthai === 'Đang dọn dẹp').length,
        maintenance: rooms.filter(r => r.trangthai === 'Bảo trì').length
    };

    document.getElementById('availableRooms').textContent = stats.available;
    document.getElementById('occupiedRooms').textContent = stats.occupied;
    document.getElementById('cleaningRooms').textContent = stats.cleaning;
    document.getElementById('maintenanceRooms').textContent = stats.maintenance;
}

// =======================
// Chi tiết phòng (Modal)
// =======================
function openRoomDetail(roomId) {
    selectedRoom = allRooms.find(r => r.maphong === roomId);
    if (!selectedRoom) return;

    document.getElementById('modalRoomNumber').textContent = selectedRoom.sophong;
    document.getElementById('modalRoomType').textContent = (selectedRoom.maloaiphongNavigation && selectedRoom.maloaiphongNavigation.tenloaiphong) || 'N/A';
    document.getElementById('modalPrice').textContent = formatCurrency(selectedRoom.giaphong);
    document.getElementById('modalStatus').innerHTML =
        `<span class="room-status ${getStatusClass(selectedRoom.trangthai)}">${selectedRoom.trangthai}</span>`;
    document.getElementById('statusNote').value = selectedRoom.ghichu || '';

    document.getElementById('roomDetailModal').classList.add('show');
}

// Đóng modal
function closeRoomDetailModal() {
    document.getElementById('roomDetailModal').classList.remove('show');
    selectedRoom = null;
}

// =======================
// Cập nhật trạng thái phòng
// =======================
async function updateRoomStatus() {
    if (!selectedRoom) return;

    const newStatus = document.getElementById('newStatus').value;
    const note = document.getElementById('statusNote').value;

    try {
        const payload = {
            ...selectedRoom,
            trangthai: newStatus,
            ghichu: note
        };

        const response = await fetch(`${API_BASE_URL}/Phongs/${selectedRoom.maphong}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Không thể cập nhật trạng thái phòng.');

        // Cập nhật lại dữ liệu hiển thị
        selectedRoom.trangthai = newStatus;
        selectedRoom.ghichu = note;

        displayRooms(allRooms);
        updateStatistics(allRooms);
        closeRoomDetailModal();

        showSuccess('✅ Cập nhật trạng thái phòng thành công!');
    } catch (err) {
        console.error('❌ Lỗi cập nhật:', err);
        showError('Không thể cập nhật trạng thái phòng.');
    }
}

// =======================
// Tiện ích chung
// =======================
function getStatusClass(status) {
    const map = {
        'Trống': 'available',
        'Đang sử dụng': 'occupied',
        'Đang dọn dẹp': 'cleaning',
        'Bảo trì': 'maintenance'
    };
    return map[status] || 'available';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function showLoading() {
    document.getElementById('roomsGridView').innerHTML =
        `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>`;
}

function showError(msg) { alert(msg); }

function showSuccess(msg) { alert(msg); }

// Đóng modal khi bấm ngoài
window.onclick = (event) => {
    const modal = document.getElementById('roomDetailModal');
    if (event.target === modal) closeRoomDetailModal();
};

// ESC để đóng modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRoomDetailModal();
});