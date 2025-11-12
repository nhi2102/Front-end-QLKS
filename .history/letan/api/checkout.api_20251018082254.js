// ============================
// checkout.api.js
// ============================

const API_BASE_URL = "https://localhost:7076/api";

// --- Helper: format tiền ---
function formatCurrency(amount) {
    if (!amount || amount === 0) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// --- Helper: format ngày ---
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
}

// ============================
// API functions
// ============================

// --- Lấy danh sách khách cần checkout ---
async function fetchPendingCheckouts() {
    const res = await fetch(`${API_BASE_URL}/Datphongs/pending-checkouts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bookings = await res.json();

    // helpers
    const parsePossibleDate = (val) => {
        if (!val) return null;
        // handle objects like { $date: '...' } or { $numberLong: '...' }
        if (typeof val === 'object') {
            if (val.$date) return new Date(val.$date);
            if (val.$numberLong) return new Date(Number(val.$numberLong));
            if (val.$seconds) return new Date(Number(val.$seconds) * 1000);
            // try to find any property that looks like a date
            const keys = Object.keys(val);
            for (const k of keys) {
                const candidate = val[k];
                if (typeof candidate === 'string' || typeof candidate === 'number') {
                    const d = parsePossibleDate(candidate);
                    if (d) return d;
                }
            }
            return null;
        }
        if (typeof val === 'number') return new Date(val);
        if (typeof val === 'string') {
            // handle /Date(1234567890)/
            const m = /Date\((\d+)\)/i.exec(val);
            if (m) return new Date(Number(m[1]));
            // numeric string
            if (/^\d+$/.test(val)) return new Date(Number(val));
            const d = new Date(val);
            return isNaN(d) ? null : d;
        }
        return null;
    };

    const normalizeRoomNumber = (r) => {
        if (r === undefined || r === null) return '';
        return String(r).trim();
    };

    // augment each booking in parallel
    const augmented = await Promise.all((bookings || []).map(async(b) => {
        const id = b.maDatPhong || b.maDatphong || b.madatphong || b.Madatphong;
        // attach chiTietPhong
        let chiTiet = [];
        try {
            chiTiet = await getRoomDetailsByBookingId(id);
        } catch (e) {
            // ignore; leave chiTiet empty
            chiTiet = [];
        }

        // derive room numbers from chiTiet; if missing, try booking.sophong or other fields
        let roomNums = [];
        if (Array.isArray(chiTiet) && chiTiet.length > 0) {
            roomNums = chiTiet.map(ct => normalizeRoomNumber(ct.sophong || ct.soPhong || ct.phong || ct.maphong || (ct.phongNavigation && ct.phongNavigation.sophong) || (ct.phongNavigation && ct.phongNavigation.soPhong))).filter(x => x);
        }

        if ((!roomNums || roomNums.length === 0) && (b.soPhong || b.sophong || b.phong)) {
            const candidate = b.soPhong || b.sophong || b.phong;
            if (Array.isArray(candidate)) roomNums = candidate.map(normalizeRoomNumber).filter(x => x);
            else roomNums = [normalizeRoomNumber(candidate)].filter(x => x);
        }

        // final dedupe and fallback to fetching room info by id contained in chiTiet
        roomNums = Array.from(new Set(roomNums.map(r => r)));
        if (roomNums.length === 0 && Array.isArray(chiTiet) && chiTiet.length > 0) {
            // try to fetch room details by ID if available
            for (const ct of chiTiet) {
                const roomId = ct.maphong || ct.phongId || ct.phong || ct.id;
                if (!roomId) continue;
                try {
                    const rinfo = await getRoomById(roomId);
                    const rn = rinfo && (rinfo.soPhong || rinfo.sophong || rinfo.roomNumber || rinfo.tenphong);
                    if (rn) roomNums.push(normalizeRoomNumber(rn));
                } catch (e) {
                    // ignore
                }
            }
            roomNums = Array.from(new Set(roomNums.filter(x => x)));
        }

        // compute nights
        const inCandidates = [b.ngayNhanPhong, b.Ngaynhanphong, b.ngaynhanphong, b.ngayDen, b.ngayden, b.ngayNhan];
        const outCandidates = [b.ngayTraPhong, b.Ngaytraphong, b.ngaytraphong, b.ngayDi, b.ngaydi, b.ngayTra];
        let inDate = null;
        let outDate = null;
        for (const c of inCandidates) { if (!inDate) inDate = parsePossibleDate(c); }
        for (const c of outCandidates) { if (!outDate) outDate = parsePossibleDate(c); }
        let soDem = '';
        if (inDate && outDate && !isNaN(inDate) && !isNaN(outDate)) {
            const msPerDay = 24 * 60 * 60 * 1000;
            const diff = Math.round((outDate - inDate) / msPerDay);
            soDem = diff > 0 ? diff : 0;
        }

        return Object.assign({}, b, {
            chiTietPhong: chiTiet,
            soPhong: roomNums.join(', '),
            soDem: soDem
        });
    }));

    return augmented;
}

// --- Lấy lịch sử dịch vụ (chỉ dịch vụ chưa thanh toán) ---
async function fetchServiceHistory(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Sudungdvs/history/${bookingId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// --- Lấy danh sách thiết bị khách sạn ---
async function fetchHotelEquipment() {
    const res = await fetch(`${API_BASE_URL}/Thietbikhachsans`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// --- Lấy danh sách đền bù thiệt hại theo booking ---
async function fetchDamageCompensation(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all = await res.json();
    return all.filter(d => d.madatphong == bookingId);
}

// --- Tạo mới hoặc cập nhật đền bù ---
async function createDamageCompensation(data) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais/taodenbu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// --- Lấy số tiền còn thiếu ---
async function getRemainingAmount(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Datphongs/Sotienthieu/${bookingId}`);
    if (!res.ok) throw new Error('Lỗi khi lấy số tiền còn thiếu');
    return res.json();
}

// --- Thực hiện checkout ---
async function executeCheckout(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Datphongs/Checkout/${bookingId}`);
    if (!res.ok) throw new Error('Lỗi khi thực hiện checkout');
    return res.json();
}

// --- Tính tổng tiền dịch vụ chưa thanh toán ---
async function calculateTotalServiceAmount(bookingId) {
    const history = await fetchServiceHistory(bookingId);
    return history.reduce((sum, s) => sum + (s.thanhTien || 0), 0);
}

// --- Tính tổng cuối cùng ---
function computeTotal(serviceCharge, extra, discount) {
    const total = (serviceCharge || 0) + (extra || 0) - (discount || 0);
    return total > 0 ? total : 0;
}
//Lấy thông tin khách hàng (khi cần)
async function getCustomerById(customerId) {
    const response = await fetch(`${API_BASE_URL}/Khachhangs/${customerId}`);
    if (!response.ok) throw new Error('Lỗi tải dữ liệu khách hàng');
    return response.json();
}

//Lấy chi tiết đặt phòng (nếu cần)
async function getRoomDetailsByBookingId(bookingId) {
    const response = await fetch(`${API_BASE_URL}/Chitietdatphongs?madatphong=${bookingId}`);
    if (!response.ok) throw new Error('Lỗi tải chi tiết phòng');
    return response.json();
}

// Lấy thông tin phòng theo mã
async function getRoomById(roomId) {
    const response = await fetch(`${API_BASE_URL}/Phongs/${roomId}`);
    if (!response.ok) throw new Error('Lỗi tải thông tin phòng');
    return response.json();
}
// Gắn các hàm vào global để UI có thể gọi
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.fetchPendingCheckouts = fetchPendingCheckouts;
window.fetchServiceHistory = fetchServiceHistory;
window.fetchHotelEquipment = fetchHotelEquipment;
window.fetchDamageCompensation = fetchDamageCompensation;
window.createDamageCompensation = createDamageCompensation;
window.getRemainingAmount = getRemainingAmount;
window.executeCheckout = executeCheckout;
window.calculateTotalServiceAmount = calculateTotalServiceAmount;
window.computeTotal = computeTotal;
window.getCustomerById = getCustomerById;
window.getRoomDetailsByBookingId = getRoomDetailsByBookingId;
window.getRoomById = getRoomById;