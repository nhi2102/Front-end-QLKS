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

        // 3️ In hóa đơn sau khi checkout thành công
        await printCheckoutInvoice(currentBooking);

        // 4️ Đóng modal và làm mới giao diện
        closeCheckOutModal();
        loadCurrentGuests();

    } catch (err) {
        console.error(err);
        alert("Lỗi checkout: " + err.message);
    }
}


//  Format helpers
// In hóa đơn checkout
async function printCheckoutInvoice(booking) {
    if (!booking) return;
    
    try {
        // Thu thập thông tin hóa đơn
        const equipmentEl = document.getElementById('equipmentCompensation');
        const equipmentCompensation = equipmentEl ? parseFloat(equipmentEl.dataset.value || 0) : 0;
        
        // Lấy tiền dịch vụ từ giao diện
        const serviceChargeText = document.getElementById('serviceCharge')?.textContent || '0 ₫';
        const serviceCharge = parseCurrency(serviceChargeText);
        
        // Lấy tổng tiền từ giao diện
        const totalAmountText = document.getElementById('totalAmount')?.textContent || '0 ₫';
        const totalAmount = parseCurrency(totalAmountText);
        
        const invoiceData = {
            bookingId: booking.maDatPhong,
            customerName: booking.tenKhachHang,
            phone: booking.soDienThoai,
            roomNumber: booking.phong,
            checkInDate: formatDate(booking.ngayNhanPhong),
            checkOutDate: formatDate(booking.ngayTraPhong),
            roomCharge: originalRoomCharge,
            serviceCharge: serviceCharge,
            extraCharge: equipmentCompensation, // Tiền đền bù thiết bị
            discount: 0,
            totalToPay: totalAmount,
            paymentMethod: 'Tiền mặt'
        };
        
        console.log('📄 In hóa đơn checkout:', invoiceData);
        
        // Gọi function in từ checkout API
        if (typeof CheckoutAPI !== 'undefined' && CheckoutAPI.printInvoice) {
            CheckoutAPI.printInvoice(invoiceData);
        } else {
            // Fallback: in trực tiếp
            printInvoiceNow(invoiceData);
        }
        
    } catch (error) {
        console.error('Lỗi khi in hóa đơn:', error);
        alert('Không thể in hóa đơn: ' + error.message);
    }
}

// Print invoice helper - tương tự như trong checkout.js
function printInvoiceNow(invoice) {
    const win = window.open('', '_blank');
    if (!win) {
        alert('Không thể mở cửa sổ in (popup bị chặn)');
        return;
    }
    
    const styles = `
        :root{--primary:#112173; --muted:#6c757d}
        body{font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#212529; margin:0; padding:20px; background:#f5f7fb}
        .invoice-wrap{max-width:800px; margin:20px auto; background:#fff; padding:28px; border-radius:8px; box-shadow:0 6px 20px rgba(17,33,115,0.06)}
        .header{display:flex; justify-content:space-between; align-items:center}
        .brand{display:flex; gap:12px; align-items:center}
        .brand h1{font-size:20px; margin:0; color:var(--primary)}
        .meta{font-size:14px; color:var(--muted)}
        .section{margin-top:18px}
        .section .row{display:flex; justify-content:space-between; gap:16px}
        table{width:100%; border-collapse:collapse; margin-top:14px}
        th, td{padding:12px 10px; text-align:left}
        thead th{color:var(--muted); font-size:13px; border-bottom:1px solid #eef2fb}
        tbody tr + tr td{border-top:1px solid #f1f4fb}
        .right{text-align:right}
        .totals{margin-top:16px; display:flex; justify-content:flex-end}
        .totals .box{background:#f8f9ff; padding:14px 18px; border-radius:8px; min-width:260px}
        .totals .box .line{display:flex; justify-content:space-between; margin-bottom:8px}
        .grand{font-size:18px; font-weight:700; color:var(--primary)}
        .small{font-size:12px; color:var(--muted)}
        @media print{
            body{background:#fff}
            .invoice-wrap{box-shadow:none; border-radius:0; margin:0; padding:8mm}
            .no-print{display:none}
        }
    `;

    const html = `
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Hóa đơn Checkout - ${invoice.bookingId}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="invoice-wrap">
                <div class="header">
                    <div class="brand">
                        <div>
                            <h1>Thanh Trà Hotel</h1>
                            <div class="meta">Địa chỉ: Đường ABC, Đà Nẵng • Tel: 0123 456 789</div>
                        </div>
                    </div>
                    <div class="meta" style="text-align:right">
                        <div><strong>HÓA ĐƠN CHECKOUT</strong></div>
                        <div class="small">Mã: ${invoice.bookingId}</div>
                        <div class="small">${new Date().toLocaleString('vi-VN')}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="row">
                        <div>
                            <div><strong>Khách hàng</strong></div>
                            <div>${invoice.customerName || ''}</div>
                            <div class="small">SĐT: ${invoice.phone || ''}</div>
                        </div>
                        <div>
                            <div><strong>Thông tin phòng</strong></div>
                            <div>Phòng: ${invoice.roomNumber || ''}</div>
                            <div class="small">Nhận: ${invoice.checkInDate || '-'} • Trả: ${invoice.checkOutDate || '-'}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <table>
                        <thead>
                            <tr><th>Mô tả</th><th class="right">Số lượng</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Tiền phòng</td>
                                <td class="right">1</td>
                                <td class="right">${formatCurrency(invoice.roomCharge || 0)}</td>
                                <td class="right">${formatCurrency(invoice.roomCharge || 0)}</td>
                            </tr>
                            ${invoice.serviceCharge > 0 ? `
                            <tr>
                                <td>Tiền dịch vụ</td>
                                <td class="right">-</td>
                                <td class="right">-</td>
                                <td class="right">${formatCurrency(invoice.serviceCharge)}</td>
                            </tr>` : ''}
                            ${invoice.extraCharge > 0 ? `
                            <tr>
                                <td>Phụ thu / Đền bù thiết bị</td>
                                <td class="right">-</td>
                                <td class="right">-</td>
                                <td class="right">${formatCurrency(invoice.extraCharge)}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </div>

                <div class="totals">
                    <div class="box">
                        <div class="line"><div class="small">Tổng trước thuế</div><div>${formatCurrency((invoice.roomCharge||0)+(invoice.serviceCharge||0)+(invoice.extraCharge||0))}</div></div>
                        <div class="line grand"><div>TỔNG CẦN THU</div><div>${formatCurrency(invoice.totalToPay||0)}</div></div>
                    </div>
                </div>

                <div class="section" style="margin-top:22px; display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <div class="small">Phương thức: ${invoice.paymentMethod || 'Tiền mặt'}</div>
                        <div class="small">Trạng thái: <strong>ĐÃ CHECKOUT</strong></div>
                    </div>
                    <div style="text-align:center">
                        <div class="small">Lễ tân thu tiền</div>
                        <div style="margin-top:36px">(Ký & ghi rõ họ tên)</div>
                    </div>
                </div>

                <div class="no-print" style="margin-top:18px; text-align:center">
                    <button onclick="window.print()" style="background:var(--primary); color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer">In lại</button>
                </div>
            </div>
        </body>
        </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    
    // Delay để render hoàn thành trước khi in
    setTimeout(() => { 
        try { 
            win.print(); 
        } catch (e) { 
            console.warn('Lỗi in:', e); 
        } 
    }, 600);
}

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