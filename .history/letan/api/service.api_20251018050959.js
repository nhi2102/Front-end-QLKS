// ============================
// 📦 service.api.js
// ============================

const API_BASE = 'https://localhost:7076/api';

// Dữ liệu toàn cục
let currentGuestsData = [];
let availableServices = [];
let selectedServices = [];
let currentBookingId = null;

// Utility format
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    } catch {
        return 'N/A';
    }
}

function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// ============================
// ⚙️ API functions
// ============================

// Lấy danh sách khách đang ở
async function loadCurrentGuests() {
    const response = await fetch(`${API_BASE}/Datphongs/checked-in`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    currentGuestsData = data;
    return data;
}

// Lấy danh sách dịch vụ đang hiệu lực
async function loadAvailableServices() {
    const response = await fetch(`${API_BASE}/Dichvus`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    availableServices = data.filter(s => s.trangthai === "Hiệu lực");
    return availableServices;
}

// Gọi procedure thêm dịch vụ (TAO_SUDUNGDV)
async function addServiceToBooking(bookingId, serviceId, quantity) {
    const payload = { madatphong: bookingId, madv: serviceId, soluong: quantity };
    const res = await fetch(`${API_BASE}/Sudungdvs/sudungdv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Lỗi thêm dịch vụ ${serviceId}`);
    return res.json();
}

// Lấy lịch sử sử dụng dịch vụ
async function getServiceHistory(bookingId) {
    const response = await fetch(`${API_BASE}/Sudungdvs/history/${bookingId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

// Export các hàm ra window
window.api = {
    loadCurrentGuests,
    loadAvailableServices,
    addServiceToBooking,
    getServiceHistory,
    formatDate,
    formatCurrency
};