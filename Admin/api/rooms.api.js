const API_BASE_URL = 'https://localhost:7076';
const API_BOOKING_BASE = 'https://localhost:7076/api'; // Dùng để gọi API Đặt phòng

async function apiRequest(url, options = {}) {
    options.headers = { 'Content-Type': 'application/json', ...options.headers };

        // === THÊM LOGIC CHỐNG CACHE ===
    let fetchUrl = url;
    const method = options.method || 'GET';
    // Chỉ thêm vào lệnh GET
    if (method === 'GET') {
        const separator = fetchUrl.includes('?') ? '&' : '?';
        fetchUrl += `${separator}_=${new Date().getTime()}`; // Thêm timestamp
    }
    // === KẾT THÚC THÊM LOGIC ===
    try {
        console.log(`>>> ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, options);
        console.log(`<<< Status ${response.status}`);
        if (!response.ok) {
            const text = await response.text();
            let err;
            try {
                err = JSON.parse(text);
            } catch {
                err = { message: text };
            }
            throw new Error(err.message || `Lỗi ${response.status}`);
        }
        if (response.status === 204) return null;
        const ct = response.headers.get("content-type");
        const data = ct?.includes("application/json") ? await response.json() : await response.text();
        console.log(`<<< Data:`, data);
        return data;
    } catch (error) {
        console.error(`XXX Lỗi API ${url}:`, error);
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Không kết nối được tới server. Kiểm tra backend và HTTPS.');
        }
        throw error;
    }
}

// === LOẠI PHÒNG ===
const ROOM_TYPE_ENDPOINT = `${API_BASE_URL}/api/Loaiphongs`;
export async function getRoomTypes() { return apiRequest(ROOM_TYPE_ENDPOINT); }
export async function createRoomType(p) {
    return apiRequest(ROOM_TYPE_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
            tenloaiphong: p.tenloaiphong,
            giacoban: p.giacoban,
            songuoitoida: p.songuoitoida,
            sogiuong: p.sogiuong || 1,
            mota: p.mota || " ",
            trangthai: p.trangthai || "Hoạt động"
        })
    });
}
export async function updateRoomType(id, p) {
    return apiRequest(`${ROOM_TYPE_ENDPOINT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            maloaiphong: id,
            tenloaiphong: p.tenloaiphong,
            giacoban: p.giacoban,
            songuoitoida: p.songuoitoida,
            sogiuong: p.sogiuong || 1,
            mota: p.mota || " ",
            trangthai: p.trangthai
        })
    });
}
export async function deleteRoomType(id) {
    return apiRequest(`${ROOM_TYPE_ENDPOINT}/${id}`, { method: 'DELETE' });
}


// === PHÒNG ===
const ROOM_ENDPOINT = `${API_BASE_URL}/api/Phongs`;
export async function getRooms() { return apiRequest(ROOM_ENDPOINT); }
export async function createRoom(p) {
    return apiRequest(ROOM_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
            sophong: p.sophong,
            maloaiphong: p.maloaiphong,
            succhua: p.succhua,
            trangthai: p.trangthai,
            mahinhphong: p.mahinhphong || 1,
            mavoucher: p.mavoucher || null
        })
    });
}
export async function updateRoom(id, p) {
    return apiRequest(`${ROOM_ENDPOINT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            maphong: id,
            sophong: p.sophong,
            maloaiphong: p.maloaiphong,
            succhua: p.succhua,
            trangthai: p.trangthai,
            mahinhphong: p.mahinhphong || 1,
            mavoucher: p.mavoucher || null
        })
    });
}
export async function deleteRoom(id) {
    return apiRequest(`${ROOM_ENDPOINT}/${id}`, { method: 'DELETE' });
}


// === DỊCH VỤ KHÁCH SẠN ===
const HOTEL_SERVICE_ENDPOINT = `${API_BASE_URL}/api/Dichvus`;
export async function getHotelServices() { return apiRequest(HOTEL_SERVICE_ENDPOINT); }
export async function createHotelService(p) {
    return apiRequest(HOTEL_SERVICE_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
            tendv: p.tendv,
            giatien: p.giatien,
            mota: p.mota || " ",
            trangthai: p.trangthai || "Hiệu lực",
            maloaidv: parseInt(p.maloaidv)
        })
    });
}
export async function updateHotelService(id, p) {
    return apiRequest(`${HOTEL_SERVICE_ENDPOINT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            madv: id,
            tendv: p.tendv,
            giatien: p.giatien,
            mota: p.mota || " ",
            trangthai: p.trangthai || "Hiệu lực",
            maloaidv: parseInt(p.maloaidv)
        })
    });
}
export async function deleteHotelService(id) {
    return apiRequest(`${HOTEL_SERVICE_ENDPOINT}/${id}`, { method: 'DELETE' });
}


// === LOẠI DỊCH VỤ ===
const SERVICE_TYPE_ENDPOINT = `${API_BASE_URL}/api/Loaidvs`;
export async function getServiceTypes() { return apiRequest(SERVICE_TYPE_ENDPOINT); }


// === KHUYẾN MÃI (CHUNG) ===
const PROMOTION_ENDPOINT = `${API_BASE_URL}/api/Khuyenmais`;
export async function getPromotions() { return apiRequest(PROMOTION_ENDPOINT); }
export async function createPromotion(p) {
    return apiRequest(PROMOTION_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
            tenkhuyenmai: p.tenKhuyenMai,
            soluong: p.soLuong || null,
            trangthai: p.trangThai || "Hoạt động",
            mota: p.moTa || " ",
            giamgia: p.giamGia || null,
            ngaybatdau: p.ngayBatDau,
            ngayketthuc: p.ngayKetThuc,
            manv: p.maNv || null,
            maloaiPhong: p.maLoaiPhong || null
        })
    });
}
export async function updatePromotion(id, p) {
    return apiRequest(`${PROMOTION_ENDPOINT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            makhuyenmai: id,
            tenkhuyenmai: p.tenKhuyenMai,
            soluong: p.soLuong || null,
            trangthai: p.trangThai,
            mota: p.moTa || " ",
            giamgia: p.giamGia || null,
            ngaybatdau: p.ngayBatDau,
            ngayketthuc: p.ngayKetThuc,
            manv: p.maNv || null,
            maloaiPhong: p.maLoaiPhong || null
        })
    });
}
export async function deletePromotion(id) {
    return apiRequest(`${PROMOTION_ENDPOINT}/${id}`, { method: 'DELETE' });
}

// === NHÂN VIÊN ===
const STAFF_ENDPOINT = `${API_BASE_URL}/api/Nhanviens`;
export async function getStaffs() { return apiRequest(STAFF_ENDPOINT); }


// === VOUCHER (Đã đầy đủ) ===
const VOUCHER_ENDPOINT = `${API_BASE_URL}/api/Vouchers`;

export async function getVouchers() {
    return apiRequest(VOUCHER_ENDPOINT);
}

export async function createVoucher(payload) {
    return apiRequest(VOUCHER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
            mavoucher: payload.mavoucher?.trim(),
            tenvoucher: payload.tenvoucher,
            mota: payload.mota || " ",
            giagiam: payload.giagiam,
            ngaybatdau: payload.ngaybatdau,
            ngayketthuc: payload.ngayketthuc,
            maloaiphong: payload.maloaiphong
        })
    });
}

export async function updateVoucher(id, payload) {
    return apiRequest(`${VOUCHER_ENDPOINT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            mavoucher: id,
            tenvoucher: payload.tenvoucher,
            mota: payload.mota || " ",
            giagiam: payload.giagiam,
            ngaybatdau: payload.ngaybatdau,
            ngayketthuc: payload.ngayketthuc,
            maloaiphong: payload.maloaiphong
        })
    });
}

export async function deleteVoucher(id) {
    return apiRequest(`${VOUCHER_ENDPOINT}/${id}`, { method: 'DELETE' });
}

// === PHẦN BỔ SUNG: KIỂM TRA NGHIỆP VỤ ĐẶT PHÒNG ===

// Hàm helper (nội bộ), không export
async function getActiveBookings() {
    try {
        const bookings = await apiRequest(`${API_BOOKING_BASE}/Datphongs`);
        // Lọc các đặt phòng đang "Đang ở"
        return bookings.filter(b => b.trangthai === 'Đang ở');
    } catch (e) {
        console.error("Lỗi tải đặt phòng:", e);
        return []; // Trả về mảng rỗng nếu lỗi
    }
}

// Hàm helper (nội bộ), không export
async function getBookingDetails() {
    try {
        return await apiRequest(`${API_BOOKING_BASE}/Chitietdatphongs`);
    } catch (e) {
        console.error("Lỗi tải chi tiết đặt phòng:", e);
        return []; // Trả về mảng rỗng nếu lỗi
    }
}

/**
 * Kiểm tra chéo xem một phòng (roomId) có đang thuộc một đơn "Đang ở" không.
 * @param {number | string} roomId Mã phòng (maphong) cần kiểm tra
 * @returns {Promise<boolean>} Trả về true nếu phòng đang ở, ngược lại false.
 */
export async function isRoomOccupied(roomId) {
    try {
        // Tải song song 2 bảng
        const [activeBookings, allDetails] = await Promise.all([
            getActiveBookings(),
            getBookingDetails()
        ]);

        if (activeBookings.length === 0) return false;

        // Lấy danh sách các madatphong đang "Đang ở"
        const activeBookingIds = new Set(activeBookings.map(b => b.madatphong));

        // Tìm trong bảng chi tiết xem phòng (roomId) này có nằm trong
        // bất kỳ đặt phòng nào đang "Đang ở" không
        const isOccupied = allDetails.some(detail =>
            detail.maphong == roomId && activeBookingIds.has(detail.madatphong)
        );

        return isOccupied;
    } catch (error) {
        console.error("Lỗi kiểm tra phòng:", error);
        // An toàn là trả về 'true' để ngăn thay đổi nếu hệ thống kiểm tra lỗi
        return true;
    }
}