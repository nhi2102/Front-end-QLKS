// ============================================
// ROOMS MANAGEMENT - API & UI Logic
// ============================================

const API_BASE_URL = 'https://localhost:7076/api';

let allRooms = [];
let filteredRooms = [];
let currentView = 'grid';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));

    document.getElementById('filterRoomType').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterFloor').addEventListener('change', applyFilters);

    document.querySelectorAll('.toggle-btn').forEach(btn => btn.addEventListener('click', (e) => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
    }));

    checkUserLogin();
    loadRooms();
});

function checkUserLogin() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.hoten) {
        const el = document.getElementById('userName');
        if (el) el.textContent = user.hoten;
    }
}

async function loadRooms() {
    showLoading(true);
    try {
        const resp = await fetch(`${API_BASE_URL}/Phong`);
        if (!resp.ok) throw new Error('Không thể tải dữ liệu phòng');
        allRooms = await resp.json();
        filteredRooms = [...allRooms];

        updateStats();
        renderRoomsGrid();
        renderRoomsList();
    } catch (err) {
        console.error(err);
        const grid = document.getElementById('roomsGridView');
        grid.innerHTML = '<div class="no-data"><i class="fas fa-exclamation-triangle"></i><p>Lỗi tải dữ liệu</p></div>';
    } finally {
        showLoading(false);
    }
}

function applyFilters() {
    const type = document.getElementById('filterRoomType').value;
    const status = document.getElementById('filterStatus').value;
    const floor = document.getElementById('filterFloor').value;

    filteredRooms = allRooms.filter(r => {
        if (type && r.loaiPhong && r.loaiPhong.tenloaiphong !== type) return false;
        if (status && r.trangthai !== status) return false;
        if (floor && String(r.tang) !== String(floor)) return false;
        return true;
    });

    renderRoomsGrid();
    renderRoomsList();
}

function resetFilters() {
    document.getElementById('filterRoomType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterFloor').value = '';
    filteredRooms = [...allRooms];
    renderRoomsGrid();
    renderRoomsList();
}

function setView(view) {
    currentView = view;
    const grid = document.getElementById('roomsGridView');
    const list = document.getElementById('roomsListView');
    if (view === 'grid') {
        grid.style.display = 'grid';
        list.style.display = 'none';
    } else {
        grid.style.display = 'none';
        list.style.display = 'block';
    }
}

function updateStats() {
    const available = allRooms.filter(r => r.trangthai === 'Trống').length;
    const occupied = allRooms.filter(r => r.trangthai === 'Đang sử dụng').length;
    const cleaning = allRooms.filter(r => r.trangthai === 'Đang dọn dẹp').length;
    const maintenance = allRooms.filter(r => r.trangthai === 'Bảo trì').length;

    document.getElementById('availableRooms').textContent = available;
    document.getElementById('occupiedRooms').textContent = occupied;
    document.getElementById('cleaningRooms').textContent = cleaning;
    document.getElementById('maintenanceRooms').textContent = maintenance;
}

function renderRoomsGrid() {
    const grid = document.getElementById('roomsGridView');
    if (!grid) return;

    if (!filteredRooms || filteredRooms.length === 0) {
        grid.innerHTML = '<div class="no-data"><i class="fas fa-door-open"></i><p>Không có phòng</p></div>';
        return;
    }

    grid.innerHTML = '';
    filteredRooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card status-' + (room.trangthai ? room.trangthai.replace(/\s+/g, '-').toLowerCase() : 'unknown');
        card.innerHTML = `
            <div class="room-number">${room.sophong}</div>
            <div class="room-type">${room.loaiPhong ? room.loaiPhong.tenloaiphong : 'N/A'}</div>
            <div class="room-status ${classifyStatus(room.trangthai)}">${room.trangthai || 'N/A'}</div>
            <div class="room-price">${formatCurrency(room.loaiPhong ? room.loaiPhong.giacoban : 0)}</div>
        `;
        card.addEventListener('click', () => openRoomModal(room));
        grid.appendChild(card);
    });
}

function renderRoomsList() {
    const tbody = document.getElementById('roomsListBody');
    if (!tbody) return;

    if (!filteredRooms || filteredRooms.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fas fa-door-open"></i>
                    <p>Không có phòng</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filteredRooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${room.sophong}</td>
            <td>${room.loaiPhong ? room.loaiPhong.tenloaiphong : 'N/A'}</td>
            <td>${room.tang || '-'}</td>
            <td>${formatCurrency(room.loaiPhong ? room.loaiPhong.giacoban : 0)}</td>
            <td><span class="table-status-badge ${classifyStatus(room.trangthai)}">${room.trangthai || '-'}</span></td>
            <td>${room.currentGuest ? room.currentGuest.hoten : '-'}</td>
            <td>${room.ghichu || '-'}</td>
            <td class="table-actions"><button class="action-btn view" onclick="openRoomModalById(${room.maphong})"><i class=\"fas fa-eye\"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function classifyStatus(status) {
    if (!status) return '';
    if (status.includes('Trống')) return 'available';
    if (status.includes('Đang sử dụng')) return 'occupied';
    if (status.includes('Đang dọn dẹp')) return 'cleaning';
    if (status.includes('Bảo trì')) return 'maintenance';
    return '';
}

function formatCurrency(num) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
}

function openRoomModal(room) {
    // populate modal
    document.getElementById('modalRoomNumber').textContent = room.sophong;
    document.getElementById('modalRoomType').textContent = room.loaiPhong ? room.loaiPhong.tenloaiphong : '-';
    document.getElementById('modalFloor').textContent = room.tang || '-';
    document.getElementById('modalPrice').textContent = formatCurrency(room.loaiPhong ? room.loaiPhong.giacoban : 0);
    document.getElementById('modalCapacity').textContent = room.loaiPhong ? (room.loaiPhong.succhua || '-') + ' người' : '-';
    document.getElementById('modalArea').textContent = room.dientich ? room.dientich + ' m²' : '-';
    document.getElementById('modalStatus').textContent = room.trangthai || '-';
    document.getElementById('modalNote').textContent = room.ghichu || '-';

    if (room.currentGuest) {
        document.getElementById('guestInfoSection').style.display = 'block';
        document.getElementById('modalBookingCode').textContent = room.currentGuest.bookingCode || '-';
        document.getElementById('modalGuestName').textContent = room.currentGuest.hoten || '-';
        document.getElementById('modalGuestPhone').textContent = room.currentGuest.sdt || '-';
        document.getElementById('modalCheckIn').textContent = room.currentGuest.checkIn ? new Date(room.currentGuest.checkIn).toLocaleDateString('vi-VN') : '-';
        document.getElementById('modalCheckOut').textContent = room.currentGuest.checkOut ? new Date(room.currentGuest.checkOut).toLocaleDateString('vi-VN') : '-';
        document.getElementById('modalNights').textContent = room.currentGuest.nights || '-';
    } else {
        document.getElementById('guestInfoSection').style.display = 'none';
    }

    // store current room in a dataset for update
    const modal = document.getElementById('roomDetailModal');
    modal.dataset.roomId = room.maphong;
    modal.classList.add('show');
}

function openRoomModalById(roomId) {
    const room = allRooms.find(r => r.maphong === roomId);
    if (room) openRoomModal(room);
}

function closeRoomDetailModal() {
    document.getElementById('roomDetailModal').classList.remove('show');
}

async function updateRoomStatus() {
    const modal = document.getElementById('roomDetailModal');
    const roomId = parseInt(modal.dataset.roomId);
    const newStatus = document.getElementById('newStatus').value;
    const note = document.getElementById('statusNote').value;

    try {
        const payload = { trangthai: newStatus, ghichu: note };
        const resp = await fetch(`${API_BASE_URL}/Phong/${roomId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Cập nhật thất bại');
        alert('Cập nhật trạng thái phòng thành công');
        closeRoomDetailModal();
        loadRooms();
    } catch (err) {
        console.error(err);
        alert('Lỗi khi cập nhật trạng thái:' + err.message);
    }
}

function showLoading(show) {
    const grid = document.getElementById('roomsGridView');
    if (!grid) return;
    if (show) {
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    }
}
