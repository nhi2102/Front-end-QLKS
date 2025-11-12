// ============================================
// BIẾN TOÀN CỤC
// ============================================
let currentBooking = null;
let selectedNewRoom = null;
let availableRooms = [];
let allRoomTypes = [];

// ============================================
// KHỞI TẠO SAU KHI DOM SẴN SÀNG
// ============================================
document.addEventListener("DOMContentLoaded", async() => {
    try {
        initializeEventListeners();
        checkUserLogin();
        setupEventListeners();
        await loadRoomTypes();

        const btnFindNew = document.getElementById("btnFindByNewDate");
        if (btnFindNew) btnFindNew.addEventListener("click", findRoomsByNewDate);
    } catch (err) {
        console.error("Lỗi khởi tạo giao diện:", err);
    }
});

// ============================================
// KHỞI TẠO CÁC SỰ KIỆN
// ============================================
function initializeEventListeners() {
    const btnSearch = document.getElementById("searchBookingBtn");
    if (btnSearch) btnSearch.addEventListener("click", searchBookings);

    const searchInput = document.getElementById("searchValue");
    if (searchInput)
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") searchBookings();
        });

    const cancelBtn = document.getElementById("cancelChangeBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", resetForm);

    const confirmBtn = document.getElementById("confirmChangeBtn");
    if (confirmBtn)
        confirmBtn.addEventListener("click", async() => {
            try {
                const payload = {
                    maDatPhong: currentBooking ? .madatphong || currentBooking ? .id,
                    maPhongCu: currentBooking ? .currentRoomId,
                    maPhongMoi: selectedNewRoom ? .maphong,
                    lyDo: document.getElementById("changeReason") ? .value || "Không rõ lý do",
                    nguoiThucHien: document.getElementById("userName") ? .textContent || "Nhân viên",
                };

                const result = await RoomChangeAPI.changeRoomAPI(payload);
                alert(result.message || "Đổi phòng thành công!");
                resetForm();
            } catch (err) {
                console.error("Lỗi đổi phòng:", err);
                alert("Không thể đổi phòng: " + err.message);
            }
        });
}

// ============================================
// HIỂN THỊ THÔNG TIN PHÒNG ĐANG Ở
// ============================================
function displayCurrentBookingInfo(booking, details, customer) {
    const info = document.getElementById("currentRoomDetails");
    if (!info) return;

    if (!details || details.length === 0) {
        info.innerHTML = `<p>Không tìm thấy thông tin phòng hiện tại.</p>`;
        return;
    }

    let html = `
        <p><b>Khách hàng:</b> ${customer.hoten}</p>
        <p><b>Mã đặt phòng:</b> ${booking.madatphong}</p>
        <hr><p>Chọn phòng muốn đổi:</p>
    `;

    details.forEach((d) => {
        const room = d.phong || d.maphongNavigation || {};
        const loai = room.loaiPhong || room.maloaiphongNavigation || {};

        html += `
        <div class="room-info-block" id="room-${d.machitiet}">
            <div class="room-header-line">
                <h5>Phòng ${room.sophong || "N/A"} - ${
            loai.tenloaiphong || "Không rõ loại"
        }</h5>
                <button class="btn btn-sm btn-outline-primary" onclick="selectRoomToChange(${d.machitiet})">
                    <i class="fas fa-check"></i> Chọn
                </button>
            </div>
            <p><b>Giá/đêm:</b> ${formatCurrency(loai.giacoban)}</p>
        </div><hr>`;
    });

    info.innerHTML = html;
    currentBooking.roomDetails = details;
}

// ============================================
// CHỌN PHÒNG HIỆN TẠI ĐỂ ĐỔI
// ============================================
window.selectRoomToChange = async function(detailId) {
    document.querySelectorAll(".room-info-block").forEach((div) =>
        div.classList.remove("selected-room")
    );

    const selectedDiv = document.getElementById(`room-${detailId}`);
    if (selectedDiv) selectedDiv.classList.add("selected-room");

    const detail = currentBooking.roomDetails.find(
        (d) => d.machitiet === detailId
    );
    if (!detail) return alert("Không tìm thấy chi tiết phòng này!");

    const room = detail.phong || detail.maphongNavigation || {};
    const loai = room.loaiPhong || room.maloaiphongNavigation || {};

    currentBooking.currentRoomDetailId = detailId;
    currentBooking.currentRoomId = room.maphong;
    currentBooking.currentRoomPrice = loai.giacoban || 0;

    await loadAvailableRooms(currentBooking);

    const availableSection = document.querySelector(".available-rooms-section");
    if (availableSection) availableSection.style.display = "block";
};

// ============================================
// HIỂN THỊ DANH SÁCH PHÒNG TRỐNG
// ============================================
function displayAvailableRooms(rooms) {
    const list = document.getElementById("availableRoomsList");
    if (!list) return;
    list.innerHTML = "";

    rooms.forEach((r) => {
        const loai = r.loaiPhong || r.maloaiphongNavigation || {};
        const div = document.createElement("div");
        div.className = "room-card";
        div.innerHTML = `
            <div class="room-card-header">
                Phòng ${r.sophong || "N/A"} - ${loai.tenloaiphong || "Không rõ loại"}
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

// ============================================
// CHỌN PHÒNG MỚI ĐỂ ĐỔI
// ============================================
window.selectNewRoom = function(id) {
    selectedNewRoom = availableRooms.find((r) => r.maphong === id);
    calculatePriceAdjustment();
    const confirmBtn = document.getElementById("confirmChangeBtn");
    if (confirmBtn) confirmBtn.disabled = false;
};

// ============================================
// CÁC HÀM PHỤ TRỢ
// ============================================
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount || 0);
}

function showLoading(show) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = show ? "flex" : "none";
}

function resetForm() {
    currentBooking = null;
    selectedNewRoom = null;
    availableRooms = [];
    const confirmBtn = document.getElementById("confirmChangeBtn");
    if (confirmBtn) confirmBtn.disabled = true;
    document.getElementById("changeReason").value = "";
}