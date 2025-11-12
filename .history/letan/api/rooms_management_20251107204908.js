const API_BASE_URL = 'https://localhost:7076/api';

// Lấy toàn bộ danh sách phòng
async function getAllRoomsAPI() {
    const res = await fetch(`${API_BASE_URL}/Phongs/letan-view`);
    if (!res.ok) throw new Error('Không thể tải danh sách phòng');
    return await res.json();
}


// Cập nhật trạng thái phòng
async function updateRoomStatus(maPhong, trangThai) {
    const response = await fetch(`${API_BASE_URL}/Phongs/cap-nhat-trang-thai/${maPhong}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(trangThai)
    });

    if (!response.ok) {
        // Parse error response để lấy message
        try {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi cập nhật trạng thái phòng');
        } catch (parseError) {
            const errorText = await response.text();
            throw new Error(errorText || 'Lỗi khi cập nhật trạng thái phòng');
        }
    }
    
    // Trả về JSON response
    return await response.json();
}

// Export để dùng bên UI (nếu không dùng module thì gán window)
window.RoomAPI = {
    getAllRoomsAPI,
    updateRoomStatus
};