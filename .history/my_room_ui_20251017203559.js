// File xử lý giao diện trang My Rooms
// API functions được import từ api/my_bookings.js

document.addEventListener('DOMContentLoaded', async function() {

            // Kiểm tra đăng nhập
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const makhachhang = currentUser.customerId ||
                currentUser.makhachhang ||
                currentUser.makh ||
                currentUser.MaKh ||
                currentUser.id;

            if (!makhachhang) {
                alert('Vui lòng đăng nhập để xem đặt phòng!');
                window.location.href = 'login.html';
                return;
            }

            // --- HÀM TIỆN ÍCH ---
            function parseDate(dateString) {
                if (!dateString) return new Date();

                if (dateString.includes('/')) {
                    const parts = dateString.split('/');
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                }

                return new Date(dateString);
            }

            // --- BIẾN TOÀN CỤC ---
            let allBookings = [];

            // --- TẢI DỮ LIỆU TỪ API ---
            async function loadBookings() {
                try {
                    console.log('=== ĐANG TẢI ĐẶT PHÒNG ===');

                    // Gọi API function từ my_bookings.js
                    const result = await getMyBookings();

                    if (!result.success) {
                        throw new Error(result.message || 'Không thể tải đặt phòng');
                    }

                    allBookings = result.data;
                    console.log(' Đã tải xong:', allBookings);

                    // Render tab đầu tiên
                    renderTabContent('upcoming');

                } catch (error) {
                    console.error(' Lỗi khi tải đặt phòng:', error);
                    alert('Không thể tải danh sách đặt phòng. Vui lòng thử lại!');
                }
            }

            // --- TẠO HTML CHO CARD ĐẶT PHÒNG ---
            function createBookingCard(booking, isUpcoming) {
                const madatphong = booking.madatphong || booking.Madatphong;
                const checkInDate = formatDateDisplay(booking.ngaynhanphong || booking.Ngaynhanphong);
                const checkOutDate = formatDateDisplay(booking.ngaytraphong || booking.Ngaytraphong);
                const trangthai = booking.trangthai || booking.Trangthai || 'Sắp tới';
                const tongTien = booking.tongtien || booking.Tongtien || 0;
                const chiTiet = booking.chiTiet || [];
                const chinhSachHuy = booking.chinhsachhuy || booking.Chinhsachhuy || 'Xem chính sách hủy tại khách sạn';
                const trangThaiThanhToan = booking.trangthaithanhtoan || booking.Trangthaithanhtoan || '';

                // Tính số đêm
                const checkIn = parseDate(booking.ngaynhanphong || booking.Ngaynhanphong);
                const checkOut = parseDate(booking.ngaytraphong || booking.Ngaytraphong);
                const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

                // Lấy tiền phòng và tiền dịch vụ từ Chi tiết hóa đơn (đã load sẵn trong API)
                let tongTienPhongAll = booking.tienPhong || 0;
                let tongTienDichVuAll = booking.tienDichVu || 0;

                console.log(' TỔNG KẾT TỪ HÓA ĐƠN:');
                console.log('   - Tiền phòng:', tongTienPhongAll);
                console.log('   - Tiền dịch vụ:', tongTienDichVuAll);

                // Tạo HTML cho danh sách phòng chi tiết
                let roomDetailsHTML = '';
                let tongTienTatCaPhong = 0;

                chiTiet.forEach((ct, index) => {
                            const phongInfo = ct.phongInfo || {};

                            // Lấy thông tin từ loại phòng (có giá phòng)
                            const loaiphongInfo = phongInfo.loaiphongInfo || {};

                            // Tên phòng: Ưu tiên tên loại phòng, fallback về số phòng
                            const tenPhong = phongInfo.tenphong ||
                                loaiphongInfo.tenloaiphong || loaiphongInfo.Tenloaiphong ||
                                phongInfo.sophong || phongInfo.Sophong || 'Phòng';

                            const loaiPhong = loaiphongInfo.tenloaiphong || loaiphongInfo.Tenloaiphong || 'Standard';

                            // Hình ảnh: Từ loại phòng hoặc phòng
                            const hinhAnh = loaiphongInfo.hinhanh || loaiphongInfo.Hinhanh ||
                                phongInfo.hinhanh || phongInfo.Hinhanh ||
                                'assets/img/room2_main.jpg';

                            // Giá phòng: Từ loại phòng (field name: giacoban)
                            let giaPhong = phongInfo.giaphong || phongInfo.Giaphong || // Đã được gắn sẵn từ giacoban
                                loaiphongInfo.giacoban || loaiphongInfo.Giacoban || // Fallback trực tiếp
                                0;

                            const tongCong = ct.tongcong || ct.Tongcong || 0;

                            console.log('DEBUG phongInfo:', phongInfo);
                            console.log('DEBUG loaiphongInfo:', loaiphongInfo);
                            console.log('DEBUG giaPhong:', giaPhong);

                            // Tính tiền dịch vụ trước
                            let tongTienDichVu = 0;
                            const dichVuList = ct.dichvu || [];

                            console.log(' DEBUG dichVuList:', dichVuList);
                            console.log(' DEBUG dichVuList.length:', dichVuList.length);

                            if (dichVuList.length > 0) {
                                dichVuList.forEach(dv => {
                                    const soLuong = dv.soluong || dv.Soluong || 1;
                                    const donGia = dv.dongia || dv.Dongia || 0;
                                    console.log(' Dịch vụ:', dv, 'SL:', soLuong, 'Giá:', donGia);
                                    tongTienDichVu += soLuong * donGia;
                                });
                            }

                            console.log(' Tổng tiền dịch vụ phòng này:', tongTienDichVu); // Nếu giaPhong = 0, tính ngược từ tongCong
                            if (giaPhong === 0 && tongCong > 0 && nights > 0) {
                                giaPhong = Math.round((tongCong - tongTienDichVu) / nights);
                                console.log('Tính ngược giaPhong:', giaPhong);
                            }

                            // Tính tiền phòng theo đêm
                            const tienPhong = giaPhong * nights;

                            tongTienTatCaPhong += tongCong;

                            // Tạo HTML dịch vụ nếu có (CHỈ RENDER, KHÔNG TÍNH LẠI)
                            let servicesHTML = '';
                            if (dichVuList.length > 0) {
                                let servicesListHTML = '';

                                dichVuList.forEach(dv => {
                                            const dichvuInfo = dv.dichvuInfo || {};
                                            const tenDichVu = dichvuInfo.tendichvu || dichvuInfo.Tendichvu || 'Dịch vụ';
                                            const moTa = dichvuInfo.mota || dichvuInfo.Mota || '';
                                            const soLuong = dv.soluong || dv.Soluong || 1;
                                            const donGia = dv.dongia || dv.Dongia || 0;
                                            const thanhTien = soLuong * donGia;

                                            servicesListHTML += `
                        <div class="service-item">
                            <div class="service-info">
                                <span class="service-name">${tenDichVu} × ${soLuong}</span>
                                ${moTa ? `<span class="service-desc">${moTa}</span>` : ''}
                            </div>
                            <span class="service-price">${formatCurrency(thanhTien)}</span>
                        </div>
                    `;
                });
                
                servicesHTML = `
                    <div class="room-services">
                        <h5><i class="fas fa-concierge-bell"></i> Dịch vụ đi kèm:</h5>
                        <div class="services-list">
                            ${servicesListHTML}
                        </div>
                        <div class="services-total">
                            <span class="service-name"><strong>Tổng dịch vụ:</strong></span>
                            <span class="service-price"><strong>${formatCurrency(tongTienDichVu)}</strong></span>
                        </div>
                    </div>
                `;
            }

            roomDetailsHTML += `
                <div class="room-item-detail">
                    <div class="room-item-img">
                        <img src="${hinhAnh}" alt="${tenPhong}" onerror="this.src='assets/img/room2_main.jpg'">
                    </div>
                    <div class="room-item-info">
                        <h4>${tenPhong}</h4>
                        <p class="room-type"><i class="fas fa-bed"></i> ${loaiPhong}</p>
                        <div class="room-pricing">
                            <div class="price-detail">
                                <span class="price-label"><i class="fas fa-dollar-sign"></i> Giá phòng:</span>
                                <span class="price-value">${formatCurrency(giaPhong)}/đêm × ${nights} đêm = <strong>${formatCurrency(tienPhong)}</strong></span>
                            </div>
                            ${servicesHTML}

                        </div>
                    </div>
                </div>
            `;
        });

        // Nếu hóa đơn không có dữ liệu, tính lại từ chi tiết phòng
        if (tongTienPhongAll === 0 && tongTienDichVuAll === 0 && tongTienTatCaPhong > 0) {
            console.log(' Hóa đơn không có dữ liệu, tính lại từ chi tiết phòng...');
            
            tongTienPhongAll = 0;
            tongTienDichVuAll = 0;
            
            chiTiet.forEach(ct => {
                const phongInfo = ct.phongInfo || {};
                const loaiphongInfo = phongInfo.loaiphongInfo || {};
                
                // Tính tiền phòng
                const giaPhong = phongInfo.giaphong || phongInfo.Giaphong || 
                    loaiphongInfo.giacoban || loaiphongInfo.Giacoban || 0;
                const tienPhong = giaPhong * nights;
                tongTienPhongAll += tienPhong;
                
                // Tính tiền dịch vụ
                const dichVuList = ct.dichvu || [];
                let tienDichVuPhong = 0;
                dichVuList.forEach(dv => {
                    const soLuong = dv.soluong || dv.Soluong || 1;
                    const donGia = dv.dongia || dv.Dongia || 0;
                    tienDichVuPhong += soLuong * donGia;
                });
                tongTienDichVuAll += tienDichVuPhong;
            });
            
            console.log(' Tính lại - Tiền phòng:', tongTienPhongAll, 'Tiền dịch vụ:', tongTienDichVuAll);
        }

        // Kiểm tra tính nhất quán và sửa tongTien nếu cần
        const tongTinhToan = tongTienPhongAll + tongTienDichVuAll;
        
        // Ưu tiên dùng tổng tính toán nếu hợp lý
        let tongTienCuoiCung = tongTien;
        
        if (tongTinhToan > 0 && (tongTien === 0 || Math.abs(tongTinhToan - tongTien) > 1000)) {
            console.log(` Sửa tongTien: ${tongTien} → ${tongTinhToan}`);
            tongTienCuoiCung = tongTinhToan;
        } else if (Math.abs(tongTinhToan - tongTien) > 1000 && tongTien > 0) {
            console.log(` Không khớp: Tính toán=${tongTinhToan} vs API=${tongTien}, sẽ điều chỉnh breakdown...`);
            
            // Nếu có tổng tiền nhưng breakdown không khớp, chia tỷ lệ
            if (tongTinhToan > 0) {
                const tylePhong = tongTienPhongAll / tongTinhToan;
                const tyleDichVu = tongTienDichVuAll / tongTinhToan;
                
                tongTienPhongAll = Math.round(tongTien * tylePhong);
                tongTienDichVuAll = Math.round(tongTien * tyleDichVu);
            } else {
                // Nếu không có breakdown, coi như tất cả là tiền phòng
                tongTienPhongAll = tongTien;
                tongTienDichVuAll = 0;
            }
            
            console.log(` Điều chỉnh - Tiền phòng: ${tongTienPhongAll}, Tiền dịch vụ: ${tongTienDichVuAll}`);
        }
        
        console.log(` TỔNG KẾT CUỐI CÙNG:`);
        console.log(`   - Tiền phòng: ${tongTienPhongAll}`);
        console.log(`   - Tiền dịch vụ: ${tongTienDichVuAll}`);
        console.log(`   - Tổng tiền: ${tongTienCuoiCung}`);

        // Tạo nút "Xem chi tiết" / "Ẩn chi tiết"
        const toggleButtonHTML = `
            <button class="toggle-details-btn" data-booking-id="${madatphong}">
                <i class="fas fa-chevron-down"></i> Xem Chi Tiết
            </button>
        `;

        // Tạo nút actions chung
        let footerActionsHTML = '';
        if (isUpcoming && trangthai !== 'Đã hủy') {
            // Nút cho đơn chưa hủy: Đổi phòng và Hủy
            footerActionsHTML = `
                <div class="footer-actions">
                    <button class="action-btn btn-change-room" data-booking-id="${madatphong}">
                        <i class="fas fa-exchange-alt"></i> Yêu cầu Đổi Phòng
                    </button>
                    <button class="action-btn btn-cancel-booking" data-booking-id="${madatphong}">
                        <i class="fas fa-times-circle"></i> Hủy Đặt Phòng
                    </button>
                </div>
            `;
        } else if (trangthai.toLowerCase() === 'đã hủy') {
            // Nút cho đơn đã hủy: Đặt lại
            const ngayNhan = booking.ngaynhanphong || booking.Ngaynhanphong;
            const ngayTra = booking.ngaytraphong || booking.Ngaytraphong;
            footerActionsHTML = `
                <div class="footer-actions">
                    <button class="action-btn btn-rebook" 
                            data-checkin="${ngayNhan}" 
                            data-checkout="${ngayTra}">
                        <i class="fas fa-redo-alt"></i> Đặt Lại Phòng
                    </button>
                </div>
            `;
        } else if (trangthai.toLowerCase() === 'đã trả') {
            // Nút cho đơn đã hoàn tất: Đánh giá
            const daDanhGia = booking.dadanhgia || booking.Dadanhgia || false;
            if (!daDanhGia) {
                footerActionsHTML = `
                    <div class="footer-actions">
                        <button class="action-btn btn-review" data-booking-id="${madatphong}">
                            <i class="fas fa-star"></i> Đánh Giá Khách Sạn
                        </button>
                    </div>
                `;
            } else {
                footerActionsHTML = `
                    <div class="footer-actions">
                        <div class="review-completed">
                            <i class="fas fa-check-circle"></i>
                            <span>Đã đánh giá - Cảm ơn bạn!</span>
                        </div>
                    </div>
                `;
            }
        }

        return `
            <div class="booking-card" data-booking-id="${madatphong}">
                <div class="card-header">
                    <div class="booking-id">
                        <i class="fas fa-receipt"></i>
                        <span>Mã đặt phòng: <strong>#DP${madatphong}</strong></span>
                    </div>
                    <div class="booking-status status-${trangthai.toLowerCase().replace(/\s/g, '-')}">
                        ${trangthai}
                    </div>
                </div>
                
                <div class="cancellation-policy">
                    <i class="fas fa-info-circle"></i>
                    <span>Chính sách hủy: <strong>${chinhSachHuy}</strong></span>
                </div>
                
                ${trangThaiThanhToan ? `
                <div class="payment-status ${trangThaiThanhToan.toLowerCase().replace(/\s/g, '-')}">
                    <i class="fas fa-money-check-alt"></i>
                    <span>Thanh toán: <strong>${trangThaiThanhToan}</strong></span>
                </div>
                ` : ''}
                
                <div class="booking-summary">
                    <div class="date-item">
                        <i class="fas fa-calendar-check"></i>
                        <div class="date-content">
                            <p class="date-label">Nhận phòng</p>
                            <p class="date-value">${checkInDate}</p>
                        </div>
                    </div>
                    <div class="nights-count">
                        <span>${nights} đêm</span>
                    </div>
                    <div class="date-item">
                        <i class="fas fa-calendar-times"></i>
                        <div class="date-content">
                            <p class="date-label">Trả phòng</p>
                            <p class="date-value">${checkOutDate}</p>
                        </div>
                    </div>
                </div>

                <div class="booking-summary-footer">
                    <p class="room-count"><i class="fas fa-door-open"></i> ${chiTiet.length} phòng</p>
                    ${toggleButtonHTML}
                </div>

                <div class="room-details-hidden" id="details-${madatphong}">
                    ${roomDetailsHTML}
                </div>

                <div class="card-footer">
                    <div class="footer-total-breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label"><i class="fas fa-bed"></i> Tiền phòng:</span>
                            <span class="breakdown-value">${formatCurrency(tongTienPhongAll)}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label"><i class="fas fa-concierge-bell"></i> Tiền dịch vụ:</span>
                            <span class="breakdown-value">${formatCurrency(tongTienDichVuAll)}</span>
                        </div>
                    </div>
                    <div class="footer-total">
                        <span class="total-label">Tổng tiền:</span>
                        <span class="total-value">${formatCurrency(tongTienCuoiCung)}</span>
                    </div>
                    ${footerActionsHTML}
                </div>
            </div>
        `;
    }

    // --- RENDER NỘI DUNG TAB ---
    function renderTabContent(tabId) {
        const container = document.getElementById(`${tabId}-bookings-container`);
        if (!container) return; 

        container.innerHTML = `<p class="loading-text">Đang tải danh sách phòng...</p>`; 
        
        // LOG: Xem tất cả trạng thái
        console.log(`=== RENDER TAB: ${tabId} ===`);
        console.log('Tất cả đặt phòng:', allBookings.length);
        allBookings.forEach(b => {
            const status = (b.trangthai || b.Trangthai || 'N/A');
            console.log(`- DP${b.madatphong || b.Madatphong}: "${status}"`);
        });
        
        const bookingsToRender = allBookings.filter(booking => {
            const status = (booking.trangthai || booking.Trangthai || '').toLowerCase().trim();

            // Phân loại HOÀN TOÀN dựa trên TRẠNG THÁI từ backend
            if (tabId === 'upcoming') {
                // Tab "Sắp tới": chỉ trạng thái "Sắp tới" hoặc "Đã đặt"
                const match = status === 'sắp tới' || status === 'đã đặt';
                console.log(`  Kiểm tra upcoming: "${status}" → ${match}`);
                return match;
            } else if (tabId === 'in-progress') {
                // Tab "Đang ở": CHỈ KHI có trạng thái "Đang ở"
                return status === 'đang ở';
            } else if (tabId === 'completed') {
                // Tab "Hoàn tất": trạng thái "Hoàn tất" hoặc "Đã hoàn tất"
                return status === 'đã trả' || status === 'Đã trả';
            } else if (tabId === 'cancelled') {
                // Tab "Đã hủy": trạng thái "Đã hủy"
                return status === 'đã hủy';
            }
            return false;
        });
        
        console.log(`→ Tìm thấy ${bookingsToRender.length} đặt phòng cho tab ${tabId}`);

        // Sắp xếp theo mã đặt phòng giảm dần
        bookingsToRender.sort((a, b) => {
            const idA = a.madatphong || a.Madatphong;
            const idB = b.madatphong || b.Madatphong;
            return idB - idA;
        });

        container.innerHTML = ''; 

        if (bookingsToRender.length === 0) {
            let message = 'Bạn chưa có đơn đặt phòng nào.';
            if (tabId === 'in-progress') message = 'Bạn chưa có đơn đặt phòng nào đang sử dụng.';
            if (tabId === 'completed') message = 'Bạn chưa có phòng đã hoàn tất nào.';
            if (tabId === 'cancelled') message = 'Bạn chưa có phòng đã hủy nào.';
            container.innerHTML = `<p class="empty-list-message">${message}</p>`;
        } else {
            bookingsToRender.forEach(booking => {
                const isUpcoming = (tabId === 'upcoming');
                container.innerHTML += createBookingCard(booking, isUpcoming);
            });
            
            // Gắn sự kiện
            setupToggleButtons();
            setupChangeRoomButtons();
            setupCancelButtons();
            setupRebookButtons(); // ← Thêm nút đặt lại
            setupReviewButtons(); // ← Thêm nút đánh giá
        }
    }

    // --- CHUYỂN ĐỔI TAB ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function switchTab(targetTabId) {
        tabPanes.forEach(pane => pane.classList.remove('active'));
        tabButtons.forEach(btn => btn.classList.remove('active'));

        const activePane = document.getElementById(targetTabId);
        if (activePane) activePane.classList.add('active');

        const activeButton = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
        if (activeButton) activeButton.classList.add('active');
        
        renderTabContent(targetTabId);
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // --- TOGGLE CHI TIẾT PHÒNG ---
    function setupToggleButtons() {
        const toggleButtons = document.querySelectorAll('.toggle-details-btn');
        
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const madatphong = this.getAttribute('data-booking-id');
                const detailsDiv = document.getElementById(`details-${madatphong}`);
                const icon = this.querySelector('i');
                
                if (detailsDiv.style.display === 'none' || detailsDiv.style.display === '') {
                    detailsDiv.style.display = 'block';
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                    this.innerHTML = '<i class="fas fa-chevron-up"></i> Ẩn Chi Tiết';
                } else {
                    detailsDiv.style.display = 'none';
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                    this.innerHTML = '<i class="fas fa-chevron-down"></i> Xem Chi Tiết';
                }
            });
        });
    }

    // --- HỦY ĐẶT PHÒNG ---
    function setupCancelButtons() {
        const cancelButtons = document.querySelectorAll('.btn-cancel-booking');
        
        cancelButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const madatphong = this.getAttribute('data-booking-id');
                
                // Tìm thông tin đặt phòng
                const booking = allBookings.find(b => 
                    (b.madatphong || b.Madatphong) === parseInt(madatphong)
                );
                
                if (booking) {
                    showCancelModal(booking);
                }
            });
        });
    }
    
    // --- HIỂN THỊ MODAL HỦY PHÒNG ---
    function showCancelModal(booking) {
        const madatphong = booking.madatphong || booking.Madatphong;
        let tongTien = booking.tongtien || booking.Tongtien || 0;
        
        // Tính lại tổng tiền nếu cần (giống logic trong createBookingCard)
        const chiTiet = booking.chiTiet || [];
        if (tongTien === 0 && chiTiet.length > 0) {
            chiTiet.forEach(ct => {
                tongTien += ct.tongcong || ct.Tongcong || 0;
            });
            console.log(` Modal hủy - Tính lại tổng tiền: ${tongTien}`);
        }
        const chinhSachHuy = booking.chinhsachhuy || booking.Chinhsachhuy || '';
        const ngayNhanPhong = booking.ngaynhanphong || booking.Ngaynhanphong;
        
        // Tính số giờ còn lại đến khi nhận phòng
        let hoursUntilCheckin = 0;
        let refundPercent = 0;
        let refundAmount = 0;
        
        try {
            const now = new Date();
            const checkinDate = new Date(ngayNhanPhong);
            hoursUntilCheckin = (checkinDate - now) / (1000 * 60 * 60);
            
            if (hoursUntilCheckin >= 48) {
                refundPercent = 100;
            } else if (hoursUntilCheckin >= 24) {
                refundPercent = 50;
            } else {
                refundPercent = 0;
            }
            
            refundAmount = (tongTien * refundPercent) / 100;
        } catch (error) {
            console.error('Lỗi tính toán hoàn tiền:', error);
        }
        
        const modalHTML = `
            <div class="cancel-modal-overlay" id="cancelModal">
                <div class="cancel-modal">
                    <div class="cancel-modal-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> Xác Nhận Hủy Đặt Phòng</h2>
                        <button class="cancel-modal-close" onclick="closeCancelModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="cancel-modal-body">
                        <div class="cancel-booking-info">
                            <h3>Thông tin đặt phòng</h3>
                            <p><strong>Mã đặt phòng:</strong> #DP${madatphong}</p>
                            <p><strong>Tổng tiền:</strong> ${formatCurrency(tongTien)}</p>
                        </div>
                        
                        <div class="cancel-policy-box">
                            <h3><i class="fas fa-info-circle"></i> Chính sách hủy</h3>
                            <p class="policy-text">${chinhSachHuy}</p>
                            
                            <div class="refund-details">
                                <div class="refund-item ${refundPercent === 100 ? 'active' : ''}">
                                    <i class="fas fa-clock"></i>
                                    <span>Hủy trước 48h: <strong>Hoàn 100%</strong></span>
                                </div>
                                <div class="refund-item ${refundPercent === 50 ? 'active' : ''}">
                                    <i class="fas fa-clock"></i>
                                    <span>Hủy trước 24h: <strong>Hoàn 50%</strong></span>
                                </div>
                                <div class="refund-item ${refundPercent === 0 ? 'active' : ''}">
                                    <i class="fas fa-ban"></i>
                                    <span>Hủy trong 24h: <strong>Không hoàn tiền</strong></span>
                                </div>
                            </div>
                            
                            <div class="refund-summary">
                                <div class="refund-amount">
                                    <span>Số tiền được hoàn:</span>
                                    <strong class="amount ${refundPercent > 0 ? 'positive' : 'negative'}">
                                        ${formatCurrency(refundAmount)} (${refundPercent}%)
                                    </strong>
                                </div>
                            </div>
                        </div>
                        
                        <div class="cancel-reason">
                            <h3><i class="fas fa-comment-dots"></i> Lý do hủy phòng</h3>
                            <select id="cancelReason" class="cancel-reason-select">
                                <option value="">-- Chọn lý do hủy --</option>
                                <option value="Thay đổi kế hoạch">Thay đổi kế hoạch</option>
                                <option value="Tìm được giá tốt hơn">Tìm được giá tốt hơn</option>
                                <option value="Không phù hợp nữa">Không phù hợp nữa</option>
                                <option value="Lý do cá nhân">Lý do cá nhân</option>
                                <option value="Khác">Khác</option>
                            </select>
                            <textarea id="cancelNote" class="cancel-note" placeholder="Ghi chú thêm (tùy chọn)..." rows="3"></textarea>
                        </div>
                        
                        ${refundPercent === 0 ? `
                        <div class="cancel-warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>Lưu ý: Bạn sẽ <strong>không được hoàn tiền</strong> do hủy trong vòng 24h trước khi nhận phòng.</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="cancel-modal-footer">
                        <button class="cancel-modal-btn btn-back" onclick="closeCancelModal()">
                            <i class="fas fa-arrow-left"></i> Quay Lại
                        </button>
                        <button class="cancel-modal-btn btn-confirm-cancel" onclick="confirmCancelBooking(${madatphong})">
                            <i class="fas fa-check-circle"></i> Xác Nhận Hủy
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Thêm class để trigger animation
        setTimeout(() => {
            document.getElementById('cancelModal').classList.add('show');
        }, 10);
    }
    
    // --- ĐÓNG MODAL HỦY ---
    window.closeCancelModal = function() {
        const modal = document.getElementById('cancelModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }
    
    // --- XÁC NHẬN HỦY PHÒNG ---
    window.confirmCancelBooking = async function(madatphong) {
        const reason = document.getElementById('cancelReason').value;
        const note = document.getElementById('cancelNote').value;
        
        if (!reason) {
            alert('Vui lòng chọn lý do hủy phòng!');
            return;
        }
        
        try {
            // Hiển thị loading
            const confirmBtn = document.querySelector('.btn-confirm-cancel');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            confirmBtn.disabled = true;
            
            // Gọi API hủy (backend tự động hoàn tiền)
            const result = await cancelBooking(madatphong);
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            // Đóng modal
            closeCancelModal();
            
            // Lấy thông tin hoàn tiền từ response
            const responseData = result.data || {};
            const trangThaiThanhToan = responseData.trangthaithanhtoan || responseData.Trangthaithanhtoan || '';
            const chinhSachHuy = responseData.chinhsachhuy || responseData.Chinhsachhuy || '';
            
            // Hiển thị thông báo chi tiết
            let successMessage = ' ' + result.message + '\n\n';
            
            if (trangThaiThanhToan === 'Đã hoàn tiền') {
                successMessage += ' Trạng thái: Đã hoàn tiền thành công\n';
                successMessage += ' Chính sách: ' + chinhSachHuy;
            } else if (trangThaiThanhToan) {
                successMessage += ' Trạng thái thanh toán: ' + trangThaiThanhToan;
            }
            
            alert(successMessage);
            
            // Reload lại danh sách và chuyển sang tab Đã hủy
            await loadBookings();
            switchTab('cancelled');
            
        } catch (error) {
            console.error(' Lỗi khi hủy đặt phòng:', error);
            alert('Không thể hủy đặt phòng. Vui lòng thử lại!');
            
            // Khôi phục nút
            const confirmBtn = document.querySelector('.btn-confirm-cancel');
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Xác Nhận Hủy';
                confirmBtn.disabled = false;
            }
        }
    }

    // --- YÊU CẦU ĐỔI PHÒNG ---
    function setupChangeRoomButtons() {
        const changeButtons = document.querySelectorAll('.btn-change-room');
        
        changeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const madatphong = this.getAttribute('data-booking-id');
                showChangeRoomModal(madatphong);
            });
        });
    }

    // --- ĐẶT LẠI PHÒNG (CHO ĐƠN ĐÃ HỦY) ---
    function setupRebookButtons() {
        const rebookButtons = document.querySelectorAll('.btn-rebook');
        
        rebookButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const checkIn = this.getAttribute('data-checkin');
                const checkOut = this.getAttribute('data-checkout');
                
                // Lưu thông tin ngày vào localStorage
                const searchData = {
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    adults: 2, // Mặc định
                    children: 0
                };
                
                localStorage.setItem('searchData', JSON.stringify(searchData));
                
                // Chuyển sang trang rooms
                window.location.href = 'rooms.html';
            });
        });
    }

    // --- ĐÁNH GIÁ KHÁCH SẠN ---
    function setupReviewButtons() {
        const reviewButtons = document.querySelectorAll('.btn-review');
        
        reviewButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const madatphong = this.getAttribute('data-booking-id');
                
                // Tìm thông tin đặt phòng
                const booking = allBookings.find(b => 
                    (b.madatphong || b.Madatphong) === parseInt(madatphong)
                );
                
                if (booking) {
                    showReviewModal(booking);
                }
            });
        });
    }

    // Hiển thị modal thông báo đổi phòng
    function showChangeRoomModal(madatphong) {
        const modalHTML = `
            <div class="change-room-modal-overlay" id="changeRoomModal">
                <div class="change-room-modal">
                    <div class="modal-header-icon">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <h2 class="modal-title">Yêu Cầu Đổi Phòng</h2>
                    
                    <div class="modal-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Yêu cầu đổi phòng cần được xác nhận bởi nhân viên và <strong>KHÔNG THỂ HỦY</strong> sau khi duyệt.</p>
                    </div>

                    <div class="contact-info">
                        <h3>Vui lòng liên hệ trực tiếp:</h3>
                        <div class="contact-grid">
                            <div class="contact-item">
                                <i class="fas fa-phone-alt"></i>
                                <div>
                                    <strong>Hotline</strong>
                                    <span>1900 xxxx</span>
                                </div>
                            </div>
                            <div class="contact-item">
                                <i class="fas fa-envelope"></i>
                                <div>
                                    <strong>Email</strong>
                                    <span>support@hotel.com</span>
                                </div>
                            </div>
                            <div class="contact-item">
                                <i class="fas fa-hotel"></i>
                                <div>
                                    <strong>Lễ tân</strong>
                                    <span>Tầng 1 - Khách sạn</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-close-modal" onclick="closeChangeRoomModal()">
                            <i class="fas fa-check"></i> Đã hiểu
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Thêm sự kiện đóng khi click overlay
        document.getElementById('changeRoomModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeChangeRoomModal();
            }
        });
    }

    // Đóng modal
    window.closeChangeRoomModal = function() {
        const modal = document.getElementById('changeRoomModal');
        if (modal) {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        }
    }

    // --- HIỂN THỊ MODAL ĐÁNH GIÁ ---
    function showReviewModal(booking) {
        const madatphong = booking.madatphong || booking.Madatphong;
        const checkInDate = formatDateDisplay(booking.ngaynhanphong || booking.Ngaynhanphong);
        const checkOutDate = formatDateDisplay(booking.ngaytraphong || booking.Ngaytraphong);
        const chiTiet = booking.chiTiet || [];
        
        // Tạo danh sách phòng đã ở và lấy mã phòng
        let roomListHTML = '';
        let roomIds = [];
        chiTiet.forEach(ct => {
            const phongInfo = ct.phongInfo || {};
            const loaiphongInfo = phongInfo.loaiphongInfo || {};
            const maphong = phongInfo.maphong || phongInfo.Maphong;
            const tenPhong = phongInfo.tenphong || 
                loaiphongInfo.tenloaiphong || loaiphongInfo.Tenloaiphong || 
                'Phòng';
            
            roomListHTML += `<span class="room-tag">${tenPhong}</span>`;
            if (maphong) roomIds.push(maphong);
        });
        
        const modalHTML = `
            <div class="review-modal-overlay" id="reviewModal">
                <div class="review-modal">
                    <div class="review-modal-header">
                        <h2><i class="fas fa-star"></i> Đánh Giá Khách Sạn</h2>
                        <button class="review-modal-close" onclick="closeReviewModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="review-modal-body">
                        <div class="booking-summary-review">
                            <div class="review-booking-info">
                                <h3>Thông tin lưu trú</h3>
                                <p><strong>Mã đặt phòng:</strong> #DP${madatphong}</p>
                                <p><strong>Thời gian:</strong> ${checkInDate} - ${checkOutDate}</p>
                                <div class="rooms-stayed">
                                    <strong>Phòng đã ở:</strong> ${roomListHTML}
                                </div>
                            </div>
                        </div>

                        <form id="reviewForm" class="review-form">
                            <div class="rating-section">
                                <h3><i class="fas fa-star"></i> Đánh giá khách sạn</h3>
                                <div class="rating-item-simple">
                                    <label>Mức độ hài lòng của bạn:</label>
                                    <div class="rating-stars-main" data-rating="hotel-rating">
                                        <span class="star" data-value="1">★</span>
                                        <span class="star" data-value="2">★</span>
                                        <span class="star" data-value="3">★</span>
                                        <span class="star" data-value="4">★</span>
                                        <span class="star" data-value="5">★</span>
                                    </div>
                                    <span class="rating-text-main" data-for="hotel-rating">Chưa đánh giá</span>
                                </div>
                            </div>

                            <div class="review-text-section">
                                <h3><i class="fas fa-comment-dots"></i> Bình luận của bạn</h3>
                                
                                <div class="review-textarea-group">
                                    <label for="reviewComment">Chia sẻ trải nghiệm của bạn:</label>
                                    <textarea id="reviewComment" name="comment" placeholder="Hãy chia sẻ cảm nhận về khách sạn, phòng ở, dịch vụ và những điều bạn thích hoặc muốn cải thiện..." rows="5" required></textarea>
                                    <small class="textarea-hint">Nhận xét của bạn sẽ giúp khách hàng khác có lựa chọn tốt hơn</small>
                                </div>
                            </div>

                            <div class="existing-reviews-section" id="existingReviews-${madatphong}">
                                <h3><i class="fas fa-comments"></i> Đánh giá từ khách hàng khác</h3>
                                <div class="existing-reviews-container">
                                    <p class="loading-reviews"><i class="fas fa-spinner fa-spin"></i> Đang tải đánh giá...</p>
                                </div>
                            </div>


                        </form>
                    </div>
                    
                    <div class="review-modal-footer">
                        <button type="button" class="review-modal-btn btn-cancel" onclick="closeReviewModal()">
                            <i class="fas fa-times"></i> Hủy
                        </button>
                        <button type="submit" class="review-modal-btn btn-submit" form="reviewForm">
                            <i class="fas fa-paper-plane"></i> Gửi Đánh Giá
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Đợi DOM được cập nhật hoàn toàn trước khi setup
        setTimeout(() => {
            // Setup rating stars
            setupRatingStars();
            
            // Setup form submit
            setupReviewFormSubmit(madatphong);
            
            // Load và hiển thị đánh giá có sẵn
            loadExistingReviews(madatphong, roomIds);
        }, 50);
        
        // Thêm class để trigger animation
        setTimeout(() => {
            document.getElementById('reviewModal').classList.add('show');
        }, 10);
    }

    // --- ĐÓNG MODAL ĐÁNH GIÁ ---
    window.closeReviewModal = function() {
        const modal = document.getElementById('reviewModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    // --- SETUP RATING STARS ---
    function setupRatingStars() {
        // Tìm rating group chính (đã đổi class name)
        const ratingGroup = document.querySelector('.rating-stars-main');
        
        if (!ratingGroup) {
            console.error('Không tìm thấy rating stars!');
            return;
        }
        
        const stars = ratingGroup.querySelectorAll('.star');
        const ratingText = document.querySelector('.rating-text-main');
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                const value = parseInt(this.dataset.value);
                
                // Cập nhật trạng thái sao
                stars.forEach((s, i) => {
                    if (i < value) {
                        s.classList.add('selected');
                    } else {
                        s.classList.remove('selected');
                    }
                });
                
                // Cập nhật text mô tả
                const descriptions = {
                    1: 'Rất tệ',
                    2: 'Tệ', 
                    3: 'Bình thường',
                    4: 'Tốt',
                    5: 'Xuất sắc'
                };
                
                if (ratingText) {
                    ratingText.textContent = `${descriptions[value]} (${value}/5)`;
                    ratingText.className = `rating-text-main rating-${value}`;
                }
                
                // Lưu giá trị vào data attribute
                ratingGroup.dataset.value = value;
            });
            
            // Hover effect
            star.addEventListener('mouseenter', function() {
                const value = parseInt(this.dataset.value);
                stars.forEach((s, i) => {
                    if (i < value) {
                        s.classList.add('hover');
                    } else {
                        s.classList.remove('hover');
                    }
                });
            });
        });
        
        // Remove hover effect khi rời khỏi group
        ratingGroup.addEventListener('mouseleave', function() {
            stars.forEach(s => s.classList.remove('hover'));
        });
    }

    // --- LOAD EXISTING REVIEWS ---
    async function loadExistingReviews(madatphong, roomIds) {
        try {
            const container = document.querySelector(`#existingReviews-${madatphong} .existing-reviews-container`);
            
            if (!container) {
                console.error('Không tìm thấy container cho đánh giá!');
                return;
            }
            
            if (!roomIds || roomIds.length === 0) {
                container.innerHTML = '<p class="no-reviews">Chưa có đánh giá nào cho phòng này.</p>';
                return;
            }

            // Kiểm tra hàm getRoomReviews có tồn tại không
            if (typeof getRoomReviews !== 'function') {
                console.error('Hàm getRoomReviews không được định nghĩa!');
                container.innerHTML = '<p class="error-reviews">Không thể tải đánh giá do lỗi hệ thống.</p>';
                return;
            }

            // Gọi API để lấy đánh giá
            const reviews = await getRoomReviews(roomIds);
            
            if (!reviews || reviews.length === 0) {
                container.innerHTML = '<p class="no-reviews">Chưa có đánh giá nào cho phòng này.</p>';
                return;
            }

            // Sắp xếp theo số sao giảm dần
            reviews.sort((a, b) => (b.sosao || 0) - (a.sosao || 0));

            // Tạo HTML cho các đánh giá
            let reviewsHTML = '';
            reviews.forEach((review, index) => {
                if (index >= 5) return; // Chỉ hiển thị tối đa 5 đánh giá

                const sosao = review.sosao || 0;
                const danhgia = review.danhgia || 'Không có nhận xét';
                const makh = review.makh || 'KH';

                // Tạo sao đánh giá
                let starsHTML = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= sosao) {
                        starsHTML += '<span class="star filled">★</span>';
                    } else {
                        starsHTML += '<span class="star empty">☆</span>';
                    }
                }

                reviewsHTML += `
                    <div class="existing-review-item">
                        <div class="review-header">
                            <div class="reviewer-info">
                                <span class="reviewer-name">Khách hàng #${makh}</span>
                                <div class="review-stars">
                                    ${starsHTML}
                                    <span class="rating-number">(${sosao}/5)</span>
                                </div>
                            </div>
                        </div>
                        <div class="review-content">
                            <p>"${danhgia}"</p>
                        </div>
                    </div>
                `;
            });

            // Thêm link xem thêm nếu có nhiều hơn 5 đánh giá
            if (reviews.length > 5) {
                reviewsHTML += `
                    <div class="view-more-reviews">
                        <p><i class="fas fa-plus-circle"></i> Và ${reviews.length - 5} đánh giá khác...</p>
                    </div>
                `;
            }

            container.innerHTML = reviewsHTML;

        } catch (error) {
            console.error('Lỗi khi tải đánh giá có sẵn:', error);
            const container = document.querySelector(`#existingReviews-${madatphong} .existing-reviews-container`);
            if (container) {
                container.innerHTML = '<p class="error-reviews">Không thể tải đánh giá. Vui lòng thử lại!</p>';
            }
        }
    }

    // --- SETUP FORM SUBMIT ---
    function setupReviewFormSubmit(madatphong) {
        console.log('🔧 Setting up form submit for booking:', madatphong);
        
        const form = document.getElementById('reviewForm');
        
        if (!form) {
            console.error('❌ Không tìm thấy form đánh giá với ID "reviewForm"!');
            // Debug: Liệt kê tất cả form có trong modal
            const allForms = document.querySelectorAll('#reviewModal form');
            console.log(' Các form tìm thấy trong modal:', allForms);
            return;
        }
        
        console.log(' Đã tìm thấy form đánh giá:', form);
        
        // Kiểm tra xem hàm submitReview có tồn tại không
        if (typeof submitReview !== 'function') {
            console.error(' Hàm submitReview không được định nghĩa! Kiểm tra api/my_bookings.js');
            console.log(' Các function có sẵn:', Object.keys(window).filter(key => key.includes('Review')));
            return;
        }
        
        console.log(' Hàm submitReview đã sẵn sàng');
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Thu thập dữ liệu đánh giá
            const ratingGroup = document.querySelector('.rating-stars-main');
            const ratingValue = parseInt(ratingGroup?.dataset.value || 0);
            
            // Kiểm tra xem đã đánh giá sao chưa
            if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
                alert('Vui lòng chọn số sao đánh giá từ 1-5!');
                return;
            }
            
            // Thu thập nội dung bình luận
            const formData = new FormData(form);
            const comment = formData.get('comment') || '';
            
            // Kiểm tra bình luận
            if (!comment.trim()) {
                alert('Vui lòng viết bình luận về trải nghiệm của bạn!');
                return;
            }
            
            if (comment.trim().length < 10) {
                alert('Bình luận phải có ít nhất 10 ký tự!');
                return;
            }
            
            const reviewData = {
                madatphong: madatphong,
                sosao: ratingValue,
                danhgia: comment.trim()
            };
            
            // Kiểm tra và lấy nút submit
            console.log(' Tìm kiếm nút submit trong form...');
            let submitBtn = form.querySelector('.btn-submit');
            
            // Nếu không tìm thấy trong form, thử tìm trong modal
            if (!submitBtn) {
                console.log(' Không tìm thấy nút trong form, thử tìm trong modal...');
                submitBtn = document.querySelector('#reviewModal .btn-submit');
            }
            
            // Nếu vẫn không tìm thấy, thử tìm theo attribute form
            if (!submitBtn) {
                console.log(' Thử tìm theo attribute form...');
                submitBtn = document.querySelector('button[form="reviewForm"]');
            }
            
            if (!submitBtn) {
                console.error(' Không tìm thấy nút submit với các selector:');
                console.error('   - form.querySelector(".btn-submit")');
                console.error('   - document.querySelector("#reviewModal .btn-submit")'); 
                console.error('   - document.querySelector("button[form=\\"reviewForm\\"]")');
                
                // Debug: Liệt kê tất cả nút trong modal
                const allButtons = document.querySelectorAll('#reviewModal button');
                console.log(' Tất cả button trong modal:', allButtons);
                allButtons.forEach((btn, index) => {
                    console.log(`   ${index}: class="${btn.className}", type="${btn.type}", text="${btn.textContent.trim()}"`);
                });
                
                alert('Không tìm thấy nút gửi đánh giá! Vui lòng kiểm tra console để biết thêm chi tiết.');
                return;
            }
            
            console.log(' Đã tìm thấy nút submit:', submitBtn);

            const originalText = submitBtn.innerHTML;

            try {
                console.log(' Bắt đầu gửi đánh giá với dữ liệu:', reviewData);
                
                // Hiển thị loading
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
                submitBtn.disabled = true;
                
                // Gọi API submit review
                console.log(' Gọi hàm submitReview...');
                const result = await submitReview(reviewData);
                console.log(' Kết quả từ API:', result);
                
                if (!result.success) {
                    throw new Error(result.message);
                }
                
                // Đóng modal
                closeReviewModal();
                
                // Hiển thị thông báo thành công
                alert(' Cảm ơn bạn đã đánh giá!\n\nĐánh giá của bạn sẽ giúp chúng tôi cải thiện chất lượng dịch vụ.');
                
                // Reload lại danh sách để cập nhật trạng thái đã đánh giá
                await loadBookings();
                switchTab('completed');
                
            } catch (error) {
                console.error(' Lỗi khi gửi đánh giá:', error);
                alert('Không thể gửi đánh giá. Vui lòng thử lại sau!');
                
                // Khôi phục nút (với kiểm tra an toàn)
                const currentSubmitBtn = form.querySelector('.btn-submit');
                if (currentSubmitBtn) {
                    currentSubmitBtn.innerHTML = originalText;
                    currentSubmitBtn.disabled = false;
                }
            }
        });
    }

    // --- KHỞI ĐỘNG ---
    await loadBookings();
});