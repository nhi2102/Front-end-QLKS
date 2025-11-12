// ============================
// Profile Modal - Shared Functions
// ============================

// Thêm event listener cho user profile button
document.addEventListener('DOMContentLoaded', function() {
    const userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', showProfileModal);
    }
});

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
        alert('Mật khẩu mới và xác nhận không khớp!');
        return;
    }

    // Kiểm tra độ dài mật khẩu
    if (newPassword.length < 8) {
        alert('Mật khẩu mới phải có ít nhất 8 ký tự!');
        return;
    }

    // Chữ cái đầu phải viết hoa
    if (!/^[A-Z]/.test(newPassword)) {
        alert('Chữ cái đầu của mật khẩu mới phải viết hoa!');
        return;
    }

    // Phải có ít nhất 1 chữ thường
    if (!/[a-z]/.test(newPassword)) {
        alert('Mật khẩu mới phải chứa ít nhất 1 chữ thường!');
        return;
    }

    // Phải có ít nhất 1 số
    if (!/\d/.test(newPassword)) {
        alert('Mật khẩu mới phải chứa ít nhất 1 số!');
        return;
    }

    // Phải có ít nhất 1 ký tự đặc biệt
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        alert('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt!');
        return;
    }

    // Không được chứa khoảng trắng
    if (/\s/.test(newPassword)) {
        alert('Mật khẩu mới không được chứa khoảng trắng!');
        return;
    }

    try {
        // Gọi API đổi mật khẩu
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

        alert('✓ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        document.getElementById('changePasswordForm').reset();

        // Tự động đăng xuất sau 1 giây
        setTimeout(() => {
            closeProfileModal();
            localStorage.removeItem('currentUser');
            window.location.href = '../khachhang/login.html';
        }, 1000);

    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);

        // Hiển thị thông báo lỗi thân thiện
        let userMessage = error.message || 'Lỗi kết nối tới server. Vui lòng thử lại!';
        if (userMessage.length > 200) {
            userMessage = 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra!';
        }

        alert(userMessage);
    }
}

// Đóng modal khi click bên ngoài
window.addEventListener('click', (e) => {
    const profileModal = document.getElementById('profileModal');
    if (e.target === profileModal) {
        closeProfileModal();
    }
});