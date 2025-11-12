// ============================================
// 📦 FILE: customers.api.js
// 👉 Chức năng: Gọi API đến backend để thao tác dữ liệu khách hàng và đặt phòng
// ============================================

const API_BASE_URL = 'https://localhost:7076/api';

/**
 * 🧩 Lấy toàn bộ danh sách khách hàng
 */
async function getAllCustomersAPI() {
    const res = await fetch(`${API_BASE_URL}/KhachHangs`);
    if (!res.ok) throw new Error("Không thể tải danh sách khách hàng");
    return res.json();
}

/**
 * 🧩 Lấy tất cả đơn đặt phòng của 1 khách hàng
 * @param {number} customerId - Mã khách hàng
 */
async function getCustomerBookingsAPI(customerId) {
    const res = await fetch(`${API_BASE_URL}/DatPhongs`);
    if (!res.ok) return [];
    const allBookings = await res.json();
    return allBookings.filter(b => b.makh === customerId);
}

/**
 * 🧩 Lấy chi tiết đặt phòng theo mã đặt phòng
 * @param {number} bookingId - Mã đặt phòng
 */
async function getBookingDetailsAPI(bookingId) {
    const res = await fetch(`${API_BASE_URL}/ChiTietDatPhongs/booking/${bookingId}`);
    if (!res.ok) return [];
    return res.json();
}

/**
 * 🧩 Cập nhật thông tin khách hàng
 * @param {object} customer - Dữ liệu khách hàng cần cập nhật
 */
async function updateCustomerAPI(customer) {
    const res = await fetch(`${API_BASE_URL}/KhachHangs/${customer.makh}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error("Không thể cập nhật thông tin khách hàng");
    return res.json();
}

/**
 * 🧩 Thêm mới khách hàng
 * @param {object} customer - Dữ liệu khách hàng mới
 */
async function addCustomerAPI(customer) {
    const res = await fetch(`${API_BASE_URL}/KhachHangs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error("Không thể thêm khách hàng mới");
    return res.json();
}

export {
    getAllCustomersAPI,
    getCustomerBookingsAPI,
    getBookingDetailsAPI,
    updateCustomerAPI,
    addCustomerAPI
};