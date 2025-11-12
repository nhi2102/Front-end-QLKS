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

    // Parse response một lần duy nhất
    const data = await response.json();

    if (!response.ok) {
        // Throw error với message từ backend
        throw new Error(data.message || 'Lỗi khi cập nhật trạng thái phòng');
    }

    // Trả về data nếu thành công
    return data;
}

// Export để dùng bên UI (nếu không dùng module thì gán window)
window.RoomAPI = {
    getAllRoomsAPI,
    updateRoomStatus
};