const API_BASE = 'https://localhost:7076/api';

// Biến toàn cục
let duLieuKhach = [];
let dichVuKhaDung = [];
let dichVuDaChon = [];
let maBookingHienTai = null;

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', async function() {
    kiemTraDangNhap();
    thietLapSuKien();
    
    hienThiDangTai();
    try {
        await Promise.all([
            taiDanhSachKhach(),
            taiDanhSachDichVu()
        ]);
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    } finally {
        anDangTai();
    }
});

// Kiểm tra đăng nhập
function kiemTraDangNhap() {
    const nguoiDung = localStorage.getItem("currentUser");
    if (!nguoiDung) {
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
        return;
    }
    
    const user = JSON.parse(nguoiDung);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || user.username;
}

// Thiết lập sự kiện
function thietLapSuKien() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }

    // Đăng xuất
    const logoutBtn = document.querySelector('a[href="#"]:has(i.fa-sign-out-alt)');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                window.location.href = '../login.html';
            }
        });
    }

    // Đóng modal khi click bên ngoài
    const modal = document.getElementById('servicesModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) dongModalDichVu();
        });
    }

    // Tìm kiếm khi nhấn Enter
    ['searchBookingCode', 'searchRoomNumber', 'searchCustomerName'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') timKiemKhach();
            });
        }
    });
}

// Tải danh sách khách đang ở
async function taiDanhSachKhach() {
    try {
        const response = await fetch(`${API_BASE}/Datphongs/checked-in`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        duLieuKhach = data;
        hienThiDanhSachKhach(data);
    } catch (error) {
        console.error('Lỗi tải danh sách khách:', error);
        const tbody = document.getElementById('currentGuestsList');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>Lỗi tải dữ liệu: ${error.message}</div>
                        <button onclick="taiDanhSachKhach()" class="btn btn-sm btn-primary">
                            <i class="fas fa-redo"></i> Thử lại
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Hiển thị danh sách khách
function hienThiDanhSachKhach(khachList) {
    const tbody = document.getElementById('currentGuestsList');
    const guestCountEl = document.getElementById('guestCount');

    if (!tbody) return;
    if (guestCountEl) guestCountEl.textContent = `${khachList.length} khách`;

    if (!khachList || khachList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fas fa-info-circle"></i>
                    Không có khách nào đang ở
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = khachList.map(khach => {
        const maBooking = khach.madatphong || khach.maDatPhong;
        const tenKhach = (khach.khachHang && khach.khachHang.hoten) || khach.tenKhachHang || 'N/A';
        const soDT = (khach.khachHang && khach.khachHang.sdt) || khach.soDienThoai || 'N/A';
        
        // Lấy tất cả số phòng
        let soPhong = 'N/A';
        if (khach.danhSachPhong && khach.danhSachPhong.length > 0) {
            const danhSachSoPhong = khach.danhSachPhong.map(p => 
                p.sophong || p.soPhong || 'N/A'
            );
            soPhong = danhSachSoPhong.join(', ');
        }
        
        const ngayNhan = dinhDangNgay(khach.ngaynhanphong || khach.ngayNhanPhong);
        const ngayTra = dinhDangNgay(khach.ngaytraphong || khach.ngayTraPhong);

        return `
            <tr>
                <td><strong>${maBooking}</strong></td>
                <td>${tenKhach}</td>
                <td>${soDT}</td>
                <td class="room-number">${soPhong}</td>
                <td>${ngayNhan}</td>
                <td>${ngayTra}</td>
                <td><span class="status-badge status-checkedin">Đang ở</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="moModalDichVu('${maBooking}')">
                            <i class="fas fa-concierge-bell"></i> Dịch vụ
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="xemLichSuDichVu('${maBooking}')">
                            <i class="fas fa-history"></i> Lịch sử
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Tìm kiếm khách
function timKiemKhach() {
    const maBooking = document.getElementById('searchBookingCode')?.value.trim() || '';
    const soPhong = document.getElementById('searchRoomNumber')?.value.trim() || '';
    const tenKhach = document.getElementById('searchCustomerName')?.value.trim() || '';

    if (!maBooking && !soPhong && !tenKhach) {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm!');
        return;
    }

    const ketQua = duLieuKhach.filter(khach => {
        let khop = true;
        
        if (maBooking) {
            const maKhach = (khach.madatphong || khach.maDatPhong || '').toString();
            khop = khop && maKhach.toLowerCase().includes(maBooking.toLowerCase());
        }
        
        if (soPhong) {
            const soPhongKhach = (
                khach.danhSachPhong?.[0]?.sophong || khach.phong || ''
            ).toString();
            khop = khop && soPhongKhach.includes(soPhong);
        }
        
        if (tenKhach) {
            const ten = (khach.khachHang?.hoten || khach.tenKhachHang || '');
            khop = khop && ten.toLowerCase().includes(tenKhach.toLowerCase());
        }
        
        return khop;
    });

    hienThiDanhSachKhach(ketQua);
    if (ketQua.length === 0) alert('Không tìm thấy khách nào phù hợp!');
}

// Làm mới tìm kiếm
function lamMoiTimKiem() {
    ['searchBookingCode', 'searchRoomNumber', 'searchCustomerName'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    hienThiDanhSachKhach(duLieuKhach);
}

// Tải danh sách dịch vụ
async function taiDanhSachDichVu() {
    try {
        const response = await fetch(`${API_BASE}/Dichvus`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const services = await response.json();
        dichVuKhaDung = services.filter(dv => dv.trangthai === "Hiệu lực");
    } catch (error) {
        console.error('Lỗi tải danh sách dịch vụ:', error);
        dichVuKhaDung = [
            { madv: 1, tendv: 'Bữa sáng buffet', giatien: 150000, trangthai: 'Hiệu lực' },
            { madv: 2, tendv: 'Giặt ủi nhanh', giatien: 50000, trangthai: 'Hiệu lực' },
            { madv: 3, tendv: 'Massage thư giãn', giatien: 300000, trangthai: 'Hiệu lực' }
        ];
    }
}

// Mở modal dịch vụ
function moModalDichVu(maBooking) {
    const khach = duLieuKhach.find(k => 
        (k.madatphong || k.maDatPhong).toString() === maBooking.toString()
    );

    if (!khach) {
        alert('Không tìm thấy thông tin khách hàng!');
        return;
    }

    maBookingHienTai = maBooking;
    dichVuDaChon = [];

    // Điền thông tin khách
    const setNoi = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 'N/A';
    };

    let soPhong = khach.danhSachPhong?.[0]?.sophong || khach.phong || 'N/A';
    
    setNoi('modalBookingCode', khach.madatphong || khach.maDatPhong);
    setNoi('modalCustomerName', khach.khachHang?.hoten || khach.tenKhachHang);
    setNoi('modalRoomNumber', soPhong);
    setNoi('modalPhone', khach.khachHang?.sdt || khach.soDienThoai);

    // Hiển thị dịch vụ khả dụng
    hienThiDichVuKhaDung();

    // Hiển thị modal
    const modal = document.getElementById('servicesModal');
    if (modal) modal.style.display = 'flex';
}

// Hiển thị dịch vụ khả dụng
function hienThiDichVuKhaDung() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    if (dichVuKhaDung.length === 0) {
        grid.innerHTML = '<p class="no-data">Không có dịch vụ nào</p>';
        return;
    }

    grid.innerHTML = dichVuKhaDung.map(dv => `
        <div class="service-card" onclick="themDichVu(${dv.madv})">
            <h4>${dv.tendv}</h4>
            <div class="price">${dinhDangTien(dv.giatien)}</div>
            <div class="description">${dv.mota || ''}</div>
        </div>
    `).join('');
}

// Thêm dịch vụ
function themDichVu(maDichVu) {
    const dichVu = dichVuKhaDung.find(dv => dv.madv === maDichVu);
    if (!dichVu) return;

    const viTriTonTai = dichVuDaChon.findIndex(dv => dv.madv === maDichVu);
    if (viTriTonTai >= 0) {
        dichVuDaChon[viTriTonTai].quantity += 1;
    } else {
        dichVuDaChon.push({ ...dichVu, quantity: 1 });
    }

    capNhatDanhSachDichVuDaChon();
    capNhatTongTien();
}

// Cập nhật danh sách dịch vụ đã chọn
function capNhatDanhSachDichVuDaChon() {
    const list = document.getElementById('selectedServicesList');
    if (!list) return;

    if (dichVuDaChon.length === 0) {
        list.innerHTML = '<p class="no-data">Chưa có dịch vụ nào được chọn</p>';
        return;
    }

    list.innerHTML = dichVuDaChon.map((dv, index) => `
        <div class="selected-item">
            <div class="selected-item-info">
                <div class="selected-item-name">${dv.tendv}</div>
                <div class="selected-item-qty">Số lượng: ${dv.quantity}</div>
            </div>
            <div class="selected-item-price">${dinhDangTien(dv.giatien * dv.quantity)}</div>
            <div class="selected-item-actions">
                <div class="qty-control">
                    <button class="qty-btn" onclick="thayDoiSoLuong(${index}, -1)">-</button>
                    <input type="number" class="qty-input" value="${dv.quantity}" 
                           onchange="datSoLuong(${index}, this.value)" min="1">
                    <button class="qty-btn" onclick="thayDoiSoLuong(${index}, 1)">+</button>
                </div>
                <button class="remove-btn" onclick="xoaDichVu(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Thay đổi số lượng
function thayDoiSoLuong(index, change) {
    if (dichVuDaChon[index]) {
        dichVuDaChon[index].quantity = Math.max(1, dichVuDaChon[index].quantity + change);
        capNhatDanhSachDichVuDaChon();
        capNhatTongTien();
    }
}

// Đặt số lượng
function datSoLuong(index, value) {
    const qty = Math.max(1, parseInt(value) || 1);
    if (dichVuDaChon[index]) {
        dichVuDaChon[index].quantity = qty;
        capNhatDanhSachDichVuDaChon();
        capNhatTongTien();
    }
}

// Xóa dịch vụ
function xoaDichVu(index) {
    dichVuDaChon.splice(index, 1);
    capNhatDanhSachDichVuDaChon();
    capNhatTongTien();
}

// Cập nhật tổng tiền
function capNhatTongTien() {
    const total = dichVuDaChon.reduce((sum, dv) => sum + (dv.giatien * dv.quantity), 0);
    const totalEl = document.getElementById('totalServiceAmount');
    if (totalEl) totalEl.textContent = dinhDangTien(total);
}

// Xác nhận đặt dịch vụ
async function xacNhanDichVu() {
    if (!maBookingHienTai) {
        alert('Lỗi: Không tìm thấy thông tin booking!');
        return;
    }

    if (dichVuDaChon.length === 0) {
        alert('Vui lòng chọn ít nhất một dịch vụ!');
        return;
    }

    try {
        for (const dv of dichVuDaChon) {
            const duLieu = {
                madatphong: parseInt(maBookingHienTai),
                madv: parseInt(dv.madv),
                soluong: parseInt(dv.quantity)
            };

            const response = await fetch(`${API_BASE}/Sudungdvs/sudungdv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(duLieu)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Lỗi thêm dịch vụ "${dv.tendv}": ${errorText}`);
            }
        }

        const tongTien = dichVuDaChon.reduce((sum, dv) => sum + (dv.giatien * dv.quantity), 0);

        alert([
            '✓ Đặt dịch vụ thành công!',
            '',
            `📋 Mã booking: ${maBookingHienTai}`,
            `🛎️ Số dịch vụ: ${dichVuDaChon.length}`,
            `💰 Tổng tiền: ${dinhDangTien(tongTien)}`,
            '',
            'Dịch vụ đã được thêm vào hóa đơn!'
        ].join('\n'));

        dongModalDichVu();
        window.location.reload();

    } catch (error) {
        console.error('Lỗi đặt dịch vụ:', error);
        alert('❌ Lỗi đặt dịch vụ: ' + error.message);
    }
}

// Đóng modal dịch vụ
function dongModalDichVu() {
    const modal = document.getElementById('servicesModal');
    if (modal) modal.style.display = 'none';
    
    maBookingHienTai = null;
    dichVuDaChon = [];
    capNhatDanhSachDichVuDaChon();
    capNhatTongTien();
}

// Xem lịch sử dịch vụ
async function xemLichSuDichVu(maBooking) {
    try {
        const modal = document.getElementById('serviceHistoryModal');
        const historyBody = document.getElementById('serviceHistoryBody');
        
        document.getElementById('historyBookingCode').textContent = maBooking;
        
        modal.style.display = 'flex';
        historyBody.innerHTML = '<tr><td colspan="6" class="history-loading"><i class="fas fa-spinner"></i><br>Đang tải...</td></tr>';

        const response = await fetch(`${API_BASE}/Sudungdvs/history/${maBooking}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const lichSu = await response.json();
        historyBody.innerHTML = '';

        if (lichSu && lichSu.length > 0) {
            let tongTien = 0;
            
            lichSu.forEach((item, i) => {
                const tenDV = item.dichvu?.tendv || 'Dịch vụ';
                const soLuong = item.soLuong || 1;
                const donGia = item.donGia || 0;
                const thanhTien = item.thanhTien || (donGia * soLuong);
                const ngay = item.ngaySuDung || new Date();

                tongTien += thanhTien;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${tenDV}</td>
                    <td>${soLuong}</td>
                    <td>${dinhDangTien(donGia)}</td>
                    <td>${dinhDangTien(thanhTien)}</td>
                    <td>${dinhDangNgay(ngay)}</td>
                `;
                historyBody.appendChild(row);
            });

            document.getElementById('totalServiceCount').textContent = lichSu.length;
            document.getElementById('totalHistoryAmount').textContent = dinhDangTien(tongTien);
        } else {
            historyBody.innerHTML = '<tr><td colspan="6" class="no-data">Chưa có dịch vụ nào</td></tr>';
        }

    } catch (error) {
        console.error('Lỗi tải lịch sử:', error);
        alert('Lỗi tải lịch sử dịch vụ: ' + error.message);
    }
}

// Đóng modal lịch sử
function dongModalLichSu() {
    const modal = document.getElementById('serviceHistoryModal');
    if (modal) modal.style.display = 'none';
}

// Hiển thị đang tải
function hienThiDangTai() {
    const tbody = document.getElementById('currentGuestsList');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Đang tải dữ liệu...</span>
                </td>
            </tr>
        `;
    }
}

// Ẩn đang tải
function anDangTai() {
    // Chỉ cần gọi sau khi tải xong
}

// Định dạng ngày
function dinhDangNgay(ngay) {
    if (!ngay) return 'N/A';
    try {
        return new Date(ngay).toLocaleDateString('vi-VN');
    } catch {
        return 'N/A';
    }
}

// Định dạng tiền
function dinhDangTien(so) {
    if (!so || isNaN(so)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(so);
}

// Export các hàm cần thiết - Hỗ trợ cả tên tiếng Việt và tiếng Anh
window.timKiemKhach = timKiemKhach;
window.searchGuest = timKiemKhach; // Alias tiếng Anh

window.lamMoiTimKiem = lamMoiTimKiem;
window.resetSearch = lamMoiTimKiem; // Alias tiếng Anh

window.moModalDichVu = moModalDichVu;
window.openServicesModal = moModalDichVu; // Alias tiếng Anh

window.dongModalDichVu = dongModalDichVu;
window.closeServicesModal = dongModalDichVu; // Alias tiếng Anh

window.xacNhanDichVu = xacNhanDichVu;
window.confirmServices = xacNhanDichVu; // Alias tiếng Anh

window.themDichVu = themDichVu;
window.addService = themDichVu; // Alias tiếng Anh

window.thayDoiSoLuong = thayDoiSoLuong;
window.changeQuantity = thayDoiSoLuong; // Alias tiếng Anh

window.datSoLuong = datSoLuong;
window.setQuantity = datSoLuong; // Alias tiếng Anh

window.xoaDichVu = xoaDichVu;
window.removeService = xoaDichVu; // Alias tiếng Anh

window.xemLichSuDichVu = xemLichSuDichVu;
window.showServiceHistory = xemLichSuDichVu; // Alias tiếng Anh

window.dongModalLichSu = dongModalLichSu;
window.closeServiceHistoryModal = dongModalLichSu; // Alias tiếng Anh

window.taiDanhSachKhach = taiDanhSachKhach;
window.loadCurrentGuests = taiDanhSachKhach; // Alias tiếng Anh
