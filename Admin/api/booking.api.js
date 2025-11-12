// js/booking.api.js
const API_BASE = 'https://localhost:7076/api';

// === HELPER MỚI (LỰA CHỌN B) ===
// Tải TẤT CẢ chi tiết đặt phòng
async function fetchAllBookingDetails() {
    try {
        const res = await fetch(`${API_BASE}/Chitietdatphongs`);
        if (!res.ok) throw new Error('Lỗi tải toàn bộ chi tiết đặt phòng');
        return await res.json();
    } catch (err) {
        console.error('Lỗi fetchAllBookingDetails:', err);
        return [];
    }
}

// Tải TẤT CẢ phòng
async function fetchAllRooms() {
    try {
        const res = await fetch(`${API_BASE}/Phongs`);
        if (!res.ok) throw new Error('Lỗi tải toàn bộ phòng');
        return await res.json();
    } catch (err) {
        console.error('Lỗi fetchAllRooms:', err);
        return [];
    }
}


export async function fetchBookingsByDate(date, query = '') {
    try {
        const [bookingsRes, detailsRes, roomsRes, customersRes] = await Promise.all([
            fetch(`${API_BASE}/Datphongs`),
            fetch(`${API_BASE}/Chitietdatphongs`),
            fetch(`${API_BASE}/Phongs`),
            fetch(`${API_BASE}/Khachhangs`)
        ]);

        const [bookings, details, rooms, customers] = await Promise.all([
            bookingsRes.json(),
            detailsRes.json(),
            roomsRes.json(),
            customersRes.json()
        ]);

        return bookings
            .filter(b => {
                const matchDate = !date || (b.ngaynhanphong && b.ngaynhanphong.startsWith(date));
                const search = query.toLowerCase();
                const matchQuery = !query ||
                    String(b.madatphong).includes(query) ||
                    (b.tenKhachHang && b.tenKhachHang.toLowerCase().includes(search));
                return matchDate && matchQuery;
            })
.map(b => {
    const bookingDetails = details.filter(d => d.madatphong === b.madatphong);
    const roomNumbers = bookingDetails
        .map(d => {
            const room = rooms.find(r => r.maphong === d.maphong);
            return room ? room.sophong : null;
        })
        .filter(Boolean);

    let displayRooms = 'Chưa có';
    if (roomNumbers.length > 0) {
        if (roomNumbers.length <= 3) {
            displayRooms = roomNumbers.join(', ');
        } else {
            displayRooms = roomNumbers.slice(0, 2).join(', ') + ` +${roomNumbers.length - 2}`;
        }
    }

    const customer = customers.find(c => c.makh === b.makh) || {};
    const trangThaiRaw = b.trangthaithanhtoan || b.Trangthaithanhtoan || 'CHƯA THANH TOÁN';
    const trangThai = trangThaiRaw.trim();
    const isPaid = ['ĐÃ THANH TOÁN', 'Hoàn 100%', 'Hoàn 50%'].includes(trangThai);

    return {
        id: b.madatphong,
        customerName: b.tenKhachHang || customer.hoten || 'N/A',
        roomNumber: displayRooms, // ĐÃ SỬA
        checkInDate: b.ngaynhanphong,
        checkOutDate: b.ngaytraphong,
        bookingDateTime: b.ngaydat,
        totalAmount: b.tongtien || 0,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        status: b.trangthai || 'Không xác định'
    };
});
    } catch (err) {
        console.error('Lỗi fetch đặt phòng:', err);
        throw err;
    }
}


// === SỬA (LỰA CHỌN B): TẢI CHI TIẾT ĐẶT PHÒNG ===
export async function fetchBookingDetails(id) {
    try {
        // Tải song song: 1 booking cụ thể, TẤT CẢ chi tiết, TẤT CẢ phòng
        const [bookingRes, allDetails, allRooms] = await Promise.all([
            fetch(`${API_BASE}/Datphongs/${id}`),
            fetchAllBookingDetails(), // Dùng helper
            fetchAllRooms()          // Dùng helper
        ]);

        if (!bookingRes.ok) throw new Error('Không tìm thấy');
        const booking = await bookingRes.json();

        // --- KHÁCH HÀNG (Giữ nguyên) ---
        let customerName = 'Không xác định', customerPhone = 'N/A', customerIdCard = 'N/A', customerEmail = 'N/A';
        if (booking.makh) {
            const customerRes = await fetch(`${API_BASE}/Khachhangs/${booking.makh}`);
            if (customerRes.ok) {
                const c = await customerRes.json();
                customerName = c.hoten || c.tenkhachhang || 'Không xác định';
                customerPhone = c.sodienthoai || c.sdt || 'N/A';
                customerIdCard = c.cccd || 'N/A';
                customerEmail = c.email || 'N/A';
            }
        }

        // --- LỌC PHÒNG TỪ DANH SÁCH ĐÃ TẢI VỀ (SỬA LỖI) ---
        // 1. Lọc client-side từ TẤT CẢ chi tiết
        const matchedDetails = allDetails.filter(d => d.madatphong == id); 
        
        // 2. Map client-side từ TẤT CẢ phòng (không còn N+1 fetch)
        const roomsInfo = matchedDetails.map(d => {
            const room = allRooms.find(r => r.maphong === d.maphong);
            return { number: room ? room.sophong : 'N/A' };
        });

        return {
            id: booking.madatphong,
            customerName, customerPhone, customerIdCard, customerEmail,
            rooms: roomsInfo, // Đây sẽ là mảng đầy đủ
            checkInDate: booking.ngaynhanphong,
            checkOutDate: booking.ngaytraphong,
            bookingDateTime: booking.ngaydat,
            totalAmount: booking.tongtien || 0,
            status: booking.trangthai || 'Không xác định'
        };
    } catch (err) {
        console.error('Lỗi chi tiết đặt phòng:', err);
        throw err;
    }
}



// === 3. LẤY CHI TIẾT HÓA ĐƠN (TỪ API CHITIETHOADONS) ===
export async function fetchChiTietHoaDons() {
    try {
        const res = await fetch(`${API_BASE}/Chitiethoadons`);
        if (!res.ok) throw new Error('Lỗi tải chi tiết hóa đơn');
        return await res.json();
    } catch (err) {
        console.error('Lỗi fetch chi tiết hóa đơn:', err);
        return [];
    }
}
// === 4. LẤY DANH SÁCH HÓA ĐƠN ===
export async function fetchInvoices(date, query = '') {
    try {
        const [invoicesRes, bookingsRes, customersRes, chitietRes] = await Promise.all([
            fetch(`${API_BASE}/Hoadons`),
            fetch(`${API_BASE}/Datphongs`),
            fetch(`${API_BASE}/Khachhangs`),
            fetch(`${API_BASE}/Chitiethoadons`)
        ]);

        const [invoices, bookings, customers, chitiet] = await Promise.all([
            invoicesRes.json(),
            bookingsRes.json(),
            customersRes.json(),
            chitietRes.json()
        ]);

// Tính tiền phòng + dịch vụ theo từng hóa đơn
        const chiTietMap = {};
        chitiet.forEach(ct => {
            if (!chiTietMap[ct.mahoadon]) {
                chiTietMap[ct.mahoadon] = { tienPhong: 0, tienDichVu: 0 };
            }
            if (ct.loaiphi === 'Tiền phòng') chiTietMap[ct.mahoadon].tienPhong += ct.dongia;
            if (ct.loaiphi === 'Dịch vụ') chiTietMap[ct.mahoadon].tienDichVu += ct.dongia;
        });


        return invoices
            .filter(inv => {
                const matchDate = !date || (inv.ngaylap && inv.ngaylap.startsWith(date));
                const search = query.toLowerCase();
                const matchQuery = !query ||
                    inv.mahoadon.toString().includes(query) ||
                    inv.madatphong.toString().includes(query);
                return matchDate && matchQuery;
            })
            .map(inv => {
                const booking = bookings.find(b => b.madatphong === inv.madatphong) || {};
                const customer = customers.find(c => c.makh === booking.makh) || {};
                const chiTiet = chiTietMap[inv.mahoadon] || { tienPhong: 0, tienDichVu: 0 };
                const trangThaiThanhToan = (booking.trangthaithanhtoan || '').trim();

                let paymentStatus = 'unpaid';
                if (trangThaiThanhToan === 'Đã thanh toán') paymentStatus = 'paid';
                else if (trangThaiThanhToan === 'Hoàn tiền / Đã xử lý') paymentStatus = 'refunded';

                return {
                    mahoadon: inv.mahoadon,
                    madatphong: inv.madatphong,
                    customerName: customer.hoten || customer.tenkhachhang || 'N/A',
                    ngaylap: inv.ngaylap,
                    tongtien: inv.tongtien,
                    tienPhong: chiTiet.tienPhong,
                    tienDichVu: chiTiet.tienDichVu,
                    paymentStatus,
                    trangThaiText: trangThaiThanhToan
                };
            });
    } catch (err) {
        console.error('Lỗi fetch hóa đơn:', err);
        throw err;
    }
}


// === 5. SỬA (LỰA CHỌN B): LẤY CHI TIẾT HÓA ĐƠN ===
export async function fetchInvoiceDetails(id) {
    try {
        // 1. Tải hóa đơn trước để lấy madatphong
        const invoiceRes = await fetch(`${API_BASE}/Hoadons/${id}`);
        if (!invoiceRes.ok) throw new Error('Không tìm thấy hóa đơn');
        const invoice = await invoiceRes.json();

        // 2. Tải song song 4 API
        const [bookingRes, allDetails, allRooms, allChiTietHD] = await Promise.all([
            fetch(`${API_BASE}/Datphongs/${invoice.madatphong}`),
            fetchAllBookingDetails(), // Dùng helper
            fetchAllRooms(),          // Dùng helper
            fetchChiTietHoaDons()     // Dùng helper (đã có)
        ]);
        
        if (!bookingRes.ok) throw new Error('Không tìm thấy đặt phòng');
        const booking = await bookingRes.json();

        // --- KHÁCH HÀNG (Giữ nguyên) ---
        let customerName = 'Không xác định', customerPhone = 'N/A', customerIdCard = 'N/A', customerEmail = 'N/A';
        if (booking.makh) {
            const cRes = await fetch(`${API_BASE}/Khachhangs/${booking.makh}`);
            if (cRes.ok) {
                const c = await cRes.json();
                customerName = c.hoten || c.tenkhachhang || 'Không xác định';
                customerPhone = c.sodienthoai || c.sdt || 'N/A';
                customerIdCard = c.cccd || 'N/A';
                customerEmail = c.email || 'N/A';
            }
        }

        // --- LỌC PHÒNG TỪ DANH SÁCH ĐÃ TẢI VỀ (SỬA LỖI) ---
        const matchedDetails = allDetails.filter(d => d.madatphong == invoice.madatphong);
        const roomsInfo = matchedDetails.map(d => {
            const room = allRooms.find(r => r.maphong === d.maphong);
            return { number: room ? room.sophong : 'N/A' };
        });

        // --- Trạng thái thanh toán (Giữ nguyên) ---
        const trangThai = (booking.trangthaithanhtoan || '').trim();
        const paymentStatus = trangThai === 'Đã thanh toán' ? 'paid' : 
                             trangThai === 'Hoàn tiền / Đã xử lý' ? 'refunded' : 'unpaid';

        // --- Lọc chi tiết HÓA ĐƠN (Giữ nguyên) ---
        const items = allChiTietHD.filter(ct => ct.mahoadon === id);
        let tienPhong = 0, tienDichVu = 0;
        items.forEach(ct => {
            if (ct.loaiphi === 'Tiền phòng') tienPhong += ct.dongia;
            if (ct.loaiphi === 'Dịch vụ') tienDichVu += ct.dongia;
        });

        return {
            mahoadon: invoice.mahoadon,
            madatphong: invoice.madatphong,
            customerName, customerPhone, customerIdCard, customerEmail,
            rooms: roomsInfo, // Đây sẽ là mảng đầy đủ
            ngaylap: invoice.ngaylap,
            tongtien: invoice.tongtien,
            tienPhong, tienDichVu,
            paymentStatus
        };
    } catch (err) {
        console.error('Lỗi chi tiết hóa đơn:', err);
        throw err;
    }
}