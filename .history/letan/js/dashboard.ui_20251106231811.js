// js/dashboard.ui.js
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    loadDashboardData();
    setupEventListeners();
    setDefaultCheckInTime();
});


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
    if (userNameEl) {
        userNameEl.textContent = user.name || user.username;
    }

    console.log(`Đăng nhập: ${user.username} (${user.name})`);
}


//  Sự kiện giao diện

function setupEventListeners() {
    // Toggle menu
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    // Logout
    const logoutBtn = document.querySelector('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                console.log(" Đã xóa currentUser, chuyển hướng...");
                window.location.href = '../khachhang/login.html';
            }
        });
    } else {
        console.warn("Không tìm thấy nút logout!");
    }

    // Đóng modal khi click ra ngoài
    const modal = document.getElementById('checkInModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCheckInModal();
        });
    }

    // Enter để tìm kiếm
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

// =====================
//  Load dữ liệu Dashboard
// =====================
async function loadDashboardData() {
    try {
        const summary = await apiGetLeTanSummary();
        document.getElementById("totalRooms").innerText = summary.tongSoPhong;
        document.getElementById("availableRooms").innerText = summary.phongTrong;
        document.getElementById("occupiedRooms").innerText = summary.phongDangO;
        document.getElementById("todayCheckIn").innerText = summary.checkInHomNay;
        document.getElementById("todayCheckOut").innerText = summary.checkOutHomNay;
    } catch (err) {
        console.error("Lỗi tải thống kê dashboard:", err);
    }

    try {
        const details = await apiGetLeTanDetails();
        displayDashboardDetails(details);
    } catch (err) {
        console.error(" Lỗi tải chi tiết check-in/out:", err);
    }
}

// =====================
//  Hiển thị chi tiết Check-in / Check-out
// =====================
function displayDashboardDetails(data) {
    console.log(" Dữ liệu API:", data);

    // Check-in hôm nay
    const checkinRows = Array.isArray(data.checkInHomNay) ?
        data.checkInHomNay.map(item => `
            <tr>
                <td>${item.maDatPhong}</td>
                <td>${item.khachHang}</td>
                <td>${item.phong}</td>
                <td>${item.gioNhan || ''}</td>
                <td>${item.trangThai}</td>
            </tr>`).join('') :
        '';
    document.getElementById("checkInList").innerHTML = checkinRows;

    // Check-out hôm nay
    const checkoutRows = Array.isArray(data.checkOutHomNay) ?
        data.checkOutHomNay.map(item => `
            <tr>
                <td>${item.maDatPhong}</td>
                <td>${item.khachHang}</td>
                <td>${item.phong}</td>
                <td>${item.gioTra || ''}</td>
                <td>${item.trangThai}</td>
            </tr>`).join('') :
        '';
    document.getElementById("checkOutList").innerHTML = checkoutRows;
}

// =====================
// Thời gian mặc định
// =====================
function setDefaultCheckInTime() {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    const checkInTimeInput = document.getElementById('checkInTime');
    if (checkInTimeInput) checkInTimeInput.value = timeString;
}

// =====================
//  Đóng modal
// =====================
function closeCheckInModal() {
    const modal = document.getElementById('checkInModal');
    if (modal) modal.style.display = 'none';
}