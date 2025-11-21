// js/reports.js
import { ReportAPI } from '../api/reports.api.js';

let revenueChart, topServicesChart, topRoomTypesChart;
let isLoading = false;

document.addEventListener('DOMContentLoaded', async() => {
    setupFilters();
    setupTabs();
    await loadReport(getDefaultDateRange());

    // Hiển thị tên user
    const userInfo = JSON.parse(localStorage.getItem('currentUserInfo')) || JSON.parse(localStorage.getItem('currentUser'));
    const userNameDisplay = document.getElementById('user-display-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userInfo && userNameDisplay) {
        userNameDisplay.textContent = userInfo.name || userInfo.username || 'User';
    }
    if (userInfo && userAvatar) {
        const firstLetter = (userInfo.name || userInfo.username || 'U').charAt(0).toUpperCase();
        userAvatar.src = `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;
    }
});

// Lấy khoảng thời gian mặc định: tháng hiện tại
function getDefaultDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDate(start), end: formatDate(end) };
}

// Cài đặt bộ lọc
function setupFilters() {
    const presetBtn = document.getElementById('preset-filter-btn');
    const presetValue = document.getElementById('preset-filter-value');
    const options = document.getElementById('preset-filter-options');
    const customGroup = document.getElementById('custom-range-group');
    const applyBtn = document.getElementById('apply-filter-btn');

    presetBtn.addEventListener('click', () => {
        options.style.display = options.style.display === 'block' ? 'none' : 'block';
    });

    options.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            const value = opt.dataset.value;
            presetValue.textContent = opt.textContent;
            options.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');

            if (value === 'custom') {
                customGroup.style.display = 'flex';
            } else {
                customGroup.style.display = 'none';
                applyBtn.click();
            }
            options.style.display = 'none';
        });
    });

    applyBtn.addEventListener('click', async() => {
        if (isLoading) return;
        let start, end;
        const activeOpt = document.querySelector('#preset-filter-options .custom-select-option.active');
        const preset = activeOpt ? (activeOpt.dataset.value || 'this-month') : 'this-month';

        if (preset !== 'custom') {
            const range = getPresetRange(preset);
            start = range.start;
            end = range.end;
        } else {
            start = document.getElementById('date-from').value;
            end = document.getElementById('date-to').value;
            if (!start || !end || start > end) {
                alert('Vui lòng chọn khoảng thời gian hợp lệ.');
                return;
            }
        }

        await loadReport({ start, end });
    });

    document.querySelector('[data-value="this-month"]').classList.add('active');
}

function getPresetRange(preset) {
    const now = new Date();
    let start, end;

    if (preset === 'this-month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'last-month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'this-quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    }

    return { start: formatDate(start), end: formatDate(end) };
}

// TẢI DỮ LIỆU – DOANH THU + TOP DỊCH VỤ
async function loadReport({ start, end }) {
    if (isLoading) return;
    isLoading = true;
    showLoading(true);

    try {
        const [revenueRes, topServices, topRoomTypes, reviews] = await Promise.all([
            ReportAPI.getRevenue(start, end),
            ReportAPI.getTopServices(5, start, end),
            ReportAPI.getTopRoomTypes(start, end),
            ReportAPI.getReviews()
        ]);

        updateKPI(revenueRes.summary.tongDoanhThu);
        renderRevenueTrend(revenueRes.data);
        renderTopServices(topServices);
        renderTopRoomTypes(topRoomTypes);
        renderReviews(reviews);
    } catch (err) {
        alert('Lỗi: ' + err.message);
        console.error(err);
    } finally {
        showLoading(false);
        isLoading = false;
    }
}

// CHUYỂN TAB
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).style.display = 'block';
        });
    });
}

// BIỂU ĐỒ DOANH THU THEO NGÀY
function renderRevenueTrend(data) {
    const ctx = document.getElementById('revenueTrendChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();

    if (!data || data.length === 0) {
        ctx.canvas.parentElement.innerHTML = `
            <div style="text-align:center; padding:60px; color:#999;">
                Không có dữ liệu doanh thu
            </div>`;
        return;
    }

    const labels = data.map(d => formatDateVN(d.date));
    const values = data.map(d => d.tongDoanhThu);

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Doanh thu',
                data: values,
                backgroundColor: 'rgba(255, 152, 0, 0.8)',
                borderColor: '#ff9800',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `Doanh thu: ${formatCurrency(ctx.raw)}` } },
                title: { display: true, text: 'DOANH THU THEO NGÀY', font: { size: 16, weight: 'bold' }, color: '#1a73e8' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: formatCurrency } },
                x: { ticks: { maxTicksLimit: 15 } }
            }
        }
    });
}

// BIỂU ĐỒ TOP DỊCH VỤ – ĐẸP LUNG LINH
function renderTopServices(services) {
    const ctx = document.getElementById('topServicesChart').getContext('2d');
    if (topServicesChart) topServicesChart.destroy();

    if (!services || services.length === 0) {
        ctx.canvas.parentElement.innerHTML = `
            <div style="text-align:center; padding:60px; color:#999;">
                Không có dữ liệu dịch vụ
            </div>`;
        return;
    }

    const labels = services.map(s => s.TenDichVu);
    const values = services.map(s => s.DoanhThu);

    topServicesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Doanh thu',
                data: values,
                backgroundColor: '#ff9800',
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.raw)}` } },
                title: { display: true, text: 'TOP DỊCH VỤ BÁN CHẠY', font: { size: 16, weight: 'bold' }, color: '#1a73e8' }
            },
            scales: {
                x: { ticks: { callback: formatCurrency } },
                y: { grid: { display: false } }
            }
        }
    });
}


// BIỂU ĐỒ TOP 5 LOẠI PHÒNG DOANH THU CAO NHẤT – ĐÃ FIX LỖI DESTROY
function renderTopRoomTypes(roomTypes) {
    const canvas = document.getElementById('topRoomTypesChart');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) {
        console.warn('Không tìm thấy canvas topRoomTypesChart');
        return;
    }

    // Fix lỗi destroy: chỉ destroy nếu đã tồn tại và có hàm destroy
    if (topRoomTypesChart) {
        topRoomTypesChart.destroy();
    }

    if (!roomTypes || roomTypes.length === 0) {
        ctx.canvas.parentElement.innerHTML = `
            <div style="text-align:center; padding:60px; color:#999;">
                Không có dữ liệu loại phòng
            </div>`;
        return;
    }

    const labels = roomTypes.map(s => s.TenLoaiPhong);
    const values = roomTypes.map(s => s.DoanhThu);

    topRoomTypesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Doanh thu',
                data: values,
                backgroundColor: '#ff9800',
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${formatCurrency(ctx.raw)}`
                    }
                },
                title: {
                    display: true,
                    text: 'TOP LOẠI PHÒNG DOANH THU CAO NHẤT',
                    font: { size: 16, weight: 'bold' },
                    color: '#1a73e8'
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: formatCurrency,
                        font: { weight: 'bold' },
                        color: '#555'
                    },
                    grid: {
                        display: true, // HIỆN ĐƯỜNG KẺ DỌC
                        color: 'rgba(0, 0, 0, 0.1)', // màu nhạt, đẹp
                        lineWidth: 1,
                        drawBorder: false
                    },
                    border: { display: false }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { weight: 'bold' }, color: '#333' }
                }
            }
        }
    });
}

function renderReviews(reviews) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:80px; color:#999; font-size:1.2rem;">
                Chưa có đánh giá nào từ khách hàng
            </div>`;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div class="review-header">
                <div>
                    <strong class="customer-name">${r.tenKhach}</strong>
                    <span class="room-info">
                        ${r.maDatPhong && r.maDatPhong !== 'N/A' ? `• Mã ĐP: <strong>#${r.maDatPhong}</strong>` : ''}
                    </span>
                </div>
            </div>

            <div class="review-stars">
                ${'★'.repeat(r.sosao)}${'☆'.repeat(5 - r.sosao)}
                <span class="star-count">(${r.sosao}/5)</span>
            </div>

            <p class="review-text">${r.danhgia}</p>
        </div>
    `).join('');
}



// CẬP NHẬT KPI
function updateKPI(total) {
    document.getElementById('kpi-revenue').textContent = formatCurrency(total);
    //document.getElementById('kpi-revenue-phong').textContent = '—';
    //document.getElementById('kpi-revenue-dichvu').textContent = '—';
}

// HỖ TRỢ
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateVN(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

function showLoading(show) {
    const btn = document.getElementById('apply-filter-btn');
    btn.disabled = show;
    btn.innerHTML = show ? 'Đang tải...' : 'Áp dụng';
}