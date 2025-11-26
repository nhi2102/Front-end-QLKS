// Định nghĩa API base URL
const API_BASE = "https://localhost:7076/api"; // Giống trang login

// Chạy khi trang được tải xong
window.addEventListener('DOMContentLoaded', async() => { // Thêm async ở đây nếu cần gọi API lấy chi tiết

    // 1. LẤY DỮ LIỆU BAN ĐẦU VÀ ĐỔ VÀO FORM
    // =============================================
    const currentUserJSON = localStorage.getItem('currentUser');
    if (!currentUserJSON) {
        alert('Bạn cần đăng nhập để xem trang này.');
        window.location.href = '../khachhang/login.html'; // Điều chỉnh đường dẫn nếu cần
        return;
    }

    let user = JSON.parse(currentUserJSON); // Dùng let để có thể cập nhật
    console.log("Dữ liệu user đã lưu:", user);

    // Lấy ID khách hàng (ưu tiên Makh nếu có)
    const customerId = user.makh || user.id;
    if (!customerId) {
        alert("Lỗi: Không tìm thấy ID khách hàng. Vui lòng đăng nhập lại.");
        window.location.href = '../khachhang/login.html';
        return;
    }

    // --- TÙY CHỌN: Gọi API GET /Khachhangs/{id} để lấy dữ liệu mới nhất ---
    // (Bỏ qua nếu bạn tin tưởng localStorage)
    try {
        const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`);
        if (response.ok) {
            const freshUserData = await response.json();
            console.log("Dữ liệu mới nhất từ API:", freshUserData);
            user = freshUserData; // Cập nhật user bằng dữ liệu mới nhất
            // Cập nhật lại localStorage nếu muốn
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            console.warn("Không thể lấy dữ liệu mới nhất, sử dụng dữ liệu từ localStorage.");
        }
    } catch (error) {
        console.error("Lỗi khi gọi API lấy chi tiết khách hàng:", error);
    }
    // --- Kết thúc phần tùy chọn ---


    // Đổ dữ liệu (từ user đã cập nhật nếu có) vào form
    try {
        document.getElementById('hoten').value = user.hoten || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('sodienthoai').value = user.sdt || '';
        document.getElementById('cccd').value = user.cccd || '';
        document.getElementById('diachi').value = user.diachi || ''; // Thêm địa chỉ

        if (user.ngaysinh) {
            // Chuyển DateOnly (yyyy-mm-dd) hoặc DateTime thành format input date
            const dateOnlyString = user.ngaysinh.split('T')[0];
            document.getElementById('ngaysinh').value = dateOnlyString;
        }
    } catch (error) {
        console.error("Lỗi khi đổ dữ liệu vào input:", error);
    }

    // Thêm validation realtime cho số điện thoại và CCCD
    const phoneInput = document.getElementById('sodienthoai');
    const cccdInput = document.getElementById('cccd');

    // Số điện thoại: chỉ cho phép nhập số, tối đa 11 số
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Loại bỏ tất cả ký tự không phải số
            this.value = this.value.replace(/[^0-9]/g, '');
            // Giới hạn tối đa 11 số
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
        });
    }

    // CCCD: chỉ cho phép nhập số, tối đa 12 số
    if (cccdInput) {
        cccdInput.addEventListener('input', function(e) {
            // Loại bỏ tất cả ký tự không phải số
            this.value = this.value.replace(/[^0-9]/g, '');
            // Giới hạn tối đa 12 số
            if (this.value.length > 12) {
                this.value = this.value.slice(0, 12);
            }
        });
    }

    // 2. XỬ LÝ NÚT HỦY (Giữ nguyên code cũ của bạn)
    // =============================================
    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn hủy thay đổi và quay về trang chủ?')) {
                window.location.href = '../khachhang/home.html'; // Điều chỉnh đường dẫn
            }
        });
    }

    // 3. XỬ LÝ NÚT "LƯU THAY ĐỔI" (Đã sửa)
    // =============================================
    const profileForm = document.querySelector('.profile-form'); // Giả sử form có class này
    if (profileForm) {

        profileForm.addEventListener('submit', async(e) => {
            e.preventDefault();

            const saveButton = profileForm.querySelector('button[type="submit"]'); // Tìm nút submit
            if (!saveButton) return;

            saveButton.disabled = true;
            saveButton.textContent = 'Đang lưu...';

            try {
                // a. Lấy dữ liệu ĐÃ CHỈNH SỬA từ form
                const hoten = document.getElementById('hoten').value.trim();
                const email = document.getElementById('email').value.trim();
                const sdt = document.getElementById('sodienthoai').value.trim();
                const cccd = document.getElementById('cccd').value.trim();
                const diachi = document.getElementById('diachi').value.trim(); // Lấy địa chỉ
                const ngaysinhValue = document.getElementById('ngaysinh').value;
                // Chuyển đổi ngày sinh về DateOnly? (C# thường tự xử lý 'yyyy-mm-dd')
                const ngaysinh = ngaysinhValue ? ngaysinhValue : null; // Gửi null nếu rỗng

                // Validation
                if (!hoten || !email || !sdt) {
                    alert('Vui lòng điền đầy đủ họ tên, email và số điện thoại!');
                    return;
                }

                // Kiểm tra số điện thoại
                if (!sdt.startsWith('0')) {
                    alert('Số điện thoại phải bắt đầu bằng số 0!');
                    return;
                }
                const phoneRegex = /^0[0-9]{9,10}$/;
                if (!phoneRegex.test(sdt)) {
                    alert('Số điện thoại không hợp lệ! (Phải bắt đầu bằng 0 và có 10-11 số)');
                    return;
                }

                // Kiểm tra CCCD (nếu có nhập)
                if (cccd) {
                    const cccdRegex = /^[0-9]{9}$|^[0-9]{12}$/;
                    if (!cccdRegex.test(cccd)) {
                        alert('Số CCCD/CMND không hợp lệ! (9 hoặc 12 số)');
                        return;
                    }
                }

                // Kiểm tra email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('Email không hợp lệ!');
                    return;
                }


                // b. Tạo đối tượng body để gửi đi (Khớp với model Khachhang C#)
                // Bao gồm cả các trường không có trên form lấy từ 'user'
                const updateData = {
                    Makh: customerId,

                    // Các trường lấy từ form
                    Hoten: hoten,
                    Email: email,
                    Sdt: sdt,
                    Cccd: cccd || null, // Gửi null nếu rỗng
                    Diachi: diachi || null, // Gửi null nếu rỗng
                    Ngaysinh: ngaysinh,

                    Matkhau: user.matkhau, // Gửi lại mật khẩu hiện tại (API sẽ bỏ qua nếu null)
                    // Hoặc tốt hơn là không gửi Matkhau nếu không đổi
                    Trangthai: user.trangthai || "Hoạt động", // Gửi lại trạng thái cũ
                    Diemthanhvien: user.diemthanhvien || 0, // Gửi lại điểm
                    Ngaytao: user.ngaytao // Gửi lại ngày tạo
                };

                // Tùy chọn: Không gửi mật khẩu nếu không có ô nhập mật khẩu mới
                // delete updateData.Matkhau;


                console.log("Dữ liệu gửi lên API:", updateData); // DEBUG

                // c. Gọi API PUT
                const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                // d. Xử lý kết quả
                if (response.ok) {
                    const updatedUser = await response.json(); // API trả về Khachhang đã cập nhật
                    alert("Cập nhật thông tin thành công!");

                    // e. CẬP NHẬT LẠI localStorage với dữ liệu MỚI NHẤT từ API
                    console.log("Dữ liệu trả về sau khi cập nhật:", updatedUser);
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    user = updatedUser; // Cập nhật biến user cục bộ

                    // Tùy chọn: Cập nhật lại hiển thị tên người dùng trên header nếu có
                    // updateUserNameInHeader(updatedUser.hoten);

                } else {
                    // Xử lý lỗi từ API (400, 404)
                    let errorMsg = `Lỗi ${response.status}. Không thể cập nhật.`;
                    try {
                        // Thử đọc lỗi dạng text (cho trường hợp "ID không khớp.")
                        const errorText = await response.text();
                        errorMsg = `Lỗi: ${errorText || response.statusText}`;
                    } catch (parseError) {
                        // Bỏ qua nếu không đọc được text
                    }
                    alert(errorMsg);
                }

            } catch (error) {
                console.error('Lỗi khi lưu thông tin:', error);
                alert('Lỗi kết nối hoặc lỗi hệ thống. Không thể lưu thay đổi.');
            } finally {
                // Bật lại nút
                saveButton.disabled = false;
                saveButton.textContent = 'Lưu thay đổi';
            }
        });
    } else {
        console.error("Không tìm thấy form '.profile-form'");
    }
});