// ============================================
// ROOM CHANGE PAGE - API HANDLERS
// ============================================

const API_BASE_URL = 'https://localhost:7076/api';

/**
 * Lấy tất cả loại phòng
 */
async function getRoomTypesAPI() {
    const res = await fetch(`${API_BASE_URL}/LoaiPhongs`);
    if (!res.ok) throw new Error('Không thể tải danh sách loại phòng');
    return await res.json();
}

/**
 * Lấy tất cả đơn đặt phòng (hoặc lọc theo điều kiện)
 */
async function getAllBookingsAPI() {
    const res = await fetch(`${API_BASE_URL}/DatPhongs`);
    if (!res.ok) throw new Error('Không thể tải danh sách đặt phòng');
    return await res.json();
}

/**
 * Lấy thông tin khách hàng theo ID
 */
async function getCustomerByIdAPI(customerId) {
    const res = await fetch(`${API_BASE_URL}/KhachHangs/${customerId}`);
    if (!res.ok) throw new Error('Không thể tải thông tin khách hàng');
    return await res.json();
}

/**
 * Lấy chi tiết đặt phòng theo mã đặt phòng
 */
async function getRoomDetailsByBookingIdAPI(bookingId) {
    const res = await fetch(`${API_BASE_URL}/ChiTietDatPhongs/booking/${bookingId}`);
    if (!res.ok) throw new Error('Không thể tải chi tiết phòng');
    return await res.json();
}

/**
 * Lấy danh sách phòng trống
 */
async function fetchAvailableRoomsAPI(checkInDate, checkOutDate) {
    return await apiFetch(`${API_BASE_URL}/Phongs/timphong/${checkInDate}/${checkOutDate}`);
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
 * Cập nhật chi tiết đặt phòng (đổi phòng)
 */
async function updateRoomDetailAPI(detailId, updateData) {
    const res = await fetch(`${API_BASE_URL}/ChiTietDatPhongs/${detailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    });
    if (!res.ok) throw new Error('Không thể cập nhật chi tiết đặt phòng');
    return await res.json();
}

/**
 * Cập nhật thông tin đặt phòng (cộng tiền hoặc ghi chú)
 */
async function updateBookingAPI(bookingId, bookingData) {
    const res = await fetch(`${API_BASE_URL}/DatPhongs/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    });
    if (!res.ok) throw new Error('Không thể cập nhật thông tin đặt phòng');
    return await res.json();
}

// Export sang UI
window.RoomChangeAPI = {
    getRoomTypesAPI,
    getAllBookingsAPI,
    getCustomerByIdAPI,
    getRoomDetailsByBookingIdAPI,
    getAvailableRoomsAPI,
    getRoomByIdAPI,
    updateRoomDetailAPI,
    updateBookingAPI
};