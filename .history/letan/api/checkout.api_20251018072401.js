// ============================
//  checkout.api.js
// ============================
const API_BASE_URL = "https://localhost:7076/api";

let currentBooking = null;
let originalRoomCharge = 0;

// ============================
//  Utility Functions
// ============================

function formatCurrency(amount) {
    if (!amount || amount === 0) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

// ============================
//  API Functions
// ============================

/** Lấy danh sách phòng sắp checkout hôm nay */
async function fetchPendingCheckouts() {
    const res = await fetch(`${API_BASE_URL}/Datphongs/pending-checkouts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/** Lấy lịch sử sử dụng dịch vụ theo mã đặt phòng */
async function fetchServiceHistory(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Sudungdvs/history/${bookingId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/** Lấy danh sách thiết bị khách sạn (để ghi nhận đền bù) */
async function fetchHotelEquipment() {
    const res = await fetch(`${API_BASE_URL}/Thietbikhachsans`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/** Lấy danh sách đền bù thiệt hại theo mã đặt phòng */
async function fetchDamageCompensation(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all = await res.json();
    return all.filter(d => d.madatphong == bookingId);
}

/** 
 * Ghi nhận đền bù thiệt hại (gọi stored procedure TAO_DENBUTHIETHAI)
 * @param {Object} damageData { Mathietbi, Madatphong, Soluong, Maphong }
 */
async function createDamageCompensation(damageData) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais/taodenbu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(damageData)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Lỗi khi tạo đền bù thiệt hại: ${err}`);
    }

    const result = await res.json();
    console.log("✅ Đền bù thiệt hại:", result.message);
    return result;
}

/**
 * API phụ — thêm đền bù trực tiếp (không gọi stored procedure)
 */
async function recordEquipmentDamage(damageData) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(damageData)
    });
    return res.ok;
}

/** Lấy số tiền còn thiếu của một đặt phòng */
async function getRemainingAmount(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Datphongs/Sotienthieu/${bookingId}`);
    if (!res.ok) throw new Error('Lỗi khi lấy số tiền còn thiếu');
    return res.json();
}

/** Thực hiện checkout (trả phòng) */
async function executeCheckout(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Datphongs/Checkout/${bookingId}`);
    if (!res.ok) throw new Error('Lỗi khi thực hiện checkout');
    return res.json();
}

// ============================
//  Service charge calculator
// ============================

/** Tính tổng tiền dịch vụ chưa thanh toán */
async function calculateTotalServiceAmount(bookingId) {
    const history = await fetchServiceHistory(bookingId);
    // chỉ tính dịch vụ chưa thanh toán
    const unpaid = history.filter(h => h.trangthai ? .toUpperCase() === "CHƯA THANH TOÁN");
    return unpaid.reduce((sum, s) => sum + (s.thanhTien || 0), 0);
}

/** Tổng cộng tiền checkout = dịch vụ + phụ thu - giảm giá */
function computeTotal(serviceCharge, extra, discount) {
    const total = (serviceCharge || 0) + (extra || 0) - (discount || 0);
    return total > 0 ? total : 0;
}