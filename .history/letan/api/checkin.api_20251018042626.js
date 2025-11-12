// api/checkin.api.js
const API_BASE = 'https://localhost:7076/api';

// =========================
// 🔹 API CALLS
// =========================

// Lấy danh sách chờ check-in
async function apiGetPendingCheckIns() {
    const response = await fetch(`${API_BASE}/Datphongs/pending-checkins`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData ? .message || `HTTP ${response.status}`);
    }
    return await response.json();
}

// Lấy thông tin khách hàng theo mã
async function apiGetCustomerById(id) {
    const response = await fetch(`${API_BASE}/Khachhangs/${id}`);
    if (!response.ok) throw new Error(`Không thể lấy dữ liệu khách hàng ${id}`);
    return await response.json();
}

// Lấy chi tiết đặt phòng theo mã đặt
async function apiGetRoomDetailsByBooking(madatphong) {
    const response = await fetch(`${API_BASE}/Chitietdatphongs?madatphong=${madatphong}`);
    if (!response.ok) throw new Error(`Không thể lấy chi tiết phòng cho mã ${madatphong}`);
    return await response.json();
}

// Lấy thông tin phòng theo mã
async function apiGetRoomById(id) {
    const response = await fetch(`${API_BASE}/Phongs/${id}`);
    if (!response.ok) throw new Error(`Không thể lấy dữ liệu phòng ${id}`);
    return await response.json();
}

// Gửi xác nhận check-in
async function apiConfirmCheckIn(madatphong, payload) {
    const response = await fetch(`${API_BASE}/Datphongs/${madatphong}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData ? .message || `Lỗi check-in (${response.status})`);
    }
    return await response.json();
}