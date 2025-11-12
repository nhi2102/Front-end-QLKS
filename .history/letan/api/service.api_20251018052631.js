// ============================
//  service.api.js
// ============================

const API_BASE = 'https://localhost:7076/api';

// Dữ liệu toàn cục
let currentGuestsData = [];
let availableServices = [];
let selectedServices = [];
let currentBookingId = null;

// Hàm định dạng ngày tháng
function formatDate(dateInput) {
    if (!dateInput && dateInput !== 0) return 'N/A';
    try {
        // Xử lý đối tượng Date
        if (dateInput instanceof Date) return dateInput.toLocaleDateString('vi-VN');

        // Xử lý các kiểu số nguyên (timestamp)
        if (typeof dateInput === 'number' && !isNaN(dateInput)) {
            return new Date(dateInput).toLocaleDateString('vi-VN');
        }

        // Xử lý các đối tượng bao bọc ngày tháng 
        if (typeof dateInput === 'object') {
            const candidates = [
                dateInput.ngaynhanphong, dateInput.ngaytraphong,
                dateInput.Ngaynhanphong, dateInput.Ngaytraphong,
                dateInput.checkInDate, dateInput.checkOutDate,
                dateInput.date
            ];
            for (const c of candidates) {
                if (c) return formatDate(c);
            }
            return 'N/A';
        }

        // Xử lý định dạng .NET /Date(1234567890)/
        if (typeof dateInput === 'string') {
            const dotNetMatch = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(dateInput);
            if (dotNetMatch) return new Date(parseInt(dotNetMatch[1], 10)).toLocaleDateString('vi-VN');

            // Xử lý chuỗi ngày tháng ISO / plain text
            const parsed = Date.parse(dateInput);
            if (!isNaN(parsed)) return new Date(parsed).toLocaleDateString('vi-VN');
        }

        return 'N/A';
    } catch (e) {
        console.warn('formatDate parse error', e, dateInput);
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
//  API functions
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
//Lấy thông tin khách hàng (khi cần)
async function getCustomerById(customerId) {
    const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`);
    if (!response.ok) throw new Error('Lỗi tải dữ liệu khách hàng');
    return response.json();
}

//Lấy chi tiết đặt phòng (nếu cần)
async function getRoomDetailsByBookingId(bookingId) {
    const response = await fetch(`${API_BASE}/Chitietdatphongs?madatphong=${bookingId}`);
    if (!response.ok) throw new Error('Lỗi tải chi tiết phòng');
    return response.json();
}

// Lấy thông tin phòng theo mã
async function getRoomById(roomId) {
    const response = await fetch(`${API_BASE}/Phongs/${roomId}`);
    if (!response.ok) throw new Error('Lỗi tải thông tin phòng');
    return response.json();
}

// Export các hàm ra window
window.api = {
    loadCurrentGuests,
    loadAvailableServices,
    getCustomerById,
    getRoomDetailsByBookingId,
    getRoomById,
    addServiceToBooking,
    getServiceHistory,
    formatDate,
    formatCurrency
};