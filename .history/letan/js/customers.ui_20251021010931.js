// ============================================
// 💻 FILE: customers.ui.js
// 👉 Chức năng: Xử lý giao diện quản lý khách hàng (hiển thị, tìm kiếm, sửa, xem chi tiết)
// ============================================

import {
    getAllCustomersAPI,
    getCustomerBookingsAPI,
    getBookingDetailsAPI,
    updateCustomerAPI,
    addCustomerAPI
} from "./customers.api.js";

// ===============================
// 🔧 Các biến toàn cục
// ===============================
let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
let pageSize = 12;
let currentView = 'grid';
let currentCustomer = null;

// ===============================
// 🚀 Khởi tạo trang
// ===============================
document.addEventListener('DOMContentLoaded', async() => {
    initializeEventListeners();
    await loadCustomers();
    checkUserLogin();
});

// ===============================
// 🎛️ Thiết lập sự kiện giao diện
// ===============================
function initializeEventListeners() {
    // --- Tìm kiếm / lọc ---
    document.getElementById('searchBtn').addEventListener('click', applyFilters);
    document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });

    document.getElementById('filterGender').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // --- Chuyển chế độ xem Grid/List ---
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            displayCustomers();
        });
    });

    // --- Nút Thêm, Sửa ---
    document.getElementById('addCustomerBtn').addEventListener('click', openAddCustomerModal);
    document.getElementById('editCustomerBtn').addEventListener('click', openEditCurrentCustomer);
    document.getElementById('saveCustomerBtn').addEventListener('click', saveCustomer);

    // --- Tabs (thông tin / lịch sử / thống kê) ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // --- Sidebar ---
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
}

// ===============================
// 👤 Kiểm tra đăng nhập
// ===============================
function checkUserLogin() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.hoten) {
        document.getElementById('userName').textContent = user.hoten;
    }
}

// ===============================
// 📋 Tải danh sách khách hàng
// ===============================
async function loadCustomers() {
    showLoading(true);
    try {
        // Gọi API lấy danh sách khách hàng
        allCustomers = await getAllCustomersAPI();

        // Lấy lịch sử đặt phòng cho từng khách
        await Promise.all(allCustomers.map(async c => {
            c.bookings = await getCustomerBookingsAPI(c.makh);
            c.activeBookings = c.bookings.filter(b =>
                b.trangthai === 'Đã nhận phòng' || b.trangthai === 'Đã đặt'
            );
        }));

        filteredCustomers = [...allCustomers];
        updateStatistics();
        displayCustomers();
    } catch (err) {
        console.error("⚠️ Lỗi tải khách hàng:", err);
        alert("Không thể tải danh sách khách hàng");
    } finally {
        showLoading(false);
    }
}

// ===============================
// 📊 Cập nhật thống kê tổng quan
// ===============================
function updateStatistics() {
    const total = allCustomers.length;
    const active = allCustomers.filter(c => c.activeBookings ? .length > 0).length;
    const vip = allCustomers.filter(c => c.bookings ? .length >= 5).length;

    const now = new Date();
    const monthly = allCustomers.filter(c => {
        if (!c.ngaytao) return false;
        const created = new Date(c.ngaytao);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    document.getElementById('totalCustomers').textContent = total;
    document.getElementById('activeCustomers').textContent = active;
    document.getElementById('vipCustomers').textContent = vip;
    document.getElementById('monthlyCustomers').textContent = monthly;
}

// ===============================
// 🔍 Tìm kiếm & lọc khách hàng
// ===============================
function applyFilters() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase().trim();
    const gender = document.getElementById('filterGender').value;
    const status = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;

    filteredCustomers = allCustomers.filter(c => {
        const matchKeyword = !keyword ||
            c.hoten ? .toLowerCase().includes(keyword) ||
            c.sdt ? .includes(keyword) ||
            c.email ? .toLowerCase().includes(keyword) ||
            c.cccd ? .includes(keyword);

        if (!matchKeyword) return false;
        if (gender && c.gioitinh !== gender) return false;
        if (status === 'active' && (!c.activeBookings || c.activeBookings.length === 0)) return false;
        if (status === 'inactive' && c.activeBookings ? .length > 0) return false;

        return true;
    });

    sortCustomers(sortBy);
    currentPage = 1;
    displayCustomers();
}

// ===============================
// 🔢 Sắp xếp danh sách khách hàng
// ===============================
function sortCustomers(sortBy) {
    switch (sortBy) {
        case 'newest':
            filteredCustomers.sort((a, b) => b.makh - a.makh);
            break;
        case 'oldest':
            filteredCustomers.sort((a, b) => a.makh - b.makh);
            break;
        case 'name-asc':
            filteredCustomers.sort((a, b) => a.hoten.localeCompare(b.hoten));
            break;
        case 'name-desc':
            filteredCustomers.sort((a, b) => b.hoten.localeCompare(a.hoten));
            break;
        case 'visits':
            filteredCustomers.sort((a, b) => (b.bookings ? .length || 0) - (a.bookings ? .length || 0));
            break;
    }
}

// ===============================
// 🧱 Hiển thị danh sách khách hàng
// ===============================
function displayCustomers() {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const list = filteredCustomers.slice(start, end);

    document.getElementById('customerCount').textContent = filteredCustomers.length;

    if (currentView === 'grid') {
        displayGridView(list);
        document.getElementById('customersGrid').style.display = 'grid';
        document.getElementById('customersList').style.display = 'none';
    } else {
        displayListView(list);
        document.getElementById('customersGrid').style.display = 'none';
        document.getElementById('customersList').style.display = 'block';
    }

    displayPagination();
}

// ===============================
// ⚙️ Các hàm tiện ích chung
// ===============================
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}