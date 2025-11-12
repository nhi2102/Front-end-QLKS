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
    setDefaultDates();
    loadRoomTypesUI();
});
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

        // Cho phép chọn khoảng ngày
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

        // Gán giá trị mặc định
        const fmt = d => (`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
        dr.value = `${fmt(today)} - ${fmt(tomorrow)}`;

        // Cập nhật hidden input khi chọn ngày
        window.receptionPicker.on('selected', function(date1, date2) {
            const toInputDate = (d) => {
                const dt = new Date(d.year, d.month - 1, d.day);
                return dt.toISOString().split('T')[0];
            };
            document.getElementById('checkInDate').value = toInputDate(date1);
            document.getElementById('checkOutDate').value = toInputDate(date2);
        });

        console.log(' Litepicker đã khởi tạo thành công.');
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
    const ci = document.getElementById('checkInDate').value;
    const co = document.getElementById('checkOutDate').value;
    if (!ci || !co) return alert('Vui lòng chọn ngày nhận và trả phòng.');

    showRoomsLoading();
    try {
        const list = await API.fetchAvailableRoomsAPI(ci, co);
        const rooms = await Promise.all(list.map(r => API.getRoomDetailsAPI(r.maphong)));
        availableRooms = rooms.filter(r => r);
        displayAvailableRooms(availableRooms);
    } catch (err) {
        console.error('Lỗi tìm kiếm phòng', err);
        showRoomsError('Không thể tải danh sách phòng.');
    }
}

// --- Hiển thị danh sách phòng trống ---
function displayAvailableRooms(rooms) {
    const grid = document.getElementById('roomsGrid');
    if (!rooms.length) {
        grid.innerHTML = '<p>Không có phòng trống phù hợp.</p>';
        return;
    }

    grid.innerHTML = rooms.map(room => `
        <div class="room-card" data-room-id="${room.maphong}">
            <div class="room-header">Phòng ${room.sophong} - ${room.loaiPhong.tenloaiphong}</div>
            <div>${formatCurrency(room.loaiPhong.giacoban)} / đêm</div>
            <button onclick="selectRoom(${room.maphong})">Chọn</button>
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