// ===============================
// Biến toàn cục
// ===============================
let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
let pageSize = 12;
let currentView = 'grid';
let currentCustomer = null;

// ===============================
// Khởi tạo trang
// ===============================
document.addEventListener('DOMContentLoaded', async() => {
    initializeEventListeners();
    await loadCustomers();
    checkUserLogin();
    setupEventListeners();
});

// ===============================
// Sự kiện giao diện
// ===============================
function initializeEventListeners() {
    // Tìm kiếm / lọc
    document.getElementById('searchBtn').addEventListener('click', applyFilters);
    document.getElementById('searchKeyword').addEventListener('keypress', e => {
        if (e.key === 'Enter') applyFilters();
    });
    document.getElementById('filterGender').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // Chuyển chế độ xem Grid/List
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            displayCustomers();
        });
    });

    // Nút thêm, sửa
    document.getElementById('addCustomerBtn').addEventListener('click', openAddCustomerModal);
    document.getElementById('editCustomerBtn').addEventListener('click', openEditCurrentCustomer);
    document.getElementById('saveCustomerBtn').addEventListener('click', saveCustomer);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Sidebar
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
}

// ===============================
// Kiểm tra đăng nhập
// ===============================
function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
        return;
    }

    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || user.username;
}

function setupEventListeners() {
    const logoutBtn = document.querySelector('a[href="#"]:has(i.fa-sign-out-alt)');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                window.location.href = '../login.html';
            }
        });
    }
}

// ===============================
// Tải danh sách khách hàng
// ===============================
async function loadCustomers() {
    showLoading(true);
    try {
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
// Cập nhật thống kê
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
// Tìm kiếm & lọc khách hàng
// ===============================
function applyFilters() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase().trim();
    const gender = document.getElementById('filterGender').value;
    const status = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;

    filteredCustomers = allCustomers.filter(c => {
        const matchKeyword = !keyword ||
            (c.hoten && c.hoten.toLowerCase().includes(keyword)) ||
            (c.sdt && String(c.sdt).includes(keyword)) ||
            (c.email && c.email.toLowerCase().includes(keyword)) ||
            (c.cccd && String(c.cccd).includes(keyword));

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
// Sắp xếp
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
// Hiển thị danh sách khách hàng
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
// Grid View
// ===============================
function displayGridView(customers) {
    const grid = document.getElementById('customersGrid');
    grid.innerHTML = '';

    if (!customers.length) {
        grid.innerHTML = `<p class="text-center">Không có khách hàng nào</p>`;
        return;
    }

    customers.forEach(customer => {
        const initials = getInitials(customer.hoten);
        const active = customer.activeBookings ? .length > 0;

        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <div class="customer-avatar">${initials}</div>
            <h4>${customer.hoten}</h4>
            <p>SĐT: ${customer.sdt || 'N/A'}</p>
            <p>Email: ${customer.email || 'N/A'}</p>
            <p>Trạng thái: <span class="${active ? 'text-success' : 'text-muted'}">${active ? 'Đang lưu trú' : 'Không lưu trú'}</span></p>
            <button class="btn btn-sm btn-view" onclick="viewCustomerDetail(${customer.makh})">Xem</button>
            <button class="btn btn-sm btn-edit" onclick="editCustomer(${customer.makh})">Sửa</button>
        `;
        grid.appendChild(card);
    });
}

// ===============================
// Modal xem/sửa khách hàng
// ===============================
window.viewCustomerDetail = function(customerId) {
    const customer = allCustomers.find(c => c.makh === customerId);
    if (!customer) return alert("Không tìm thấy khách hàng!");

    currentCustomer = customer;
    const modal = document.getElementById('customerDetailModal');
    if (modal) modal.classList.add('show');

    document.getElementById('customerInfo').innerHTML = `
        <p><b>Họ tên:</b> ${customer.hoten}</p>
        <p><b>SĐT:</b> ${customer.sdt}</p>
        <p><b>Email:</b> ${customer.email}</p>
        <p><b>Địa chỉ:</b> ${customer.diachi || 'N/A'}</p>
    `;
};

window.closeCustomerDetailModal = function() {
    document.getElementById('customerDetailModal') ? .classList.remove('show');
};

function openAddCustomerModal() {
    currentCustomer = null;
    document.getElementById('editCustomerForm') ? .reset();
    document.getElementById('editModalTitle').textContent = 'Thêm Khách Hàng Mới';
    document.getElementById('editCustomerModal') ? .classList.add('show');
}

window.editCustomer = function(customerId) {
    const customer = allCustomers.find(c => c.makh === customerId);
    if (!customer) return alert("Không tìm thấy khách hàng!");

    currentCustomer = customer;
    document.getElementById('editModalTitle').textContent = 'Chỉnh Sửa Thông Tin';
    document.getElementById('editHoten').value = customer.hoten || '';
    document.getElementById('editSdt').value = customer.sdt || '';
    document.getElementById('editEmail').value = customer.email || '';
    document.getElementById('editDiachi').value = customer.diachi || '';
    document.getElementById('editCustomerModal') ? .classList.add('show');
};

window.closeEditCustomerModal = function() {
    document.getElementById('editCustomerModal') ? .classList.remove('show');
};

async function saveCustomer() {
    const hoten = document.getElementById('editHoten').value.trim();
    const sdt = document.getElementById('editSdt').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const diachi = document.getElementById('editDiachi').value.trim();

    if (!hoten || !sdt) {
        alert("Vui lòng nhập đủ thông tin!");
        return;
    }

    showLoading(true);
    try {
        const data = { hoten, sdt, email, diachi };
        if (currentCustomer) {
            data.makh = currentCustomer.makh;
            await updateCustomerAPI(data);
            alert("Cập nhật thành công!");
        } else {
            await addCustomerAPI(data);
            alert("Thêm khách hàng mới thành công!");
        }
        closeEditCustomerModal();
        loadCustomers();
    } catch (err) {
        console.error("❌ Lỗi lưu khách hàng:", err);
        alert("Không thể lưu thông tin!");
    } finally {
        showLoading(false);
    }
}

// ===============================
// Tiện ích
// ===============================
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}