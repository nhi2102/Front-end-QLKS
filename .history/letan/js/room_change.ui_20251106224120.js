// Biến toàn cục dùng để lưu thông tin hiện tại
let currentBooking = null; // Đơn đặt phòng hiện tại đang được chọn
let selectedNewRoom = null; // Phòng mới mà người dùng chọn để đổi
let availableRooms = []; // Danh sách phòng trống có thể đổi
let allRoomTypes = []; // Danh sách loại phòng
// ============================================
//Khởi tạo
document.addEventListener('DOMContentLoaded', async() => {
    console.log("DOMContentLoaded event fired");

    try {
        initializeEventListeners();
        console.log("initializeEventListeners done");

        checkUserLogin();
        setupEventListeners();
        console.log("setupEventListeners done");

        const confirmBtn = document.getElementById("confirmChangeBtn");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", async() => {
                const confirmBtn = document.getElementById("confirmChangeBtn");
                const scriptSrc = document.currentScript && document.currentScript.src ? document.currentScript.src : 'unknown';

                try {
                    const userNameEl = document.getElementById("userName");
                    const payload = {
                        maDatPhong: currentBooking && (currentBooking.id || currentBooking.madatphong),
                        maPhongCu: currentBooking && currentBooking.currentRoomId,
                        maPhongMoi: selectedNewRoom && selectedNewRoom.maphong,
                        nguoiThucHien: (userNameEl && (userNameEl.textContent || userNameEl.innerText)) || "Không rõ"
                    };
                    const result = await RoomChangeAPI.changeRoomAPI(payload);
                    alert(result.message || "Đổi phòng thành công!");
                } catch (err) {
                    alert("Không thể đổi phòng: " + err.message);
                }
            });
        } else {}
    } catch (ex) {}
});


function setupChangeTypeToggle() {
    const radios = document.querySelectorAll('input[name="changeType"]');
    const newDateSection = document.querySelector('.new-date-section');
    const availableRoomsSection = document.querySelector('.available-rooms-section');

    if (!radios.length) {
        console.warn(" Không tìm thấy radio 'changeType' trong DOM!");
        return;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', async() => {
            if (!currentBooking) {
                alert("Vui lòng chọn đơn đặt phòng trước!");
                radio.checked = false;
                return;
            }

            if (radio.value === 'changeRoom') {
                availableRoomsSection.style.display = 'block';
                await loadAvailableRooms(currentBooking);
            } else {
                console.log(" Chế độ đổi ngày đặt phòng");
                availableRoomsSection.style.display = 'none';
                newDateSection.style.display = 'block';
            }
        });
    });
}


function initializeEventListeners() {
    document.getElementById('searchBookingBtn').addEventListener('click', searchBookings);
    document.getElementById('searchValue').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBookings();
    });
    document.getElementById('cancelChangeBtn').addEventListener('click', resetForm);

}





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
    if (userNameEl) userNameEl.textContent = user.name || user.username;
}

// Thiết lập sự kiện
function setupEventListeners() {
    const logoutBtn = document.querySelector('a[href="#"]:has(i.fa-sign-out-alt)');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                window.location.href = '../khachhang/login.html';
            }
        });
    }

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

//Tìm kiếm đặt phòng
async function searchBookings() {
    const searchType = document.getElementById('searchType').value;
    const keyword = document.getElementById('searchValue').value.trim();
    if (!keyword) return alert('Nhập từ khóa tìm kiếm');

    showLoading(true);
    try {
        const allBookings = await RoomChangeAPI.getAllBookingsAPI();
        console.log("All bookings from API:", allBookings);

        // Cho phép khớp gần đúng, tránh lỗi viết hoa viết thường
        let bookings = allBookings.filter(b => ['Đang ở', 'Đã đặt'].includes(b.trangthai));


        let filtered = [];

        switch (searchType) {
            case 'booking':
                filtered = bookings.filter(b =>
                    (b.madatphong || '').toString().includes(keyword)
                );
                break;

            case 'customer':
                filtered = bookings.filter(b => {
                    const name =
                        b.tenKhachHang ||
                        (b.khachhang && b.khachhang.hoten) ||
                        (b.makhNavigation && b.makhNavigation.hoten) ||
                        '';
                    return name.toLowerCase().includes(keyword.toLowerCase());
                });
                break;

            case 'phone':
                for (const b of bookings) {
                    const customer = await RoomChangeAPI.getCustomerByIdAPI(b.makh);
                    if (customer && customer.sdt && customer.sdt.toString().includes(keyword)) {
                        filtered.push({
                            ...b,
                            tenkhachhang: customer.hoten
                        });
                    }
                }
                break;
        }

        console.log("Filtered bookings:", filtered);
        displaySearchResults(filtered);
    } catch (e) {
        console.error(" Lỗi tìm kiếm:", e);
        alert('Lỗi tìm kiếm: ' + e.message);
    } finally {
        showLoading(false);
    }
}

function displaySearchResults(bookings) {
    const resultsSection = document.getElementById('searchResults');
    const list = document.getElementById('bookingsList');
    list.innerHTML = '';

    // Luôn bật hiển thị vùng kết quả
    resultsSection.style.display = 'block';

    if (!bookings || bookings.length === 0) {
        list.innerHTML = '<p class="text-center">Không tìm thấy kết quả</p>';
        document.getElementById('resultCount').textContent = '0';
        return;
    }

    document.getElementById('resultCount').textContent = bookings.length;

    bookings.forEach(b => {
        const name =
            b.tenKhachHang || // tên được trả sẵn từ DTO
            (b.khachhang && (b.khachhang.hoten || b.khachhang.tenkhachhang)) || // có object khách hàng lồng trong
            (b.makhNavigation && (b.makhNavigation.hoten || b.makhNavigation.tenkhachhang)) || // có navigation đúng tên
            'Không rõ tên'; // fallback cuối cùng

        const card = document.createElement('div');
        card.className = 'booking-card';
        card.innerHTML = `
        <div class="booking-card-header">
            <span>Mã ĐP: ${b.madatphong}</span>
            <span class="booking-status checked-in">${b.trangthai}</span>
        </div>
        <div class="booking-card-body">
            <div><i class="fas fa-user"></i> ${name}</div>
            <div><i class="fas fa-calendar"></i> ${formatDate(b.ngaynhanphong)} - ${formatDate(b.ngaytraphong)}</div>
        </div>`;
        card.addEventListener('click', () => selectBooking(b));
        list.appendChild(card);
    });

}

// Chọn đơn đặt phòng để đổi
async function selectBooking(booking) {
    currentBooking = booking;
    showLoading(true);
    try {
        const roomDetails = await RoomChangeAPI.getRoomDetailsByBookingIdAPI(booking.madatphong);
        const customer = await RoomChangeAPI.getCustomerByIdAPI(booking.makh);

        displayCurrentBookingInfo(booking, roomDetails, customer);

        const section = document.getElementById('roomChangeFormSection');
        if (section) section.style.display = 'block';

        // Ẩn hai phần con
        document.querySelector('.available-rooms-section').style.display = 'none';

        // Gọi setupChangeTypeToggle sau khi form hiển thị
        setupChangeTypeToggle();
    } finally {
        showLoading(false);
    }
}


// Hiển thị thông tin đặt phòng và phòng hiện tại
function displayCurrentBookingInfo(booking, details, customer) {
    const info = document.getElementById('currentRoomDetails');
    if (!info) return;

    if (!details || details.length === 0) {
        info.innerHTML = `<p>Không tìm thấy thông tin phòng hiện tại.</p>`;
        return;
    }

    // Header
    let html = `
        <p><b>Khách hàng:</b> ${customer.hoten}</p>
        <p><b>Mã đặt phòng:</b> ${booking.madatphong}</p>
        <hr>
        <p>Chọn phòng muốn đổi:</p>
    `;

    // Hiển thị danh sách phòng
    details.forEach((d) => {
        const room = d.phong || d.maphongNavigation || {};
        const loai = room.loaiPhong || room.maloaiphongNavigation || {};

        html += `
        <div class="room-info-block" id="room-${d.machitiet}">
            <div class="room-header-line">
                <h5>Phòng ${room.sophong || 'N/A'} - ${loai.tenloaiphong || 'Không rõ loại'}</h5>
                <button class="btn btn-sm btn-outline-primary" onclick="selectRoomToChange(${d.machitiet})">
                    <i class="fas fa-check"></i> Chọn
                </button>
            </div>
            <p><b>Giá/đêm:</b> ${formatCurrency(loai.giacoban)}</p>
        </div>
        <hr>`;
    });

    info.innerHTML = html;

    // Lưu danh sách chi tiết vào currentBooking để xử lý sau
    currentBooking.roomDetails = details;
}

// Khi bấm chọn 1 phòng để đổi
window.selectRoomToChange = async function(detailId) {
    // Xóa highlight của các phòng khác
    document.querySelectorAll('.room-info-block').forEach(div => {
        div.classList.remove('selected-room');
    });

    const selectedDiv = document.getElementById(`room-${detailId}`);
    if (selectedDiv) selectedDiv.classList.add('selected-room');

    // Tìm chi tiết phòng
    const detail = currentBooking.roomDetails.find(d => d.machitiet === detailId);
    if (!detail) return alert("Không tìm thấy thông tin chi tiết phòng này!");

    const room = detail.phong || detail.maphongNavigation || {};
    const loai = room.loaiPhong || room.maloaiphongNavigation || {};

    // Ghi vào biến tạm để đổi
    currentBooking.currentRoomDetailId = detailId;
    currentBooking.currentRoomId = room.maphong;
    currentBooking.currentRoomPrice = loai.giacoban || 0;


    // Hiển thị danh sách phòng trống sau khi chọn
    await loadAvailableRooms(currentBooking);
    document.querySelector('.available-rooms-section').style.display = 'block';
};


/// TẢI DANH SÁCH PHÒNG TRỐNG
async function loadAvailableRooms(booking) {
    const checkIn = booking.ngaynhanphong.split('T')[0];
    const checkOut = booking.ngaytraphong.split('T')[0];

    try {
        showLoading(true);

        // Gọi API tìm phòng trống theo khoảng thời gian
        const rooms = await RoomChangeAPI.getAvailableRoomsAPI(checkIn, checkOut);

        if (!rooms || rooms.length === 0) {
            document.getElementById('availableRoomsList').innerHTML =
                '<p class="text-center text-muted">Không có phòng trống trong khoảng thời gian này.</p>';
            return;
        }

        availableRooms = rooms;
        displayAvailableRooms(rooms);
    } catch (err) {
        console.error('Lỗi tải danh sách phòng trống:', err);
        alert('Không thể tải danh sách phòng trống.');
    } finally {
        showLoading(false);
    }
}

// HIỂN THỊ DANH SÁCH PHÒNG TRỐNG (chuẩn theo API mới)
function displayAvailableRooms(rooms) {
    const list = document.getElementById('availableRoomsList');
    list.innerHTML = '';

    rooms.forEach(r => {
        const loai = r.loaiPhong || {};
        const tenLoai = loai.tenloaiphong || 'Không rõ loại';
        const giaCoBan = loai.giacoban || loai.giaCoBan || 0;
        const giaKhuyenMai = loai.giaKhuyenMai || loai.giakhuyenmai || null;
        const tenVoucher = loai.tenVoucher || loai.tenvoucher || null;

        // Ưu tiên giá khuyến mãi nếu có, không thì lấy giá cơ bản
        const giaHienThi = (giaKhuyenMai && giaKhuyenMai < giaCoBan) ? giaKhuyenMai : giaCoBan;

        // Lưu giá hiển thị vào object phòng để dùng cho tính toán
        r.giaHienThi = giaHienThi;

        // Hiển thị giá
        let giaHtml = `
            <span class="price">${formatCurrency(giaHienThi)}</span>
            <span class="price-unit">/ đêm</span>
        `;

        // Chỉ hiển thị badge voucher nếu có giá khuyến mãi
        if (giaKhuyenMai && giaKhuyenMai < giaCoBan && tenVoucher) {
            giaHtml += `<div class="voucher-badge"><i class="fas fa-tag"></i> ${tenVoucher}</div>`;
        }

        const div = document.createElement('div');
        div.className = 'room-card';
        div.innerHTML = `
            <div class="room-card-header">
                Phòng ${r.sophong || 'N/A'} - ${tenLoai}
            </div>
            <div class="room-card-body">
                ${giaHtml}
                <button class="btn btn-sm btn-primary" onclick="selectNewRoom(${r.maphong})">
                    <i class="fas fa-exchange-alt"></i> Chọn
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}



// CHỌN PHÒNG MỚI ĐỂ ĐỔI

window.selectNewRoom = function(id) {
    selectedNewRoom = availableRooms.find(r => r.maphong === id);
    calculatePriceAdjustment();
    document.getElementById('confirmChangeBtn').disabled = false;
};

// TÍNH TOÁN CHÊNH LỆCH GIÁ
function calculatePriceAdjustment() {
    if (!currentBooking || !selectedNewRoom) return;

    const oldPrice = currentBooking.currentRoomPrice || 0;

    // Sử dụng giá hiển thị đã được tính toán (ưu tiên giá khuyến mãi)
    const newPrice = selectedNewRoom.giaHienThi || 0;

    let diffDays;

    const today = new Date();
    const checkout = new Date(currentBooking.ngaytraphong);
    diffDays = Math.max(1, Math.ceil((checkout - today) / (1000 * 60 * 60 * 24)));

    const diffPerNight = newPrice - oldPrice;
    const totalAdjustment = diffPerNight * diffDays;

    document.getElementById("oldRoomPrice").textContent = formatCurrency(oldPrice);
    document.getElementById("newRoomPrice").textContent = formatCurrency(newPrice);
    document.getElementById("priceDifference").textContent = formatCurrency(diffPerNight);
    document.getElementById("remainingNights").textContent = diffDays;
    document.getElementById("totalAdjustment").textContent = formatCurrency(totalAdjustment);
}
// RESET FORM
function resetForm() {
    currentBooking = null;
    selectedNewRoom = null;
    availableRooms = [];

    // Ẩn các phần giao diện
    const currentBookingSection = document.getElementById('currentBookingSection');
    if (currentBookingSection) currentBookingSection.style.setProperty('display', 'none');
    const roomChangeFormSection = document.getElementById('roomChangeFormSection');
    if (roomChangeFormSection) roomChangeFormSection.style.setProperty('display', 'none');
    document.getElementById('confirmChangeBtn').disabled = true;

    // Xóa chọn thẻ cũ
    document.querySelectorAll('.booking-card').forEach(c => c.classList.remove('selected'));

    console.log(' Đã reset form đổi phòng');
}


// HÀM HỖ TRỢ

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString('vi-VN') : 'N/A';
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showSuccessModal() {
    alert('Đổi phòng thành công!');
    resetForm();
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