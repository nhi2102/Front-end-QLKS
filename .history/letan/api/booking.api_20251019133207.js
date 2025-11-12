// ============================================
// BOOKING API MODULE (NO DOM TOUCHING)
// ============================================

// Base URL dùng chung
export const API_BASE_URL = "https://localhost:7076/api";

// ======= Helpers (pure) =======

// Format date cho input HTML (yyyy-MM-dd)
export function formatDateForInput(date) {
    return new Date(date).toISOString().split('T')[0];
}

// Format date để hiển thị (dd/MM/yyyy)
export function formatDateDisplay(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
        return dateString;
    }
}

// Format tiền VND
export function formatCurrency(amount) {
    const num = Number(amount);
    if (!num || isNaN(num)) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// Giá phòng (ưu tiên lấy từ LoaiPhong)
export function getRoomPrice(room) {
    if (!room) return 500000;
    const raw =
        (room.loaiPhong && (room.loaiPhong.giacoban || room.loaiPhong.Giacoban || room.loaiPhong.giaphong || room.loaiPhong.giaPhong)) ||
        room.giaPhong || room.gia || 0;
    const n = Number(raw);
    return (n && !isNaN(n)) ? n : 500000;
}

// Convert mọi kiểu date input -> yyyy-MM-dd, throw nếu invalid
export function formatDateForAPI(dateInput) {
    if (!dateInput) throw new Error('Missing date');

    if (dateInput instanceof Date) {
        return dateInput.toISOString().split('T')[0];
    }
    if (typeof dateInput === 'string') {
        // yyyy-MM-dd (ISO-like)
        if (dateInput.includes('-')) {
            const d = new Date(dateInput);
            if (isNaN(d)) throw new Error('Invalid date string: ' + dateInput);
            return d.toISOString().split('T')[0];
        }
        // dd/MM/yyyy
        if (dateInput.includes('/')) {
            const parts = dateInput.split('/').map(p => p.trim());
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
        }
        const d = new Date(dateInput);
        if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    throw new Error('Unrecognized date format: ' + dateInput);
}

// ========== API: Loại phòng ==========

export async function apiLoadRoomTypes() {
    const res = await fetch(`${API_BASE_URL}/Loaiphongs`);
    if (!res.ok) throw new Error('Failed to load room types');
    return await res.json();
}

// ========== API: Tìm phòng trống + Chi tiết phòng ==========

export async function apiFetchAvailableRooms(checkInDate, checkOutDate) {
    const url = `${API_BASE_URL}/Phongs/timphong/${formatDateForAPI(checkInDate)}/${formatDateForAPI(checkOutDate)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API returned status ${res.status}`);
    return await res.json(); // mảng { maphong }
}

export async function apiGetRoomDetails(maPhong) {
    try {
        const phongRes = await fetch(`${API_BASE_URL}/Phongs/${maPhong}`);
        if (!phongRes.ok) throw new Error(`Cannot get room info ${maPhong}`);
        const phong = await phongRes.json();

        const loaiPhongRes = await fetch(`${API_BASE_URL}/Loaiphongs/${phong.maloaiphong}`);
        const loaiPhong = loaiPhongRes.ok ? await loaiPhongRes.json() : null;

        const hinhAnhRes = await fetch(`${API_BASE_URL}/Hinhanhphongs/${phong.mahinhphong}`);
        const hinhAnhData = hinhAnhRes.ok ? await hinhAnhRes.json() : null;

        let hinhAnh = [];
        if (hinhAnhData) {
            if (hinhAnhData.hinhchinh) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhchinh}` });
            if (hinhAnhData.hinhphu1) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu1}` });
            if (hinhAnhData.hinhphu2) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu2}` });
            if (hinhAnhData.hinhphu3) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu3}` });
            if (hinhAnhData.hinhphu4) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu4}` });
            if (hinhAnhData.hinhphu5) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu5}` });
        }

        return {...phong, loaiPhong, hinhAnh };
    } catch (error) {
        console.error(`Error getting room details ${maPhong}:`, error);
        return null;
    }
}

// Chuẩn hoá phòng (thêm field dùng cho filter/hiển thị)
export function enrichRooms(roomsWithDetails) {
    return roomsWithDetails
        .filter(Boolean)
        .map(room => ({
            ...room,
            sophong: room.sophong || room.soPhong || room.sophong || room.soPhong || room.sophong,
            maphong: room.maphong || room.maPhong || room.maphong,
            trangthai: room.trangthai || room.trangThai || 'Trống',
            tenLoaiPhong: room.loaiPhong ? (room.loaiPhong.tenloaiphong || room.loaiPhong.tenLoaiPhong || 'Standard') : (room.tenLoaiPhong || 'Standard'),
            giaPhong: getRoomPrice(room),
            soLuongNguoi: room.loaiPhong ? (room.loaiPhong.songuoitoida || room.loaiPhong.soluongnguoi || room.loaiPhong.soLuongNguoi || room.succhua || 2) : (room.succhua || 2),
            moTa: room.loaiPhong ? (room.loaiPhong.mota || room.loaiPhong.moTa || '') : (room.moTa || ''),
            roomType: room.loaiPhong || null
        }));
}

export function filterRooms(rooms, { guestCount, roomType }) {
    let filtered = rooms;
    if (guestCount) {
        const numGuests = parseInt(guestCount);
        filtered = filtered.filter(r => {
            const max = Number(r.soLuongNguoi || r.succhua || 0);
            return max >= numGuests;
        });
    }
    if (roomType) {
        filtered = filtered.filter(r =>
            String(r.maphong && r.maloaiphong ? r.maloaiphong : r.maphong && r.maLoaiPhong ? r.maLoaiPhong : r.loaiPhong && r.loaiPhong.maloaiphong) === String(roomType) ||
            String(r.maloaiphong) === String(roomType) ||
            String(r.roomType && (r.roomType.maloaiphong || r.roomType.maLoaiPhong)) === String(roomType)
        );
    }
    return filtered;
}

// ========== API: Khách hàng ==========

export async function apiFindOrCreateCustomer({ customerName, customerPhone, customerEmail, customerIdCard, customerAddress }) {
    let makhId = null;

    const normaliseCustomers = async(res) => {
        if (!res || !res.ok) return [];
        const body = await res.json();
        if (!body) return [];
        if (Array.isArray(body)) return body;
        if (typeof body === 'object') return [body];
        return [];
    };

    const searches = [];
    if (customerIdCard) {
        searches.push(`${API_BASE_URL}/Khachhangs?cccd=${encodeURIComponent(customerIdCard)}`);
        searches.push(`${API_BASE_URL}/Khachhangs?cccdNumber=${encodeURIComponent(customerIdCard)}`);
    }
    if (customerPhone) {
        searches.push(`${API_BASE_URL}/Khachhangs?phone=${encodeURIComponent(customerPhone)}`);
        searches.push(`${API_BASE_URL}/Khachhangs?sdt=${encodeURIComponent(customerPhone)}`);
    }

    for (const url of searches) {
        try {
            const res = await fetch(url);
            const arr = await normaliseCustomers(res);
            if (arr && arr.length > 0) {
                const customer = arr[0];
                makhId = customer.makh || customer.MaKh || customer.id || customer.Makh || null;
                if (makhId) {
                    console.log('Found existing Khachhang via', url, makhId);
                    break;
                }
            }
        } catch (e) { /* ignore */ }
    }

    if (!makhId) {
        const khPayload = {
            hoten: customerName,
            sdt: customerPhone,
            email: customerEmail || null,
            cccd: customerIdCard || null,
            diachi: customerAddress || null
        };

        const createRes = await fetch(`${API_BASE_URL}/Khachhangs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(khPayload)
        });

        if (createRes.ok) {
            const kh = await createRes.json();
            makhId = kh.makh || kh.MaKh || kh.id || kh.Makh || null;
            console.log('Created new Khachhang:', makhId);
        } else {
            console.warn('Could not create Khachhang, server returned', createRes.status);
        }
    }

    return makhId;
}

// ========== API: Đặt phòng ==========

export async function apiCreateBooking(bookingApiData) {
    const response = await fetch(`${API_BASE_URL}/Datphongs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingApiData)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return await response.json();
}

// ========== API: Check-in ==========

export async function apiPerformImmediateCheckin(maDatPhong, { thoiGianCheckin, nhanVienCheckin }) {
    const checkinData = {
        maDatPhong,
        thoiGianCheckin,
        nhanVienCheckin,
        ghiChu: `Check-in ngay sau khi đặt phòng - ${new Date().toLocaleString('vi-VN')}`
    };

    const checkinResponse = await fetch(`${API_BASE_URL}/Datphongs/checkin/${maDatPhong}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData)
    });

    if (!checkinResponse.ok) {
        throw new Error(`Check-in failed: ${checkinResponse.status}`);
    }
    return await checkinResponse.json();
}

// ========== API: Debug (không DOM) ==========
export async function apiDebugGetAll() {
    const [roomsResponse, roomTypesResponse, bookingsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/Phongs`),
        fetch(`${API_BASE_URL}/Loaiphongs`),
        fetch(`${API_BASE_URL}/Datphongs`)
    ]);
    return {
        rooms: await roomsResponse.json(),
        roomTypes: await roomTypesResponse.json(),
        bookings: await bookingsResponse.json()
    };
}

// Convert English room types to Vietnamese (pure)
export function getVietnameseRoomType(englishType) {
    const typeMap = { 'standard': 'tiêu chuẩn', 'deluxe': 'deluxe', 'suite': 'suite', 'vip': 'vip' };
    return typeMap[englishType] || englishType;
}