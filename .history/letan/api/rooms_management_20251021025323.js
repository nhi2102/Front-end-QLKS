// Rooms Management API and UI Logic
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let allRooms = [];
let currentView = 'grid';
let selectedRoom = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadRooms();
    initializeEventListeners();
});

// Initialize event listeners
function initializeEventListeners() {
    // Menu toggle for mobile
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
}

// Load rooms data from API
async function loadRooms() {
    try {
        showLoading();
        
        // Mock API call - Replace with actual API endpoint
        const response = await fetchRoomsData();
        allRooms = response;
        
        displayRooms(allRooms);
        updateStatistics(allRooms);
        
    } catch (error) {
        console.error('Error loading rooms:', error);
        showError('Không thể tải dữ liệu phòng. Vui lòng thử lại sau.');
    }
}

// Fetch rooms data (Mock function - replace with actual API call)
async function fetchRoomsData() {
    // Simulating API call with setTimeout
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(generateMockRooms());
        }, 1000);
    });
}

// Generate mock rooms data
function generateMockRooms() {
    const rooms = [];
    const roomTypes = ['Standard', 'Deluxe', 'Suite', 'VIP'];
    const statuses = ['Trống', 'Đang sử dụng', 'Đang dọn dẹp', 'Bảo trì'];
    const prices = {
        'Standard': 500000,
        'Deluxe': 800000,
        'Suite': 1200000,
        'VIP': 2000000
    };
    
    for (let floor = 1; floor <= 5; floor++) {
        for (let room = 1; room <= 8; room++) {
            const roomNumber = floor * 100 + room;
            const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            rooms.push({
                id: roomNumber,
                roomNumber: roomNumber.toString(),
                roomType: roomType,
                floor: floor,
                price: prices[roomType],
                status: status,
                capacity: roomType === 'VIP' ? 4 : roomType === 'Suite' ? 3 : 2,
                area: roomType === 'VIP' ? 50 : roomType === 'Suite' ? 40 : roomType === 'Deluxe' ? 30 : 25,
                guestName: status === 'Đang sử dụng' ? 'Nguyễn Văn A' : null,
                guestPhone: status === 'Đang sử dụng' ? '0912345678' : null,
                bookingCode: status === 'Đang sử dụng' ? 'BK' + Math.floor(Math.random() * 10000) : null,
                checkIn: status === 'Đang sử dụng' ? '2025-10-20' : null,
                checkOut: status === 'Đang sử dụng' ? '2025-10-23' : null,
                note: status === 'Bảo trì' ? 'Sửa điều hòa' : status === 'Đang dọn dẹp' ? 'Đang vệ sinh' : ''
            });
        }
    }
    
    return rooms;
}

// Display rooms in current view
function displayRooms(rooms) {
    if (currentView === 'grid') {
        displayGridView(rooms);
    } else {
        displayListView(rooms);
    }
}

// Display rooms in grid view
function displayGridView(rooms) {
    const gridContainer = document.getElementById('roomsGridView');
    
    if (rooms.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Không tìm thấy phòng</h3>
                <p>Không có phòng nào phù hợp với bộ lọc</p>
            </div>
        `;
        return;
    }
    
    gridContainer.innerHTML = rooms.map(room => {
        const statusClass = getStatusClass(room.status);
        return `
            <div class="room-card" onclick="openRoomDetail(${room.id})">
                <div class="room-card-header">
                    <div class="room-number">${room.roomNumber}</div>
                    <span class="room-status ${statusClass}">${room.status}</span>
                </div>
                <div class="room-type">
                    <i class="fas fa-bed"></i> ${room.roomType}
                </div>
                <div class="room-details">
                    <div class="room-detail-item">
                        <i class="fas fa-building"></i>
                        <span>Tầng ${room.floor}</span>
                    </div>
                    <div class="room-detail-item">
                        <i class="fas fa-users"></i>
                        <span>${room.capacity} người</span>
                    </div>
                    <div class="room-detail-item">
                        <i class="fas fa-expand"></i>
                        <span>${room.area}m²</span>
                    </div>
                </div>
                <div class="room-price">
                    ${formatCurrency(room.price)}/đêm
                </div>
                ${room.guestName ? `
                    <div class="room-guest">
                        <strong>Khách:</strong> ${room.guestName}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Display rooms in list view
function displayListView(rooms) {
    const tableBody = document.getElementById('roomsListBody');
    
    if (rooms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Không tìm thấy phòng</h3>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = rooms.map(room => {
        const statusClass = getStatusClass(room.status);
        return `
            <tr>
                <td><strong>${room.roomNumber}</strong></td>
                <td>${room.roomType}</td>
                <td>Tầng ${room.floor}</td>
                <td>${formatCurrency(room.price)}</td>
                <td><span class="room-status ${statusClass}">${room.status}</span></td>
                <td>${room.guestName || '-'}</td>
                <td>${room.note || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="openRoomDetail(${room.id})">
                            <i class="fas fa-eye"></i> Xem
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update statistics
function updateStatistics(rooms) {
    const stats = {
        available: rooms.filter(r => r.status === 'Trống').length,
        occupied: rooms.filter(r => r.status === 'Đang sử dụng').length,
        cleaning: rooms.filter(r => r.status === 'Đang dọn dẹp').length,
        maintenance: rooms.filter(r => r.status === 'Bảo trì').length
    };
    
    document.getElementById('availableRooms').textContent = stats.available;
    document.getElementById('occupiedRooms').textContent = stats.occupied;
    document.getElementById('cleaningRooms').textContent = stats.cleaning;
    document.getElementById('maintenanceRooms').textContent = stats.maintenance;
}

// Apply filters
function applyFilters() {
    const roomType = document.getElementById('filterRoomType').value;
    const status = document.getElementById('filterStatus').value;
    const floor = document.getElementById('filterFloor').value;
    
    let filteredRooms = allRooms;
    
    if (roomType) {
        filteredRooms = filteredRooms.filter(r => r.roomType === roomType);
    }
    
    if (status) {
        filteredRooms = filteredRooms.filter(r => r.status === status);
    }
    
    if (floor) {
        filteredRooms = filteredRooms.filter(r => r.floor === parseInt(floor));
    }
    
    displayRooms(filteredRooms);
}

// Reset filters
function resetFilters() {
    document.getElementById('filterRoomType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterFloor').value = '';
    displayRooms(allRooms);
}

// Set view mode
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

// Open room detail modal
function openRoomDetail(roomId) {
    selectedRoom = allRooms.find(r => r.id === roomId);
    
    if (!selectedRoom) return;
    
    // Populate modal with room data
    document.getElementById('modalRoomNumber').textContent = selectedRoom.roomNumber;
    document.getElementById('modalRoomType').textContent = selectedRoom.roomType;
    document.getElementById('modalFloor').textContent = 'Tầng ' + selectedRoom.floor;
    document.getElementById('modalPrice').textContent = formatCurrency(selectedRoom.price) + '/đêm';
    document.getElementById('modalCapacity').textContent = selectedRoom.capacity + ' người';
    document.getElementById('modalArea').textContent = selectedRoom.area + 'm²';
    document.getElementById('modalStatus').innerHTML = `<span class="room-status ${getStatusClass(selectedRoom.status)}">${selectedRoom.status}</span>`;
    document.getElementById('modalNote').textContent = selectedRoom.note || 'Không có';
    
    // Show/hide guest info section
    const guestSection = document.getElementById('guestInfoSection');
    if (selectedRoom.status === 'Đang sử dụng') {
        guestSection.style.display = 'block';
        document.getElementById('modalBookingCode').textContent = selectedRoom.bookingCode;
        document.getElementById('modalGuestName').textContent = selectedRoom.guestName;
        document.getElementById('modalGuestPhone').textContent = selectedRoom.guestPhone;
        document.getElementById('modalCheckIn').textContent = formatDate(selectedRoom.checkIn);
        document.getElementById('modalCheckOut').textContent = formatDate(selectedRoom.checkOut);
        
        const nights = calculateNights(selectedRoom.checkIn, selectedRoom.checkOut);
        document.getElementById('modalNights').textContent = nights + ' đêm';
    } else {
        guestSection.style.display = 'none';
    }
    
    // Set current status in select
    document.getElementById('newStatus').value = selectedRoom.status;
    document.getElementById('statusNote').value = selectedRoom.note || '';
    
    // Show modal
    document.getElementById('roomDetailModal').classList.add('show');
}

// Close room detail modal
function closeRoomDetailModal() {
    document.getElementById('roomDetailModal').classList.remove('show');
    selectedRoom = null;
}

// Update room status
async function updateRoomStatus() {
    if (!selectedRoom) return;
    
    const newStatus = document.getElementById('newStatus').value;
    const note = document.getElementById('statusNote').value;
    
    try {
        // Mock API call - Replace with actual API endpoint
        await updateRoomStatusAPI(selectedRoom.id, newStatus, note);
        
        // Update local data
        selectedRoom.status = newStatus;
        selectedRoom.note = note;
        
        // Refresh display
        displayRooms(allRooms);
        updateStatistics(allRooms);
        
        // Close modal
        closeRoomDetailModal();
        
        // Show success message
        showSuccess('Cập nhật trạng thái phòng thành công!');
        
    } catch (error) {
        console.error('Error updating room status:', error);
        showError('Không thể cập nhật trạng thái phòng. Vui lòng thử lại.');
    }
}

// Mock API call for updating room status
async function updateRoomStatusAPI(roomId, status, note) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 500);
    });
}

// Utility functions
function getStatusClass(status) {
    const statusMap = {
        'Trống': 'available',
        'Đang sử dụng': 'occupied',
        'Đang dọn dẹp': 'cleaning',
        'Bảo trì': 'maintenance'
    };
    return statusMap[status] || 'available';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function showLoading() {
    const gridView = document.getElementById('roomsGridView');
    const listView = document.getElementById('roomsListBody');
    
    gridView.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    listView.innerHTML = '<tr><td colspan="8" class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('roomDetailModal');
    if (event.target === modal) {
        closeRoomDetailModal();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // ESC to close modal
    if (event.key === 'Escape') {
        closeRoomDetailModal();
    }
});
