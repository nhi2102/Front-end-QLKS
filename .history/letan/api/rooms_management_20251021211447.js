// ==========================================
// 📡 Rooms Management API (Dành cho Lễ tân)
// ==========================================

const API_BASE_URL = 'https://localhost:7076/api';

// Lấy toàn bộ danh sách phòng
async function getAllRoomsAPI() {
    const res = await fetch(`${API_BASE_URL}/Phongs`);
    if (!res.ok) throw new Error('Không thể tải danh sách phòng');
    return await res.json();
}

// Cập nhật trạng thái phòng
async function updateRoomStatusAPI(roomId, data) {
    const res = await fetch(`${API_BASE_URL}/Phongs/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật trạng thái phòng');
    return await res.json().catch(() => ({}));
}

// Export để dùng bên UI (nếu không dùng module thì gán window)
window.RoomAPI = {
    getAllRoomsAPI,
    updateRoomStatusAPI
};