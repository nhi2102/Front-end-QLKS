document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
    const logoutBtn = document.querySelector('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                console.log(" Đã xóa currentUser, chuyển hướng...");
                window.location.href = '../login.html';
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
    // Kiểm tra xem có đang ở trang dashboard không (dựa vào sự tồn tại của canvas)
    const roomStatusCanvas = document.getElementById('roomStatusChart');
    const revenueCanvas = document.getElementById('revenueChart');

    // Nếu không tìm thấy canvas -> không phải trang dashboard -> dừng lại
    if (!roomStatusCanvas || !revenueCanvas) {
        // console.log("Không tìm thấy canvas biểu đồ, bỏ qua việc vẽ."); // Debug log nếu cần
        return;
    }

    console.log("Đang ở trang Dashboard, bắt đầu vẽ biểu đồ..."); // Debug log

    // === Biểu đồ Tròn: Trạng thái phòng ===
    try {
        const roomCtx = roomStatusCanvas.getContext('2d');

        // --- DỮ LIỆU MẪU (Thay bằng cách gọi API) ---
        const roomData = {
            labels: ['Phòng trống', 'Đang sử dụng', 'Đã đặt trước'],
            datasets: [{
                label: 'Số lượng phòng',
                data: [12, 48, 5], // Ví dụ: 12 trống, 48 đang dùng, 5 đã đặt
                backgroundColor: [
                    'rgb(54, 162, 235)', // Xanh dương
                    'rgb(255, 205, 86)', // Vàng
                    'rgb(255, 99, 132)' // Đỏ
                ],
                hoverOffset: 4
            }]
        };
        // -----------------------------------------

        new Chart(roomCtx, {
            type: 'pie', // Loại biểu đồ tròn
            data: roomData,
            options: {
                responsive: true,
                maintainAspectRatio: false, // Cho phép biểu đồ co giãn
                plugins: {
                    legend: {
                        position: 'top', // Hiển thị chú thích ở trên
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
        console.log("Đã vẽ xong biểu đồ trạng thái phòng."); // Debug
    } catch (error) {
        console.error("Lỗi khi vẽ biểu đồ trạng thái phòng:", error);
        roomStatusCanvas.parentElement.innerHTML = '<p class="text-danger text-center">Lỗi tải biểu đồ trạng thái phòng.</p>';
    }

    // === Biểu đồ Cột: Doanh thu 7 ngày ===
    try {
        const revenueCtx = revenueCanvas.getContext('2d');

        // --- DỮ LIỆU MẪU (Thay bằng cách gọi API) ---
        // Lấy ngày hiện tại và 6 ngày trước đó
        const today = new Date();
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            // Format ngày dạng DD/MM
            labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
        }

        const revenueData = {
            labels: labels, // Nhãn là các ngày
            datasets: [{
                label: 'Doanh thu (VND)',
                // Dữ liệu doanh thu tương ứng (ví dụ)
                data: [12000000, 15500000, 13000000, 17000000, 16500000, 18000000, 21000000],
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Xanh dương nhạt
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        };
        // -----------------------------------------

        new Chart(revenueCtx, {
            type: 'bar', // Loại biểu đồ cột
            data: revenueData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true, // Bắt đầu trục Y từ 0
                        ticks: {
                            // Định dạng số tiền cho trục Y (ví dụ: 10,000,000)
                            callback: function(value, index, values) {
                                if (parseInt(value) >= 1000) {
                                    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                } else {
                                    return value;
                                }
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Ẩn chú thích (chỉ có 1 dataset)
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    // Định dạng số tiền trong tooltip
                                    label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
        console.log("Đã vẽ xong biểu đồ doanh thu."); // Debug
    } catch (error) {
        console.error("Lỗi khi vẽ biểu đồ doanh thu:", error);
        revenueCanvas.parentElement.innerHTML = '<p class="text-danger text-center">Lỗi tải biểu đồ doanh thu.</p>';
    }
});
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
    if (userNameEl) {
        userNameEl.textContent = user.name || user.username;
    }

    console.log(`Đăng nhập: ${user.username} (${user.name})`);
}