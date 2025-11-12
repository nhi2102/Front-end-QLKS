const API_BASE_URL = 'https://localhost:7076/api';

let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
let pageSize = 12;
let currentView = 'grid';
let currentCustomer = null;
// Khởi tạo sự kiện giao diện

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadCustomers();
    checkUserLogin();
    setupEventListeners();
});

function initializeEventListeners() {
    //Tìm kiếm và lọc
    document.getElementById('searchBtn').addEventListener('click', applyFilters);
    document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });

    // document.getElementById('filterGender').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // Hiển thị dạng xem
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            displayCustomers();
        });
    });

    // // Thêm khách hàng
    // document.getElementById('addCustomerBtn').addEventListener('click', openAddCustomerModal);

    // Chỉnh sửa khách hàng
    //document.getElementById('editCustomerBtn').addEventListener('click', openEditCurrentCustomer);
    document.getElementById('saveCustomerBtn').addEventListener('click', saveCustomer);
    document.getElementById('resetPasswordBtn').addEventListener('click', promptAndResetPassword);
    // Chuyển tab trong modal chi tiết khách hàng
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

//  Kiểm tra đăng nhập

function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
        return;
    }

    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.name || user.username;
    }

    console.log(`Đăng nhập: ${user.username} (${user.name})`);
}
//  Sự kiện giao diện

function setupEventListeners() {
    // Toggle menu
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    // Logout
    const logoutBtn = document.querySelector('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                console.log(" Đã xóa currentUser, chuyển hướng...");
                window.location.href = '../login.html';
            }
        });
    } else {
        console.warn("Không tìm thấy nút logout!");
    }

    // Đóng modal khi click ra ngoài
    const modal = document.getElementById('checkInModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCheckInModal();
        });
    }
}
// load khách hàng

async function loadCustomers() {
    showLoading(true);

    try {

        const response = await fetch(`${API_BASE_URL}/KhachHangs/timkiem`);
        if (!response.ok) throw new Error('Không thể tải danh sách khách hàng');

        allCustomers = await response.json();

        // Load dữ liệu đặt phòng cho mỗi khách hàng
        await Promise.all(allCustomers.map(async(customer) => {
            customer.bookings = await getCustomerBookings(customer.makh);
            customer.activeBookings = customer.bookings.filter(b =>
                b.trangthai === 'Đang ở' || b.trangthai === 'Đã đặt'
            );
        }));

        filteredCustomers = [...allCustomers];
        updateStatistics();
        displayCustomers();
    } catch (error) {
        console.error('Lỗi tải khách hàng:', error);
        alert('Có lỗi xảy ra khi tải danh sách khách hàng');
    } finally {
        showLoading(false);
    }
}

async function getCustomerBookings(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/DatPhongs`);
        if (!response.ok) return [];

        const allBookings = await response.json();
        return allBookings.filter(b => b.makh === customerId);
    } catch (error) {
        console.error('Lỗi tải lịch sử đặt phòng:', error);
        return [];
    }
}

// Cập nhật thống kê

function updateStatistics() {
    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter(c => c.activeBookings && c.activeBookings.length > 0).length;

    // // VIP customers (more than 5 bookings)
    // const vipCustomers = allCustomers.filter(c => c.bookings && c.bookings.length >= 5).length;

    // // Customers created this month
    // const now = new Date();
    // const monthlyCustomers = allCustomers.filter(c => {
    //     if (!c.ngaytao) return false;
    //     const created = new Date(c.ngaytao);
    //     return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    // }).length;

    document.getElementById('totalCustomers').textContent = totalCustomers;
    document.getElementById('activeCustomers').textContent = activeCustomers;
    // document.getElementById('vipCustomers').textContent = vipCustomers;
    // document.getElementById('monthlyCustomers').textContent = monthlyCustomers;
}

// ============================================
// APPLY FILTERS
// ============================================

function applyFilters() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase().trim();
    // const gender = document.getElementById('filterGender').value;
    const status = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;

    filteredCustomers = allCustomers.filter(customer => {
        // Keyword filter
        if (keyword) {
            const matchKeyword =
                (customer.hoten && customer.hoten.toLowerCase().includes(keyword)) ||
                (customer.sdt && customer.sdt.includes(keyword)) ||
                (customer.email && customer.email.toLowerCase().includes(keyword)) ||
                (customer.cccd && customer.cccd.includes(keyword)) ||
                (customer.makh && customer.makh.toString().includes(keyword));

            if (!matchKeyword) return false;
        }


        // Status filter
        if (status === 'active' && (!customer.activeBookings || customer.activeBookings.length === 0)) return false;
        if (status === 'inactive' && customer.activeBookings && customer.activeBookings.length > 0) return false;

        return true;
    });

    // Sort
    switch (sortBy) {
        case 'newest':
            filteredCustomers.sort((a, b) => b.makh - a.makh);
            break;
        case 'oldest':
            filteredCustomers.sort((a, b) => a.makh - b.makh);
            break;
        case 'name-asc':
            filteredCustomers.sort((a, b) => (a.hoten || '').localeCompare(b.hoten || ''));
            break;
        case 'name-desc':
            filteredCustomers.sort((a, b) => (b.hoten || '').localeCompare(a.hoten || ''));
            break;
        case 'visits':
            filteredCustomers.sort((a, b) => ((b.bookings && b.bookings.length) || 0) - ((a.bookings && a.bookings.length) || 0));
            break;
    }

    currentPage = 1;
    displayCustomers();
}

// ============================================
// DISPLAY CUSTOMERS
// ============================================

function displayCustomers() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageCustomers = filteredCustomers.slice(startIndex, endIndex);

    document.getElementById('customerCount').textContent = filteredCustomers.length;

    if (currentView === 'grid') {
        displayGridView(pageCustomers);
        document.getElementById('customersGrid').style.display = 'grid';
        document.getElementById('customersList').style.display = 'none';
    } else {
        displayListView(pageCustomers);
        document.getElementById('customersGrid').style.display = 'none';
        document.getElementById('customersList').style.display = 'block';
    }

    displayPagination();
}

function displayGridView(customers) {
    const grid = document.getElementById('customersGrid');

    if (customers.length === 0) {
        grid.innerHTML = `
            <div class="no-data" style="grid-column: 1 / -1;">
                <i class="fas fa-users"></i>
                <p>Không tìm thấy khách hàng nào</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    customers.forEach(customer => {
        const card = createCustomerCard(customer);
        grid.appendChild(card);
    });
}

function createCustomerCard(customer) {
    const card = document.createElement('div');
    card.className = 'customer-card';

    const isActive = customer.activeBookings && customer.activeBookings.length > 0;
    const initials = getInitials(customer.hoten);

    card.innerHTML = `
        <div class="customer-card-header">
            <span class="customer-status-badge ${isActive ? 'active' : 'inactive'}">
                ${isActive ? 'Đang lưu trú' : 'Không lưu trú'}
            </span>
            <div class="customer-avatar">${initials}</div>
            <div class="customer-name">${customer.hoten || 'N/A'}</div>
            <div class="customer-id">Mã KH: ${customer.makh}</div>
        </div>
        <div class="customer-card-body">
            <div class="customer-info-item">
                <i class="fas fa-id-card"></i>
                <span class="label">CCCD:</span>
                <span class="value">${customer.cccd || 'N/A'}</span>
            </div>
            <div class="customer-info-item">
                <i class="fas fa-phone"></i>
                <span class="label">SĐT:</span>
                <span class="value">${customer.sdt || 'N/A'}</span>
            </div>
            <div class="customer-info-item">
                <i class="fas fa-envelope"></i>
                <span class="label">Email:</span>
                <span class="value">${customer.email || 'N/A'}</span>
            </div>
            <div class="customer-info-item">
                <i class="fas fa-calendar-check"></i>
                <span class="label">Lượt lưu trú:</span>
                <span class="value">${customer.bookings?.length || 0}</span>
            </div>
        </div>
        <div class="customer-card-footer">
            <button class="btn-small btn-view" onclick="viewCustomerDetail(${customer.makh})">
                <i class="fas fa-eye"></i> Xem
            </button>
            <button class="btn-small btn-edit" onclick="editCustomer(${customer.makh})">
                <i class="fas fa-edit"></i> Sửa
            </button>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
            viewCustomerDetail(customer.makh);
        }
    });

    return card;
}

function displayListView(customers) {
    const tbody = document.getElementById('customersTableBody');

    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="no-data">
                        <i class="fas fa-users"></i>
                        <p>Không tìm thấy khách hàng nào</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';

    customers.forEach(customer => {
        const isActive = customer.activeBookings && customer.activeBookings.length > 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.makh}</td>
            <td>${customer.hoten || 'N/A'}</td>
            <td>${customer.cccd || 'N/A'}</td>
            <td>${customer.sdt || 'N/A'}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.bookings?.length || 0}</td>
            <td>
                <span class="table-status-badge ${isActive ? 'active' : 'inactive'}">
                    ${isActive ? 'Đang lưu trú' : 'Không lưu trú'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewCustomerDetail(${customer.makh})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editCustomer(${customer.makh})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;

        row.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                viewCustomerDetail(customer.makh);
            }
        });

        tbody.appendChild(row);
    });
}

// ============================================
// PAGINATION
// ============================================

function displayPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredCustomers.length / pageSize);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = `
        <button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span>...</span>`;
        }
    }

    html += `
        <button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = html;
}

window.changePage = function(page) {
    const totalPages = Math.ceil(filteredCustomers.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayCustomers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================
// VIEW CUSTOMER DETAIL
// ============================================

window.viewCustomerDetail = async function(customerId) {
    const customer = allCustomers.find(c => c.makh === customerId);
    if (!customer) return;

    currentCustomer = customer;

    // Display customer info
    displayCustomerInfo(customer);

    // Switch to info tab
    switchTab('info');

    // Show modal
    document.getElementById('customerDetailModal').classList.add('show');
};

function displayCustomerInfo(customer) {
    const infoGrid = document.getElementById('customerInfoGrid');

    infoGrid.innerHTML = `
        <div class="info-item">
            <div class="label">Mã Khách Hàng</div>
            <div class="value">${customer.makh}</div>
        </div>
        <div class="info-item">
            <div class="label">Họ Tên</div>
            <div class="value">${customer.hoten || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="label">CCCD/CMND</div>
            <div class="value">${customer.cccd || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="label">Số Điện Thoại</div>
            <div class="value">${customer.sdt || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="label">Email</div>
            <div class="value">${customer.email || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="label">Ngày Sinh</div>
            <div class="value">${customer.ngaysinh ? formatDate(customer.ngaysinh) : 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="label">Địa Chỉ</div>
            <div class="value">${customer.diachi || 'N/A'}</div>
        </div>
    `;
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Load tab data if needed
    if (tabName === 'history' && currentCustomer) {
        displayBookingHistory(currentCustomer);
    } else if (tabName === 'stats' && currentCustomer) {
        displayCustomerStats(currentCustomer);
    }
}

// ============================================
// BOOKING HISTORY
// ============================================

async function displayBookingHistory(customer) {
    const historyDiv = document.getElementById('bookingHistory');

    if (!customer.bookings || customer.bookings.length === 0) {
        historyDiv.innerHTML = `
            <div class="no-data">
                <i class="fas fa-calendar-times"></i>
                <p>Khách hàng chưa có lịch sử đặt phòng</p>
            </div>
        `;
        return;
    }

    // Sort bookings by date (newest first)
    const sortedBookings = [...customer.bookings].sort((a, b) =>
        new Date(b.ngaynhanphong) - new Date(a.ngaynhanphong)
    );

    historyDiv.innerHTML = '';

    for (const booking of sortedBookings) {
        const historyItem = await createBookingHistoryItem(booking);
        historyDiv.appendChild(historyItem);
    }
}

async function createBookingHistoryItem(booking) {
    const item = document.createElement('div');
    item.className = 'history-item';

    // Get room details
    let roomInfo = 'Đang tải...';
    try {
        const response = await fetch(`${API_BASE_URL}/ChiTietDatPhongs/booking/${booking.madatphong}`);
        if (response.ok) {
            const details = await response.json();
            if (details && details.length > 0) {
                roomInfo = details.map(d => `Phòng ${d.phong.sophong} (${d.phong.loaiPhong.tenloaiphong})`).join(', ');
            }
        }
    } catch (err) {
        roomInfo = 'N/A';
    }

    const statusClass = getBookingStatusClass(booking.trangthai);

    item.innerHTML = `
        <div class="history-header">
            <span class="history-code">Mã ĐP: ${booking.madatphong}</span>
            <span class="history-status ${statusClass}">${booking.trangthai}</span>
        </div>
        <div class="history-details">
            <div class="history-detail-item">
                <i class="fas fa-bed"></i>
                <span class="label">Phòng:</span>
                <span class="value">${roomInfo}</span>
            </div>
            <div class="history-detail-item">
                <i class="fas fa-calendar"></i>
                <span class="label">Nhận phòng:</span>
                <span class="value">${formatDate(booking.ngaynhanphong)}</span>
            </div>
            <div class="history-detail-item">
                <i class="fas fa-calendar-check"></i>
                <span class="label">Trả phòng:</span>
                <span class="value">${formatDate(booking.ngaytraphong)}</span>
            </div>
        </div>
    `;

    return item;
}

function getBookingStatusClass(status) {
    switch (status) {
        case 'Đã thanh toán':
        case 'Đã trả phòng':
            return 'completed';
        case 'Đã hủy':
            return 'cancelled';
        case 'Đã nhận phòng':
        case 'Đã đặt':
            return 'active';
        default:
            return '';
    }
}

// ============================================
// CUSTOMER STATISTICS
// ============================================

function displayCustomerStats(customer) {
    const statsDiv = document.getElementById('customerStats');

    const totalBookings = (customer.bookings && customer.bookings.length) || 0;
    const completedBookings = (customer.bookings && customer.bookings.filter(b =>
        b.trangthai === 'Đã thanh toán' || b.trangthai === 'Đã trả'
    ).length) || 0;
    const cancelledBookings = (customer.bookings && customer.bookings.filter(b => b.trangthai === 'Đã hủy').length) || 0;
    const totalSpent = (customer.bookings && Array.isArray(customer.bookings)) ? customer.bookings.reduce((sum, b) => sum + (b.tongcong || 0), 0) : 0;

    statsDiv.innerHTML = `
        <div class="stat-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <i class="fas fa-calendar-check"></i>
            <div class="stat-number">${totalBookings}</div>
            <div class="stat-label">Tổng Lượt Đặt</div>
        </div>
        <div class="stat-box" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <i class="fas fa-check-circle"></i>
            <div class="stat-number">${completedBookings}</div>
            <div class="stat-label">Hoàn Thành</div>
        </div>
        <div class="stat-box" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <i class="fas fa-times-circle"></i>
            <div class="stat-number">${cancelledBookings}</div>
            <div class="stat-label">Đã Hủy</div>
        </div>
    `;
}

window.closeCustomerDetailModal = function() {
    document.getElementById('customerDetailModal').classList.remove('show');
    currentCustomer = null;
};

// ============================================
// EDIT CUSTOMER
// ============================================

window.editCustomer = function(customerId) {
    const customer = allCustomers.find(c => c.makh === customerId);
    if (!customer) return;

    currentCustomer = customer;

    document.getElementById('editModalTitle').textContent = 'Chỉnh Sửa Thông Tin';
    document.getElementById('editCustomerId').value = customer.makh;
    document.getElementById('editHoten').value = customer.hoten || '';
    document.getElementById('editCccd').value = customer.cccd || '';
    document.getElementById('editSdt').value = customer.sdt || '';
    document.getElementById('editEmail').value = customer.email || '';
    document.getElementById('editNgaysinh').value = customer.ngaysinh ? customer.ngaysinh.split('T')[0] : '';
    document.getElementById('editDiachi').value = customer.diachi || '';

    document.getElementById('editCustomerModal').classList.add('show');
};

function openEditCurrentCustomer() {
    if (!currentCustomer) return;
    closeCustomerDetailModal();
    editCustomer(currentCustomer.makh);
}

function openAddCustomerModal() {
    currentCustomer = null;

    document.getElementById('editModalTitle').textContent = 'Thêm Khách Hàng Mới';
    document.getElementById('editCustomerId').value = '';
    document.getElementById('editCustomerForm').reset();

    document.getElementById('editCustomerModal').classList.add('show');
}

window.closeEditCustomerModal = function() {
    document.getElementById('editCustomerModal').classList.remove('show');
};

async function saveCustomer() {
    const customerId = document.getElementById('editCustomerId').value;
    const isEdit = customerId !== '';

    const customerData = {
        hoten: document.getElementById('editHoten').value.trim(),
        cccd: document.getElementById('editCccd').value.trim(),
        sdt: document.getElementById('editSdt').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        ngaysinh: document.getElementById('editNgaysinh').value || null,
        diachi: document.getElementById('editDiachi').value.trim(),
    };

    // Validation
    if (!customerData.hoten) {
        alert('Vui lòng nhập họ tên');
        return;
    }
    if (!customerData.cccd) {
        alert('Vui lòng nhập CCCD/CMND');
        return;
    }
    if (!customerData.sdt) {
        alert('Vui lòng nhập số điện thoại');
        return;
    }

    showLoading(true);

    try {
        let response;

        if (isEdit) {
            // Gắn lại ID để backend nhận đúng
            customerData.makh = parseInt(customerId);

            console.log("Dữ liệu gửi PUT:", customerData); // debug

            response = await fetch(`${API_BASE_URL}/KhachHangs/${customerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
        } else {
            // Create new customer
            response = await fetch(`${API_BASE_URL}/KhachHangs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });
        }

        if (!response.ok) throw new Error('Không thể lưu thông tin khách hàng');

        alert(isEdit ? 'Cập nhật thông tin thành công!' : 'Thêm khách hàng thành công!');
        closeEditCustomerModal();
        loadCustomers();
    } catch (error) {
        console.error('Lỗi lưu khách hàng:', error);
        alert('Có lỗi xảy ra khi lưu thông tin: ' + error.message);
    } finally {
        showLoading(false);
    }
}
/**
 * Hiển thị xác nhận trước khi gửi link reset mật khẩu.
 */
/**
 * Hiển thị xác nhận trước khi GỬI MẬT KHẨU MỚI.
 */
async function promptAndResetPassword() {
    // Lấy Tên và Email khách hàng từ form edit
    const customerName = document.getElementById('editHoten').value || "khách hàng này";
    const customerEmail = document.getElementById('editEmail').value || "";

    if (!customerEmail) {
        alert('Khách hàng này không có email. Không thể gửi mật khẩu mới.');
        return;
    }

    // Yêu cầu Lễ tân xác nhận
    const isConfirmed = confirm(
        `Bạn có chắc chắn muốn TẠO MỚI và GỬI mật khẩu ngẫu nhiên cho khách hàng "${customerName}"?\n\n` +
        `Mật khẩu mới sẽ được gửi đến email: ${customerEmail}`
    );

    if (isConfirmed) {
        // Gọi hàm API để gửi
        await sendNewPasswordByEmail(customerEmail);
    }
}
// ============================================
// UTILITY FUNCTIONS
// ============================================

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}