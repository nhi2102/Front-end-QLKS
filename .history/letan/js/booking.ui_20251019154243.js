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
});
// Kiểm tra đăng nhập

function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
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
                window.location.href = '../login.html';
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
        const fmtISO = (d) => d.toISOString().split('T')[0];
        checkIn.value = fmtISO(today);
        checkOut.value = fmtISO(tomorrow);

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

// --- Tìm kiếm phòng trống ---
async function searchAvailableRooms() {
    // Lấy input ngày nhận - trả
    let ci = document.getElementById('checkInDate').value;
    let co = document.getElementById('checkOutDate').value;

    // Nếu người dùng chưa chọn, tự gán mặc định hôm nay & ngày mai
    if (!ci || !co) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const fmt = d => d.toISOString().split('T')[0];
        ci = fmt(today);
        co = fmt(tomorrow);
        document.getElementById('checkInDate').value = ci;
        document.getElementById('checkOutDate').value = co;
        console.log("⚙️ Tự động gán ngày mặc định:", ci, "→", co);
    }

    showRoomsLoading();
    try {
        console.log("🔍 Gọi API tìm phòng:", ci, co);
        const list = await API.fetchAvailableRoomsAPI(ci, co);

        // Nếu API trả về mảng phòng trống
        if (!list || list.length === 0) {
            showRoomsError("Không có phòng trống trong khoảng thời gian này.");
            return;
        }

        // Gọi API chi tiết cho từng phòng
        const rooms = await Promise.all(list.map(r => API.getRoomDetailsAPI(r.maphong)));
        availableRooms = rooms.filter(r => r);

        // Hiển thị
        displayAvailableRooms(availableRooms);
        console.log("✅ Đã hiển thị danh sách phòng trống:", availableRooms.length);
    } catch (err) {
        console.error("❌ Lỗi tìm kiếm phòng:", err);
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

    grid.innerHTML = rooms.map(room => `
        <div class="room-card" data-room-id="${room.maphong}">
            <div class="room-header">
                <h4>Phòng ${room.sophong || ''}</h4>
                <span>${room.loaiPhong?.tenloaiphong || 'Không rõ loại'}</span>
            </div>
            <div class="room-body">
                <p>Giá: ${formatCurrency(room.loaiPhong?.giacoban || 0)} / đêm</p>
                <button class="btn btn-primary" onclick="selectRoom(${room.maphong})">Chọn Phòng</button>
            </div>
        </div>
    `).join('');
}


// --- Chọn hoặc bỏ chọn một phòng ---
function selectRoom(roomId) {
    const room = availableRooms.find(r => r.maphong == roomId);
    if (!room) return;

    const exists = selectedRooms.find(r => r.maphong == roomId);
    selectedRooms = exists ?
        selectedRooms.filter(r => r.maphong != roomId) : [...selectedRooms, room];

    displaySelectedRoomInfo();
}

// --- Hiển thị thông tin các phòng đã chọn ---
function displaySelectedRoomInfo() {
    const el = document.getElementById('selectedRoomInfo');
    if (!selectedRooms.length) {
        el.innerHTML = '<p>Chưa chọn phòng nào</p>';
        return;
    }

    el.innerHTML = selectedRooms.map(r => `
        <div>Phòng ${r.sophong} - ${formatCurrency(r.loaiPhong.giacoban)}</div>
    `).join('');
}

// --- Gửi yêu cầu đặt phòng ---
async function submitBooking() {
    if (!selectedRooms.length) return alert('Vui lòng chọn ít nhất một phòng.');

    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const cccd = document.getElementById('customerIdCard').value;

    const customer = await API.findOrCreateCustomerAPI({ hoten: name, sdt: phone, cccd });

    const details = selectedRooms.map(r => ({
        Maphong: r.maphong,
        Tongcong: r.loaiPhong.giacoban
    }));

    const payload = {
        TenKhachHang: name,
        Makh: customer.makh,
        Ngaynhanphong: document.getElementById('checkInDate').value,
        Ngaytraphong: document.getElementById('checkOutDate').value,
        Chitietdatphongs: details
    };

    const booking = await API.createBookingAPI(payload);
    alert('Đặt phòng thành công! Mã đặt: ' + (booking.maDatPhong || booking.id));
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
// ============================================