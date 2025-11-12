// api.js — Quản lý tất cả các hàm làm việc với API
const API_BASE = 'https://localhost:7076/api';

// 🔹 Lấy danh sách booking chờ check-in
//Lấy danh sách booking chờ check-in
async function getPendingCheckIns() {
    const response = await fetch(`${API_BASE}/Datphongs/pending-checkins`);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi tải danh sách chờ check-in: ${errorText}`);
    }
    return response.json();
}

// 🔹 Gọi API xác nhận check-in
//Gọi API xác nhận check-in
async function checkInBooking(bookingId, checkInData) {
    const response = await fetch(`${API_BASE}/Datphongs/checkin/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi khi check-in: ${errorText}`);
    }
    return response.json();
}

// 🔹 Lấy thông tin khách hàng (khi cần)
//Lấy thông tin khách hàng (khi cần)
async function getCustomerById(customerId) {
    const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`);
    if (!response.ok) throw new Error('Lỗi tải dữ liệu khách hàng');
    return response.json();
}

// 🔹 Lấy chi tiết đặt phòng (nếu cần)
//Lấy chi tiết đặt phòng (nếu cần)
async function getRoomDetailsByBookingId(bookingId) {
    const response = await fetch(`${API_BASE}/Chitietdatphongs?madatphong=${bookingId}`);
    if (!response.ok) throw new Error('Lỗi tải chi tiết phòng');
    return response.json();
}

// 🔹 Lấy thông tin phòng theo mã
//Lấy thông tin phòng theo mã
async function getRoomById(roomId) {
    const response = await fetch(`${API_BASE}/Phongs/${roomId}`);
    if (!response.ok) throw new Error('Lỗi tải thông tin phòng');
    return response.json();
}

// Xuất các hàm API ra global (để ui.js dùng được)
window.api = {
    getPendingCheckIns,
    checkInBooking,
    getCustomerById,
    getRoomDetailsByBookingId,
    getRoomById
};