// ============================================
// BOOKING API LOGIC (XỬ LÝ API ĐẶT PHÒNG)
// ============================================

const API_BASE_URL = "https://localhost:7076/api";

// --- Hàm tiện ích chung cho API: gọi fetch và kiểm tra lỗi ---
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`API ${url} lỗi: ${res.status} - ${msg}`);
    }
    return await res.json();
}

// --- Lấy danh sách loại phòng ---
async function loadRoomTypesAPI() {
    return await apiFetch(`${API_BASE_URL}/Loaiphongs`);
}

// --- Tìm phòng trống theo ngày ---
async function fetchAvailableRoomsAPI(checkInDate, checkOutDate) {
    return await apiFetch(`${API_BASE_URL}/Phongs/timphong/${checkInDate}/${checkOutDate}`);
}

// --- Lấy thông tin chi tiết 1 phòng ---
async function getRoomDetailsAPI(maPhong) {
    const phong = await apiFetch(`${API_BASE_URL}/Phongs/${maPhong}`);
    const loaiPhong = await apiFetch(`${API_BASE_URL}/Loaiphongs/${phong.maloaiphong}`);

    let hinhAnh = [];
    try {
        const hinh = await apiFetch(`${API_BASE_URL}/Hinhanhphongs/${phong.mahinhphong}`);
        if (hinh.hinhchinh) hinhAnh.push({ duongdan: `../assets/img/${hinh.hinhchinh}` });
        for (let i = 1; i <= 5; i++) {
            const key = `hinhphu${i}`;
            if (hinh[key]) hinhAnh.push({ duongdan: `../assets/img/${hinh[key]}` });
        }
    } catch {
        // Bỏ qua nếu không có hình ảnh
    }

    return {...phong, loaiPhong, hinhAnh };
}

// --- Tìm hoặc tạo mới khách hàng ---
async function findOrCreateCustomerAPI(payload) {
    const searchParams = [
        `${API_BASE_URL}/Khachhangs?cccd=${payload.cccd}`,
        `${API_BASE_URL}/Khachhangs?sdt=${payload.sdt}`,
    ];

    for (const url of searchParams) {
        try {
            const data = await fetch(url);
            const body = await data.json();
            if (Array.isArray(body) && body.length > 0) return body[0];
        } catch {}
    }

    // Nếu không tìm thấy → tạo mới khách hàng
    return await apiFetch(`${API_BASE_URL}/Khachhangs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

// --- Tạo mới đặt phòng ---
async function createBookingAPI(payload) {
    return await apiFetch(`${API_BASE_URL}/Datphongs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

// --- Thực hiện check-in ngay sau khi đặt phòng ---
async function performImmediateCheckinAPI(maDatPhong, data) {
    return await apiFetch(`${API_BASE_URL}/Datphongs/checkin/${maDatPhong}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
}

// --- Debug: lấy toàn bộ dữ liệu phòng, loại phòng, đặt phòng ---
async function debugAllDataAPI() {
    const [rooms, roomTypes, bookings] = await Promise.all([
        apiFetch(`${API_BASE_URL}/Phongs`),
        apiFetch(`${API_BASE_URL}/Loaiphongs`),
        apiFetch(`${API_BASE_URL}/Datphongs`)
    ]);
    return { rooms, roomTypes, bookings };
}

// --- Xuất các hàm API ra phạm vi toàn cục (window) để UI có thể gọi ---
window.API = {
    loadRoomTypesAPI,
    fetchAvailableRoomsAPI,
    getRoomDetailsAPI,
    findOrCreateCustomerAPI,
    createBookingAPI,
    performImmediateCheckinAPI,
    debugAllDataAPI
};
// ============================================