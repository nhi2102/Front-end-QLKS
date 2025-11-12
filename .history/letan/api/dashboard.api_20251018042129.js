// api/dashboard.api.js
const API_BASE = "https://localhost:7076/api/Dashboard";

// ======================
// 🔹 API GỌI DỮ LIỆU DASHBOARD
// ======================

// Lấy thống kê tổng quan cho lễ tân
async function apiGetLeTanSummary() {
    const res = await fetch(`${API_BASE}/letan`);
    if (!res.ok) throw new Error(`Lỗi tải thống kê (${res.status})`);
    return await res.json();
}

// Lấy danh sách chi tiết check-in/check-out
async function apiGetLeTanDetails() {
    const res = await fetch(`${API_BASE}/letan/chitiet`);
    if (!res.ok) throw new Error(`Lỗi tải chi tiết (${res.status})`);
    return await res.json();
}