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
            matkhau: "123456"
        })
    });
}


// --- Tạo mới đặt phòng (và chi tiết phòng) ---
async function createBookingAPI(payload) {
    // Bước 1: tạo đặt phòng chính
    const datphong = await apiFetch(`${API_BASE_URL}/Datphongs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            makh: payload.Makh,
            ngaynhanphong: payload.Ngaynhanphong,
            ngaytraphong: payload.Ngaytraphong,
            tongtien: payload.Chitietdatphongs.reduce((sum, r) => sum + r.Tongcong, 0),
            trangthai: "Đã đặt",
            trangthaithanhtoan: "Chưa thanh toán",
            ghichu: payload.Ghichu || null
        })
    });

    // Bước 2: thêm chi tiết đặt phòng
    await createBookingDetailsAPI(payload.Chitietdatphongs, datphong.madatphong);

    // Bước 3: tạo hóa đơn
    await createInvoiceAPI();

    // Bước 4: in phiếu xác nhận đặt phòng
    printBooking({
        id: datphong.madatphong,
        bookingDate: new Date(),
        status: "Đã đặt",
        paymentStatus: "Chưa thanh toán",
        customerName: payload.KhachHang && payload.KhachHang.hoten ? payload.KhachHang.hoten : "Khách lẻ",
        customerPhone: payload.KhachHang && payload.KhachHang.sdt ? payload.KhachHang.sdt : "",
        customerEmail: payload.KhachHang && payload.KhachHang.email ? payload.KhachHang.email : "",
        customerID: payload.KhachHang && payload.KhachHang.cccd ? payload.KhachHang.cccd : "",
        roomNumber: payload.Chitietdatphongs && payload.Chitietdatphongs[0] && payload.Chitietdatphongs[0].SoPhong ? payload.Chitietdatphongs[0].SoPhong : "",
        roomType: payload.Chitietdatphongs && payload.Chitietdatphongs[0] && payload.Chitietdatphongs[0].LoaiPhong ? payload.Chitietdatphongs[0].LoaiPhong : "",
        checkinDate: payload.Ngaynhanphong,
        checkoutDate: payload.Ngaytraphong,
        tienPhong: Array.isArray(payload.Chitietdatphongs) ? payload.Chitietdatphongs.reduce((sum, r) => sum + (r.Tongcong || 0), 0) : 0,
        tienDichVu: 0,
        totalAmount: Array.isArray(payload.Chitietdatphongs) ? payload.Chitietdatphongs.reduce((sum, r) => sum + (r.Tongcong || 0), 0) : 0,
        notes: payload.Ghichu || ""
    });

    return datphong;
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
async function fetchBookingFullInfo(bookingId) {
    try {
        // 1️ Lấy thông tin đặt phòng
        const booking = await apiFetch(`${API_BASE_URL}/Datphongs/${bookingId}`);

        // 2️ Lấy chi tiết phòng
        const details = await apiFetch(`${API_BASE_URL}/Chitietdatphongs/${bookingId}`);

        // 3️ Lấy loại phòng (từ MALOAI trong details)
        const roomTypeId = details ? .maLoaiPhong || details ? .MALOAIPHONG;
        let roomType = '';
        if (roomTypeId) {
            const typeData = await apiFetch(`${API_BASE_URL}/Loaiphongs/${roomTypeId}`);
            roomType = typeData ? .tenLoaiPhong || typeData ? .Tenloaiphong || '';
        }

        // 🧩 Gộp dữ liệu thành một object hoàn chỉnh để in
        return {
            ...booking,
            roomNumber: details ? .soPhong || details ? .SOPHONG || '',
            roomType: roomType,
            tienPhong: details ? .tienPhong || details ? .TIENPHONG || 0,
            tienDichVu: details ? .tienDichVu || details ? .TIENDICHVU || 0,
            totalAmount: booking ? .tongTien || booking ? .TONGTIEN || 0
        };
    } catch (error) {
        console.error(" Lỗi khi load dữ liệu in phiếu:", error);
        throw error;
    }
}

//in phiếu đặt phòng
function printBooking(selectedBooking) {
    if (!selectedBooking) {
        alert("Không có thông tin đặt phòng để in!");
        return;
    }

    // Gán dữ liệu vào template
    document.getElementById('p_maDatPhong').textContent = selectedBooking.id;
    document.getElementById('p_ngayDat').textContent = formatDate(selectedBooking.bookingDate);
    document.getElementById('p_trangThai').textContent = selectedBooking.status;
    document.getElementById('p_trangThaiTT').textContent = selectedBooking.paymentStatus;

    document.getElementById('p_khachHang').textContent = selectedBooking.customerName;
    document.getElementById('p_sdt').textContent = selectedBooking.customerPhone;
    document.getElementById('p_email').textContent = selectedBooking.customerEmail;
    document.getElementById('p_cccd').textContent = selectedBooking.customerID;

    document.getElementById('p_phong').textContent = selectedBooking.roomNumber;
    document.getElementById('p_loaiPhong').textContent = selectedBooking.roomType;
    document.getElementById('p_checkin').textContent = formatDate(selectedBooking.checkinDate);
    document.getElementById('p_checkout').textContent = formatDate(selectedBooking.checkoutDate);

    document.getElementById('p_tienPhong').textContent = formatCurrency(selectedBooking.tienPhong || 0);
    document.getElementById('p_tienDichVu').textContent = formatCurrency(selectedBooking.tienDichVu || 0);
    document.getElementById('p_tongTien').textContent = formatCurrency(selectedBooking.totalAmount || 0);

    document.getElementById('p_ghiChu').textContent = selectedBooking.notes || "Không có ghi chú";
    document.getElementById('p_ngayIn').textContent = formatDateTime(new Date());

    // Gán chữ ký
    document.getElementById('p_tenKhachHangKy').textContent = selectedBooking.customerName;
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    document.getElementById('p_tenLeTanKy').textContent = currentUser.name || currentUser.username || "______________________";

    // In
    const printContent = document.getElementById('printBookingTemplate').innerHTML;
    const win = window.open('', '', 'width=900,height=1000');
    win.document.write(`
        <html>
        <head>
            <title>Phiếu Đặt Phòng #${selectedBooking.id}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding:20px; color:#000; }
                table { width:100%; border-collapse: collapse; margin-bottom: 20px; }
                td, th { border: 1px solid #000; padding: 8px; }
                th { background: #f3f3f3; }
                h3, h4 { text-align:center; margin:10px 0; }
                img { display:block; margin:auto; height:80px; }
            </style>
        </head>
        <body>${printContent}</body>
        </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
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