// =============================================
// Booking List UI (chỉ xem chi tiết & hủy)
// =============================================

let allBookings = [];
let filteredBookings = [];
let currentFilter = 'Tất cả';
let currentPage = 1;
let itemsPerPage = 10;
let selectedBooking = null;

// --- Khởi tạo ---
document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    initializeEventListeners();
    checkUserLogin();
    setupEventListeners();
    updateCurrentDate();
});

// --- Kiểm tra đăng nhập ---
function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../khachhang/login.html";
        return;
    }
    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || user.username;
}

// --- Đăng xuất ---
function setupEventListeners() {
    const logout = document.querySelector('.logout');
    if (logout) {
        logout.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                window.location.href = '../khachhang/login.html';
            }
        });
    }
}

// --- Tìm kiếm, menu ---
function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput)
        searchInput.addEventListener('input', e => handleSearch(e.target.value));

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle)
        menuToggle.addEventListener('click', () =>
            document.querySelector('.sidebar').classList.toggle('collapsed'));

    // Sự kiện click vào user profile
    const userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', showProfileModal);
    }
}

// --- Hiển thị ngày hiện tại ---
function updateCurrentDate() {
    const today = new Date().toLocaleDateString('vi-VN');

}

// --- Debug function để kiểm tra dữ liệu ---
function debugBookingData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();



    // Đếm theo trạng thái
    const statusCount = {};
    allBookings.forEach(b => {
        statusCount[b.status] = (statusCount[b.status] || 0) + 1;
    });


    // Check-in hôm nay
    const checkinToday = allBookings.filter(b =>
        new Date(b.checkinDate).toDateString() === todayStr
    );


    // Check-out hôm nay  
    const checkoutToday = allBookings.filter(b =>
        new Date(b.checkoutDate).toDateString() === todayStr
    );
    console.log(`🚪 Check-out hôm nay (tất cả): ${checkoutToday.length}`);
    console.log('   - Trạng thái:', checkoutToday.map(b => `${b.id}: ${b.status}`));

    return { checkinToday, checkoutToday, statusCount };
}

// Export debug function
window.debugBookingData = debugBookingData;

// --- Gọi API ---
async function loadBookings() {
    try {
        showLoading();
        const data = await BookingAPI.fetchBookings();
        allBookings = data;
        filteredBookings = [...data];

        // Cập nhật thống kê và hiển thị song song (không chờ nhau)
        updateStatistics(allBookings);
        displayBookings();

    } catch (err) {
        console.error(" Lỗi tải đặt phòng:", err);
        //showError("Không thể tải danh sách đặt phòng từ máy chủ.");
    }
}

// ============================
// Lọc & hiển thị danh sách
// ============================

function filterBookings(filter) {
    currentFilter = filter;
    currentPage = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.filter === filter) t.classList.add('active');
    });

    // Ánh xạ tên hiển thị
    const filterTitles = {
        'Tất cả': 'Tất Cả',
        'Đang ở': 'Đang Ở',
        'checkin hôm nay': 'Check-in Hôm Nay',
        'checkout hôm nay': 'Check-out Hôm Nay',
        'Đã đặt': 'Đã Đặt',
        'Đã trả': 'Đã Trả',
        'Đã hủy': 'Đã Hủy'
    };

    switch (filter) {
        case 'Đang ở':
            filteredBookings = allBookings.filter(b => b.status === 'Đang ở');
            break;
        case 'checkin hôm nay':
            // Check-in hôm nay: chỉ hiển thị trạng thái "Đã đặt"
            filteredBookings = allBookings.filter(b =>
                new Date(b.checkinDate).toDateString() === today.toDateString() &&
                b.status === 'Đã đặt'
            );
            break;
        case 'checkout hôm nay':
            // Check-out hôm nay: chỉ hiển thị trạng thái "Đang ở"
            filteredBookings = allBookings.filter(b =>
                new Date(b.checkoutDate).toDateString() === today.toDateString() &&
                b.status === 'Đang ở'
            );
            break;
        case 'Đã đặt':
            filteredBookings = allBookings.filter(b => new Date(b.checkinDate) > today && b.status === 'Đã đặt');
            break;
        case 'Đã trả':
            filteredBookings = allBookings.filter(b => b.status === 'Đã trả');
            break;
        case 'Đã hủy':
            filteredBookings = allBookings.filter(b => b.status === 'Đã hủy');
            break;
        default:
            filteredBookings = [...allBookings];
    }

    // Cập nhật tiêu đề với text đã format
    document.getElementById('currentFilterTitle').textContent = filterTitles[filter] || filter;
    displayBookings();
}

function handleSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return filterBookings(currentFilter);
    filteredBookings = allBookings.filter(b =>
        b.id.toString().includes(term) ||
        b.customerName.toLowerCase().includes(term) ||
        b.customerPhone.includes(term) ||
        (b.roomNumber || '').toString().includes(term)
    );
    displayBookings();
}

// --- Hiển thị bảng ---
function displayBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filteredBookings.slice(start, start + itemsPerPage);
    document.getElementById('bookingCount').textContent = `(${filteredBookings.length})`;

    if (!filteredBookings.length) {
        tbody.innerHTML = `<tr><td colspan="11" class="empty-state">
            <i class="fas fa-inbox"></i><h3>Không có dữ liệu</h3>
        </td></tr>`;
        return;
    }

    // Tối ưu: Build HTML string thay vì join array
    let html = '';
    for (let i = 0; i < pageData.length; i++) {
        const b = pageData[i];
        html += `
        <tr>
            <td><span class="booking-code" onclick="viewBookingDetail('${b.id}')">${b.id}</span></td>
            <td>${b.customerName}</td>
            <td>${b.customerPhone}</td>
            <td>${b.roomNumber}</td>
            <td>${b.roomType}</td>
            <td>${formatDate(b.checkinDate)}</td>
            <td>${formatDate(b.checkoutDate)}</td>
            <td>${b.paymentStatus}</td>
            <td>${formatCurrency(b.totalAmount)}</td>
            <td>${getStatusBadge(b.status)}</td>
            <td>${getActionButtons(b)}</td>
        </tr>`;
    }
    tbody.innerHTML = html;

    updatePagination();
}

// --- Màu trạng thái ---
function getStatusBadge(status) {
    const map = { 'Đang ở': 'Đang ở', 'Đã đặt': 'Đã đặt', 'Đã trả': 'Đã trả', 'Đã hủy': 'Đã hủy' };
    return `<span class="status-badge status-${map[status]||''}">
        <i class="fas fa-circle"></i> ${status}
    </span>`;
}

// --- Chỉ còn 2 nút: Xem + Hủy ---
function getActionButtons(b) {
    // Không cho phép hủy nếu: Đã hủy, Đã trả, hoặc Đang ở
    const canCancel = (b.status !== 'Đã hủy' && b.status !== 'Đã trả' && b.status !== 'Đang ở');
    const cancelBtn = canCancel ?
        `<button class="btn-action btn-cancel" onclick="confirmCancelBooking('${b.id}')">
               <i class="fas fa-ban"></i></button>` :
        '';

    return `
        <button class="btn-action btn-view" onclick="viewBookingDetail('${b.id}')">
            <i class="fas fa-eye"></i>
        </button>
        ${cancelBtn}
    `;
}

// ============================
// Chi tiết & Hủy
// ============================

function viewBookingDetail(id) {
    selectedBooking = allBookings.find(b => b.id == id);
    if (!selectedBooking) return;

    document.getElementById('modalBookingCode').textContent = selectedBooking.id;
    document.getElementById('modalBookingDate').textContent = formatDate(selectedBooking.bookingDate);
    document.getElementById('modalStatus').innerHTML = getStatusBadge(selectedBooking.status);

    document.getElementById('modalCustomerName').textContent = selectedBooking.customerName;
    document.getElementById('modalCustomerPhone').textContent = selectedBooking.customerPhone;
    document.getElementById('modalCustomerEmail').textContent = selectedBooking.customerEmail;
    document.getElementById('modalCustomerID').textContent = selectedBooking.customerID;

    document.getElementById('modalRoomNumber').textContent = selectedBooking.roomNumber;
    document.getElementById('modalRoomType').textContent = selectedBooking.roomType;
    document.getElementById('modalCheckin').textContent = formatDate(selectedBooking.checkinDate);
    document.getElementById('modalCheckout').textContent = formatDate(selectedBooking.checkoutDate);

    //  Dữ liệu tiền phòng và dịch vụ
    const roomPrice = selectedBooking.tienPhong || selectedBooking.TienPhong || 0;
    const serviceFee = selectedBooking.tienDichVu || selectedBooking.TienDichVu || 0;
    const total = selectedBooking.totalAmount || selectedBooking.TongTien || roomPrice + serviceFee;
    const paid = (selectedBooking.paymentStatus === 'Đã thanh toán') ? total : 0;
    const remaining = total - paid;

    document.getElementById('modalRoomPrice').textContent = formatCurrency(roomPrice);
    document.getElementById('modalServiceFee').textContent = formatCurrency(serviceFee);
    document.getElementById('modalGrandTotal').textContent = formatCurrency(total);
    document.getElementById('modalPaid').textContent = formatCurrency(paid);
    document.getElementById('modalRemaining').textContent = formatCurrency(remaining);

    document.getElementById('modalNotes').textContent = selectedBooking.notes || 'Không có ghi chú';

    // Ẩn/hiện nút hủy dựa trên trạng thái booking
    const btnCancel = document.getElementById('btnCancel');
    const canCancel = (selectedBooking.status !== 'Đã hủy' && selectedBooking.status !== 'Đã trả' && selectedBooking.status !== 'Đang ở');

    if (btnCancel) {
        btnCancel.style.display = canCancel ? 'inline-block' : 'none';
    }

    document.getElementById('bookingDetailModal').classList.add('show');
}



function closeBookingDetailModal() {
    document.getElementById('bookingDetailModal').classList.remove('show');
    selectedBooking = null;
}
window.onclick = e => { if (e.target.id === 'bookingDetailModal') closeBookingDetailModal(); };

async function confirmCancelBooking(id) {
    // Nếu không có id (gọi từ modal), dùng selectedBooking
    const bookingId = id || (selectedBooking ? selectedBooking.id : null);
    const booking = id ? allBookings.find(b => b.id == id) : selectedBooking;

    if (!bookingId || !booking) {
        showNotification('Không tìm thấy thông tin booking', 'error');
        return;
    }

    // Kiểm tra trạng thái không được phép hủy
    if (booking.status === 'Đã hủy' || booking.status === 'Đã trả' || booking.status === 'Đang ở') {
        showNotification(`Không thể hủy booking có trạng thái "${booking.status}"`, 'error');
        return;
    }

    // Hiển thị modal hủy phòng giống bên khách hàng
    await showCancelModal(bookingId, booking);
}

// Modal hủy phòng giống bên khách hàng
async function showCancelModal(madatphong, booking) {
    try {
        // 1. Gọi API xem trước thông tin hủy
        const response = await fetch(`https://localhost:7076/api/Datphongs/PreviewCancel/${madatphong}`);
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin hủy phòng.');
        }

        const data = await response.json();

        // 2. Tạo modal HTML
        const modalHTML = `
            <div class="cancel-modal-overlay" id="cancelModal">
                <div class="cancel-modal">
                    <div class="cancel-modal-header">
                        <h2>
                            <i class="fas fa-ban"></i>
                            Xác Nhận Hủy Đặt Phòng
                        </h2>
                        <button class="cancel-modal-close" onclick="closeCancelModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="cancel-modal-body">
                        <div class="cancel-booking-info">
                            <h3><i class="fas fa-info-circle"></i> Thông tin đặt phòng</h3>
                            <p><strong>Mã đặt phòng:</strong> #${madatphong}</p>
                            <p><strong>Khách hàng:</strong> ${booking.customerName}</p>
                            <p><strong>Phòng:</strong> ${booking.roomNumber}</p>
                            <p><strong>Tổng tiền đơn hàng:</strong> ${formatCurrency(data.tongTienDonHang)}</p>
                            <p><strong>Số tiền đã thanh toán:</strong> ${formatCurrency(data.tongTienDaThanhToan)}</p>
                        </div>
                        
                        <div class="cancel-policy-box">
                            <h3>
                                <i class="fas fa-shield-alt"></i> Chính sách hủy
                            </h3>
                            <p class="policy-text">${data.chinhSachHuy}</p>
                            
                            <div class="refund-details">
                                <div class="refund-item ${data.phanTramHoan === 100 ? 'active' : ''}">
                                    <i class="fas fa-clock"></i>
                                    <span>Hủy trước 48h: <strong>Hoàn 100%</strong></span>
                                    ${data.phanTramHoan === 100 ? '<i class="fas fa-check-circle"></i>' : ''}
                                </div>
                                <div class="refund-item ${data.phanTramHoan === 50 ? 'active' : ''}">
                                    <i class="fas fa-clock"></i>
                                    <span>Hủy trước 24h: <strong>Hoàn 50%</strong></span>
                                    ${data.phanTramHoan === 50 ? '<i class="fas fa-check-circle"></i>' : ''}
                                </div>
                                <div class="refund-item ${data.phanTramHoan === 0 ? 'active' : ''}">
                                    <i class="fas fa-ban"></i>
                                    <span>Hủy trong 24h: <strong>Không hoàn tiền</strong></span>
                                    ${data.phanTramHoan === 0 ? '<i class="fas fa-check-circle"></i>' : ''}
                                </div>
                            </div>
                            
                            <div class="refund-summary ${data.phanTramHoan > 0 ? 'positive' : 'negative'}">
                                <div class="refund-amount">
                                    <span>Số tiền được hoàn:</span>
                                    <strong class="${data.phanTramHoan > 0 ? 'positive' : 'negative'}">
                                        ${formatCurrency(data.soTienHoan)} (${data.phanTramHoan}%)
                                    </strong>
                                </div>
                            </div>
                        </div>
                        
                        <div class="cancel-reason">
                            <h3>
                                <i class="fas fa-comment-dots"></i> Lý do hủy phòng
                            </h3>
                            <select id="cancelReason" class="cancel-reason-select">
                                <option value="">-- Chọn lý do hủy --</option>
                                <option value="Thay đổi kế hoạch">Thay đổi kế hoạch</option>
                                <option value="Khách không đến">Khách không đến</option>
                                <option value="Lỗi đặt phòng">Lỗi đặt phòng</option>
                                <option value="Yêu cầu của khách">Yêu cầu của khách</option>
                                <option value="Lý do vận hành">Lý do vận hành</option>
                                <option value="Khác">Khác</option>
                            </select>
                            <textarea id="cancelNote" class="cancel-note" placeholder="Ghi chú thêm (tùy chọn)..." rows="3"></textarea>
                        </div>
                        
                        ${data.phanTramHoan === 0 ? `
                        <div class="cancel-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>
                                <strong>Lưu ý:</strong> Khách hàng sẽ <strong>không được hoàn tiền</strong> 
                                do hủy trong vòng 24h trước khi nhận phòng.
                            </span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="cancel-modal-footer">
                        <button class="cancel-modal-btn btn-back" onclick="closeCancelModal()">
                            <i class="fas fa-arrow-left"></i> Quay Lại
                        </button>
                        <button class="cancel-modal-btn btn-confirm-cancel" onclick="executeBookingCancel(${madatphong})">
                            <i class="fas fa-check-circle"></i> Xác Nhận Hủy
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 3. Thêm modal vào body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 4. Hiển thị modal với animation
        setTimeout(() => {
            const modalElement = document.getElementById('cancelModal');
            if (modalElement) {
                modalElement.classList.add('show');
            }
        }, 10);

    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
}

// Đóng modal hủy
window.closeCancelModal = function() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Thực hiện hủy phòng
window.executeBookingCancel = async function(madatphong) {
    const reason = document.getElementById('cancelReason').value;
    const note = document.getElementById('cancelNote').value;
    
    if (!reason) {
        alert('Vui lòng chọn lý do hủy phòng!');
        return;
    }
    
    const confirmBtn = document.querySelector('.btn-confirm-cancel');
    const originalText = confirmBtn.innerHTML;

    try {
        // Hiển thị loading
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        confirmBtn.disabled = true;
        
        // Gọi API hủy
        const response = await fetch(`https://localhost:7076/api/Datphongs/huy/${madatphong}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                LyDo: reason,
                GhiChu: note
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Hủy phòng thất bại.');
        }
        
        // Xử lý thành công
        closeCancelModal();
        
        const trangThai = result.trangThaiThanhToan || "Đã xử lý";
        const soTien = result.soTienHoanDuKien;
        const phanTram = result.phanTramHoan;

        let successMessage = result.message + '\n\n';
        successMessage += 'Trạng thái: ' + trangThai + '\n';
        
        if (soTien !== undefined && phanTram !== undefined) {
            successMessage += `Số tiền hoàn: ${formatCurrency(soTien)} (${phanTram}%)`;
        }

        showNotification('Hủy phòng thành công!');
        
        // Đóng modal chi tiết nếu đang mở
        if (selectedBooking && selectedBooking.id == madatphong) {
            closeBookingDetailModal();
        }
        
        // Tải lại danh sách
        loadBookings();
        
    } catch (error) {
        console.error('Lỗi khi hủy đặt phòng:', error);
        showNotification('Lỗi: ' + error.message, 'error');
        
        // Khôi phục nút
        if (confirmBtn) {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
}

// ============================
// Tiện ích chung
// ============================

function updateStatistics(bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Kiểm tra phần tử tồn tại trước khi set textContent
    const checkinTodayEl = document.getElementById('checkinToday');
    const checkoutTodayEl = document.getElementById('checkoutToday');
    const currentStayingEl = document.getElementById('currentStaying');
    const upcomingBookingsEl = document.getElementById('upcomingBookings');
    const completedBookingsEl = document.getElementById('completedBookings');
    
    if (checkinTodayEl) {
        checkinTodayEl.textContent = bookings.filter(b => new Date(b.checkinDate).toDateString() === today.toDateString()).length;
    }
    if (checkoutTodayEl) {
        checkoutTodayEl.textContent = bookings.filter(b => new Date(b.checkoutDate).toDateString() === today.toDateString()).length;
    }
    if (currentStayingEl) {
        currentStayingEl.textContent = bookings.filter(b => b.status === 'Đang ở').length;
    }
    if (upcomingBookingsEl) {
        upcomingBookingsEl.textContent = bookings.filter(b => new Date(b.checkinDate) > today && b.status === 'Đã đặt').length;
    }
    if (completedBookingsEl) {
        completedBookingsEl.textContent = bookings.filter(b => b.status === 'Đã trả').length;
    }
}

function showNotification(msg, type = 'success') {
    const color = type === 'error' ? '#dc2626' : '#16a34a';
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = `position:fixed;top:20px;right:20px;padding:10px 20px;
        background:${color};color:#fff;border-radius:8px;z-index:9999;`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '-'; }

function formatCurrency(v) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0); }

function showLoading() { document.getElementById('bookingsTableBody').innerHTML = '<tr><td colspan="11"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>'; }

function showError(m) { alert(m); }

// --- Phân trang ---
function updatePagination() {
    const total = Math.ceil(filteredBookings.length / itemsPerPage);
    const box = document.getElementById('pageNumbers');
    
    // Tối ưu: Build HTML string thay vì tạo từng element
    let html = '';
    for (let i = 1; i <= total; i++) {
        const activeClass = i === currentPage ? ' active' : '';
        html += `<button class="page-number${activeClass}" onclick="changePage(${i})">${i}</button>`;
    }
    box.innerHTML = html;
}

// Hàm helper cho pagination
function changePage(page) {
    currentPage = page;
    displayBookings();
}

function refreshBookings() { loadBookings(); }

//in phiếu
function printBooking() {
    if (!selectedBooking) {
        alert("Vui lòng chọn đặt phòng để in.");
        return;
    }

    // 🔹 Gán dữ liệu vào template
    document.getElementById('p_maDatPhong').textContent = selectedBooking.id;
    document.getElementById('p_ngayDat').textContent = formatDate(selectedBooking.bookingDate);
    document.getElementById('p_trangThai').textContent = selectedBooking.status;
    document.getElementById('p_trangThaiTT').textContent = selectedBooking.paymentStatus;

    document.getElementById('p_khachHang').textContent = selectedBooking.customerName;
    document.getElementById('p_sdt').textContent = selectedBooking.customerPhone;
    document.getElementById('p_email').textContent = selectedBooking.customerEmail;
    document.getElementById('p_cccd').textContent = selectedBooking.customerID;

    document.getElementById('p_phong').textContent = selectedBooking.roomNumber;
    document.getElementById('p_loaiPhong').textContent = selectedBooking.roomType;
    document.getElementById('p_checkin').textContent = formatDate(selectedBooking.checkinDate);
    document.getElementById('p_checkout').textContent = formatDate(selectedBooking.checkoutDate);

    document.getElementById('p_tienPhong').textContent = formatCurrency(selectedBooking.tienPhong || 0);
    document.getElementById('p_tienDichVu').textContent = formatCurrency(selectedBooking.tienDichVu || 0);
    document.getElementById('p_tongTien').textContent = formatCurrency(selectedBooking.totalAmount || 0);

    document.getElementById('p_ghiChu').textContent = selectedBooking.notes || "Không có ghi chú";
    document.getElementById('p_ngayIn').textContent = formatDateTime(new Date());

    //  Gán tên ký
    document.getElementById('p_tenKhachHangKy').textContent = selectedBooking.customerName;
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    document.getElementById('p_tenLeTanKy').textContent = currentUser.name || currentUser.username || "______________________";

    //  In trực tiếp
    const printContent = document.getElementById('printBookingTemplate').innerHTML;
    const win = window.open('', '', 'width=900,height=1000');
    win.document.write(`
        <html>
        <head>
            <title>Phiếu Đặt Phòng #${selectedBooking.id}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding:20px; color:#000; }
                table { width:100%; border-collapse: collapse; margin-bottom: 20px; }
                td, th { border: 1px solid #000; padding: 8px; }
                th { background: #f3f3f3; }
                h3, h4 { text-align:center; margin:10px 0; }
                img { display:block; margin:auto; height:80px; }
                .center { text-align:center; }
            </style>
        </head>
        <body>${printContent}</body>
        </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
}





function formatDateTime(d) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return d ? new Date(d).toLocaleString('vi-VN', options) : '-';
}

// ============================
// Modal Thông Tin Cá Nhân
// ============================

function showProfileModal() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Điền thông tin vào modal
    document.getElementById('profile_username').textContent = currentUser.username || '-';
    document.getElementById('profile_name').textContent = currentUser.name || currentUser.hoten || '-';
    document.getElementById('profile_email').textContent = currentUser.email || '-';
    document.getElementById('profile_phone').textContent = currentUser.sdt || currentUser.phone || '-';
    
    // Reset form đổi mật khẩu
    document.getElementById('changePasswordForm').reset();
    
    // Hiển thị modal
    document.getElementById('profileModal').classList.add('show');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
}

async function handleChangePassword(event) {
    event.preventDefault();
    
    const emailOrSdt = document.getElementById('emailorsdt_input').value.trim();
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    // Kiểm tra mật khẩu mới và xác nhận khớp nhau
    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu mới và xác nhận không khớp!', 'error');
        return;
    }
    
    // Kiểm tra độ dài mật khẩu
    if (newPassword.length < 8) {
        showNotification('Mật khẩu mới phải có ít nhất 8 ký tự!', 'error');
        return;
    }
    
    // Chữ cái đầu phải viết hoa
    if (!/^[A-Z]/.test(newPassword)) {
        showNotification('Chữ cái đầu của mật khẩu mới phải viết hoa!', 'error');
        return;
    }

    // Phải có ít nhất 1 chữ thường
    if (!/[a-z]/.test(newPassword)) {
        showNotification('Mật khẩu mới phải chứa ít nhất 1 chữ thường!', 'error');
        return;
    }

    // Phải có ít nhất 1 số
    if (!/\d/.test(newPassword)) {
        showNotification('Mật khẩu mới phải chứa ít nhất 1 số!', 'error');
        return;
    }

    // Phải có ít nhất 1 ký tự đặc biệt
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        showNotification('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt!', 'error');
        return;
    }

    // Không được chứa khoảng trắng
    if (/\s/.test(newPassword)) {
        showNotification('Mật khẩu mới không được chứa khoảng trắng!', 'error');
        return;
    }
    
    try {
        // Gọi API đổi mật khẩu giống bên khách hàng
        const response = await fetch(
            `https://localhost:7076/api/Taikhoans/DoiMatKhau?emailorsdt=${encodeURIComponent(emailOrSdt)}&matkhaucu=${encodeURIComponent(currentPassword)}&matkhaumoi=${encodeURIComponent(newPassword)}`,
            {
                method: 'POST'
            }
        );
        
        // Xử lý response (có thể là text hoặc JSON)
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            result = { message: text };
        }
        
        if (!response.ok) {
            // Xử lý thông báo lỗi cho người dùng
            let errorMessage = result.message || result || 'Đổi mật khẩu thất bại';
            
            // Phát hiện lỗi mật khẩu cũ không đúng hoặc lỗi BCrypt
            if (errorMessage.includes('SaltParseException') || 
                errorMessage.includes('BCrypt') || 
                errorMessage.includes('Invalid salt')) {
                errorMessage = 'Mật khẩu hiện tại không đúng hoặc tài khoản có vấn đề! Vui lòng liên hệ quản trị viên.';
            } else if (errorMessage.includes('Mật khẩu cũ không chính xác')) {
                errorMessage = 'Mật khẩu hiện tại không đúng!';
            } else if (errorMessage.includes('không tìm thấy')) {
                errorMessage = 'Không tìm thấy tài khoản với email/số điện thoại này!';
            }
            
            throw new Error(errorMessage);
        }
        
        showNotification('✓ ' + (result.message || result || 'Đổi mật khẩu thành công!'), 'success');
        document.getElementById('changePasswordForm').reset();
        
        // Tự động đăng xuất sau 3 giây
        setTimeout(() => {
            closeProfileModal();
            localStorage.removeItem('currentUser');
            window.location.href = '../khachhang/login.html';
        }, 3000);
        
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        
        // Hiển thị thông báo lỗi thân thiện
        let userMessage = error.message || 'Lỗi kết nối tới server. Vui lòng thử lại!';
        if (userMessage.length > 200) {
            userMessage = 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra!';
        }
        
        showNotification(userMessage, 'error');
    }
}

// Đóng modal khi click bên ngoài
window.addEventListener('click', (e) => {
    const profileModal = document.getElementById('profileModal');
    if (e.target === profileModal) {
        closeProfileModal();
    }
});