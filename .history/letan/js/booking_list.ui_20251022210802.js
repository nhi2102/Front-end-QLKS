// Booking List UI Enhancement
// Additional UI utilities and interactions

// Auto-refresh functionality
let autoRefreshInterval = null;

function enableAutoRefresh(intervalMinutes = 5) {
    disableAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        refreshBookings();
        console.log('Auto-refreshed at:', new Date().toLocaleTimeString());
    }, intervalMinutes * 60 * 1000);
}

function disableAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Quick filter shortcuts
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case '1':
                event.preventDefault();
                filterBookings('all');
                break;
            case '2':
                event.preventDefault();
                filterBookings('staying');
                break;
            case '3':
                event.preventDefault();
                filterBookings('checkin-today');
                break;
            case '4':
                event.preventDefault();
                filterBookings('checkout-today');
                break;
            case '5':
                event.preventDefault();
                filterBookings('upcoming');
                break;
            case 'r':
                event.preventDefault();
                refreshBookings();
                break;
        }
    }
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    notification.innerHTML = `
        <i class="fas ${icon}" style="margin-right: 10px;"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export filtered data to CSV
function exportToCSV() {
    const headers = ['Mã Booking', 'Khách Hàng', 'Số ĐT', 'Phòng', 'Loại Phòng', 'Check-in', 'Check-out', 'Số Đêm', 'Tổng Tiền', 'Trạng Thái'];
    const rows = filteredBookings.map(b => [
        b.id,
        b.customerName,
        b.customerPhone,
        b.roomNumber,
        b.roomType,
        formatDate(b.checkinDate),
        formatDate(b.checkoutDate),
        b.nights,
        b.totalAmount,
        b.status
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `danh-sach-dat-phong-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showNotification('Đã xuất file CSV thành công', 'success');
}

// Print specific booking
function printBookingDetails() {
    if (!selectedBooking) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Chi Tiết Đặt Phòng</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
    printWindow.document.write('h1 { color: #3b82f6; }');
    printWindow.document.write('.info-row { display: flex; margin: 10px 0; }');
    printWindow.document.write('.label { font-weight: bold; width: 200px; }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>CHI TIẾT ĐẶT PHÒNG</h1>');
    printWindow.document.write(`<div class="info-row"><div class="label">Mã Booking:</div><div>${selectedBooking.id}</div></div>`);
    printWindow.document.write(`<div class="info-row"><div class="label">Khách hàng:</div><div>${selectedBooking.customerName}</div></div>`);
    printWindow.document.write(`<div class="info-row"><div class="label">Số điện thoại:</div><div>${selectedBooking.customerPhone}</div></div>`);
    printWindow.document.write(`<div class="info-row"><div class="label">Phòng:</div><div>${selectedBooking.roomNumber} - ${selectedBooking.roomType}</div></div>`);
    printWindow.document.write(`<div class="info-row"><div class="label">Check-in:</div><div>${formatDate(selectedBooking.checkinDate)}</div></div>`);
    printWindow.document.write(`<div class="info-row"><div class="label">Check-out:</div><div>${formatDate(selectedBooking.checkoutDate)}</div></div>`);
    printWindow.document.write(`<div class="info-row"><div class="label">Tổng tiền:</div><div>${formatCurrency(selectedBooking.totalAmount)}</div></div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// Highlight bookings that need attention
function highlightUrgentBookings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll('.bookings-table tbody tr').forEach(row => {
        const bookingEl = row.querySelector('.booking-code');
        const bookingId = bookingEl ? bookingEl.textContent.trim() : null;
        const booking = filteredBookings.find(b => b.id === bookingId);

        if (booking) {
            const checkin = new Date(booking.checkinDate);
            checkin.setHours(0, 0, 0, 0);
            const checkout = new Date(booking.checkoutDate);
            checkout.setHours(0, 0, 0, 0);

            if (checkin.getTime() === today.getTime() || checkout.getTime() === today.getTime()) {
                row.style.backgroundColor = '#fef3c7';
            }
        }
    });
}

// Call after displaying bookings
const originalDisplayBookings = displayBookings;
displayBookings = function() {
    originalDisplayBookings();
    setTimeout(highlightUrgentBookings, 100);
};

// Initialize tooltips
function initializeTooltips() {
    document.querySelectorAll('[title]').forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.cssText = `
                position: absolute;
                background: #1e293b;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';

            this.addEventListener('mouseleave', function() {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, { once: true });
        });
    });
}

// Load saved preferences
function loadUserPreferences() {
    const savedFilter = localStorage.getItem('bookingListFilter');
    if (savedFilter) {
        filterBookings(savedFilter);
    }

    const savedItemsPerPage = localStorage.getItem('bookingListItemsPerPage');
    if (savedItemsPerPage) {
        itemsPerPage = parseInt(savedItemsPerPage);
    }
}

// Save filter preference
function saveFilterPreference(filter) {
    localStorage.setItem('bookingListFilter', filter);
}

// Override filterBookings to save preference
const originalFilterBookings = filterBookings;
filterBookings = function(filter) {
    originalFilterBookings(filter);
    saveFilterPreference(filter);
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadUserPreferences();
    // Uncomment to enable auto-refresh every 5 minutes
    // enableAutoRefresh(5);
});

console.log('Booking List UI initialized');
console.log('Keyboard shortcuts:');
console.log('  Ctrl+1: Tất cả');
console.log('  Ctrl+2: Đang ở');
console.log('  Ctrl+3: Check-in hôm nay');
console.log('  Ctrl+4: Check-out hôm nay');
console.log('  Ctrl+5: Sắp tới');
console.log('  Ctrl+R: Làm mới');