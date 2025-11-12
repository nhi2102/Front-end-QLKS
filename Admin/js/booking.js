// js/booking.js
console.log('booking.js loaded!');

import { fetchBookingsByDate, fetchBookingDetails, fetchInvoices, fetchInvoiceDetails } from '../api/booking.api.js';
import { openModal } from '../js/main.js';

document.addEventListener('DOMContentLoaded', function () {
    // === CẬP NHẬT TÊN NGƯỜI DÙNG ===
    const userInfo = JSON.parse(localStorage.getItem('currentUserInfo')) || JSON.parse(localStorage.getItem('currentUser'));
    const userNameDisplay = document.getElementById('user-display-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userInfo && userNameDisplay) {
        const name = userInfo.hoten || userInfo.name || userInfo.username || 'Admin';
        userNameDisplay.textContent = name;
    }
    if (userInfo && userAvatar) {
        const name = userInfo.hoten || userInfo.name || userInfo.username || 'A';
        const firstLetter = name.charAt(0).toUpperCase();
        userAvatar.src = `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;
        userAvatar.alt = `Avatar ${name}`;
    }

    // === NGÀY HIỆN TẠI ===
    const today = new Date().toISOString().split('T')[0];
    const dateSearch = document.getElementById('date-search');
    if (dateSearch) dateSearch.value = today;

    // === ĐỊNH DẠNG NGÀY ===
    function formatDateOnly(isoString) {
        if (!isoString) return 'N/A';
        const [y, m, d] = isoString.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    }

    
function getBookingStatusClass(status) {
    const s = (status || '').trim();
    if (s === 'Đã đặt') return 'pending';
    if (s === 'Đang ở') return 'staying';
    if (s === 'Đã trả') return 'returned';
    if (s === 'Đã hủy') return 'cancelled';
    return 'unknown';
}

    // === RENDER ĐẶT PHÒNG ===
function renderBookings(bookings) {
    const tbody = document.getElementById('booking-table-body');
    const loadingRow = document.getElementById('booking-loading-row');

    // XÓA HOÀN TOÀN DỮ LIỆU CŨ
    tbody.innerHTML = '';
    if (loadingRow) loadingRow.remove();

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không tìm thấy đặt phòng nào</td></tr>';
        return;
    }

    bookings.forEach(booking => {
        const paid = booking.paymentStatus === 'paid';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#DP${booking.id}</td>
            <td>${booking.customerName}</td>
            <td>${booking.roomNumber}</td>
            <td>${formatDateOnly(booking.checkInDate)}</td>
            <td>${formatDateOnly(booking.checkOutDate)}</td>
            <td>${formatDateOnly(booking.bookingDateTime)}</td>
            <td>
                <span class="status-badge status-${getBookingStatusClass(booking.status)}">
                    ${booking.status}
                </span>
            </td>
            <td class="text-center">
                <button class="action-btn" data-action="view-booking" data-id="${booking.id}" title="Xem chi tiết">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

    // === RENDER HÓA ĐƠN (SỬA) ===
    function renderInvoices(invoices) {
        const tbody = document.getElementById('invoice-table-body');
        const loadingRow = document.getElementById('invoice-loading-row');

        // XÓA DỮ LIỆU CŨ HOÀN TOÀN
        tbody.innerHTML = '';
        if (loadingRow) loadingRow.remove();

        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không có dữ liệu</td></tr>';
            return;
        }

        invoices.forEach(inv => {
            const paid = inv.paymentStatus === 'paid';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#HD${inv.mahoadon}</td>
                <td>#DP${inv.madatphong}</td>
                <td>${inv.customerName}</td>
                <td>${formatDateOnly(inv.ngaylap)}</td>
                <td>${inv.tongtien.toLocaleString('vi-VN')} VND</td>
                <td>
                    <span class="status-badge status-${inv.paymentStatus}">
                        ${inv.paymentStatus === 'paid' ? 'Đã thanh toán' : 
                        inv.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 
                        'Chưa thanh toán'}
                    </span>
                </td>
                <td class="text-center">
                    <button class="action-btn" data-action="view-invoice" data-id="${inv.mahoadon}" title="Xem chi tiết">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // === LOAD ĐẶT PHÒNG ===
    let bookingCache = null; // Cache danh sách gốc

    async function loadBookings(date = today, query = '') {
        try {
            // Dùng cache nếu không tìm kiếm và không đổi ngày
            if (!query && date === today && bookingCache) {
                const filtered = bookingCache.filter(b => 
                    !date || b.checkInDate.startsWith(date)
                );
                renderBookings(filtered);
                return;
            }

            const bookings = await fetchBookingsByDate(date, query);
            if (!query && date === today) bookingCache = bookings; // Lưu cache
            renderBookings(bookings);
        } catch (err) {
            console.error('Lỗi load đặt phòng:', err);
            const tbody = document.getElementById('booking-table-body');
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
        }
    }

    // === LOAD HÓA ĐƠN ===
    async function loadInvoices(query = '') {
        try {
            const invoices = await fetchInvoices(query);
            renderInvoices(invoices);
        } catch (err) {
            console.error('Lỗi load hóa đơn:', err);
            document.getElementById('invoice-table-body').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
        }
    }

    // === CHUYỂN TAB ===
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.tab);
            if (panel) panel.classList.add('active');

            if (btn.dataset.tab === 'invoice-content') {
                loadInvoices();
            } else {
                loadBookings(dateSearch.value, document.getElementById('text-search').value.trim());
            }
        });
    });

    // === TÌM KIẾM ===
    document.getElementById('search-btn')?.addEventListener('click', () => {
        const date = document.getElementById('date-search').value;
        const query = document.getElementById('text-search').value.trim();
        loadBookings(date, query); // Gọi hàm đã sửa
    });

    document.getElementById('invoice-search-btn')?.addEventListener('click', () => {
        const query = document.getElementById('invoice-search').value.trim();
        loadInvoices(query);
    });

    // === XEM CHI TIẾT ===
    document.addEventListener('click', async e => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

if (btn.dataset.action === 'view-booking') {
    try {
        const bookingId = btn.dataset.id;
        let booking = { rooms: [] }; // Khởi tạo rỗng để tránh cache
        try {
            booking = await fetchBookingDetails(bookingId);
        } catch (err) {
            console.error('Lỗi tải chi tiết:', err);
            alert('Không tải được chi tiết đặt phòng');
            return;
        }

        let invoice = null;
        try {
            // LẤY HÓA ĐƠN THEO madatphong QUA API CHI TIẾT
            const allInvoices = await fetchInvoices();
            const matched = allInvoices.find(inv => inv.madatphong === parseInt(bookingId));
            if (matched) {
                invoice = await fetchInvoiceDetails(matched.mahoadon); // LẤY ĐẦY ĐỦ
            }
        } catch (err) {
            console.warn('Không tải được hóa đơn:', err);
        }

        // ƯU TIÊN DỮ LIỆU TỪ HÓA ĐƠN (chính xác hơn)
        //const finalRoomNumber = invoice?.roomNumber || booking.roomNumber;
        //const finalRoomCapacity = invoice?.roomCapacity || booking.roomCapacity || 'N/A';
        const finalTotal = invoice?.tongtien || booking.totalAmount || 0;
        const totalLabel = invoice ? 'Tổng tiền (Hóa đơn):' : 'Tổng tiền (Đặt phòng):';

        openModal(`Chi tiết đặt phòng #DP${bookingId}`, `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: 0.9375rem; line-height: 1.6;">
                <!-- KHÁCH HÀNG -->
                <div>
                    <h4 style="margin:0 0 .75rem;color:#3182ce;font-weight:600;font-size:1rem;border-bottom:2px solid #3182ce;padding-bottom:.25rem;">
                        Thông tin khách hàng
                    </h4>
                    <div style="display:grid;gap:.5rem;">
                        <p><strong>Họ tên:</strong> <span style="color:#1a202c;font-weight:500">${booking.customerName}</span></p>
                        <p><strong>SĐT:</strong> ${booking.customerPhone}</p>
                        <p><strong>CCCD:</strong> ${booking.customerIdCard}</p>
                        <p><strong>Email:</strong> ${booking.customerEmail}</p>
                    </div>
                </div>

                <!-- ĐẶT PHÒNG -->
                <div>
                    <h4 style="margin:0 0 .75rem;color:#3182ce;font-weight:600;font-size:1rem;border-bottom:2px solid #3182ce;padding-bottom:.25rem;">
                        Thông tin đặt phòng
                    </h4>
                    <div style="display:grid;gap:.5rem;">
<p><strong>Phòng đã đặt:</strong></p>
<div style="background:#ebf8ff;padding:0.75rem 1rem;border-radius:0.5rem;border-left:4px solid #3182ce;margin-top:0.5rem;font-weight:500;">
${(() => {
    const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];
    if (rooms.length === 0) return '<em style="color:#a0aec0;">Chưa có phòng</em>';
    return rooms.map(r => 
        `<span style="font-weight:600;color:#2b6cb0;">${r.number || 'N/A'}</span>`
    ).join(' • ');
})()}
<span style="margin-left:0.75rem;color:#718096;font-size:0.9em;">
    (${Array.isArray(booking.rooms) ? booking.rooms.length : 0} phòng)
</span>
</div>
                        <p><strong>Nhận phòng:</strong> ${formatDateOnly(booking.checkInDate)}</p>
                        <p><strong>Trả phòng:</strong> ${formatDateOnly(booking.checkOutDate)}</p>
                        <p><strong>Ngày đặt:</strong> ${formatDateOnly(booking.bookingDateTime)}</p>
                        <p><strong>${totalLabel}</strong>
                            <strong style="color:#e53e3e;font-size:1.05em;">
                                ${finalTotal.toLocaleString('vi-VN')} VND
                            </strong>
                        </p>
                        <p><strong>Trạng thái:</strong> 
                            <span class="status-badge status-${getBookingStatusClass(booking.status)}">
                                ${booking.status}
                            </span>
                        </p>

                    </div>
                </div>
            </div>

            <div class="modal-form-footer" style="margin-top:1.5rem;text-align:right;">
                <button class="btn btn-secondary" onclick="document.getElementById('modal').classList.remove('show')">
                    Đóng
                </button>
            </div>
        `);
    } catch (err) {
        console.error('Lỗi:', err);
        alert('Không tải được chi tiết');
    }
}

        if (btn.dataset.action === 'view-invoice') {
            try {
                const invoice = await fetchInvoiceDetails(btn.dataset.id);
                openModal(`Chi tiết hóa đơn #HD${invoice.mahoadon}`, `
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        font-size: 1rem;
                        line-height: 1.8;
                    ">
                        <!-- CỘT 1: KHÁCH HÀNG -->
                        <div>
                            <h4 style="
                                margin:0 0 1rem;
                                color:#3182ce;
                                font-weight:700;
                                font-size:1.15rem;
                                border-bottom:3px solid #3182ce;
                                padding-bottom:.35rem;
                                letter-spacing:0.5px;
                            ">
                                Thông tin khách hàng
                            </h4>
                            <div style="display:grid;gap:.75rem;">
                                <p><strong>Họ tên:</strong> <span style="color:#1a202c;font-weight:600">${invoice.customerName}</span></p>
                                <p><strong>SĐT:</strong> 
                                    <a href="tel:${invoice.customerPhone}" style="color:#3182ce;text-decoration:none;font-weight:500;">
                                        ${invoice.customerPhone}
                                    </a>
                                </p>
                                <p><strong>CCCD:</strong> <span style="font-family:monospace">${invoice.customerIdCard}</span></p>
                                <p><strong>Email:</strong> 
                                    <a href="mailto:${invoice.customerEmail}" style="color:#3182ce;text-decoration:none;">
                                        ${invoice.customerEmail}
                                    </a>
                                </p>
                            </div>
                        </div>

                        <!-- CỘT 2: HÓA ĐƠN -->
                        <div>
                            <h4 style="
                                margin:0 0 1rem;
                                color:#3182ce;
                                font-weight:700;
                                font-size:1.15rem;
                                border-bottom:3px solid #3182ce;
                                padding-bottom:.35rem;
                                letter-spacing:0.5px;
                            ">
                                Thông tin hóa đơn
                            </h4>
                            <div style="display:grid;gap:.75rem;">
                                <p><strong>Mã đặt phòng:</strong> <span style="color:#d69e2e;font-weight:600">#DP${invoice.madatphong}</span></p>
<p><strong>Phòng đã đặt:</strong></p>
<div style="background:#ebf8ff;padding:0.75rem 1rem;border-radius:0.5rem;border-left:4px solid #3182ce;margin-top:0.5rem;font-weight:500;">
    ${invoice.rooms && invoice.rooms.length > 0 
        ? invoice.rooms.map(r => 
            `<span style="font-weight:600;color:#2b6cb0;">${r.number}</span>`
          ).join(' • ')
        : '<em style="color:#a0aec0;">Chưa có phòng</em>'
    }
    ${invoice.rooms && invoice.rooms.length > 1 
        ? `<span style="margin-left:0.75rem;color:#718096;font-size:0.9em;">(${invoice.rooms.length} phòng)</span>`
        : ''
    }
</div>
                                <p><strong>Ngày lập:</strong> <span style="color:#2b6cb0">${formatDateOnly(invoice.ngaylap)}</span></p>
                                <p><strong>Tổng tiền:</strong> 
                                    <strong style="color:#e53e3e;font-size:1.1em">${invoice.tongtien.toLocaleString('vi-VN')} VND</strong>
                                </p>
                                <p><strong>Trạng thái thanh toán:</strong> 
                                    <span class="status-badge status-${invoice.paymentStatus}">
                                        ${invoice.paymentStatus === 'paid' ? 'Đã thanh toán' : 
                                        invoice.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 
                                        'Chưa thanh toán'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="modal-form-footer" style="margin-top:2rem;text-align:right;padding-top:1rem;border-top:1px solid #e2e8f0;">
                        <button class="btn btn-secondary" style="padding:.65rem 1.5rem;font-size:1rem;" onclick="document.getElementById('modal').classList.remove('show')">
                            Đóng
                        </button>
                    </div>
                `);
                } catch (err) {
                alert('Không tải được chi tiết hóa đơn');
            }
        }
    });

    // === LOAD MẶC ĐỊNH ===
    loadBookings(today);
});

// === XUẤT EXCEL ===
document.getElementById('export-excel-btn')?.addEventListener('click', () => {
    // Lấy dữ liệu từ bảng hiện tại (hoặc load tất cả nếu cần)
    const table = document.getElementById('booking-table-body');
    if (table.children.length === 0 || table.innerHTML.includes('Không có dữ liệu')) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    // Tạo dữ liệu từ bảng (hoặc từ cache nếu có)
    const rows = [];
    const header = ['Mã ĐP', 'Khách hàng', 'Số phòng', 'Ngày nhận', 'Ngày trả', 'Ngày đặt', 'Thanh toán'];

    // Lấy từ rows hiện tại
    Array.from(table.querySelectorAll('tr')).forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length >= 7) {
            rows.push([
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim(),
                cells[6].textContent.trim()
            ]);
        }
    });

    if (rows.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    // Tạo workbook với SheetJS
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Tự động điều chỉnh độ rộng cột
    const colWidths = header.map(h => ({ wch: Math.max(10, h.length + 2) }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachDonDatPhong');

    // Tạo tên file với timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
    const filename = `DonDatPhong_${timestamp}.xlsx`;

    // Tải file
    XLSX.writeFile(wb, filename);
    alert(`Đã xuất thành công: ${filename}`);
});