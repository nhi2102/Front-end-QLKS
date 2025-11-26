// ============================================
// BOOKING UI LOGIC (XỬ LÝ GIAO DIỆN & TƯƠNG TÁC)
// ============================================

let selectedRooms = []; // Danh sách phòng đã chọn
let availableRooms = []; // Danh sách phòng trống
let bookingData = {}; // Dữ liệu đặt phòng hiện tại

// --- Khởi tạo trang ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    setupEventListeners();
    // setDefaultDates();
    loadRoomTypesUI();
    setupEventListeners();
    setupInputValidation(); // Thêm validation cho input
});

// Thiết lập validation cho số điện thoại và CCCD
function setupInputValidation() {
    const phoneInput = document.getElementById('customerPhone');
    const cccdInput = document.getElementById('customerIdCard');
    const emailInput = document.getElementById('customerEmail');

    // Số điện thoại: chỉ cho phép nhập số, tối đa 10 số
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });
    }

    // CCCD: chỉ cho phép nhập số, tối đa 12 số
    if (cccdInput) {
        cccdInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length > 12) {
                this.value = this.value.slice(0, 12);
            }
        });
    }

    // Email: loại bỏ khoảng trắng
    if (emailInput) {
        emailInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\s/g, '');
        });
    }
}
// Kiểm tra đăng nhập

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

// ============================================
// KHỞI TẠO LITEPICKER - CHỌN NGÀY NHẬN/TRẢ PHÒNG
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const dr = document.getElementById('date-range-picker');
    if (dr && typeof Litepicker !== 'undefined') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Khởi tạo Litepicker
        window.receptionPicker = new Litepicker({
            element: dr,
            singleMode: false,
            numberOfMonths: 2,
            numberOfColumns: 2,
            format: 'DD/MM/YYYY',
            lang: 'vi-VN',
            minDate: today,
            startDate: today,
            endDate: tomorrow
        });

        // Gán hiển thị mặc định
        const fmtDisplay = (d) => (`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
        dr.value = `${fmtDisplay(today)} - ${fmtDisplay(tomorrow)}`;

        // Gán giá trị mặc định cho input ẩn
        const checkIn = document.getElementById('checkInDate');
        const checkOut = document.getElementById('checkOutDate');
        checkIn.value = formatLocalDate(today);
        checkOut.value = formatLocalDate(tomorrow);


        // Khi người dùng chọn lại khoảng ngày mới
        window.receptionPicker.on('selected', function(date1, date2) {
            if (!date1 || !date2) return;
            const toInputDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            checkIn.value = toInputDate(date1);
            checkOut.value = toInputDate(date2);
            console.log("Đã chọn ngày:", checkIn.value, "→", checkOut.value);
        });

        console.log(' Litepicker đã khởi tạo thành công (có giá trị mặc định).');
    } else {
        console.warn(' Không tìm thấy Litepicker hoặc #date-range-picker');
    }
});


// ============================================
// GẮN SỰ KIỆN CHO NÚT TÌM PHÒNG
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchRoomsBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(' Nút Tìm Phòng đã được bấm');
            searchAvailableRooms(); // Gọi hàm tìm phòng
        });
        searchBtn.style.pointerEvents = 'auto'; // Đảm bảo có thể click
    } else {
        console.warn(' Không tìm thấy nút #searchRoomsBtn');
    }
});

// --- Tải danh sách loại phòng và hiển thị lên giao diện ---
async function loadRoomTypesUI() {
    try {
        const data = await API.loadRoomTypesAPI();
        const select = document.getElementById('roomType');
        select.innerHTML = '<option value="">Tất cả</option>';
        data.forEach(rt => {
            const opt = document.createElement('option');
            opt.value = rt.maloaiphong;
            opt.textContent = rt.tenloaiphong;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Lỗi tải danh sách loại phòng', err);
    }
}

// --- Tìm kiếm phòng trống (lọc thêm theo số người và loại phòng) ---
async function searchAvailableRooms() {
    // Lấy dữ liệu nhập vào
    let ci = document.getElementById('checkInDate').value;
    let co = document.getElementById('checkOutDate').value;
    const guestCount = parseInt(document.getElementById('guestCount').value) || 1;
    const roomType = document.getElementById('roomType').value;

    // Nếu người dùng chưa chọn ngày → mặc định hôm nay và ngày mai
    if (!ci || !co) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        ci = formatLocalDate(today);
        co = formatLocalDate(tomorrow);
        document.getElementById('checkInDate').value = ci;
        document.getElementById('checkOutDate').value = co;
        console.log("Tự động gán ngày mặc định:", ci, "→", co);
    }

    showRoomsLoading();

    try {
        console.log(" Gọi API tìm phòng:", ci, co);
        let rooms = await API.fetchAvailableRoomsAPI(ci, co);

        // API mới đã trả về đầy đủ thông tin, không cần gọi getRoomDetailsAPI nữa
        rooms = rooms.filter(r => r); // loại bỏ phòng null

        // --- Lọc theo loại phòng (nếu người dùng chọn) ---
        if (roomType && roomType.trim() !== '') {
            rooms = rooms.filter(r => {
                if (!r) return false;

                // So sánh với maloaiphong hoặc tenloaiphong
                if (r.maloaiphong && String(r.maloaiphong) === String(roomType)) return true;
                if (r.tenloaiphong && String(r.tenloaiphong).toLowerCase().includes(String(roomType).toLowerCase())) return true;

                return false;
            });
        }

        // --- Lọc theo số người ---
        if (guestCount > 0) {
            rooms = rooms.filter(r => {
                if (!r) return false;
                const capacity = r.succhua || 0;
                return Number(capacity) >= guestCount;
            });
        }

        availableRooms = rooms;
        displayAvailableRooms(availableRooms);
        console.log(` Đã lọc ${availableRooms.length} phòng phù hợp (${guestCount} người, loại: ${roomType || 'Tất cả'})`);
    } catch (err) {
        console.error(" Lỗi tìm kiếm phòng:", err);
        showRoomsError("Không thể tải danh sách phòng. Kiểm tra console để biết thêm chi tiết.");
    }
}



// --- Hiển thị danh sách phòng trống ---
function displayAvailableRooms(rooms) {
    const grid = document.getElementById('roomsGrid');
    const section = document.getElementById('roomsSection');
    if (section) section.style.display = 'block'; // Hiện khối "Phòng Trống"

    if (!rooms || !rooms.length) {
        grid.innerHTML = '<p class="no-data">Không có phòng trống phù hợp.</p>';
        return;
    }

    grid.innerHTML = rooms.map(room => {
                const roomId = room.maphong || room.maPhong;
                const roomNumber = room.sophong || room.soPhong || '';
                const roomType = room.tenloaiphong || room.tenLoaiPhong || 'Không rõ loại';
                const capacity = room.succhua || 'N/A';

                // === GIÁ - Lấy trực tiếp từ API response ===
                const giaCoBan = room.giaCoBan || room.giacoban || 0;
                const giaKhuyenMai = room.giaKhuyenMai || room.giakhuyenmai || null;
                const tenVoucher = room.tenVoucher || room.tenvoucher || null;

                // Ưu tiên giá khuyến mãi nếu có
                const giaHienThi = (giaKhuyenMai && giaKhuyenMai < giaCoBan) ? giaKhuyenMai : giaCoBan;

                // Lưu giá hiển thị vào phòng để dùng cho tính toán
                room.giaHienThi = giaHienThi;

                const selected = selectedRooms.some(r => (r.maphong || r.maPhong) == roomId);

                const selectBtn = `
            <button class="select-room-btn ${selected ? 'selected-btn' : ''}" onclick="selectRoom('${roomId}')">
                ${selected ? 'Đã Chọn' : 'Chọn Phòng'}
            </button>
        `;

                // === HIỂN THỊ GIÁ ===
                let priceHtml = `
            <div class="price-info">
                <span class="price-amount">${formatCurrency(giaHienThi)}</span>
                <span class="price-unit">/ đêm</span>
            </div>
        `;

                // Nếu có giá khuyến mãi, hiển thị voucher badge
                if (giaKhuyenMai && giaKhuyenMai < giaCoBan && tenVoucher) {
                    priceHtml += `<div class="voucher-tag"><i class="fas fa-tag"></i> ${tenVoucher}</div>`;
                }

                return `
            <div class="room-card ${selected ? 'selected' : ''}" data-room-id="${roomId}">
                <div class="room-card-header">
                    <div class="room-number">Phòng ${roomNumber}</div>
                    <div class="room-type">${roomType}</div>
                    <div class="room-status">Trống</div>
                </div>
                <div class="room-card-body">
                    <div class="room-features">
                        <span class="feature-tag"><i class="fas fa-users"></i> ${capacity} người</span>
                    </div>
                    ${room.moTa ? `<p class="room-description">${room.moTa}</p>` : ''}
                    <div class="room-price">
                        ${priceHtml}
                        ${selectBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}




// --- Chọn hoặc bỏ chọn nhiều phòng ---
function selectRoom(roomId) {
    const room = availableRooms.find(r => (r.maphong || r.maPhong) == roomId);
    if (!room) return;

    const isAlreadySelected = selectedRooms.some(r => (r.maphong || r.maPhong) == roomId);

    if (isAlreadySelected) {
        // Bỏ chọn phòng này
        selectedRooms = selectedRooms.filter(r => (r.maphong || r.maPhong) != roomId);
        console.log(" Bỏ chọn phòng:", roomId);
    } else {
        // Thêm phòng mới vào danh sách
        selectedRooms.push(room);
        console.log(" Thêm phòng:", roomId);
    }

    // Cập nhật lại giao diện hiển thị danh sách phòng
    displayAvailableRooms(availableRooms);
    displaySelectedRoomInfo();
    updateBookingSummary();

    // Nếu còn phòng được chọn → hiển thị form, ngược lại ẩn form
    const formSection = document.getElementById('bookingFormSection');
    formSection.style.display = selectedRooms.length > 0 ? 'block' : 'none';
}




// --- Hiển thị thông tin các phòng đã chọn (phiên bản đẹp hơn) ---
function displaySelectedRoomInfo() {
    const el = document.getElementById('selectedRoomInfo');
    if (!selectedRooms.length) {
        el.innerHTML = `
            <div class="no-selected-room">
                <i class="fas fa-bed"></i> Chưa chọn phòng nào
            </div>`;
        return;
    }

    el.innerHTML = selectedRooms.map((r, index) => {
        const roomType = r.tenloaiphong || r.loaiPhong?.tenloaiphong || 'Không rõ loại';
        const roomNumber = r.sophong || r.soPhong || 'N/A';
        const capacity = r.succhua || r.loaiPhong?.songuoitoida || 'N/A';
        
        // Sử dụng giá hiển thị (đã tính khuyến mãi nếu có)
        const roomPrice = r.giaHienThi || r.giaCoBan || r.giacoban || r.loaiPhong?.giacoban || 0;

        return `
            <div class="selected-room-card">
                <div class="room-header">
                    <span class="room-index">#${index + 1}</span>
                    <span class="room-name">Phòng ${roomNumber}</span>
                    <span class="room-type">(${roomType})</span>
                </div>
                <div class="room-body">
                    <div><i class="fas fa-tag"></i> Giá: ${formatCurrency(roomPrice)} / đêm</div>
                </div>
                <button class="remove-room-btn" onclick="removeSelectedRoom('${r.maphong || r.maPhong}')">
                    <i class="fas fa-times"></i> Bỏ chọn
                </button>
            </div>
        `;
    }).join('');
}

// --- Hỗ trợ bỏ chọn trực tiếp trong phần tóm tắt ---
function removeSelectedRoom(roomId) {
    selectedRooms = selectedRooms.filter(r => (r.maphong || r.maPhong) != roomId);
    displaySelectedRoomInfo();
    updateBookingSummary();
    displayAvailableRooms(availableRooms);
}


// --- Cập nhật tổng giá & số đêm ---
function updateBookingSummary() {
    if (!selectedRooms.length) {
        document.getElementById('roomPricePerNight').textContent = "0 ₫";
        document.getElementById('totalNights').textContent = "0";
        document.getElementById('subtotal').textContent = "0 ₫";
        document.getElementById('totalAmount').textContent = "0 ₫";
        return;
    }

    // Tổng giá phòng mỗi đêm (sử dụng giá hiển thị đã tính khuyến mãi)
    const totalPerNight = selectedRooms.reduce((sum, r) => {
        const price = r.giaHienThi || r.giaCoBan || r.giacoban || r.loaiPhong?.giacoban || 0;
        return sum + price;
    }, 0);

    // Tính số đêm
    const checkIn = new Date(document.getElementById('checkInDate').value);
    const checkOut = new Date(document.getElementById('checkOutDate').value);
    const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

    const subtotal = totalPerNight * nights;

    // Cập nhật giao diện
    document.getElementById('roomPricePerNight').textContent = formatCurrency(totalPerNight);
    document.getElementById('totalNights').textContent = nights;
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('totalAmount').textContent = formatCurrency(subtotal);
}



// --- Gửi yêu cầu đặt phòng (hoàn chỉnh) ---
async function submitBooking(e) {
    if (e) e.preventDefault(); // Ngăn reload form

    // Kiểm tra phòng đã chọn
    if (!selectedRooms.length) {
        alert('Vui lòng chọn ít nhất một phòng trước khi đặt.');
        return;
    }

    // Lấy thông tin khách hàng
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const cccd = document.getElementById('customerIdCard').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const specialRequests = document.getElementById('specialRequests').value.trim();

    // Kiểm tra thông tin bắt buộc
    if (!name || !phone || !cccd) {
        alert('Vui lòng nhập đầy đủ họ tên, số điện thoại và CCCD/CMND.');
        return;
    }

    // Kiểm tra số điện thoại
    if (!phone.startsWith('0')) {
        alert('Số điện thoại phải bắt đầu bằng số 0!');
        return;
    }
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
        alert('Số điện thoại không hợp lệ! (Phải bắt đầu bằng 0 và có đúng 10 số)');
        return;
    }

    // Kiểm tra CCCD
    const cccdRegex = /^[0-9]{9}$|^[0-9]{12}$/;
    if (!cccdRegex.test(cccd)) {
        alert('Số CCCD/CMND không hợp lệ! (9 hoặc 12 số)');
        return;
    }

    // Kiểm tra email (nếu có nhập)
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Email không hợp lệ!');
            return;
        }
    }

    // Ngày nhận / trả
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    if (!checkInDate || !checkOutDate) {
        alert('Vui lòng chọn ngày nhận và ngày trả phòng.');
        return;
    }

    try {
        // 1️ Tìm hoặc tạo mới khách hàng
        const customer = await API.findOrCreateCustomerAPI({
            hoten: name,
            sdt: phone,
            cccd,
            email,
        });

        // 2️ Tính số đêm
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

        // 3️ Chuẩn bị dữ liệu chi tiết đặt phòng
        const details = selectedRooms.map(r => {
            const dongia = r.giaHienThi || r.giaCoBan || r.giacoban || r.loaiPhong?.giacoban || 0;
            const tongcong = dongia * nights; // Nhân với số đêm
            return {
                Maphong: r.maphong,
                Dongia: dongia,
                Tongcong: tongcong, // Tổng tiền = đơn giá × số đêm
                MaphongNavigation: null,
                MadatphongNavigation: null
            };
        });


        // 4️ Xây dựng payload gửi API
        const payload = {
            TenKhachHang: name,
            Makh: customer.makh,
            Ngaynhanphong: checkInDate,
            Ngaytraphong: checkOutDate,
            Ghichu: specialRequests,
            Chitietdatphongs: details
        };

        console.log(' Payload đặt phòng:', payload);
        console.log(` Số đêm: ${nights}, Tổng tiền: ${formatCurrency(details.reduce((s, d) => s + d.Tongcong, 0))}`);

        // 5️ Gửi yêu cầu tạo đặt phòng
        const booking = await API.createBookingAPI(payload);


        // Reset giao diện
        resetBookingForm();

    } catch (err) {
        console.error(" Lỗi khi đặt phòng:", err);
        alert("Không thể tạo đặt phòng. Vui lòng thử lại sau.");
    }
}

// --- Xử lý khi thay đổi loại đặt phòng ---
function handleBookingTypeChange() {
    const typeSelect = document.getElementById('bookingType');
    const checkinGroup = document.getElementById('checkinTimeGroup');
    const confirmText = document.getElementById('confirmButtonText');

    if (!typeSelect) return;

    const value = typeSelect.value;
    if (value === 'checkin-now') {
        // Nếu chọn "Check-in Luôn" → hiển thị chọn giờ và đổi nút
        if (checkinGroup) checkinGroup.style.display = 'block';
        if (confirmText) confirmText.textContent = 'Xác Nhận Check-in';
    } else {
        // Nếu chọn "Đặt" → ẩn chọn giờ và trả lại nút mặc định
        if (checkinGroup) checkinGroup.style.display = 'none';
        if (confirmText) confirmText.textContent = 'Xác Nhận Đặt Phòng';
    }
}

// --- Định dạng tiền tệ (VND) ---
function formatCurrency(num) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// --- Hiển thị trạng thái đang tải phòng ---
function showRoomsLoading() {
    document.getElementById('roomsGrid').innerHTML = '<p>Đang tải phòng...</p>';
}

// --- Hiển thị lỗi khi tải phòng ---
function showRoomsError(msg) {
    document.getElementById('roomsGrid').innerHTML = `<p class="error">${msg}</p>`;
}
// Hàm định dạng ngày local (yyyy-MM-dd) không bị lệch múi giờ
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// Cập nhật lại tổng tiền khi đổi ngày
document.addEventListener('DOMContentLoaded', () => {
    const checkIn = document.getElementById('checkInDate');
    const checkOut = document.getElementById('checkOutDate');

    if (checkIn) checkIn.addEventListener('change', updateBookingSummary);
    if (checkOut) checkOut.addEventListener('change', updateBookingSummary);
});
// --- Reset form sau khi đặt phòng thành công ---
function resetBookingForm() {
    // Ẩn form
    const formSection = document.getElementById('bookingFormSection');
    if (formSection) formSection.style.display = 'none';

    // Reset danh sách phòng đã chọn
    selectedRooms = [];
    displayAvailableRooms(availableRooms);
    displaySelectedRoomInfo();
    updateBookingSummary();

    // Xóa dữ liệu form khách hàng
    document.getElementById('bookingForm').reset();

    // Reset ngày (vẫn giữ nguyên hôm nay và ngày mai)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    document.getElementById('checkInDate').value = formatLocalDate(today);
    document.getElementById('checkOutDate').value = formatLocalDate(tomorrow);
}
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', submitBooking);
    }
});


// ============================================