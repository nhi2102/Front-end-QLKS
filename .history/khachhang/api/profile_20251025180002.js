< script >
    // Định nghĩa API base URL
    const API_BASE = "https://localhost:7076/api"; // Giống trang login

// Chạy khi trang được tải xong
window.addEventListener('DOMContentLoaded', () => {

    // 1. LẤY DỮ LIỆU VÀ ĐỔ VÀO FORM (Code cũ của bạn)
    // =============================================

    const currentUserJSON = localStorage.getItem('currentUser');
    if (!currentUserJSON) {
        alert('Bạn cần đăng nhập để xem trang này.');
        window.location.href = '../khachhang/login.html';
        return;
    }

    const user = JSON.parse(currentUserJSON);
    console.log("Dữ liệu user đã lưu:", user);

    try {
        document.getElementById('hoten').value = user.hoten || user.name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('sodienthoai').value = user.sdt || '';
        document.getElementById('cccd').value = user.cccd || ''; // Đã lấy đúng user.cccd (chữ thường)
    } catch (error) {
        console.error("Lỗi khi đổ dữ liệu vào input:", error);
    }

    // 2. XỬ LÝ NÚT HỦY (Code cũ của bạn)
    // =============================================
    const cancelButton = document.getElementById('cancelButton'); // (Hãy chắc là bạn đã thêm id="cancelButton" cho nút Hủy)
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn hủy thay đổi và quay về trang chủ?')) {
                window.location.href = '../khachhang/home.html';
            }
        });
    }

    // 3. XỬ LÝ NÚT "LƯU THAY ĐỔI" (Code mới)
    // =============================================
    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {

        profileForm.addEventListener('submit', async(e) => {
            e.preventDefault(); // Ngăn form reload lại trang

            const saveButton = document.querySelector('.btn-primary');
            saveButton.disabled = true;
            saveButton.textContent = 'Đang lưu...';

            try {
                // a. Lấy ID của khách hàng
                const customerId = user.makh || user.id;
                if (!customerId) {
                    alert("Lỗi: Không tìm thấy ID khách hàng. Vui lòng đăng nhập lại.");
                    return;
                }

                // b. Lấy dữ liệu ĐÃ CHỈNH SỬA từ form
                const hoten = document.getElementById('hoten').value;
                const email = document.getElementById('email').value;
                const sdt = document.getElementById('sodienthoai').value;
                const cccd = document.getElementById('cccd').value;

                // c. Tạo DTO (body) để gửi đi
                // Tên thuộc tính (Hoten, Email...) phải viết hoa (PascalCase)
                // để khớp với DTO (KhachhangUpdateDto) ở C#
                const updateDto = {
                    Hoten: hoten,
                    Email: email,
                    Sdt: sdt,
                    Cccd: cccd,
                    // Lấy các trường không có trên form từ localStorage
                    // để gửi về, tránh bị API ghi đè thành null
                    Diachi: user.diachi || null,
                    Ngaysinh: user.ngaysinh || null
                };

                // d. Gọi API PUT
                const response = await fetch(`${API_BASE}/Khachhangs/${customerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateDto)
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message); // "Cập nhật thông tin khách hàng thành công!"

                    // e. CẬP NHẬT LẠI localStorage với thông tin mới
                    user.hoten = updateDto.Hoten;
                    user.name = updateDto.Hoten; // (Cập nhật cả 'name' cho đồng bộ)
                    user.email = updateDto.Email;
                    user.sdt = updateDto.Sdt;
                    user.cccd = updateDto.Cccd;
                    localStorage.setItem('currentUser', JSON.stringify(user));

                } else {
                    // Hiển thị lỗi từ API (ví dụ: "Không tìm thấy khách hàng")
                    alert('Lỗi: ' + (result.message || 'Không thể cập nhật.'));
                }

            } catch (error) {
                console.error('Lỗi khi lưu thông tin:', error);
                alert('Lỗi kết nối. Không thể lưu thay đổi.');
            } finally {
                // Bật lại nút dù thành công hay thất bại
                saveButton.disabled = false;
                saveButton.textContent = 'Lưu thay đổi';
            }
        });
    }
}); <
/script>