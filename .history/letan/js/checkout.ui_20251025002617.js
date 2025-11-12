// ===============================
// checkout.ui.js
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    loadCurrentGuests();
});

currentBooking = null;
let originalRoomCharge = 0;
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

    const searchInputs = ['searchBookingCode', 'searchRoomNumber', 'searchName'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchBooking();
            });
        }
    });
}
// Tìm kiếm booking
function searchBooking() {
    const bookingCodeEl = document.getElementById('searchBookingCode');
    const bookingCode = bookingCodeEl && bookingCodeEl.value ? bookingCodeEl.value.trim() : '';
    const roomNumberEl = document.getElementById('searchRoomNumber');
    const roomNumber = roomNumberEl && roomNumberEl.value ? roomNumberEl.value.trim() : '';
    const nameEl = document.getElementById('searchName');
    const name = nameEl && nameEl.value ? nameEl.value.trim() : '';

    if (!bookingCode && !roomNumber && !name) {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm!');
        return;
    }

    const filtered = currentBookingsData.filter(booking => {
        let matches = true;
        if (bookingCode) {
            const id = (booking.madatphong || booking.maDatPhong || '').toString();
            matches = matches && id.toLowerCase().includes(bookingCode.toLowerCase());
        }
        if (roomNumber) {
            let bookingRoom = booking.soPhong || booking.Sophong || booking.sophong || '';
            if (!bookingRoom && booking.makhNavigation) bookingRoom = booking.makhNavigation.Sophong || booking.makhNavigation.sophong || '';
            matches = matches && bookingRoom.toString().includes(roomNumber);
        }
        if (name) {
            let customerName = booking.tenKhachHang || booking.Hoten || booking.hoten || '';
            if (!customerName && booking.makhNavigation) customerName = booking.makhNavigation.Hoten || booking.makhNavigation.hoten || '';
            matches = matches && customerName.toLowerCase().includes(name.toLowerCase());
        }
        return matches;
    });

    displayPendingCheckIns(filtered);

    if (!filtered || filtered.length === 0) {
        alert('Không tìm thấy booking nào phù hợp trong danh sách check-in!');
    }
}
// Tải danh sách khách đang ở
async function loadCurrentGuests() {
    try {
        const bookings = await CheckoutAPI.getPendingCheckouts();
        displayCurrentGuests(bookings);
        document.getElementById('guestCount').textContent = `${bookings.length} khách`;
    } catch (e) {
        console.error(e);
        showError('Không thể tải danh sách khách checkout hôm nay');
    }
}

// Hiển thị danh sách khách
function displayCurrentGuests(bookings) {
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) return;
    if (!bookings.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="no-data">Không có khách hôm nay</td></tr>`;
        return;
    }
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.maDatPhong}</td>
            <td>${b.tenKhachHang}</td>
            <td>${b.soDienThoai}</td>
            <td>${b.phong || '-'}</td>
            <td>${formatDate(b.ngayNhanPhong)}</td>
            <td>${formatDate(b.ngayTraPhong)}</td>
            <td><span class="status-badge status-checkedin">Đang ở</span></td>
            <td>
                <button class="btn btn-checkout" onclick='openCheckOutModal(${JSON.stringify(b)})'>
                    <i class="fas fa-sign-out-alt"></i> Check-out
                </button>
            </td>
        </tr>`).join('');
}

// Mở modal checkout
async function openCheckOutModal(booking) {
    currentBooking = booking;
    document.getElementById('modalBookingCode').textContent = booking.maDatPhong;
    document.getElementById('modalCustomerName').textContent = booking.tenKhachHang; {
        const phoneEl = document.getElementById('modalPhoneNumber');
        const phoneVal = booking.soDienThoai;
        if (phoneVal === undefined || phoneVal === null || phoneVal === '') {
            phoneEl.textContent = '-';
        } else {
            phoneEl.textContent = phoneVal.toString();
        }
    }
    const modalCCCDEl = document.getElementById('modalCCCD');
    const cccd = booking.cccd;
    if (cccd !== undefined && cccd !== null && cccd !== '') {
        modalCCCDEl.textContent = cccd.toString();
    } else {
        modalCCCDEl.textContent = '-';
    }
    document.getElementById('modalRoomNumber').textContent = booking.phong;
    document.getElementById('modalCheckInDate').textContent = formatDate(booking.ngayNhanPhong);
    document.getElementById('modalCheckOutDate').textContent = formatDate(booking.ngayTraPhong);
    document.getElementById('modalRoomType').textContent = booking.loaiPhong || '-';
    document.getElementById('checkOutModal').classList.add('show');

    // Tiền phòng
    originalRoomCharge = booking.tongTienDatPhong || booking.tongTien || 0;
    document.getElementById('roomCharge').textContent = formatCurrency(originalRoomCharge);

    // Dịch vụ
    // const services = await CheckoutAPI.getServiceHistory(booking.maDatPhong);

    // //  Lấy danh sách dịch vụ chưa thanh toán (mảng)
    // const pendingServices = services.chuaThanhToan || [];

    // //  Lấy tổng tiền chưa thanh toán từ API (ưu tiên, nếu không có thì tự cộng)
    // const totalService = (services && services.tongChuaThanhToan != null) ?
    //     Number(services.tongChuaThanhToan) :
    //     pendingServices.reduce((s, v) => s + (v.thanhTien || 0), 0);

    // // Hiển thị tổng tiền dịch vụ
    // document.getElementById('serviceCharge').textContent = formatCurrency(totalService);

    // // Hiển thị danh sách dịch vụ
    // document.getElementById('serviceHistoryList').innerHTML =
    //     pendingServices.length ?
    //     pendingServices.map(s => `<div>${s.tenDichVu} - ${formatCurrency(s.thanhTien)}</div>`).join('') :
    //     '<div>Không có dịch vụ chưa thanh toán</div>';

    // // Cập nhật tổng cộng
    // calculateTotal();
    const services = await CheckoutAPI.getServiceHistory(booking.maDatPhong);
    console.log('Service API result:', services);

    let totalService = 0;
    //  Lấy danh sách dịch vụ chưa thanh toán (mảng)
    const pendingServices = services.chuaThanhToan || [];

    // Nếu là object có field tongChuaThanhToan
    if (services && typeof services === 'object' && 'tongChuaThanhToan' in services) {
        totalService = services.tongChuaThanhToan;
    }
    // Nếu là mảng thì lấy phần tử đầu tiên có tongChuaThanhToan
    else if (Array.isArray(services) && services.length && services[0].tongChuaThanhToan != null) {
        totalService = services[0].tongChuaThanhToan;
    }

    document.getElementById('serviceCharge').textContent = formatCurrency(totalService);
    // Hiển thị danh sách dịch vụ
    document.getElementById('serviceHistoryList').innerHTML =
        pendingServices.length ?
        pendingServices.map(s => `<div>${s.tenDichVu} - ${formatCurrency(s.thanhTien)}</div>`).join('') :
        '<div>Không có dịch vụ chưa thanh toán</div>';
    calculateTotal(booking.maDatPhong);



}
async function handleEquipmentStatusChange() {
    const status = document.getElementById("equipmentStatus").value;
    const equipmentGroup = document.getElementById("equipmentCheckGroup");
    const listContainer = document.getElementById("equipmentCheckList");

    if (status === "damaged") {
        equipmentGroup.style.display = "block";
        listContainer.innerHTML = `<div class="loading">⏳ Đang tải danh sách thiết bị...</div>`;

        try {
            // Gọi API lấy danh sách thiết bị khách sạn
            const equipments = await CheckoutAPI.getHotelEquipments();

            if (!equipments || equipments.length === 0) {
                listContainer.innerHTML = `<div class="no-data">Không có thiết bị nào trong hệ thống</div>`;
                return;
            }

            // Lấy danh sách phòng hiện tại trong booking (nếu có)
            const roomList = (function() {
                if (!currentBooking) return [];
                return currentBooking.danhSachPhong || currentBooking.DanhSachPhong || [];
            })();
            const roomOptions = (roomList || []).map(function(p) {
                return '<option value="' + (p.MaPhong || p.maPhong || '') + '">' + (p.SoPhong || p.soPhong || '') + '</option>';
            }).join('');

            // Đổ danh sách thiết bị ra giao diện (mỗi thiết bị có checkbox + chọn phòng + số lượng)
            listContainer.innerHTML = equipments.map(eq => `
                <div class="equipment-item">
                    <label style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox"
                               class="equipment-check"
                               value="${eq.maThietBi || eq.mathietbi}"
                               data-name="${eq.tenThietBi || eq.tenthietbi}"
                               data-price="${eq.donGia || eq.dongia || 0}"
                               onchange="handleEquipmentSelectionChange()">
                        <span>${eq.tenThietBi || eq.tenthietbi}</span>
                        <span class="price">(${formatCurrency(eq.donGia || eq.dongia || 0)})</span>
                    </label>
                    
                    <!-- Chọn phòng bị hỏng -->
                    <div class="equipment-extra" style="margin-left:25px;display:none;">
                        <label>Phòng:</label>
                        <select class="equipment-room">${roomOptions}</select>
                        
                        <label style="margin-left:10px;">Số lượng:</label>
                        <input type="number" class="equipment-qty" min="1" value="1" style="width:60px;">
                    </div>
                </div>
            `).join("");

        } catch (error) {
            console.error(" Lỗi tải thiết bị:", error);
            listContainer.innerHTML = `<div class="error">Không thể tải danh sách thiết bị</div>`;
        }

    } else {
        equipmentGroup.style.display = "none";
        listContainer.innerHTML = "";
        document.getElementById("equipmentCompensation").textContent = "0 ₫";
    }

    if (currentBooking) {
        await calculateTotal(currentBooking.maDatPhong);
    }
}



// Khi tick chọn thiết bị hư hỏng
async function handleEquipmentStatusChange() {
    const status = document.getElementById("equipmentStatus").value;
    const equipmentGroup = document.getElementById("equipmentCheckGroup");
    const listContainer = document.getElementById("equipmentCheckList");

    if (status === "damaged") {
        equipmentGroup.style.display = "block";
        listContainer.innerHTML = `<div class="loading">Đang tải danh sách thiết bị...</div>`;

        try {
            // Gọi API lấy danh sách thiết bị khách sạn
            const equipments = await CheckoutAPI.getHotelEquipments();

            if (!equipments || equipments.length === 0) {
                listContainer.innerHTML = `<div class="no-data">Không có thiết bị nào trong hệ thống</div>`;
                return;
            }

            // Lấy danh sách phòng hiện tại trong booking (nếu có)
            const roomOptions = ((currentBooking && (currentBooking.danhSachPhong || currentBooking.DanhSachPhong)) || [])
                .map(p => `<option value="${p.MaPhong || p.maPhong}">${p.SoPhong || p.soPhong}</option>`)
                .join('');

            // Đổ danh sách thiết bị ra giao diện
            listContainer.innerHTML = equipments.map(eq => `
                <div class="equipment-item" style="margin-bottom:8px;">
                    <label style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox"
                               class="equipment-check"
                               value="${eq.maThietBi || eq.mathietbi}"
                               data-name="${eq.tenThietBi || eq.tenthietbi}"
                               data-price="${eq.donGia || eq.dongia || 0}"
                               onchange="handleEquipmentSelectionChange()">
                        <span>${eq.tenThietBi || eq.tenthietbi}</span>
                        <span class="price">(${formatCurrency(eq.donGia || eq.dongia || 0)})</span>
                    </label>
                    
                    <!-- Chọn phòng + số lượng -->
                    <div class="equipment-extra" style="margin-left:25px;display:none;align-items:center;gap:8px;">
                        <label>Phòng:</label>
                        <select class="equipment-room">${roomOptions}</select>
                        
                        <label>Số lượng:</label>
                        <div class="equipment-qty-wrapper" style="display:inline-flex;align-items:center;gap:3px;">
                            <button type="button" class="qty-btn" onclick="changeQty(this, -1)">−</button>
                            <input type="number" class="equipment-qty" min="1" value="1" style="width:50px;text-align:center;">
                            <button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button>
                        </div>
                    </div>
                </div>
            `).join("");

        } catch (error) {
            console.error("Lỗi tải thiết bị:", error);
            listContainer.innerHTML = `<div class="error">Không thể tải danh sách thiết bị</div>`;
        }

    } else {
        equipmentGroup.style.display = "none";
        listContainer.innerHTML = "";
        document.getElementById("equipmentCompensation").textContent = "0 ₫";
    }

    if (currentBooking) {
        await calculateTotal(currentBooking.maDatPhong);
    }
}

// Hàm tăng/giảm số lượng
function changeQty(btn, delta) {
    const input = btn.parentElement.querySelector('.equipment-qty');
    let value = parseInt(input.value) || 1;
    value = Math.max(1, value + delta);
    input.value = value;

    // Kích hoạt sự kiện change nếu bạn có tính lại tiền
    input.dispatchEvent(new Event('change'));
    handleEquipmentSelectionChange();
}



function handleEquipmentSelectionChange() {
    const items = document.querySelectorAll('.equipment-item');

    items.forEach(item => {
        const checkbox = item.querySelector('.equipment-check');
        const extraFields = item.querySelector('.equipment-extra');

        if (checkbox.checked) {
            extraFields.style.display = 'inline-flex';
            extraFields.style.gap = '10px';
            extraFields.style.alignItems = 'center';
        } else {
            extraFields.style.display = 'none';
        }
    });

    // Tính tổng tiền bồi thường
    let total = 0;
    document.querySelectorAll('.equipment-check:checked').forEach(cb => {
        const price = parseFloat(cb.dataset.price || 0);
        const qtyInput = cb.closest('.equipment-item').querySelector('.equipment-qty');
        let qty = 1;
        if (qtyInput && qtyInput.value) {
            qty = parseInt(qtyInput.value, 10) || 1;
        }
        total += price * qty;
    });

    // Gán tổng vào phần hiển thị và lưu dataset
    const compEl = document.getElementById('equipmentCompensation');
    if (compEl) {
        compEl.textContent = formatCurrency(total);
        compEl.dataset.value = total;
    }
    calculateTotal(currentBooking.maDatPhong);


}






//  Tính tổng tiền
async function calculateTotal(maDatPhong) {
    try {
        // --- 1️ Gọi API lấy tiền còn thiếu ---
        const remainingRes = await CheckoutAPI.getRemainingAmount(maDatPhong);
        let remainingAmount = 0;
        if (remainingRes) {
            if (remainingRes.soTienThieu != null) {
                remainingAmount = Number(remainingRes.soTienThieu) || 0;
            } else if (remainingRes.SoTienThieu != null) {
                remainingAmount = Number(remainingRes.SoTienThieu) || 0;
            } else if (remainingRes.sotienthieu != null) {
                remainingAmount = Number(remainingRes.sotienthieu) || 0;
            } else if (typeof remainingRes === 'number') {
                remainingAmount = remainingRes || 0;
            }
        }
        //  Lấy các khoản phụ thu, giảm giá, dịch vụ từ giao diện ---
        const equipmentEl = document.getElementById('equipmentCompensation');


        // Lấy tiền đền bù thiết bị (nếu có)
        const equipmentCompensation = equipmentEl ? parseFloat(equipmentEl.dataset.value || 0) : 0;

        // --- Tổng tiền cần thanh toán ---
        const totalUnpaid = remainingAmount + equipmentCompensation;

        // ---  Hiển thị kết quả --
        const totalAmountEl = document.getElementById('totalAmount');
        if (totalAmountEl) {
            totalAmountEl.textContent = formatCurrency(totalUnpaid);

        }

        console.log(' Tổng cộng:', {
            remainingAmount,
            equipmentCompensation,
            totalUnpaid
        });
    } catch (error) {
        console.error(' Lỗi khi tính tổng tiền:', error);
    }
}



//  Xác nhận checkout
async function confirmCheckOut() {
    if (!currentBooking) return alert("Không có booking nào");

    const id = currentBooking.maDatPhong;
    const remain = await CheckoutAPI.getRemainingAmount(id);
    const soTienThieu = remain.SoTienThieu || 0;

    if (soTienThieu > 0 && !confirm(`Khách còn thiếu ${formatCurrency(soTienThieu)}.\nTiếp tục checkout?`)) return;

    const result = await CheckoutAPI.executeCheckout(id);
    alert(result.message || "Checkout hoàn tất");
    closeCheckOutModal();
    loadCurrentGuests();
}
//check out xử lý
async function handleCheckout() {
    const bookingId = currentBooking && currentBooking.maDatPhong;
    if (!bookingId) {
        alert("Không tìm thấy mã đặt phòng!");
        return;
    }

    try {
        // 1️ Lấy danh sách thiết bị hư hỏng từ giao diện
        const damagedItems = [];
        document.querySelectorAll('.equipment-check:checked').forEach(cb => {
            const item = cb.closest('.equipment-item');
            const qty = parseInt(item.querySelector('.equipment-qty').value) || 1;
            const room = item.querySelector('.equipment-room').value;
            damagedItems.push({
                mathietbi: cb.value,
                madatphong: bookingId,
                soluong: qty,
                maphong: room
            });
        });

        // 2 Gọi API tạo đền bù cho từng thiết bị
        for (const item of damagedItems) {
            await CheckoutAPI.createDamageCompensation(item);
        }

        //  Sau khi xong đền bù, gọi Checkout
        const res = await CheckoutAPI.executeCheckout(bookingId);
        alert(res.message || "Checkout thành công!");

        // 4️ Làm mới giao diện hoặc load lại danh sách phòng
        loadCurrentGuests();

    } catch (err) {
        console.error(err);
        alert(" " + err.message);
    }
}


//  Format helpers
function formatCurrency(v) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
}

function parseCurrency(txt) {
    return parseFloat(txt.replace(/[^\d]/g, '')) || 0;
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('vi-VN') : '-';
}

function showError(msg) { alert(msg); }

//  Modal close
function closeCheckOutModal() {
    document.getElementById('checkOutModal').classList.remove('show');
}