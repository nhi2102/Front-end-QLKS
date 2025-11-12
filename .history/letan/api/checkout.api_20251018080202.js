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
    return res.json();
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
    const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`);
    if (!response.ok) throw new Error('Lỗi tải dữ liệu khách hàng');
    return response.json();
}

//Lấy chi tiết đặt phòng (nếu cần)
async function getRoomDetailsByBookingId(bookingId) {
    const response = await fetch(`${API_BASE}/Chitietdatphongs?madatphong=${bookingId}`);
    if (!response.ok) throw new Error('Lỗi tải chi tiết phòng');
    return response.json();
}

// Lấy thông tin phòng theo mã
async function getRoomById(roomId) {
    const response = await fetch(`${API_BASE}/Phongs/${roomId}`);
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