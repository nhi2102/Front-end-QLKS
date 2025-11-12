// js/dashboard.ui.js
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    loadDashboardData();
    setupEventListeners();
    setDefaultCheckInTime();
});


//  Kiểm tra đăng nhập

function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../khachhang/login.html";
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
                window.location.href = '../khachhang/login.html';
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

    // Enter để tìm kiếm
    const searchInputs = ['searchBookingCode', 'searchPhone', 'searchName'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchBooking();
            });
        }
    });
}

// =====================
//  Load dữ liệu Dashboard
// =====================
async function loadDashboardData() {
    try {
        const summary = await apiGetLeTanSummary();
        document.getElementById("totalRooms").innerText = summary.tongSoPhong;
        document.getElementById("availableRooms").innerText = summary.phongTrong;
        document.getElementById("occupiedRooms").innerText = summary.phongDangO;
        document.getElementById("todayCheckIn").innerText = summary.checkInHomNay;
        document.getElementById("todayCheckOut").innerText = summary.checkOutHomNay;
    } catch (err) {
        console.error("Lỗi tải thống kê dashboard:", err);
    }

    try {
        const details = await apiGetLeTanDetails();
        displayDashboardDetails(details);
    } catch (err) {
        console.error(" Lỗi tải chi tiết check-in/out:", err);
    }
}

// =====================
//  Hiển thị chi tiết Check-in / Check-out
// =====================
function displayDashboardDetails(data) {
    console.log(" Dữ liệu API:", data);

    // Check-in hôm nay
    const checkinRows = Array.isArray(data.checkInHomNay) ?
        data.checkInHomNay.map(item => `
            <tr>
                <td>${item.maDatPhong}</td>
                <td>${item.khachHang}</td>
                <td>${item.phong}</td>
                <td>${item.gioNhan || ''}</td>
                <td>${item.trangThai}</td>
            </tr>`).join('') :
        '';
    document.getElementById("checkInList").innerHTML = checkinRows;

    // Check-out hôm nay
    const checkoutRows = Array.isArray(data.checkOutHomNay) ?
        data.checkOutHomNay.map(item => `
            <tr>
                <td>${item.maDatPhong}</td>
                <td>${item.khachHang}</td>
                <td>${item.phong}</td>
                <td>${item.gioTra || ''}</td>
                <td>${item.trangThai}</td>
            </tr>`).join('') :
        '';
    document.getElementById("checkOutList").innerHTML = checkoutRows;
}

// =====================
// Thời gian mặc định
// =====================
function setDefaultCheckInTime() {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    const checkInTimeInput = document.getElementById('checkInTime');
    if (checkInTimeInput) checkInTimeInput.value = timeString;
}

// =====================
//  Đóng modal
// =====================
function closeCheckInModal() {
    const modal = document.getElementById('checkInModal');
    if (modal) modal.style.display = 'none';
}

// ============================
// Modal Thông Tin Cá Nhân
// ============================

function showProfileModal() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Điền thông tin vào modal
    document.getElementById('profile_name').textContent = currentUser.name || currentUser.hoten || '-';
    document.getElementById('profile_email').textContent = currentUser.email || '-';
    document.getElementById('profile_phone').textContent = currentUser.sdt || currentUser.phone || '-';

    // Tự động điền email vào input hidden
    const emailOrSdt = currentUser.email || currentUser.sdt || currentUser.username;
    document.getElementById('emailorsdt_input').value = emailOrSdt;

    // Reset form đổi mật khẩu
    document.getElementById('changePasswordForm').reset();
    document.getElementById('emailorsdt_input').value = emailOrSdt; // Giữ lại sau reset

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
            `https://localhost:7076/api/Taikhoans/DoiMatKhau?emailorsdt=${encodeURIComponent(emailOrSdt)}&matkhaucu=${encodeURIComponent(currentPassword)}&matkhaumoi=${encodeURIComponent(newPassword)}`, {
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