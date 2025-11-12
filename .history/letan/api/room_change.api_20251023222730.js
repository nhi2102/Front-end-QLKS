// ============================================
// ROOM CHANGE PAGE - API 
// ============================================

const API_BASE_URL = 'https://localhost:7076/api';

/**
 * Lấy tất cả loại phòng
 */
async function getRoomTypesAPI() {
    const res = await fetch(`${API_BASE_URL}/Loaiphongs`);
    if (!res.ok) throw new Error('Không thể tải danh sách loại phòng');
    return await res.json();
}

/**
 * Lấy tất cả đơn đặt phòng (hoặc lọc theo điều kiện)
 */
async function getAllBookingsAPI() {
    const res = await fetch(`${API_BASE_URL}/Datphongs`);
    if (!res.ok) throw new Error('Không thể tải danh sách đặt phòng');
    return await res.json();
}

/**
 * Lấy thông tin khách hàng theo ID
 */
async function getCustomerByIdAPI(customerId) {
    const res = await fetch(`${API_BASE_URL}/Khachhangs/${customerId}`);
    if (!res.ok) throw new Error('Không thể tải thông tin khách hàng');
    return await res.json();
}

/**
 * Lấy chi tiết đặt phòng theo mã đặt phòng
 */
async function getRoomDetailsByBookingIdAPI(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Chitietdatphongs/booking/${bookingId}`);
    if (!res.ok) throw new Error('Không thể tải chi tiết phòng');
    return await res.json();
}

/**
 * Lấy danh sách phòng trống
 */
async function getAvailableRoomsAPI(checkInDate, checkOutDate) {
    const res = await fetch(`${API_BASE_URL}/Phongs/timphong/${checkInDate}/${checkOutDate}`);
    if (!res.ok) throw new Error('Không thể tải danh sách phòng trống');
    return await res.json();
}

/**
 * Lấy thông tin chi tiết 1 phòng
 */
async function getRoomByIdAPI(roomId) {
    const res = await fetch(`${API_BASE_URL}/Phongs/${roomId}`);
    if (!res.ok) throw new Error(`Không thể tải phòng ${roomId}`);
    return await res.json();
}
/**
 * Gọi API đổi phòng (thực thi stored procedure usp_DoiPhong)
 */
async function changeRoomAPI(data) {
    console.log("🔄 Gửi yêu cầu đổi phòng:", data);

    const res = await fetch(`${API_BASE_URL}/Datphongs/doi-phong`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const text = await res.text(); // đọc text trước để debug lỗi
    console.log("📥 Kết quả API:", text);

    if (!res.ok) {
        throw new Error(`Không thể đổi phòng. Status ${res.status}. Chi tiết: ${text}`);
    }

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}


// Export sang UI
window.RoomChangeAPI = {
    getRoomTypesAPI,
    getAllBookingsAPI,
    getCustomerByIdAPI,
    getRoomDetailsByBookingIdAPI,
    getAvailableRoomsAPI,
    getRoomByIdAPI,
    changeRoomAPI
};