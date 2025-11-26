// js/reports.js
import { ReportAPI } from '../api/reports.api.js';

let revenueChart, topServicesChart, topRoomTypesChart, damageChart;
let isLoading = false;

document.addEventListener('DOMContentLoaded', async () => {
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

// ==================== BỘ LỌC – HOÀN HẢO ====================
function setupFilters() {
    const presetBtn = document.getElementById('preset-filter-btn');
    const presetValue = document.getElementById('preset-filter-value');
    const options = document.getElementById('preset-filter-options');
    const customGroup = document.getElementById('custom-range-group');
    const applyBtn = document.getElementById('apply-filter-btn');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');

    // Khởi tạo giá trị ngày mặc định
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFrom.value = formatDate(firstDay);
    dateTo.value = formatDate(today);

    presetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.style.display = options.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => options.style.display = 'none');

    options.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const value = opt.dataset.value;
            presetValue.textContent = opt.textContent;
            options.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');

            if (value === 'custom') {
                customGroup.style.display = 'flex';
                dateFrom.focus();
            } else {
                customGroup.style.display = 'none';
                applyBtn.click(); // Tự động áp dụng
            }
            options.style.display = 'none';
        });
    });

    applyBtn.addEventListener('click', async () => {
        if (isLoading) return;

        let start, end;
        const activeOpt = document.querySelector('#preset-filter-options .custom-select-option.active');
        const preset = activeOpt?.dataset.value || 'this-month';

        if (preset !== 'custom') {
            const range = getPresetRange(preset);
            start = range.start;
            end = range.end;
            presetValue.textContent = activeOpt.textContent;
        } else {
            start = dateFrom.value;
            end = dateTo.value;

            if (!start || !end) {
                alert('Vui lòng chọn đầy đủ Từ ngày và Đến ngày!');
                return;
            }
            if (start > end) {
                alert('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
                return;
            }
            presetValue.textContent = `${formatDateVN(start)} → ${formatDateVN(end)}`;
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

    if (end > now) end = now;

    return { start: formatDate(start), end: formatDate(end) };
}

// ==================== TẢI DỮ LIỆU ====================
async function loadReport({ start, end }) {
    if (isLoading) return;
    isLoading = true;
    showLoading(true);

    try {
        const [revenueRes, topServices, topRoomTypes, reviews, damageData] = await Promise.all([
            ReportAPI.getRevenue(start, end),
            ReportAPI.getTopServices(5, start, end),
            ReportAPI.getTopRoomTypes(start, end),
            ReportAPI.getReviews(),
            ReportAPI.getDamageSummary(start, end)
        ]);

        updateKPI(revenueRes.summary?.tongDoanhThu || 0);
        renderRevenueTrend(revenueRes.data || []);
        renderTopServices(topServices || []);
        renderTopRoomTypes(topRoomTypes || []);
        renderReviews(reviews || []);
        renderDamageEquipment(damageData.chartData || [], damageData.totalDamage || 0);
    } catch (err) {
        alert('Lỗi tải dữ liệu: ' + err.message);
        console.error(err);
    } finally {
        showLoading(false);
        isLoading = false;
    }
}

// ==================== CHUYỂN TAB ====================
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

// ==================== BIỂU ĐỒ DOANH THU ====================
function renderRevenueTrend(data) {
    const canvas = document.getElementById('revenueTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (revenueChart) revenueChart.destroy();

    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        canvas.parentElement.querySelector('.chart-container > div')?.remove();
        canvas.parentElement.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:60px;color:#999;">Không có dữ liệu doanh thu</div>`);
        return;
    }
    canvas.style.display = 'block';
    canvas.parentElement.querySelector('.chart-container > div')?.remove();

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

// ==================== TOP DỊCH VỤ ====================
function renderTopServices(services) {
    const canvas = document.getElementById('topServicesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (topServicesChart) topServicesChart.destroy();

    const totalServiceRevenue = services.reduce((sum, s) => sum + (s.DoanhThu || 0), 0);
    const totalEl = document.getElementById('total-service-revenue');
    if (totalEl) totalEl.textContent = formatCurrency(totalServiceRevenue);

    if (!services || services.length === 0 || totalServiceRevenue === 0) {
        canvas.style.display = 'none';
        canvas.parentElement.querySelector('.chart-container > div')?.remove();
        canvas.parentElement.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:60px;color:#999;">Không có dữ liệu dịch vụ</div>`);
        return;
    }
    canvas.style.display = 'block';
    canvas.parentElement.querySelector('.chart-container > div')?.remove();

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

// ==================== TOP LOẠI PHÒNG ====================
function renderTopRoomTypes(roomTypes) {
    const canvas = document.getElementById('topRoomTypesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (topRoomTypesChart) topRoomTypesChart.destroy();

    if (!roomTypes || roomTypes.length === 0) {
        canvas.style.display = 'none';
        canvas.parentElement.querySelector('.chart-container > div')?.remove();
        canvas.parentElement.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:60px;color:#999;">Không có dữ liệu loại phòng</div>`);
        return;
    }
    canvas.style.display = 'block';
    canvas.parentElement.querySelector('.chart-container > div')?.remove();

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
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.raw)}` } },
                title: { display: true, text: 'TOP LOẠI PHÒNG DOANH THU CAO NHẤT', font: { size: 16, weight: 'bold' }, color: '#1a73e8' }
            },
            scales: {
                x: { ticks: { callback: formatCurrency, font: { weight: 'bold' } } },
                y: { grid: { display: false } }
            }
        }
    });
}

// ==================== THIỆT HẠI THIẾT BỊ ====================
function renderDamageEquipment(data, totalDamage) {
    const canvas = document.getElementById('damageEquipmentChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (damageChart) damageChart.destroy();

    const totalEl = document.getElementById('total-damage-amount');
    if (totalEl) totalEl.textContent = formatCurrency(totalDamage || 0);

    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        canvas.parentElement.querySelector('.chart-container > div')?.remove();
        canvas.parentElement.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:60px;color:#999;">Không có dữ liệu thiệt hại thiết bị</div>`);
        return;
    }
    canvas.style.display = 'block';
    canvas.parentElement.querySelector('.chart-container > div')?.remove();

    const labels = data.map(d => d.tenThietBi);
    const values = data.map(d => d.tongTien);

    damageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tiền bồi thường',
                data: values,
                backgroundColor: '#ff9800',
                borderColor: '#ff9800',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `Bồi thường: ${formatCurrency(ctx.raw)}` } },
                title: { display: true, text: 'THIẾT BỊ HƯ HỎNG NHIỀU NHẤT', font: { size: 16, weight: 'bold' }, color: '#1a73e8' }
            },
            scales: {
                x: { ticks: { callback: formatCurrency, font: { weight: 'bold' } } },
                y: { grid: { display: false } }
            }
        }
    });
}

// ==================== ĐÁNH GIÁ ====================
function renderReviews(reviews) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:80px;color:#999;font-size:1.2rem;">Chưa có đánh giá nào từ khách hàng</div>`;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div class="review-header">
                <strong class="customer-name">${r.tenKhach}</strong>
                <span class="room-info">${r.maDatPhong && r.maDatPhong !== 'N/A' ? `• Mã ĐP: <strong>#${r.maDatPhong}</strong>` : ''}</span>
            </div>
            <div class="review-stars">
                ${'★'.repeat(r.sosao)}${'☆'.repeat(5 - r.sosao)} <span class="star-count">(${r.sosao}/5)</span>
            </div>
            <p class="review-text">${r.danhgia || '(Không có nội dung)'}</p>
        </div>
    `).join('');
}

// ==================== HỖ TRỢ ====================
function updateKPI(total) {
    document.getElementById('kpi-revenue').textContent = formatCurrency(total || 0);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateVN(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

function showLoading(show) {
    const btn = document.getElementById('apply-filter-btn');
    btn.disabled = show;
    btn.innerHTML = show ? 'Đang tải...' : 'Áp dụng';
}