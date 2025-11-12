// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    loadDashboardData();
    setupEventListeners();
    setDefaultCheckInTime();
});
// Check user login
function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");

    if (!currentUser) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
        return;
    }

    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.name || user.username;
    }

    console.log(`✅ Đăng nhập: ${user.username} (${user.name})`);
}

// Setup event listeners
function setupEventListeners() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Logout
    const logoutBtn = document.querySelector('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                console.log("✅ Đã xóa currentUser, chuẩn bị chuyển hướng...");
                window.location.href = '../login.html';
            }
        });
    } else {
        console.warn("⚠️ Không tìm thấy nút logout!");
    }


    // Close modal on outside click
    const modal = document.getElementById('checkInModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCheckInModal();
            }
        });
    }

    // Search on Enter key
    const searchInputs = ['searchBookingCode', 'searchPhone', 'searchName'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchBooking();
                }
            });
        }
    });
}

// Load dashboard data
function loadDashboardData() {
    // Load summary statistics
    fetch("https://localhost:7076/api/Dashboard/letan")
        .then(res => res.json())
        .then(data => {
            document.getElementById("totalRooms").innerText = data.tongSoPhong;
            document.getElementById("availableRooms").innerText = data.phongTrong;
            document.getElementById("occupiedRooms").innerText = data.phongDangO;
            document.getElementById("todayCheckIn").innerText = data.checkInHomNay;
            document.getElementById("todayCheckOut").innerText = data.checkOutHomNay;
        })
        .catch(err => console.error("Lỗi tải thống kê dashboard:", err));

    // Load check-in/check-out details
    loadCheckInCheckOutDetails();
}

// Load check-in and check-out details
function loadCheckInCheckOutDetails() {
    fetch("https://localhost:7076/api/Dashboard/letan/chitiet")
        .then(res => res.json())
        .then(data => {
            console.log("Dữ liệu API:", data);

            // Check-in hôm nay
            let checkinRows = '';
            data.checkInHomNay.forEach(item => {
                checkinRows += `
                    <tr>
                        <td>${item.maDatPhong}</td>
                        <td>${item.khachHang}</td>
                        <td>${item.phong}</td>
                        <td>${item.gioNhan ?? ''}</td>
                        <td>${item.trangThai}</td>
                    </tr>`;
            });
            document.getElementById("checkInList").innerHTML = checkinRows;

            // Check-out hôm nay
            let checkoutRows = '';
            data.checkOutHomNay.forEach(item => {
                checkoutRows += `
                    <tr>
                        <td>${item.maDatPhong}</td>
                        <td>${item.khachHang}</td>
                        <td>${item.phong}</td>
                        <td>${item.gioTra ?? ''}</td>
                        <td>${item.trangThai}</td>
                    </tr>`;
            });
            document.getElementById("checkOutList").innerHTML = checkoutRows;
        })
        .catch(err => console.error("Lỗi tải chi tiết check-in/out:", err));
}

// Set default check-in time to current time
function setDefaultCheckInTime() {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5); // HH:MM format

    const checkInTimeInput = document.getElementById('checkInTime');
    if (checkInTimeInput) {
        checkInTimeInput.value = timeString;
    }
}

// Close check-in modal
function closeCheckInModal() {
    const modal = document.getElementById('checkInModal');
    if (modal) {
        modal.style.display = 'none';
    }
}