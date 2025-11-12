// ==========================================
// 🏨 Rooms Management UI Logic (Lễ tân)
// ==========================================

// Biến toàn cục
let allRooms = [];
let currentView = 'grid';
let selectedRoom = null;

// ==========================================
// Khởi tạo trang
// ==========================================
document.addEventListener('DOMContentLoaded', async() => {
    initializeEventListeners();
    await loadRooms();
});

// ==========================================
// Thiết lập sự kiện
// ==========================================
function initializeEventListeners() {
    // Toggle menu (mobile)
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }

    // Bộ lọc
    const filterRoomType = document.getElementById('filterRoomType');
    if (filterRoomType) filterRoomType.addEventListener('change', applyFilters);

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);

    const filterFloor = document.getElementById('filterFloor');
    if (filterFloor) filterFloor.addEventListener('change', applyFilters);

    // Chuyển chế độ xem
    function setView(view) {
        currentView = view;
        displayRooms(allRooms);

        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        if (gridBtn) gridBtn.classList.toggle('active', view === 'grid');
        if (listBtn) listBtn.classList.toggle('active', view === 'list');
    }

    const gridViewBtn = document.getElementById('gridViewBtn');
    if (gridViewBtn) gridViewBtn.addEventListener('click', () => setView('grid'));

    const listViewBtn = document.getElementById('listViewBtn');
    if (listViewBtn) listViewBtn.addEventListener('click', () => setView('list'));
}

// ==========================================
// Tải danh sách phòng
// ==========================================
async function loadRooms() {
    showLoading();
    try {
        allRooms = await RoomAPI.getAllRoomsAPI();
        displayRooms(allRooms);
        updateStatistics(allRooms);
    } catch (err) {
        console.error('Lỗi tải phòng:', err);
        showError('Không thể tải danh sách phòng.');
    }
}

// ==========================================
// Hiển thị phòng
// ==========================================
function displayRooms(rooms) {
    if (currentView === 'grid') displayGridView(rooms);
    else displayListView(rooms);
}

function displayGridView(rooms) {
    const container = document.getElementById('roomsGridView');
    if (!container) return;

    if (rooms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Không có phòng nào</p>
            </div>`;
        return;
    }

    container.innerHTML = rooms.map(r => `
        <div class="room-card" onclick="openRoomDetail(${r.maphong})">
            <div class="room-card-header">
                <div class="room-number">${r.sophong}</div>
                <span class="room-status ${getStatusClass(r.trangthai)}">${r.trangthai}</span>
            </div>
            <div class="room-type">
                <i class="fas fa-bed"></i> ${r.tenLoaiPhong || 'N/A'}
            </div>
            <div class="room-details">
                <i class="fas fa-money-bill"></i> ${formatCurrency(r.giaPhong || 0)}/đêm
            </div>
        </div>
    `).join('');
}


function displayListView(rooms) {
    const tbody = document.getElementById('roomsListBody');
    if (!tbody) return;

    if (rooms.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8" class="text-center">Không có phòng nào</td></tr>`;
        return;
    }

    tbody.innerHTML = rooms.map(r => `
        <tr>
            <td>${r.sophong}</td>
            <td>${r.maloaiphongNavigation?.tenloaiphong || 'N/A'}</td>
            <td>${r.tang}</td>
            <td>${formatCurrency(r.giaphong)}</td>
            <td><span class="room-status ${getStatusClass(r.trangthai)}">${r.trangthai}</span></td>
            <td>${r.tenkhach || '-'}</td>
            <td>${r.ghichu || '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="openRoomDetail(${r.maphong})">
                    <i class="fas fa-eye"></i> Xem
                </button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// Bộ lọc & thống kê
// ==========================================
function applyFilters() {
    const type = document.getElementById('filterRoomType').value;
    const status = document.getElementById('filterStatus').value;
    const floor = document.getElementById('filterFloor').value;

    let filtered = [...allRooms];
    filtered = filtered.filter(r => r.maloaiphongNavigation && r.maloaiphongNavigation.tenloaiphong === type);
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

// ==========================================
// Chi tiết phòng (Modal)
// ==========================================
function openRoomDetail(id) {
    selectedRoom = allRooms.find(r => r.maphong === id);
    if (!selectedRoom) return;

    document.getElementById('modalRoomNumber').textContent = selectedRoom.sophong;
    document.getElementById('modalRoomType').textContent = (selectedRoom.maloaiphongNavigation && selectedRoom.maloaiphongNavigation.tenloaiphong) || '-';
    document.getElementById('modalFloor').textContent = selectedRoom.tang || '-';
    document.getElementById('modalPrice').textContent = formatCurrency(selectedRoom.giaphong);
    document.getElementById('modalStatus').innerHTML = `<span class="room-status ${getStatusClass(selectedRoom.trangthai)}">${selectedRoom.trangthai}</span>`;
    document.getElementById('modalNote').textContent = selectedRoom.ghichu || 'Không có';

    document.getElementById('newStatus').value = selectedRoom.trangthai;
    document.getElementById('statusNote').value = selectedRoom.ghichu || '';

    document.getElementById('roomDetailModal').classList.add('show');
}

function closeRoomDetailModal() {
    document.getElementById('roomDetailModal').classList.remove('show');
    selectedRoom = null;
}

// ==========================================
// Cập nhật trạng thái phòng
// ==========================================
async function updateRoomStatus() {
    if (!selectedRoom) return;
    const newStatus = document.getElementById('newStatus').value;
    const note = document.getElementById('statusNote').value;

    const payload = {
        ...selectedRoom,
        trangthai: newStatus,
        ghichu: note
    };

    try {
        await RoomAPI.updateRoomStatusAPI(selectedRoom.maphong, payload);
        showSuccess('✅ Cập nhật trạng thái thành công!');
        closeRoomDetailModal();
        await loadRooms();
    } catch (err) {
        showError('❌ Lỗi khi cập nhật phòng.');
        console.error(err);
    }
}

// ==========================================
// Tiện ích chung
// ==========================================
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
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function showLoading() {
    document.getElementById('roomsGridView').innerHTML =
        `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>`;
}

function showError(msg) { alert(msg); }

function showSuccess(msg) { alert(msg); }

// Đóng modal khi bấm ngoài
window.onclick = (e) => {
    const modal = document.getElementById('roomDetailModal');
    if (e.target === modal) closeRoomDetailModal();
};

// ESC để đóng modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRoomDetailModal();
});