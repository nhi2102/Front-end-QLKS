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
    return await apiFetch(`${API_BASE_URL}/Phongs/timphongletan/${checkInDate}/${checkOutDate}`);
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
    // Gọi API tìm kiếm khách hàng theo CCCD hoặc SĐT
    const query = new URLSearchParams();
    if (payload.cccd) query.append("cccd", payload.cccd);
    if (payload.sdt) query.append("sdt", payload.sdt);

    const url = `${API_BASE_URL}/Khachhangs/timkiem?${query.toString()}`;

    try {
        const res = await fetch(url);
        const body = await res.json();

        if (Array.isArray(body) && body.length > 0) {
            console.log("[Client] Tìm thấy khách hàng:", body[0]);
            return body[0];
        }
    } catch (error) {
        console.error("[Client] Lỗi khi tìm khách hàng:", error);
    }

    // Nếu không tìm thấy → tạo mới khách hàng
    console.log("[Client] Không tìm thấy, tạo khách hàng mới...");
    return await apiFetch(`${API_BASE_URL}/Khachhangs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            hoten: payload.hoten,
            sdt: payload.sdt,
            cccd: payload.cccd,
            email: payload.email || "",
            trangthai: "Hoạt động",
            matkhau: "123456"
        })
    });
}


// --- Tạo mới đặt phòng (và chi tiết phòng) ---
async function createBookingAPI(payload) {
    // Lấy mã nhân viên từ currentUser
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const manv = currentUser.manv || currentUser.maNV || currentUser.id || 1;

    console.log('🔍 currentUser:', currentUser);
    console.log('🔍 Mã nhân viên sẽ lưu:', manv);

    // Bước 1: tạo đặt phòng chính
    const bookingPayload = {
        makh: payload.Makh,
        ngaynhanphong: payload.Ngaynhanphong,
        ngaytraphong: payload.Ngaytraphong,
        tongtien: payload.Chitietdatphongs.reduce((sum, r) => sum + r.Tongcong, 0),
        trangthai: "Đã đặt",
        trangthaithanhtoan: "Chưa thanh toán",
        ghichu: payload.Ghichu || null,
        manv: manv // Thêm mã nhân viên
    };

    console.log('📤 Payload gửi đến /Datphongs:', bookingPayload);

    const datphong = await apiFetch(`${API_BASE_URL}/Datphongs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload)
    });

    // Bước 2: thêm chi tiết đặt phòng
    await createBookingDetailsAPI(payload.Chitietdatphongs, datphong.madatphong);

    // Bước 3: tạo hóa đơn
    await createInvoiceAPI();


}

// --- Tạo chi tiết đặt phòng ---
async function createBookingDetailsAPI(details, maDatPhong) {
    for (const item of details) {
        const payload = {
            madatphong: maDatPhong,
            maphong: item.Maphong,
            tongcong: item.Tongcong,
            trangthai: "Đã đặt"
        };
        await apiFetch(`${API_BASE_URL}/Chitietdatphongs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }
}
// --- Tạo hóa đơn và chi tiết hóa đơn ---
async function createInvoiceAPI() {
    try {
        const res = await apiFetch(`${API_BASE_URL}/Hoadons/taohoadon`, {
            method: "POST"
        });
        console.log(res);
        return res;
    } catch (error) {
        console.error(error);
    }
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

function formatDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '-'; }

function formatCurrency(v) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0); }

function formatDateTime(d) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return d ? new Date(d).toLocaleString('vi-VN', options) : '-';
}

// --- Xuất các hàm API ra phạm vi toàn cục (window) để UI có thể gọi ---
window.API = {
    loadRoomTypesAPI,
    fetchAvailableRoomsAPI,
    getRoomDetailsAPI,
    findOrCreateCustomerAPI,
    createBookingAPI,
    performImmediateCheckinAPI,
    debugAllDataAPI,
    createInvoiceAPI
};
// ============================================