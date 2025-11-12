// Biến toàn cục dùng để lưu thông tin hiện tại
let currentBooking = null; // Đơn đặt phòng hiện tại đang được chọn
let selectedNewRoom = null; // Phòng mới mà người dùng chọn để đổi
let availableRooms = []; // Danh sách phòng trống có thể đổi
let allRoomTypes = []; // Danh sách loại phòng
// ============================================
//Khởi tạo
document.addEventListener('DOMContentLoaded', async() => {
    console.log("✅ DOMContentLoaded event fired");

    try {
        initializeEventListeners();
        console.log("✅ initializeEventListeners done");

        checkUserLogin();
        setupEventListeners();
        console.log("✅ setupEventListeners done");

        // await loadRoomTypes();
        // console.log("✅ loadRoomTypes done");

        const btnFindNew = document.getElementById('btnFindByNewDate');
        if (btnFindNew) {
            console.log("✅ Found btnFindByNewDate");
            btnFindNew.addEventListener('click', findRoomsByNewDate);
        } else {
            console.warn("⚠️ Không tìm thấy #btnFindByNewDate");
        }

        const confirmBtn = document.getElementById("confirmChangeBtn");
        if (confirmBtn) {
            console.log("✅ Found confirmChangeBtn, adding listener...");
            confirmBtn.addEventListener("click", async() => {
                console.log("🟢 ConfirmChangeBtn clicked!");
                const confirmBtn = document.getElementById("confirmChangeBtn");
                console.log("🔍 Kiểm tra confirmChangeBtn:", confirmBtn);
                const scriptSrc = document.currentScript && document.currentScript.src ? document.currentScript.src : 'unknown';
                console.log("📄 Vị trí script đang chạy:", scriptSrc);
                console.log("📦 Tổng số button trong trang:", document.querySelectorAll('button').length);

                try {
                    const userNameEl = document.getElementById("userName");
                    const payload = {
                        maDatPhong: currentBooking && (currentBooking.id || currentBooking.madatphong),
                        maPhongCu: currentBooking && currentBooking.currentRoomId,
                        maPhongMoi: selectedNewRoom && selectedNewRoom.maphong,
                        nguoiThucHien: (userNameEl && (userNameEl.textContent || userNameEl.innerText)) || "Không rõ"
                    };

                    console.log("📦 Payload gửi:", payload);

                    const result = await RoomChangeAPI.changeRoomAPI(payload);
                    console.log("✅ API response:", result);
                    alert(result.message || "Đổi phòng thành công!");
                } catch (err) {
                    console.error("❌ Lỗi đổi phòng:", err);
                    alert("Không thể đổi phòng: " + err.message);
                }
            });
        } else {
            console.warn("❌ Không tìm thấy nút #confirmChangeBtn trong DOM!");
        }
    } catch (ex) {
        console.error("🔥 Lỗi khi khởi tạo trang:", ex);
    }
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
                console.log(" Chế độ đổi phòng trong cùng ngày");
                newDateSection.style.display = 'none';
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
        document.querySelector('.new-date-section').style.display = 'none';

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

    //alert(`✅ Đã chọn đổi phòng ${room.sophong} (${loai.tenloaiphong})`);

    // Hiển thị danh sách phòng trống sau khi chọn
    await loadAvailableRooms(currentBooking);
    document.querySelector('.available-rooms-section').style.display = 'block';
};

// TÌM PHÒNG THEO NGÀY MỚI

async function findRoomsByNewDate() {
    const checkIn = document.getElementById('newCheckIn').value;
    const checkOut = document.getElementById('newCheckOut').value;

    if (!checkIn || !checkOut) {
        alert('Vui lòng chọn cả ngày nhận và ngày trả mới!');
        return;
    }

    showLoading(true);
    try {
        const rooms = await RoomChangeAPI.getAvailableRoomsAPI(checkIn, checkOut);

        if (!rooms || rooms.length === 0) {
            document.getElementById('availableRoomsList').innerHTML =
                '<p class="text-center text-muted">Không có phòng trống trong khoảng thời gian này.</p>';
            return;
        }

        availableRooms = rooms;
        displayAvailableRooms(rooms);
        // alert('Đã tải danh sách phòng trống theo ngày mới!');
    } catch (err) {
        console.error('Lỗi tải phòng trống ngày mới:', err);
        alert('Không thể tải danh sách phòng trống.');
    } finally {
        showLoading(false);
    }
}

// TẢI DANH SÁCH PHÒNG TRỐNG
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
        console.error(' Lỗi tải danh sách phòng trống:', err);
        alert('Không thể tải danh sách phòng trống.');
    } finally {
        showLoading(false);
    }
}
// Tìm phòng trống theo ngày mới
// TÌM PHÒNG THEO NGÀY MỚI
async function findRoomsByNewDate() {
    const checkIn = document.getElementById('newCheckIn').value;
    const checkOut = document.getElementById('newCheckOut').value;

    if (!checkIn || !checkOut) {
        alert('Vui lòng chọn cả ngày nhận và ngày trả mới!');
        return;
    }

    showLoading(true);
    try {
        // Gọi API thực sự có tồn tại
        const rooms = await RoomChangeAPI.getAvailableRoomsAPI(checkIn, checkOut);

        const list = document.getElementById('availableRoomsList');
        if (!rooms || rooms.length === 0) {
            list.innerHTML = '<p class="text-center text-muted">Không có phòng trống trong khoảng thời gian này.</p>';
            return;
        }

        availableRooms = rooms;
        displayAvailableRooms(rooms);
        document.querySelector('.available-rooms-section').style.display = 'block';
    } catch (err) {
        console.error(' Lỗi tải phòng trống ngày mới:', err);
        alert('Không thể tải danh sách phòng trống. Chi tiết: ' + err.message);
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
    if (!currentBooking || !selectedNewRoom) return;

    const oldPrice = currentBooking.currentRoomPrice || 0;
    const newPrice =
        (selectedNewRoom && selectedNewRoom.loaiPhong && selectedNewRoom.loaiPhong.giacoban) ||
        (selectedNewRoom && selectedNewRoom.maloaiphongNavigation && selectedNewRoom.maloaiphongNavigation.giacoban) ||
        0;

    // Nếu người dùng có nhập ngày mới → tính theo ngày mới
    const newCheckIn = document.getElementById('newCheckIn').value;
    const newCheckOut = document.getElementById('newCheckOut').value;

    let diffDays;
    if (newCheckIn && newCheckOut) {
        diffDays = Math.max(1, Math.ceil(
            (new Date(newCheckOut) - new Date(newCheckIn)) / (1000 * 60 * 60 * 24)
        ));
    } else {
        const today = new Date();
        const checkout = new Date(currentBooking.ngaytraphong);
        diffDays = Math.max(1, Math.ceil((checkout - today) / (1000 * 60 * 60 * 24)));
    }

    const diffPerNight = newPrice - oldPrice;
    const totalAdjustment = diffPerNight * diffDays;

    document.getElementById("oldRoomPrice").textContent = formatCurrency(oldPrice);
    document.getElementById("newRoomPrice").textContent = formatCurrency(newPrice);
    document.getElementById("priceDifference").textContent = formatCurrency(diffPerNight);
    document.getElementById("remainingNights").textContent = diffDays;
    document.getElementById("totalAdjustment").textContent = formatCurrency(totalAdjustment);
}




// // XÁC NHẬN ĐỔI PHÒNG


// async function confirmRoomChange() {
//     if (!currentBooking || !selectedNewRoom) return alert('Chưa chọn phòng');
//     const reason = document.getElementById('changeReason').value || 'Không rõ lý do';
//     const newCheckIn = document.getElementById('newCheckIn').value;
//     const newCheckOut = document.getElementById('newCheckOut').value;

//     showLoading(true);
//     try {
//         const detail = currentBooking.roomDetails.find(
//             d => d.machitiet === currentBooking.currentRoomDetailId
//         );
//         if (!detail) return alert('Không tìm thấy chi tiết phòng cần đổi!');

//         const updateDetail = {
//             machitiet: detail.machitiet,
//             madatphong: currentBooking.madatphong,
//             maphong: selectedNewRoom.maphong,
//             tongcong: selectedNewRoom.loaiPhong.giacoban,
//             ghichu: `Đổi phòng: ${reason}`
//         };
//         await RoomChangeAPI.updateRoomDetailAPI(detail.machitiet, updateDetail);

//         //  Nếu người dùng chọn ngày mới → cập nhật luôn booking
//         if (newCheckIn && newCheckOut) {
//             const updateBooking = {
//                 ...currentBooking,
//                 ngaynhanphong: newCheckIn,
//                 ngaytraphong: newCheckOut
//             };
//             await RoomChangeAPI.updateBookingAPI(currentBooking.madatphong, updateBooking);
//         }

//         showSuccessModal();
//     } catch (err) {
//         alert('Lỗi đổi phòng: ' + err.message);
//     } finally {
//         showLoading(false);
//     }
// }



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
    // document.getElementById('changeReason').value = '';
    // document.getElementById('changeNote').value = '';

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