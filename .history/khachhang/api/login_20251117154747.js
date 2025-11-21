// login.js
const API_BASE = 'https://localhost:7076/api';

async function apiRequest(url, options = {}) {
    options.headers = { 'Content-Type': 'application/json', ...options.headers };
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let err;
            try { err = await response.json(); } catch { err = { message: await response.text() }; }
            throw new Error(err.message || `Lỗi ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function login(emailorsdt, matkhau) {
    return apiRequest(`${API_BASE}/Taikhoans/DangNhap?emailorsdt=${encodeURIComponent(emailorsdt)}&matkhau=${encodeURIComponent(matkhau)}`, {
        method: 'POST'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.createElement('div');
    errorMessage.id = 'errorMessage';
    errorMessage.style.display = 'none';
    errorMessage.style.color = 'red';
    loginForm.appendChild(errorMessage);

    const successMessage = document.createElement('div');
    successMessage.id = 'successMessage';
    successMessage.style.display = 'none';
    successMessage.style.color = 'yellow';
    loginForm.appendChild(successMessage);

    if (loginForm) {
        loginForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const loginBtn = document.querySelector('.login-btn');

            // Kiểm tra nhập đầy đủ thông tin
            if (!username && !password) {
                errorMessage.textContent = ' Vui lòng nhập đầy đủ thông tin!';
                errorMessage.style.display = 'block';
                return;
            }

            if (!username) {
                errorMessage.textContent = ' Vui lòng nhập tài khoản (Email hoặc số điện thoại)!';
                errorMessage.style.display = 'block';
                return;
            }

            if (!password) {
                errorMessage.textContent = ' Vui lòng nhập mật khẩu!';
                errorMessage.style.display = 'block';
                return;
            }

            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Đang đăng nhập...';
            }

            try {
                const response = await login(username, password);

                // Xác định loại tài khoản và chuyển hướng
                const role = response.role ? response.role.toLowerCase() : 'customer';
                const name = response.hoten || response.Hoten || 'Người dùng';
                let redirect = '../khachhang/home.html';

                if (role === 'admin') redirect = '../Admin/index.html';
                else if (role === 'receptionist' || role === 'manager') redirect = '../letan/letan_dashboard.html';

                // Lưu thông tin người dùng vào localStorage
                const userData = {
                    ...response,
                    id: response.makh || response.manv || response.id || null,
                    makh: response.makh || response.MaKh || null,
                    manv: response.manv || null,
                    name,
                    email: response.email || response.Email || username,
                    sdt: response.sdt || response.Sdt || null,
                    role,
                    trangThai: response.trangThai || 'Hoạt động',
                    // Đảm bảo lưu điểm thành viên
                    diemthanhvien: response.diemthanhvien || response.Diemthanhvien || 0,
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem('currentUser', JSON.stringify(userData));

                successMessage.textContent = `Xin chào ${name}! Đang chuyển hướng...`;
                successMessage.style.display = 'block';
                setTimeout(() => {
                    window.location.href = redirect;
                }, 2000);
            } catch (error) {
                errorMessage.textContent = error.message || 'Đăng nhập thất bại. Vui lòng thử lại!';
                errorMessage.style.display = 'block';
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Đăng nhập';
                }
            }
        });
    }

    // Kiểm tra nếu đã đăng nhập
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        if (user.role === 'admin') window.location.href = '../Admin/index.html';
        else if (user.role === 'receptionist' || user.role === 'manager') window.location.href = '../letan/letan_dashboard.html';
        else window.location.href = '../khachhang/home.html';
    }
});