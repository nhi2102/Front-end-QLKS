// Biến toàn cục dùng để lưu thông tin hiện tại
let currentBooking = null; // Đơn đặt phòng hiện tại đang được chọn
let selectedNewRoom = null; // Phòng mới mà người dùng chọn để đổi
let availableRooms = []; // Danh sách phòng trống có thể đổi
let allRoomTypes = []; // Danh sách loại phòng
// ============================================
//Khởi tạo
document.addEventListener('DOMContentLoaded', async() => {
    initializeEventListeners();
    checkUserLogin();
    setupEventListeners();
    await loadRoomTypes();
});

function initializeEventListeners() {
    document.getElementById('searchBookingBtn').addEventListener('click', searchBookings);
    document.getElementById('searchValue').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBookings();
    });
    document.getElementById('cancelChangeBtn').addEventListener('click', resetForm);
    document.getElementById('confirmChangeBtn').addEventListener('click', confirmRoomChange);
}
//  Kiểm tra đăng nhập
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
//tải danh sách loại phòng
async function loadRoomTypes() {
    try {
        allRoomTypes = await RoomChangeAPI.getRoomTypesAPI();
        const select = document.getElementById('filterRoomType');
        select.innerHTML = '<option value="">Tất cả loại phòng</option>';
        allRoomTypes.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type.maloaiphong;
            opt.textContent = `${type.tenloaiphong} - ${formatCurrency(type.giacoban)}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Lỗi load loại phòng:', err);
    }
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
        await loadAvailableRooms(booking);
        document.getElementById('roomChangeFormSection').style.display = 'block';
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

    // Hiển thị danh sách phòng khách đang ở
    let html = `
        <p><b>Khách hàng:</b> ${customer.hoten}</p>
        <p><b>Mã đặt phòng:</b> ${booking.madatphong}</p>
        <hr>
        <p>Vui lòng chọn phòng muốn đổi:</p>
    `;

    details.forEach((d, i) => {
        const room = d.phong || d.maphongNavigation || {};
        const loai = room.loaiPhong || room.maloaiphongNavigation || {};
        html += `
<div class="room-info-block">
    <div class="room-header-line">
        <h5>Phòng ${room.sophong || 'N/A'} - ${loai.tenloaiphong || 'Không rõ loại'}</h5>
        <button class="btn btn-sm btn-warning" onclick="selectRoomToChange(${d.machitiet})">
            Chọn
        </button>
    </div>
    <p><b>Giá/đêm:</b> ${formatCurrency(loai.giacoban)}</p>
</div>
<hr>
`;

    });

    info.innerHTML = html;

    // Lưu toàn bộ chi tiết để dùng sau
    currentBooking.roomDetails = details;
}
window.selectRoomToChange = async function(detailId) {
    const detail = currentBooking.roomDetails.find(d => d.machitiet === detailId);
    if (!detail) return alert("Không tìm thấy thông tin chi tiết phòng này!");

    const room = detail.phong || detail.maphongNavigation || {};
    const loai = room.loaiPhong || room.maloaiphongNavigation || {};

    // Lưu vào booking hiện tại
    currentBooking.currentRoomDetailId = detailId;
    currentBooking.currentRoomId = room.maphong;
    currentBooking.currentRoomPrice = loai.giacoban || 0;

    // Thông báo phòng đang chọn
    alert(`Đang chọn đổi phòng ${room.sophong} (${loai.tenloaiphong})`);

    // Hiển thị phần chọn phòng trống để đổi
    await loadAvailableRooms(currentBooking);
    document.getElementById('roomChangeFormSection').style.display = 'block';
};

// TẢI DANH SÁCH PHÒNG TRỐNG
async function loadAvailableRooms(booking) {
    const checkIn = booking.ngaynhanphong.split('T')[0];
    const checkOut = booking.ngaytraphong.split('T')[0];

    try {
        showLoading(true);
        // Gọi API tìm phòng trống theo khoảng thời gian
        const rooms = await RoomChangeAPI.fetchAvailableRoomsAPI(checkIn, checkOut);

        if (!rooms || rooms.length === 0) {
            document.getElementById('availableRoomsList').innerHTML =
                '<p class="text-center text-muted">Không có phòng trống trong khoảng thời gian này.</p>';
            return;
        }

        availableRooms = rooms;
        displayAvailableRooms(rooms);
    } catch (err) {
        console.error(' Lỗi tải danh sách phòng trống:', err);
        alert('Không thể tải danh sách phòng trống.');
    } finally {
        showLoading(false);
    }
}


// Hiển thị danh sách phòng trống
function displayAvailableRooms(rooms) {
    const list = document.getElementById('availableRoomsList');
    list.innerHTML = '';

    rooms.forEach(r => {
        const loai = r.loaiPhong || r.maloaiphongNavigation || {};
        const div = document.createElement('div');
        div.className = 'room-card';

        div.innerHTML = `
            <div class="room-card-header">
                Phòng ${r.sophong || 'N/A'} - ${loai.tenloaiphong || 'Không rõ loại'}
            </div>
            <div class="room-card-body">
                <span>${formatCurrency(loai.giacoban)}</span>
                <button class="btn btn-sm btn-primary" onclick="selectNewRoom(${r.maphong})">
                    <i class="fas fa-exchange-alt"></i> Chọn
                </button>
            </div>`;
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
    const oldP = currentBooking.currentRoomPrice || 0;
    const newP = (selectedNewRoom && selectedNewRoom.loaiPhong && selectedNewRoom.loaiPhong.giacoban) || 0;
    const diff = newP - oldP;
    document.getElementById('priceDifference').textContent = formatCurrency(diff);
}


// XÁC NHẬN ĐỔI PHÒNG


async function confirmRoomChange() {
    if (!currentBooking || !selectedNewRoom) return alert('Chưa chọn phòng');
    const reason = document.getElementById('changeReason').value || 'Không rõ lý do';

    showLoading(true);
    try {
        const detail = currentBooking.roomDetails.find(
            d => d.machitiet === currentBooking.currentRoomDetailId
        );
        if (!detail) return alert('Không tìm thấy chi tiết phòng cần đổi!');


        const update = {
            machitiet: detail.machitiet,
            madatphong: currentBooking.madatphong,
            maphong: selectedNewRoom.maphong,
            tongcong: selectedNewRoom.loaiPhong.giacoban,
            ghichu: `Đổi phòng: ${reason}`
        };
        await RoomChangeAPI.updateRoomDetailAPI(detail.machitiet, update);

        showSuccessModal();
    } catch (err) {
        alert('Lỗi đổi phòng: ' + err.message);
    } finally {
        showLoading(false);
    }
}

function filterRooms() {
    const roomType = document.getElementById('filterRoomType').value;
    const priceRange = document.getElementById('filterPriceRange').value;

    let filtered = [...availableRooms];

    // Lọc theo loại phòng
    if (roomType) {
        filtered = filtered.filter(r => r.loaiPhong.maloaiphong.toString() === roomType);
    }

    // Lọc theo khoảng giá
    if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        filtered = filtered.filter(r => {
            const price = r.loaiPhong.giacoban;
            return price >= min && price <= max;
        });
    }

    // Hiển thị kết quả lọc
    displayAvailableRooms(filtered);
}

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

    // Reset input
    document.getElementById('changeReason').value = '';
    document.getElementById('changeNote').value = '';

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