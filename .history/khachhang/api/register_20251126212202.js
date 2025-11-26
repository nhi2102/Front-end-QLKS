// api/register.js - Xử lý đăng ký khách hàng
const API_BASE = 'https://localhost:7076/api';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Thêm validation realtime cho số điện thoại, CCCD và email
    const phoneInput = document.getElementById('sodienthoai');
    const cccdInput = document.getElementById('cccd');
    const emailInput = document.getElementById('email');

    // Số điện thoại: chỉ cho phép nhập số, tối đa 10 số
    phoneInput.addEventListener('input', function(e) {
        // Loại bỏ tất cả ký tự không phải số
        this.value = this.value.replace(/[^0-9]/g, '');
        // Giới hạn tối đa 10 số
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });

    // CCCD: chỉ cho phép nhập số, tối đa 12 số
    cccdInput.addEventListener('input', function(e) {
        // Loại bỏ tất cả ký tự không phải số
        this.value = this.value.replace(/[^0-9]/g, '');
        // Giới hạn tối đa 12 số
        if (this.value.length > 12) {
            this.value = this.value.slice(0, 12);
        }
    });

    // Email: loại bỏ khoảng trắng
    if (emailInput) {
        emailInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\s/g, '');
        });
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessages();

        // Lấy dữ liệu form
        const formData = {
            tenkhachhang: document.getElementById('tenkhachhang').value.trim(),
            email: document.getElementById('email').value.trim(),
            sodienthoai: document.getElementById('sodienthoai').value.trim(),
            cccd: document.getElementById('cccd').value.trim(),
            diachi: document.getElementById('diachi').value.trim(),
            matkhau: document.getElementById('matkhau').value,
            confirmPassword: document.getElementById('confirmPassword').value
        };

        // Validate
        const validationError = validateFormData(formData);
        if (validationError) {
            showError(validationError);
            return;
        }

        // Loading
        setLoading(true);

        try {
            // Gọi API đăng ký
            await registerCustomer(formData);

            showSuccess(' Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
            setTimeout(() => {
                window.location.href = '../khachhang/login.html';
            }, 2000);
        } catch (error) {
            console.error('Lỗi đăng ký:', error);

            let errorMessage = error.message || 'Đăng ký thất bại. Vui lòng thử lại!';

            // Xử lý các loại lỗi phổ biến
            if (errorMessage.includes('BCrypt') || errorMessage.includes('Exception')) {
                errorMessage = ' Lỗi hệ thống khi tạo tài khoản\n\n' +
                    '🔧 Vui lòng:\n' +
                    '- Thử lại sau vài phút\n' +
                    '- Hoặc liên hệ admin nếu vẫn lỗi\n\n' +
                    ' Email: support@hotel.com';
            } else if (errorMessage.includes('duplicate') || errorMessage.includes('đã tồn tại')) {
                errorMessage = ' Email hoặc số điện thoại đã được sử dụng\n\nVui lòng sử dụng thông tin khác!';
            } else if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
                errorMessage = ' Không thể kết nối đến server\n\nVui lòng kiểm tra kết nối internet và thử lại!';
            }

            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    });

    //  Hàm validate
    function validateFormData(data) {
        if (!data.tenkhachhang || !data.email || !data.sodienthoai ||
            !data.cccd || !data.diachi || !data.matkhau || !data.confirmPassword) {
            return 'Vui lòng điền đầy đủ thông tin!';
        }

        // Kiểm tra tên khách hàng
        const nameRegex = /^[A-Za-zÀ-ỹ\s]+$/;
        if (!nameRegex.test(data.tenkhachhang))
            return 'Tên khách hàng chỉ được chứa chữ cái!';

        // Kiểm tra phải nhập đủ họ và tên (ít nhất 2 từ)
        const nameParts = data.tenkhachhang.trim().split(/\s+/);
        if (nameParts.length < 2) {
            return 'Vui lòng nhập đầy đủ họ và tên (ít nhất 2 từ)!';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) return 'Email không hợp lệ!';

        // Kiểm tra số điện thoại phải bắt đầu bằng số 0
        if (!data.sodienthoai.startsWith('0')) {
            return 'Số điện thoại phải bắt đầu bằng số 0!';
        }

        const phoneRegex = /^0[0-9]{9}$/;
        if (!phoneRegex.test(data.sodienthoai)) return 'Số điện thoại không hợp lệ! (Phải bắt đầu bằng 0 và có đúng 10 số)';
        const cccdRegex = /^[0-9]{9}$|^[0-9]{12}$/;
        if (!cccdRegex.test(data.cccd)) return 'Số CCCD/CMND không hợp lệ! (9 hoặc 12 số)';

        const password = data.matkhau;
        if (/\s/.test(password))
            return 'Mật khẩu không được chứa khoảng trắng!';

        if (password.length < 8)
            return 'Mật khẩu phải có ít nhất 8 ký tự!';
        if (password !== data.confirmPassword)
            return 'Mật khẩu xác nhận không khớp!';
        if (!/^[A-Z]/.test(password))
            return 'Chữ cái đầu phải viết hoa!';
        if (!/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password))
            return 'Mật khẩu phải có chữ thường, số và ký tự đặc biệt!';
        return null;
    }

    //  Gọi API đăng ký (đúng route)
    async function registerCustomer(data) {
        const customerData = {
            Hoten: data.tenkhachhang,
            Email: data.email,
            Sdt: data.sodienthoai,
            Cccd: data.cccd,
            Diachi: data.diachi,
            Matkhau: data.matkhau
        };

        console.log('Gửi dữ liệu:', customerData);

        const response = await fetch(`${API_BASE}/Taikhoans/DangKy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });

        // Xử lý response dựa trên Content-Type
        let result;
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            // Nếu không phải JSON, lấy text
            const textResult = await response.text();
            console.log(" Response text:", textResult);

            // Cố gắng parse JSON, nếu không được thì tạo object lỗi
            try {
                result = JSON.parse(textResult);
            } catch {
                if (textResult.includes("BCrypt") || textResult.includes("Exception")) {
                    const errorLines = textResult.split('\n');
                    const mainError = errorLines[0] || textResult;
                    result = {
                        success: false,
                        message: `Lỗi hệ thống: ${mainError}\n\nVui lòng liên hệ admin để được hỗ trợ.`
                    };
                } else {
                    result = {
                        success: false,
                        message: textResult || "Lỗi server không xác định"
                    };
                }
            }
        }

        console.log('Kết quả API đăng ký:', result);

        if (!response.ok) {
            const errorMessage = result.message || `Lỗi ${response.status}: ${response.statusText}`;
            console.error(' Lỗi đăng ký:', errorMessage);
            throw new Error(errorMessage);
        }
        console.log('Đăng ký thành công:', result);
        return result;
    }

    // Hiển thị lỗi
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    // Hiển thị thành công
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    function setLoading(isLoading) {
        if (isLoading) {
            registerBtn.textContent = 'Đang xử lý...';
            registerBtn.disabled = true;
            form.classList.add('loading');
        } else {
            registerBtn.textContent = 'Đăng ký';
            registerBtn.disabled = false;
            form.classList.remove('loading');
        }
    }
});