// Rooms Management UI Enhancement
// Additional UI utilities and interactions

// Search functionality
function initializeSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'roomSearch';
    searchInput.placeholder = 'Tìm kiếm phòng...';
    searchInput.className = 'search-input';

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredRooms = allRooms.filter(room =>
            room.roomNumber.toLowerCase().includes(searchTerm) ||
            room.roomType.toLowerCase().includes(searchTerm) ||
            (room.guestName && room.guestName.toLowerCase().includes(searchTerm))
        );
        displayRooms(filteredRooms);
    });

    return searchInput;
}

// Export rooms data to Excel
function exportToExcel() {
    const data = allRooms.map(room => ({
        'Số Phòng': room.roomNumber,
        'Loại Phòng': room.roomType,
        'Tầng': room.floor,
        'Giá': room.price,
        'Trạng Thái': room.status,
        'Khách Hàng': room.guestName || '-',
        'Số Điện Thoại': room.guestPhone || '-',
        'Check-in': room.checkIn || '-',
        'Check-out': room.checkOut || '-',
        'Ghi Chú': room.note || '-'
    }));

    console.log('Export data:', data);
    alert('Chức năng xuất Excel đang được phát triển');
}

// Print room status report
function printReport() {
    window.print();
}

// Refresh room data
function refreshRooms() {
    loadRooms();
}

// Quick status change
function quickStatusChange(roomId, newStatus) {
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
        room.status = newStatus;
        displayRooms(allRooms);
        updateStatistics(allRooms);
        showSuccess('Đã cập nhật trạng thái phòng ' + room.roomNumber);
    }
}

// Bulk operations
function selectAllRooms() {
    // Implementation for selecting all rooms
    console.log('Select all rooms');
}

function bulkStatusChange() {
    // Implementation for bulk status change
    console.log('Bulk status change');
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Animation utilities
function animateStatCard(element) {
    element.style.transform = 'scale(1.05)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
        });

        element.addEventListener('mouseleave', function() {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) {
                document.body.removeChild(tooltip);
            }
        });
    });
}

// Responsive sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

// Load saved preferences
function loadPreferences() {
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        document.querySelector('.sidebar').classList.add('collapsed');
    }

    const savedView = localStorage.getItem('roomsView');
    if (savedView) {
        setView(savedView);
    }
}

// Save view preference
function saveViewPreference(view) {
    localStorage.setItem('roomsView', view);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadPreferences();
    initializeTooltips();
});