//BOOKING API LAYER - Xử lý giao tiếp với server


const API_BASE = 'https://localhost:7076/api';

// ===== UTILITY FUNCTIONS =====
function formatDateOnly(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.includes('/') ? dateStr.split('/') : null;
    if (parts && parts.length === 3) {
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return new Date(dateStr).toISOString().split('T')[0];
}

// ===== API CALLS =====

/**
 * Lấy thông tin khách hàng từ localStorage hoặc API
 */
async function getCustomerInfo() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let customerId = currentUser.customerId || currentUser.makhachhang ||
        currentUser.makh || currentUser.MaKh || currentUser.id;

    // Nếu không có ID, tìm bằng email
    if (!customerId && currentUser.email) {
        const response = await fetch(`${API_BASE}/Khachhangs`);
        if (response.ok) {
            const customers = await response.json();
            const customer = customers.find(c => (c.email || c.Email) === currentUser.email);
            if (customer) {
                customerId = customer.makh || customer.maKh || customer.id;
                currentUser.makh = customerId;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        }
    }

    if (!customerId) throw new Error('Không tìm thấy thông tin khách hàng');

    // Lấy chi tiết khách hàng
    const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`);
    if (!response.ok) throw new Error('Không thể lấy thông tin khách hàng');

    return await response.json();
}
/**
 * Đặt nhiều phòng trong cùng 1 mã đặt phòng (gộp hóa đơn)
 */
async function bookRooms(bookingData) {
    const customer = await getCustomerInfo();
    const { searchInfo, rooms } = bookingData;
    const [checkIn, checkOut] = searchInfo.dateRange.split(' - ');

    const maLoaiPhongs = [];
    const giaPhongs = [];
    const soLuongPhongs = [];

    for (const r of rooms) {
        const maLoaiPhong = typeof r.roomType === 'string' ?
            parseInt(r.roomType.split('-')[1], 10) :
            r.roomTypeId;
        if (!maLoaiPhong) continue;
        maLoaiPhongs.push(maLoaiPhong);
        giaPhongs.push(r.price);
        soLuongPhongs.push(r.quantity || 1);
    }

    const body = {
        Makh: customer.makh || customer.id,
        CheckIn: formatDateOnly(checkIn),
        CheckOut: formatDateOnly(checkOut),
        MaLoaiPhongs: maLoaiPhongs,
        GiaPhongs: giaPhongs,
        SoLuongPhongs: soLuongPhongs,
        Ghichu: bookingData.ghiChu || null,
        DiemSuDung: bookingData.diemSuDung || 0
    };

    console.log(" Gửi request đặt phòng:", body);

    const res = await fetch(`${API_BASE}/Datphongs/datphong`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Lỗi đặt phòng: ${await res.text()}`);
    const result = await res.json();

    if (!result.success) throw new Error(result.message || 'Đặt phòng thất bại');
    console.log(" Đặt phòng thành công:", result);

    // --- Lưu dịch vụ nếu có ---
    await saveServices(result.maDatPhong, rooms);

    // --- Đợi backend commit / trigger cập nhật tổng tiền xong ---
    let invoice = null;
    for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 1000));
        invoice = await getInvoiceInfo(result.hoaDonId);
        if (invoice && invoice.tongtien > 0) break;
    }


    // --- Tổng tiền chính xác ---
    // ƯU TIÊN dữ liệu từ API backend vì backend đã tính chính xác nhất
    let tongHoaDon = 0;
    if (result && typeof result.tongTien !== 'undefined' && result.tongTien !== null) {
        tongHoaDon = result.tongTien; //  backend gửi 499000
    } else if (invoice && typeof invoice.tongtien !== 'undefined' && invoice.tongtien !== null) {
        tongHoaDon = invoice.tongtien;
    }


    console.log(" Tổng tiền cuối cùng gửi qua VNPay:", tongHoaDon);
    console.log(" Tổng tiền backend trả về:", result.tongTien);
    console.log(" Tổng tiền hóa đơn DB:", invoice ? invoice.tongtien : null);
    console.log(" Tổng tiền cuối cùng gửi sang VNPay:", tongHoaDon);

    return {
        success: true,
        message: result.message,
        bookingId: result.maDatPhong,
        hoaDonId: result.hoaDonId,
        tongTien: Math.round(Number(tongHoaDon))

    };
}



/**
 * Lấy thông tin hóa đơn theo mã
 */
async function getInvoiceInfo(hoaDonId) {
    const res = await fetch(`${API_BASE}/Hoadons/${hoaDonId}`);
    if (!res.ok) throw new Error('Không lấy được hóa đơn');
    const data = await res.json();
    console.log(" Thông tin hóa đơn từ DB:", data);
    return data;
}


/**
 * Lưu dịch vụ cho các booking
 */
/**
 * Lưu dịch vụ cho 1 mã đặt phòng (đặt nhiều phòng)
 */
async function saveServices(maDatPhong, rooms) {
    if (!maDatPhong) {
        console.warn("⚠️ Không có mã đặt phòng để lưu dịch vụ");
        return;
    }

    console.log(`📝 Lưu dịch vụ cho mã đặt phòng ${maDatPhong}`);
    console.log("🔍 Rooms nhận được:", rooms);
    console.log("🔍 Số phòng:", rooms ? .length);

    // Lặp qua tất cả các phòng
    for (const room of rooms) {
        console.log("🔍 Kiểm tra phòng:", room.title || room.roomType ? .tenloaiphong);
        console.log("🔍 Services của phòng:", room.services);

        if (!room.services || !room.services.length) {
            console.log("⚠️ Phòng không có dịch vụ, bỏ qua");
            continue;
        }

        for (const service of room.services) {
            try {
                const payload = {
                    Madatphong: maDatPhong,
                    Madv: service.madv || service.serviceId,
                    Soluong: service.soluong || service.quantity || 1,
                    Manv: NULL // Dùng MANV = 1 (nhân viên mặc định cho booking online)
                };

                console.log("📤 Gọi API /Sudungdvs/sudungdv:", payload);

                const response = await fetch(`${API_BASE}/Sudungdvs/sudungdv`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok) {
                    console.log(`✅ Đã thêm dịch vụ (${service.tendv || service.name}) vào đặt phòng ${maDatPhong}`);
                } else {
                    console.error(`❌ Lỗi khi thêm dịch vụ (${service.tendv || service.name}):`, result.message);
                }
            } catch (err) {
                console.error('❌ Lỗi khi gọi /Sudungdvs/sudungdv:', err);
            }
        }
    }
}

/**
 * Tạo URL thanh toán VNPay
 */
async function createVNPayURL(paymentInfo) {
    console.log(" Mã hóa đơn gửi sang thanh toán:", paymentInfo.orderId);
    console.log(" Dữ liệu gửi:", paymentInfo);
    const response = await fetch('https://localhost:7076/api/Payment/CreateVNPayUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Name: paymentInfo.name,
            OrderId: paymentInfo.orderId,
            OrderType: 'hotel_booking',
            Amount: Math.round(paymentInfo.amount),
            OrderInfo: paymentInfo.orderInfo,
            OrderDescription: paymentInfo.orderDescription,
            ReturnUrl: paymentInfo.returnUrl,
        })
    });

    if (!response.ok) throw new Error('Không thể tạo URL thanh toán');

    const data = await response.json();
    return data.url || data.Url;
}


// Export
window.BookingAPI = {
    getCustomerInfo,
    bookRooms,
    createVNPayURL,
    getInvoiceInfo
};