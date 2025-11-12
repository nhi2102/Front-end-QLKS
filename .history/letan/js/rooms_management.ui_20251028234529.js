// ==========================================
//  Rooms Management UI Logic (Lễ tân)
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
    checkUserLogin();
    setupEventListeners();
    await loadRooms();
});

// ==========================================
// Thiết lập sự kiện
// ==========================================
function initializeEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }

    // Bộ lọc
    ['filterRoomType', 'filterStatus', 'filterFloor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });
}
// Kiểm tra đăng nhập

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
// ==========================================
// Tải danh sách phòng từ API (View SQL)
async function loadRooms() {
    showLoading();
    try {
        const dateEl = document.getElementById('filterDate');
        const date = dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0];
        const res = await fetch(`https://localhost:7076/api/Phongs/letan-view?date=${date}`);
        if (!res.ok) throw new Error('Không thể tải danh sách phòng');
        allRooms = await res.json();

        displayRooms(allRooms);
        updateStatistics(allRooms);
    } catch (err) {
        console.error(' Lỗi tải phòng:', err);
        showError('Không thể tải danh sách phòng.');
    }
}
document.addEventListener('DOMContentLoaded', async() => {
    const dateInput = document.getElementById('filterDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    initializeEventListeners();
    checkUserLogin();
    setupEventListeners();
    await loadRooms();
});


// ==========================================
//  Chuyển chế độ xem (Lưới / Danh Sách)
// ==========================================
function setView(view) {
    currentView = view;
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const gridView = document.getElementById('roomsGridView');
    const listView = document.getElementById('roomsListView');

    if (view === 'grid') {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        gridView.style.display = 'grid';
        listView.style.display = 'none';
    } else {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        gridView.style.display = 'none';
        listView.style.display = 'block';
    }

    displayRooms(allRooms);
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
        <div class="room-card" onclick="openRoomDetail(${r.maPhong})">
            <div class="room-card-header">
                <div class="room-number">${r.soPhong}</div>
                <span class="room-status ${getStatusClass(r.trangThaiThucTe)}">
                    ${r.trangThaiThucTe}
                </span>
            </div>
            <div class="room-type">
                <i class="fas fa-bed"></i> ${r.tenLoaiPhong || 'N/A'}
            </div>
            <div class="room-details">
                <i class="fas fa-money-bill"></i> ${formatCurrency(r.giaPhong || 0)}/đêm
            </div>
            ${r.tenKhach ? `
                <div class="room-guest">
                    <strong>Khách:</strong> ${r.tenKhach} (${r.sdtKhach || '-'})
                </div>` : ''}
        </div>
    `).join('');
}

function displayListView(rooms) {
    const tbody = document.getElementById('roomsListBody');
    if (!tbody) return;

    if (rooms.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">Không có phòng nào</td>
            </tr>`;
        return;
    }

    tbody.innerHTML = rooms.map(r => `
        <tr>
            <td><strong>${r.soPhong}</strong></td>
            <td>${r.tenLoaiPhong || 'N/A'}</td>
            <td>${formatCurrency(r.giaPhong || 0)}</td>
            <td><span class="room-status ${getStatusClass(r.trangThaiThucTe)}">${r.trangThaiThucTe}</span></td>
            <td>${r.tenKhach || '-'}</td>
            <td>${r.ngayNhanPhong ? formatDate(r.ngayNhanPhong) : '-'}</td>
            <td>${r.ngayTraPhong ? formatDate(r.ngayTraPhong) : '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="openRoomDetail(${r.maPhong})">
                    <i class="fas fa-eye"></i> Xem
                </button>
            </td>
        </tr>
    `).join('');
}
//Cập nhật trạng thái
async function updateRoomStatus() {
    if (!selectedRoom) return;

    const newStatus = document.getElementById('newStatus').value;

    try {
        await RoomAPI.updateRoomStatus(selectedRoom.maPhong, newStatus);
        showSuccess(' Cập nhật trạng thái thành công!');
        await loadRooms();
        closeRoomDetailModal();
    } catch (err) {
        console.error(err);
        showError(' Không thể cập nhật trạng thái phòng.');
    }
}

// 
// Bộ lọc & thống kê
// ==========================================
function applyFilters() {
    const type = document.getElementById('filterRoomType').value;
    const status = document.getElementById('filterStatus').value;
    const floor = document.getElementById('filterFloor').value;

    let filtered = [...allRooms];
    if (type) filtered = filtered.filter(r => r.tenLoaiPhong === type);
    if (status) filtered = filtered.filter(r => r.trangThaiThucTe === status);
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
        available: rooms.filter(r => r.trangThaiThucTe === 'Trống').length,
        occupied: rooms.filter(r => r.trangThaiThucTe === 'Đang sử dụng').length,
        cleaning: rooms.filter(r => r.trangThaiThucTe === 'Đang dọn dẹp').length,
        maintenance: rooms.filter(r => r.trangThaiThucTe === 'Bảo trì').length
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
    selectedRoom = allRooms.find(r => r.maPhong === id);
    if (!selectedRoom) return;

    document.getElementById('modalRoomNumber').textContent = selectedRoom.soPhong || '-';
    document.getElementById('modalRoomType').textContent = selectedRoom.tenLoaiPhong || 'N/A';
    document.getElementById('modalPrice').textContent = formatCurrency(selectedRoom.giaPhong || 0);
    document.getElementById('modalStatus').innerHTML = `
        <span class="room-status ${getStatusClass(selectedRoom.trangThaiThucTe)}">
            ${selectedRoom.trangThaiThucTe}
        </span>`;

    // Nếu có khách
    const guestSection = document.getElementById('guestInfoSection');
    if (guestSection) {
        if (selectedRoom.tenKhach) {
            guestSection.style.display = 'block';
            document.getElementById('modalGuestName').textContent = selectedRoom.tenKhach;
            document.getElementById('modalGuestPhone').textContent = selectedRoom.sdtKhach || '-';
            document.getElementById('modalCheckIn').textContent = selectedRoom.ngayNhanPhong ? formatDate(selectedRoom.ngayNhanPhong) : '-';
            document.getElementById('modalCheckOut').textContent = selectedRoom.ngayTraPhong ? formatDate(selectedRoom.ngayTraPhong) : '-';
        } else {
            guestSection.style.display = 'none';
        }
    }

    document.getElementById('roomDetailModal').classList.add('show');
}

function closeRoomDetailModal() {
    document.getElementById('roomDetailModal').classList.remove('show');
    selectedRoom = null;
}

// ==========================================
// Tiện ích chung
// ==========================================
function getStatusClass(status) {
    const map = {
        'Trống': 'available',
        'Đang sử dụng': 'occupied',
        'Đã đặt': 'booked',
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

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

function showLoading() {
    const grid = document.getElementById('roomsGridView');
    if (grid) grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
}

function showError(msg) { alert(msg); }
function showSuccess(msg) { alert(msg); }

// Đóng modal khi click ngoài
window.onclick = (e) => {
    const modal = document.getElementById('roomDetailModal');
    if (e.target === modal) closeRoomDetailModal();
};

// ESC để đóng modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRoomDetailModal();
});