// ============================
//  checkout.ui.js
// ============================

// --- Khởi tạo trang ---
document.addEventListener('DOMContentLoaded', async() => {
    console.log("🔹 Trang checkout đã load");
    await loadCheckouts();
    const btnSearch = document.getElementById('searchBtn');
    if (btnSearch) btnSearch.addEventListener('click', searchCheckout);
});

// --- Hiển thị danh sách checkout ---
async function loadCheckouts() {
    try {
        const bookings = await fetchPendingCheckouts();
        displayBookings(bookings);
    } catch (e) {
        console.error(e);
        showError('Không thể tải danh sách khách chuẩn bị checkout.');
    }
}

function displayBookings(bookings) {
    const tbody = document.getElementById('checkoutList');
    if (!tbody) return;

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Không có khách checkout hôm nay</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.maDatPhong}</td>
            <td>${b.tenKhachHang}</td>
            <td>${b.soDienThoai || '-'}</td>
            <td>${b.soPhong || '-'}</td>
            <td>${formatDate(b.ngayNhanPhong)}</td>
            <td>${formatDate(b.ngayTraPhong)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openCheckOutModal(${b.maDatPhong})">
                    <i class="fas fa-door-open"></i> Checkout
                </button>
            </td>
        </tr>
    `).join('');
}

// --- Mở modal checkout ---
window.openCheckOutModal = async function(bookingId) {
    const modal = document.getElementById('checkOutModal');
    if (!modal) return;
    modal.classList.add('show');

    document.getElementById('modalBookingCode').textContent = bookingId;
    document.getElementById('damageList').innerHTML = `<tr><td colspan="4">Đang tải...</td></tr>`;

    try {
        // 1️⃣ Tiền dịch vụ chưa thanh toán
        const serviceCharge = await calculateTotalServiceAmount(bookingId);
        document.getElementById('serviceCharge').textContent = formatCurrency(serviceCharge);

        // 2️⃣ Tiền đền bù thiệt hại
        const damageList = await fetchDamageCompensation(bookingId);
        const tableBody = document.getElementById('damageList');
        let totalDamage = 0;

        if (damageList.length > 0) {
            tableBody.innerHTML = damageList.map((d, i) => {
                const thanhTien = (d.soluong || 0) * (d.dongia || 0);
                totalDamage += thanhTien;
                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${d.tenThietBi || d.mathietbi || 'Thiết bị'}</td>
                        <td>${d.soluong}</td>
                        <td>${formatCurrency(thanhTien)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-muted">Không có thiệt hại nào</td></tr>`;
        }

        document.getElementById('damageCharge').textContent = formatCurrency(totalDamage);

        updateTotal();

    } catch (error) {
        console.error("❌ Lỗi khi tải thông tin checkout:", error);
        alert("Không thể tải dữ liệu checkout: " + error.message);
    }
};

// --- Tính tổng tiền ---
function updateTotal() {
    const serviceCharge = parseFloat(document.getElementById('serviceCharge').textContent.replace(/[^\d]/g, '')) || 0;
    const damageCharge = parseFloat(document.getElementById('damageCharge').textContent.replace(/[^\d]/g, '')) || 0;
    const extra = parseFloat(document.getElementById('extraCharge').value || 0);
    const discount = parseFloat(document.getElementById('discount').value || 0);

    const total = computeTotal(serviceCharge + damageCharge, extra, discount);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// --- Ghi nhận đền bù ---
window.addDamage = async function() {
    const bookingId = document.getElementById('modalBookingCode').textContent;
    const deviceId = document.getElementById('damageDevice').value;
    const quantity = parseInt(document.getElementById('damageQty').value || 1);
    const roomId = document.getElementById('roomId').value || null;

    if (!deviceId) {
        alert("Vui lòng chọn thiết bị bị hư hỏng!");
        return;
    }

    try {
        await createDamageCompensation({
            Mathietbi: deviceId,
            Madatphong: bookingId,
            Soluong: quantity,
            Maphong: roomId
        });

        alert("✅ Ghi nhận đền bù thành công!");
        openCheckOutModal(bookingId); // tải lại modal
    } catch (error) {
        console.error(error);
        alert("❌ Lỗi khi ghi nhận đền bù: " + error.message);
    }
};

// --- Xác nhận checkout ---
window.confirmCheckOut = async function() {
    try {
        const bookingId = document.getElementById('modalBookingCode').textContent;
        const remaining = await getRemainingAmount(bookingId);

        await executeCheckout(bookingId);

        alert(`Checkout thành công!\nSố tiền còn thiếu: ${formatCurrency(remaining.sotienthieu)}`);
        closeCheckOutModal();
        await loadCheckouts();
    } catch (error) {
        console.error(error);
        alert("❌ Lỗi khi thực hiện checkout: " + error.message);
    }
};

// --- Đóng modal ---
window.closeCheckOutModal = function() {
    const modal = document.getElementById('checkOutModal');
    if (modal) modal.classList.remove('show');
};

// --- Tìm kiếm ---
async function searchCheckout() {
    const term = document.getElementById('searchName').value.trim();
    const all = await fetchPendingCheckouts();
    const filtered = all.filter(b =>
        b.tenKhachHang ? .toLowerCase().includes(term.toLowerCase())
    );
    displayBookings(filtered);
}

// --- Hiển thị lỗi ---
function showError(msg) {
    const tbody = document.getElementById('checkoutList');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="error">${msg}</td></tr>`;
}