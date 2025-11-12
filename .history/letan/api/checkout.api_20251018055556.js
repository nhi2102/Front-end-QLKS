// ============================
// 📦 checkout.api.js
// ============================
const API_BASE_URL = "https://localhost:7076/api";

let currentBooking = null;
let originalRoomCharge = 0;

// ============================
// 🧠 Utility Functions
// ============================

export function formatCurrency(amount) {
    if (!amount || amount === 0) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
}

// ============================
// 🔌 API Functions
// ============================

export async function fetchPendingCheckouts() {
    const res = await fetch(`${API_BASE_URL}/Datphongs/pending-checkouts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchServiceHistory(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Sudungdvs/history/${bookingId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchHotelEquipment() {
    const res = await fetch(`${API_BASE_URL}/Thietbikhachsans`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchDamageCompensation(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all = await res.json();
    return all.filter(d => d.madatphong == bookingId);
}

export async function recordEquipmentDamage(damageData) {
    const res = await fetch(`${API_BASE_URL}/Denbuthiethais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(damageData)
    });
    return res.ok;
}

export async function getRemainingAmount(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Datphongs/Sotienthieu/${bookingId}`);
    if (!res.ok) throw new Error('Lỗi khi lấy số tiền còn thiếu');
    return res.json();
}

export async function executeCheckout(bookingId) {
    const res = await fetch(`${API_BASE_URL}/Datphongs/Checkout/${bookingId}`);
    if (!res.ok) throw new Error('Lỗi khi thực hiện checkout');
    return res.json();
}

// ============================
// 💰 Service charge calculator
// ============================

export async function calculateTotalServiceAmount(bookingId) {
    const history = await fetchServiceHistory(bookingId);
    return history.reduce((sum, s) => sum + (s.thanhTien || 0), 0);
}

export function computeTotal(serviceCharge, extra, discount) {
    const total = (serviceCharge || 0) + (extra || 0) - (discount || 0);
    return total > 0 ? total : 0;
}