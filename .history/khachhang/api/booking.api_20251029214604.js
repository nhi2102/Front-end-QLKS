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
        Ghichu: (bookingData.customer && bookingData.customer.request) || null,
        DiemSuDung: bookingData.diemSuDung || 0 // có thể để 0 nếu không dùng
    };

    console.log("📤 Gửi request đặt phòng:", body);

    const res = await fetch(`${API_BASE}/Datphongs/datphong`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Lỗi đặt phòng: ${await res.text()}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Đặt phòng thất bại');

    console.log("✅ Đặt phòng thành công:", result);

    // Lưu dịch vụ nếu có
    await saveServices(result.maDatPhong, rooms);

    // Đợi backend commit xong
    await new Promise(r => setTimeout(r, 800));

    // Lấy thông tin hóa đơn từ backend
    let invoice = null;
    try {
        invoice = await getInvoiceInfo(result.hoaDonId);
    } catch (e) {
        console.warn('Không lấy được hóa đơn:', e);
    }

    // Tổng tiền cuối cùng lấy từ hóa đơn, fallback về API trả về
    const tongHoaDon = (invoice ? .tongTien ? ? result.tongTien ? ? 0);

    return {
        success: true,
        message: result.message,
        bookingId: result.maDatPhong,
        hoaDonId: result.hoaDonId,
        tongTien: Number(tongHoaDon)
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
        console.warn(" Không có mã đặt phòng để lưu dịch vụ");
        return;
    }

    console.log(` Lưu dịch vụ cho mã đặt phòng ${maDatPhong}`);

    // Lặp qua tất cả các phòng
    for (const room of rooms) {
        if (!room.services || !room.services.length) continue;

        for (const service of room.services) {
            try {
                const payload = {
                    Madatphong: maDatPhong, //  tất cả chung mã
                    Madv: service.madv || service.serviceId,
                    Soluong: service.soluong || service.quantity || 1
                };

                console.log(" Gọi API /Sudungdvs/sudungdv:", payload);

                const response = await fetch(`${API_BASE}/Sudungdvs/sudungdv`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok) {
                    console.log(` Đã thêm dịch vụ (${service.tendv || service.name}) vào đặt phòng ${maDatPhong}`);
                } else {
                    console.error(` Lỗi khi thêm dịch vụ (${service.tendv || service.name}):`, result.message);
                }
            } catch (err) {
                console.error(' Lỗi khi gọi /Sudungdvs/sudungdv:', err);
            }
        }
    }
}

/**
 * Tạo URL thanh toán VNPay
 */
async function createVNPayURL(paymentInfo) {
    console.log(" Mã hóa đơn gửi sang thanh toán:", paymentInfo.OrderId);
    console.log(" Dữ liệu gửi:", paymentInfo);
    const response = await fetch('https://localhost:7076/api/Payment/CreateVNPayUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Name: paymentInfo.name,
            OrderId: paymentInfo.orderId || paymentInfo.OrderId,
            OrderType: 'hotel_booking',
            Amount: paymentInfo.amount,
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