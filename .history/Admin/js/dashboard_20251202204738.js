import { apiGetDashboardData, apiGetDatPhongs, apiGetRevenueLast7Days } from '../api/dashboard.api.js';

document.addEventListener('DOMContentLoaded', async() => {
    const roomStatusCanvas = document.getElementById('roomStatusChart');
    const revenueCanvas = document.getElementById('revenueChart');

    if (!roomStatusCanvas || !revenueCanvas) return;

    try {
        console.log("Đang tải dữ liệu Dashboard...");

        // GỌI 3 API SONG SONG
        const [dashboardData, datphongs, revenueData] = await Promise.all([
            apiGetDashboardData(),
            apiGetDatPhongs(),
            apiGetRevenueLast7Days()
        ]);

        const { summary } = dashboardData;

        // CẬP NHẬT TẤT CẢ
        updateSummaryStats(summary, datphongs);
        drawRoomStatusChart(summary);
        drawRevenueChart(revenueData); // ← TRUYỀN DỮ LIỆU THỰC

    } catch (error) {
        console.error("Lỗi tải dữ liệu Dashboard:", error);
        showError(roomStatusCanvas, "Lỗi tải biểu đồ phòng.");
        showError(revenueCanvas, "Lỗi tải biểu đồ doanh thu.");
    }


    const userInfo = JSON.parse(localStorage.getItem('currentUserInfo')) || JSON.parse(localStorage.getItem('currentUser'));
    const userNameDisplay = document.getElementById('user-display-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userInfo && userNameDisplay) {
        userNameDisplay.textContent = userInfo.name || userInfo.username || 'User';
    }
    // Optionally update avatar based on first letter
    if (userInfo && (userInfo.name || userInfo.username) && userAvatar) {
        const nameString = userInfo.name || userInfo.username;
        const firstLetter = nameString.charAt(0).toUpperCase();
        userAvatar.src = `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;
        userAvatar.alt = `Avatar for ${nameString}`;
    }
});



// === CẬP NHẬT SỐ LIỆU (LỄ TÂN + ĐẶT PHÒNG MỚI) ===
function updateSummaryStats(data, datphongs = []) {
    const {
        tongSoPhong = 0,
            phongTrong = 0,
            phongDangO = 0,
            checkInHomNay = 0,
            checkOutHomNay = 0
    } = data;

    // 1. DỮ LIỆU LỄ TÂN
    setText('daily-checkin', checkInHomNay);
    setText('daily-checkout', checkOutHomNay);
    setText('daily-occupancy', `${phongDangO} / ${tongSoPhong}`);

    // 2. ĐẶT PHÒNG MỚI HÔM NAY
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const newBookingsToday = datphongs.filter(dp => dp.ngaydat === today).length;

    setText('daily-new-bookings', newBookingsToday);
}

// === BIỂU ĐỒ TRÒN: TRẠNG THÁI PHÒNG (TỪ LỄ TÂN) ===
function drawRoomStatusChart(data) {
    const { tongSoPhong = 0, phongTrong = 0, phongDangO = 0 } = data;
    const phongDatTruoc = Math.max(0, tongSoPhong - phongTrong - phongDangO);

    const ctx = document.getElementById('roomStatusChart').getContext('2d');

    // Đăng ký plugin (chỉ cần 1 lần)
    if (!Chart.registry.plugins.get('datalabels')) {
        Chart.register(ChartDataLabels);
    }

    // Hủy biểu đồ cũ nếu có
    if (window.roomChart) window.roomChart.destroy();

    window.roomChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Phòng trống', 'Đang sử dụng', 'Đã đặt trước'],
            datasets: [{
                data: [phongTrong, phongDangO, phongDatTruoc],
                backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { enabled: true }, // Vẫn giữ tooltip khi hover (tùy chọn)
                datalabels: {
                    color: 'white',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: (value) => {
                        return value > 0 ? value : ''; // Ẩn số 0
                    },
                    anchor: 'center',
                    align: 'center',
                    clamp: true // Giữ số trong biểu đồ
                }
            }
        },
        plugins: [ChartDataLabels] // Bật plugin
    });
}

// === BIỂU ĐỒ CỘT: DOANH THU 7 NGÀY (MẪU) ===
function drawRevenueChart(revenueData = []) {
    const canvas = document.getElementById('revenueChart');
    let ctx = null;
    if (canvas) {
        ctx = canvas.getContext('2d');
    }
    if (!ctx) return;

    if (window.revenueChartInstance) window.revenueChartInstance.destroy();

    const labels = [];
    const data = [];
    const today = new Date();
    const map = {};
    // DÒNG ĐÃ SỬA
    revenueData.forEach(d => map[d.date.split('T')[0]] = d.doanhThu);

    debugger;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        labels.push(d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }));
        const iso = d.toISOString().split('T')[0];
        data.push(map[iso] || 0);
    }

    window.revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Doanh thu (VND)',
                data,
                backgroundColor: 'rgba(40, 167, 69, 0.7)',
                borderColor: 'rgb(40, 167, 69)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M ₫` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K ₫` : `${v} ₫`
                    }
                }
            },
            tooltips: {
                callbacks: {
                    label: ctx => `Doanh thu: ${ctx.parsed.y.toLocaleString('vi-VN')} ₫`
                }
            }
        }
    });
}

// === HÀM HỖ TRỢ ===
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function showError(canvas, msg) {
    const parent = canvas.parentElement;
    if (parent) parent.innerHTML = `<p class="text-danger text-center">${msg}</p>`;
}

// DÁN VÀO dashboard.js – HÀM parseApiDate
function parseApiDate(dateStr) {
    if (!dateStr) return null;
    const normalized = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
}