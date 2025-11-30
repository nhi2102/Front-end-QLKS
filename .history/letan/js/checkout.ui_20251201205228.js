// ===============================
// checkout.ui.js
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    setupEventListeners();
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
    const logoutBtn = document.querySelector('.nav-item.logout');
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

    // Lấy thông tin giảm giá bằng điểm
    await loadDiscountPointInfo(booking.maDatPhong);

    calculateTotal(booking.maDatPhong);



}
async function handleEquipmentStatusChange() {
    const status = document.getElementById("equipmentStatus").value;
    const equipmentGroup = document.getElementById("equipmentCheckGroup");
    const listContainer = document.getElementById("equipmentCheckList");

    if (status === "damaged") {
        equipmentGroup.style.display = "block";
        listContainer.innerHTML = `<div class="loading"> Đang tải danh sách thiết bị...</div>`;

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
            const roomList = ((currentBooking && (currentBooking.danhSachPhong || currentBooking.DanhSachPhong)) || []);

            const roomCheckboxes = roomList.map(p => `
                <label style="display:inline-flex;align-items:center;gap:5px;margin-right:15px;">
                    <input type="checkbox" class="room-check" value="${p.MaPhong || p.maPhong}">
                    <span>${p.SoPhong || p.soPhong}</span>
                </label>
            `).join('');

            // Đổ danh sách thiết bị ra giao diện
            listContainer.innerHTML = equipments.map(eq => `
                <div class="equipment-item" style="margin-bottom:12px;padding:10px;border:1px solid #e0e0e0;border-radius:5px;">
                    <label style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox"
                               class="equipment-check"
                               value="${eq.maThietBi || eq.mathietbi}"
                               data-name="${eq.tenThietBi || eq.tenthietbi}"
                               data-price="${eq.donGia || eq.dongia || 0}"
                               onchange="handleEquipmentSelectionChange()">
                        <span style="font-weight:500;">${eq.tenThietBi || eq.tenthietbi}</span>
                        <span class="price" style="color:#666;">(${formatCurrency(eq.donGia || eq.dongia || 0)}/phòng)</span>
                    </label>
                    
                    <!-- Chọn nhiều phòng -->
                    <div class="equipment-extra" style="margin-left:25px;margin-top:8px;display:none;">
                        <div style="margin-bottom:8px;">
                            <strong>Phòng bị hư hỏng:</strong>
                            <div class="room-selection" style="margin-top:5px;">
                                ${roomCheckboxes || '<span style="color:#999;">Không có phòng</span>'}
                            </div>
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

// Thêm event listener cho checkbox phòng
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('room-check')) {
        handleEquipmentSelectionChange();
    }
});



function handleEquipmentSelectionChange() {
    const items = document.querySelectorAll('.equipment-item');

    items.forEach(item => {
        const checkbox = item.querySelector('.equipment-check');
        const extraFields = item.querySelector('.equipment-extra');

        if (checkbox.checked) {
            extraFields.style.display = 'block';
        } else {
            extraFields.style.display = 'none';
            // Bỏ chọn tất cả phòng khi bỏ tick thiết bị
            item.querySelectorAll('.room-check').forEach(rc => rc.checked = false);
        }
    });

    // Tính tổng tiền bồi thường
    let total = 0;
    document.querySelectorAll('.equipment-check:checked').forEach(cb => {
        const price = parseFloat(cb.dataset.price || 0);
        const item = cb.closest('.equipment-item');

        // Đếm số phòng được chọn
        const selectedRooms = item.querySelectorAll('.room-check:checked');
        const roomCount = selectedRooms.length;

        // Tổng tiền = đơn giá × số phòng
        total += price * roomCount;
    });

    // Gán tổng vào phần hiển thị và lưu dataset
    const compEl = document.getElementById('equipmentCompensation');
    if (compEl) {
        compEl.textContent = formatCurrency(total);
        compEl.dataset.value = total;
    }

    if (currentBooking) {
        calculateTotal(currentBooking.maDatPhong);
    }
}






//  Tính tổng tiền
async function calculateTotal(maDatPhong) {
    try {
        // --- 1️ Lấy tiền còn thiếu ---
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

        // --- 2️ Lấy thông tin hóa đơn để tính tổng và đã thanh toán ---
        let grandTotal = 0;
        let paidAmount = 0;

        try {
            const billResponse = await fetch(`https://localhost:7076/api/Hoadons`);
            if (billResponse.ok) {
                const allBills = await billResponse.json();
                const bill = allBills.find(b => b.madatphong == maDatPhong);

                if (bill) {
                    console.log('Hóa đơn tìm thấy:', bill);

                    // Tổng tiền - thử nhiều tên trường
                    grandTotal = bill.tongtien || bill.tongTien || bill.TongTien || 0;

                    console.log('Tổng tiền hóa đơn:', grandTotal);

                    // Lấy tiền đã thanh toán từ API payment
                    try {
                        const paymentResponse = await fetch(`https://localhost:7076/api/payment`);
                        if (paymentResponse.ok) {
                            const allPayments = await paymentResponse.json();
                            // Lọc các thanh toán của hóa đơn này
                            const billPayments = allPayments.filter(p =>
                                (p.mahoadon || p.maHoaDon || p.MaHoaDon) === bill.mahoadon
                            );

                            // Tính tổng số tiền đã thanh toán
                            paidAmount = billPayments.reduce((sum, p) =>
                                sum + (p.sotien || p.soTien || p.SoTien || 0), 0
                            );

                            console.log('Các khoản thanh toán:', billPayments);
                            console.log('Tổng đã thanh toán:', paidAmount);
                        }
                    } catch (paymentError) {
                        console.error('Lỗi khi lấy thông tin thanh toán:', paymentError);
                    }
                } else {
                    console.warn('Không tìm thấy hóa đơn cho booking:', maDatPhong);
                }
            }
        } catch (error) {
            console.error('Lỗi khi lấy thông tin hóa đơn:', error);
        }

        // --- 3️ Lấy các khoản phụ thu ---
        const equipmentEl = document.getElementById('equipmentCompensation');
        const equipmentCompensation = equipmentEl ? parseFloat(equipmentEl.dataset.value || 0) : 0;

        // --- 4️ Tính toán tổng tiền ---
        // Tổng hóa đơn bao gồm cả phụ thu thiết bị mới
        const totalWithEquipment = grandTotal + equipmentCompensation;

        // Tổng tiền cần thanh toán = còn lại + phụ thu mới
        const totalUnpaid = remainingAmount + equipmentCompensation;

        // --- 5️ Hiển thị kết quả ---
        const grandTotalEl = document.getElementById('grandTotal');
        const paidAmountEl = document.getElementById('paidAmount');
        const totalAmountEl = document.getElementById('totalAmount');

        if (grandTotalEl) {
            grandTotalEl.textContent = formatCurrency(totalWithEquipment);
        }

        if (paidAmountEl) {
            paidAmountEl.textContent = formatCurrency(paidAmount);
        }

        if (totalAmountEl) {
            totalAmountEl.textContent = formatCurrency(totalUnpaid);
        }

        console.log(' Tổng cộng:', {
            grandTotal,
            equipmentCompensation,
            totalWithEquipment,
            paidAmount,
            remainingAmount,
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
        // Lấy mã nhân viên từ currentUser
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const manv = currentUser.manv || currentUser.maNV || currentUser.id || 1;

        console.log(' Nhân viên checkout:', currentUser);
        console.log(' Mã nhân viên:', manv);

        // 1️ Lấy danh sách thiết bị hư hỏng từ giao diện
        const damagedItems = [];
        document.querySelectorAll('.equipment-check:checked').forEach(cb => {
            const item = cb.closest('.equipment-item');
            const selectedRooms = item.querySelectorAll('.room-check:checked');

            // Tạo 1 bản ghi đền bù cho mỗi phòng được chọn
            selectedRooms.forEach(roomCheckbox => {
                damagedItems.push({
                    mathietbi: cb.value,
                    madatphong: bookingId,
                    soluong: 1, // Mỗi phòng 1 thiết bị
                    maphong: roomCheckbox.value,
                    manv: manv
                });
            });
        });

        // 2 Gọi API tạo đền bù cho từng thiết bị
        for (const item of damagedItems) {
            console.log(' Tạo đền bù thiết bị:', item);
            await CheckoutAPI.createDamageCompensation(item);
        }

        //  Sau khi xong đền bù, gọi Checkout với mã nhân viên
        console.log(' Checkout với mã nhân viên:', manv);
        const res = await CheckoutAPI.executeCheckout(bookingId, manv);
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
        // Lấy thông tin nhân viên checkout
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const receptionistName = currentUser.hoten || currentUser.hoTen || currentUser.name || 'Lễ tân';

        // Thu thập thông tin hóa đơn
        const equipmentEl = document.getElementById('equipmentCompensation');
        const equipmentCompensation = equipmentEl ? parseFloat(equipmentEl.dataset.value || 0) : 0;

        // Lấy tiền dịch vụ từ giao diện
        const serviceChargeEl = document.getElementById('serviceCharge');
        const serviceChargeText = serviceChargeEl ? serviceChargeEl.textContent : '0 ₫';
        const serviceCharge = parseCurrency(serviceChargeText);

        const totalAmountEl = document.getElementById('totalAmount');
        const totalAmountText = totalAmountEl ? totalAmountEl.textContent : '0 ₫';
        const totalAmount = parseCurrency(totalAmountText);

        // Lấy chi tiết dịch vụ từ API
        const services = await CheckoutAPI.getServiceHistory(booking.maDatPhong);
        const pendingServices = services.chuaThanhToan || [];

        const invoiceData = {
            bookingId: booking.maDatPhong,
            customerName: booking.tenKhachHang,
            phone: booking.soDienThoai,
            roomNumber: booking.phong,
            checkInDate: formatDate(booking.ngayNhanPhong),
            checkOutDate: formatDate(booking.ngayTraPhong),
            roomCharge: originalRoomCharge,
            serviceCharge: serviceCharge,
            services: pendingServices, // Chi tiết dịch vụ
            extraCharge: equipmentCompensation, // Tiền đền bù thiết bị
            discount: 0,
            totalToPay: totalAmount,
            paymentMethod: 'Tiền mặt',
            receptionistName: receptionistName // Thêm tên lễ tân
        };

        console.log(' In hóa đơn checkout:', invoiceData);

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

// Print invoice helper - sử dụng format giống phiếu đặt phòng
function printInvoiceNow(invoice) {
    const win = window.open('', '_blank');
    if (!win) {
        alert('Không thể mở cửa sổ in (popup bị chặn)');
        return;
    }

    const html = `
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Hóa đơn Checkout - ${invoice.bookingId}</title>
            <style>
                @media print {
                    @page { margin: 0.5in; }
                    .no-print { display: none !important; }
                }
                body { 
                    font-family: 'Times New Roman', serif; 
                    color: #000; 
                    margin: 0; 
                    padding: 20px; 
                    background: #fff; 
                }
                .container { 
                    width: 800px; 
                    margin: 0 auto; 
                    background: #fff; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                }
                th, td { 
                    padding: 8px; 
                    text-align: left; 
                }
                .border-table { 
                    border: 1px solid #000; 
                }
                .border-table th, .border-table td { 
                    border: 1px solid #000; 
                    padding: 8px; 
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .bg-light { background-color: #f8f8f8; }
                h2, h3, h4 { margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px;">
                    <img src="../assets/img/logo.jpg" alt="Hotel Logo" style="height:90px; display:block; margin:auto;">
                    <h2 style="margin:5px 0 0 0;">KHÁCH SẠN THANH TRÀ</h2>
                    <p style="margin:0;">Địa chỉ: 123 Nguyễn Huệ, TP.HCM | Điện thoại: (028) 1234 5678</p>
                </div>

                <h3 class="text-center">HÓA ĐƠN THANH TOÁN - CHECKOUT</h3>

                <!-- Thông tin booking -->
                <table style="margin-bottom:20px;">
                    <tr>
                        <td><strong>Mã Booking:</strong> ${invoice.bookingId}</td>
                        <td><strong>Ngày Checkout:</strong> ${new Date().toLocaleDateString('vi-VN')}</td>
                    </tr>
                    <tr>
                        <td><strong>Trạng Thái:</strong> <span style="color: #28a745; font-weight: bold;">ĐÃ CHECKOUT</span></td>
                        <td><strong>Thanh Toán:</strong> ${invoice.paymentMethod || 'Tiền mặt'}</td>
                    </tr>
                </table>

                <!-- Thông tin khách hàng -->
                <h4>I. THÔNG TIN KHÁCH HÀNG</h4>
                <table style="margin-bottom:20px;">
                    <tr>
                        <td><strong>Họ tên:</strong> ${invoice.customerName || ''}</td>
                    </tr>
                    <tr>
                        <td><strong>Số điện thoại:</strong> ${invoice.phone || ''}</td>
                    </tr>
                </table>

                <!-- Thông tin phòng -->
                <h4>II. THÔNG TIN PHÒNG</h4>
                <table class="border-table text-center" style="margin-bottom:20px;">
                    <thead style="background-color:#f3f3f3;">
                        <tr>
                            <th>Số Phòng</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${invoice.roomNumber || ''}</td>
                            <td>${invoice.checkInDate || '-'}</td>
                            <td>${invoice.checkOutDate || '-'}</td>
                            <td style="color: #28a745; font-weight: bold;">Đã trả phòng</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Chi tiết dịch vụ sử dụng -->
                ${invoice.services && invoice.services.length > 0 ? `
                <h4>III. CHI TIẾT DỊCH VỤ SỬ DỤNG</h4>
                <table class="border-table">
                    <thead style="background-color:#f3f3f3;">
                        <tr>
                            <th>Tên dịch vụ</th>
                            <th class="text-center">Số lượng</th>
                            <th class="text-right">Đơn giá</th>
                            <th class="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.services.map(service => `
                        <tr>
                            <td>${service.tenDichVu || service.TenDichVu || '-'}</td>
                            <td class="text-center">${service.soLuong || service.SoLuong || 1}</td>
                            <td class="text-right">${formatCurrency(service.donGia || service.DonGia || 0)}</td>
                            <td class="text-right">${formatCurrency(service.thanhTien || service.ThanhTien || 0)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : ''}

                <!-- Chi tiết thanh toán -->
                <h4>${invoice.services && invoice.services.length > 0 ? 'IV' : 'III'}. CHI TIẾT THANH TOÁN</h4>
                <table class="border-table">
                    <tr>
                        <td><strong>Tiền phòng:</strong></td>
                        <td class="text-right">${formatCurrency(invoice.roomCharge || 0)}</td>
                    </tr>
                    ${invoice.serviceCharge > 0 ? `
                    <tr>
                        <td><strong>Tổng tiền dịch vụ:</strong></td>
                        <td class="text-right">${formatCurrency(invoice.serviceCharge)}</td>
                    </tr>` : ''}
                    ${invoice.extraCharge > 0 ? `
                    <tr>
                        <td><strong>Phụ thu / Đền bù thiết bị:</strong></td>
                        <td class="text-right">${formatCurrency(invoice.extraCharge)}</td>
                    </tr>` : ''}
                    <tr class="bg-light bold">
                        <td>TỔNG CỘNG</td>
                        <td class="text-right">${formatCurrency(invoice.totalToPay || 0)}</td>
                    </tr>
                </table>

                <p style="margin-top:20px;"><strong>Ghi chú:</strong> Khách hàng đã hoàn tất checkout và thanh toán đầy đủ.</p>

                <!-- Chữ ký -->
                <div style="margin-top:50px; display:flex; justify-content:space-between; text-align:center;">
                    <div>
                        <strong>Khách hàng</strong><br><br><br>
                        <span>______________________</span><br>
                        <span style="font-size:12px;">${invoice.customerName || ''}</span>
                    </div>
                    <div>
                        <strong>Lễ tân</strong><br><br><br>
                        <span>______________________</span><br>
                        <span style="font-size:12px;">${invoice.receptionistName || ''}</span>
                    </div>
                </div>

                <p style="text-align:right; margin-top:30px; font-style:italic;">
                    Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}
                </p>

                <!-- Nút in (ẩn khi in) -->
                <div class="no-print" style="margin-top:20px; text-align:center;">
                    <button onclick="window.print()" style="background:#007bff; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-size:14px;">
                         In lại
                    </button>
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

// Lấy thông tin giảm giá bằng điểm từ chi tiết hóa đơn
async function loadDiscountPointInfo(bookingId) {
    try {
        // Ẩn dòng giảm giá mặc định
        const discountRow = document.getElementById('discountPointRow');
        const discountSpan = document.getElementById('discountPoint');
        
        if (!discountRow || !discountSpan) return;
        
        discountRow.style.display = 'none';
        discountSpan.textContent = '-';

        // Lấy hóa đơn của booking này
        const billResponse = await fetch(`https://localhost:7076/api/Hoadons`);
        if (!billResponse.ok) return;
        
        const allBills = await billResponse.json();
        const bill = allBills.find(b => b.madatphong == bookingId);
        
        if (!bill) return;

        // Lấy chi tiết hóa đơn
        const detailResponse = await fetch(`https://localhost:7076/api/Chitiethoadons`);
        if (!detailResponse.ok) return;
        
        const allDetails = await detailResponse.json();
        const billDetails = allDetails.filter(d => d.mahoadon === bill.mahoadon);
        
        // Tìm dòng giảm giá bằng điểm
        let totalDiscount = 0;
        for (const detail of billDetails) {
            if (detail.loaiphi && detail.loaiphi.toLowerCase().includes('điểm')) {
                totalDiscount += Math.abs(detail.dongia || 0);
            }
        }
        
        // Hiển thị nếu có giảm giá
        if (totalDiscount > 0) {
            discountRow.style.display = 'flex';
            discountSpan.textContent = '- ' + formatCurrency(totalDiscount);
        }
        
    } catch (error) {
        console.error('Lỗi khi lấy thông tin giảm giá:', error);
    }
}

//  Modal close
function closeCheckOutModal() {
    document.getElementById('checkOutModal').classList.remove('show');
}