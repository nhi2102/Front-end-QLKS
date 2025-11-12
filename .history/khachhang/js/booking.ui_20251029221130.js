/**
 * ============================================
 * BOOKING UI LAYER - Xử lý giao diện người dùng
 * File này chỉ làm việc với DOM và hiển thị dữ liệu
 * ============================================
 */

// ===== KHỞI TẠO KHI TRANG LOAD =====
document.addEventListener('DOMContentLoaded', async() => {
    // Hiển thị điểm tích lũy ngay từ localStorage trước
    displayLoyaltyPointsFromLocalStorage();

    await loadUserInfo();
    loadBookingData();
    setupEventHandlers();
});

/**
 * Hiển thị điểm tích lũy từ localStorage ngay lập tức
 */
function displayLoyaltyPointsFromLocalStorage() {
    const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('LocalStorage currentUser:', localUser);

    // Đảm bảo section điểm tích lũy được hiển thị
    const loyaltySection = document.querySelector('.loyalty-points-display');
    if (loyaltySection) {
        loyaltySection.style.display = 'block';
        console.log('Made loyalty points section visible');
    }

    const currentPoints = localUser.diemthanhvien || localUser.Diemthanhvien || localUser.diemThanhVien || 0;
    const pointsEl = document.getElementById('customer-loyalty-points');

    console.log('Points from localStorage:', currentPoints);

    if (pointsEl) {
        pointsEl.textContent = currentPoints.toLocaleString('vi-VN');
        console.log('Set points display to:', currentPoints);
    } else {
        console.error('Element customer-loyalty-points not found!');
    }
}

// ===== LOAD & HIỂN THỊ DỮ LIỆU =====

/**
 * Load thông tin user từ API và điền vào form
 */
async function loadUserInfo() {
    try {
        const customer = await BookingAPI.getCustomerInfo();
        fillFormData(customer);

        // Hiển thị điểm thành viên ngay khi load user info
        await displayLoyaltyPointsImmediate(customer);

    } catch (err) {
        console.error('Lỗi load user:', err);
        // Fallback: dùng dữ liệu localStorage
        const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (localUser.email) {
            fillFormData(localUser);
            await displayLoyaltyPointsImmediate(localUser);
        }
    }
}

/**
 * Hiển thị điểm tích lũy ngay lập tức (không cần booking data)
 */
async function displayLoyaltyPointsImmediate(customerData) {
    console.log('displayLoyaltyPointsImmediate called with:', customerData);

    const currentPoints = customerData.diemthanhvien || customerData.Diemthanhvien || customerData.diemThanhVien || 0;
    const pointsEl = document.getElementById('customer-loyalty-points');
    const pointsInput = document.getElementById('use-points-input');

    if (pointsEl) {
        pointsEl.textContent = currentPoints.toLocaleString('vi-VN');
        console.log('Updated points display to:', currentPoints);
    } else {
        console.error('Element customer-loyalty-points not found!');
    }

    // Set max cho input điểm
    if (pointsInput) {
        pointsInput.max = currentPoints; // <- đảm bảo max = điểm thật
        if (currentPoints >= 1000) {
            pointsInput.disabled = false;
            pointsInput.placeholder = `Tối thiểu 1000, tối đa ${currentPoints.toLocaleString('vi-VN')} điểm`;
        } else {
            pointsInput.disabled = true;
            pointsInput.placeholder = `Cần tối thiểu 1000 điểm (hiện có ${currentPoints})`;
        }
    }
}
/**
 * Điền dữ liệu khách hàng vào form
 */
function fillFormData(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };

    // Tách họ tên
    const fullName = data.hoten || data.HoTen || data.fullName || '';
    const [ho, ...ten] = fullName.split(' ');

    setVal('email', data.email || data.Email);
    setVal('cccd', data.cccd || data.CCCD);
    setVal('last-name', ho);
    setVal('first-name', ten.join(' '));
    setVal('phone', (data.sdt || data.SDT || data.phone || '').replace(/\D/g, ''));
    setVal('country', data.country || 'vn');
}

/**
 * Load dữ liệu booking từ localStorage
 */
function loadBookingData() {
    // Thử các key có thể có
    const possibleKeys = ['currentBooking', 'bookingData', 'selectedRooms', 'cart'];
    let bookingData = null;

    for (const key of possibleKeys) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.rooms || data.selectedRooms || Array.isArray(data)) {
                bookingData = {...data, rooms: data.rooms || data.selectedRooms || data };
                break;
            }
        } catch (err) {
            console.warn(`Lỗi parse ${key}:`, err);
        }
    }

    if (!bookingData || !bookingData.rooms || !bookingData.rooms.length) {
        showErrorMessage('Không tìm thấy thông tin đặt phòng');
        return;
    }

    displayBookingInfo(bookingData);
}

/**
 * Hiển thị tất cả thông tin booking
 */
function displayBookingInfo(data) {
    displayHotelInfo(data);
    displayRoomDetails(data);
    displayPriceBreakdown(data);
    displayLoyaltyPoints(data);
}

/**
 * 1. Hiển thị thông tin khách sạn và ngày
 */
function displayHotelInfo(data) {
    const { dateRange, nights } = data.searchInfo || {};
    if (!dateRange) return;

    const [checkIn, checkOut] = dateRange.split(' - ');
    const hotelInfo = document.querySelector('.hotel-info');
    if (!hotelInfo) return;

    hotelInfo.innerHTML = `
        <h3>Thanh Trà Hotel</h3>
        <p><strong>Nhận phòng:</strong> ${formatDate(checkIn)} từ 15:00</p>
        <p><strong>Trả phòng:</strong> ${formatDate(checkOut)} cho đến 12:00 (${nights} đêm)</p>
    `;
}

/**
 * 2. Hiển thị chi tiết các phòng đã chọn
 */
function displayRoomDetails(data) {
    const container = document.querySelector('.rooms-container');
    if (!container) return;

    const nights = data.searchInfo && data.searchInfo.nights ? data.searchInfo.nights : 1;
    let totalPrice = 0;

    const roomsHTML = data.rooms.map(room => {
                const roomPrice = room.price * (room.quantity || 1) * nights;
                const servicesTotal = room.services ? room.services.reduce((sum, s) =>
                    sum + (s.dongia * s.soluong), 0) : 0;
                const roomTotal = roomPrice + servicesTotal;
                totalPrice += roomTotal;

                // HTML cho dịch vụ (nếu có)
                const servicesHTML = servicesTotal > 0 ? `
            <div class="services-breakdown">
                <p><strong>Dịch vụ:</strong></p>
                ${room.services.map(s => `
                    <p class="service-line">
                        - ${s.tendv} x${s.soluong}: ${formatPrice(s.dongia * s.soluong)} VNĐ
                    </p>
                `).join('')}
                <p class="service-total">Tổng dịch vụ: ${formatPrice(servicesTotal)} VNĐ</p>
            </div>
        ` : '';

        return `
            <div class="room-item">
                <div class="room-summary">
                    <span class="room-name">
                        ${room.name || room.title} 
                        ${room.quantity > 1 ? `x${room.quantity}` : ''}
                    </span>
                    <span class="room-total">${formatPrice(roomTotal)} VNĐ</span>
                </div>
                <div class="room-details-content collapsible-content">
                    <div class="price-breakdown">
                        <p>Giá phòng: ${formatPrice(room.price)} VNĐ/đêm × ${nights} đêm</p>
                        ${room.quantity > 1 ? `<p>Số lượng: ${room.quantity} phòng</p>` : ''}
                        <p>Tổng phòng: ${formatPrice(roomPrice)} VNĐ</p>
                        ${servicesHTML}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = roomsHTML;
    container.classList.add('collapsed'); // Mặc định thu gọn
    
    // Lưu tổng tiền để dùng sau
    data.totalPrice = totalPrice;
}

/**
 * 3. Hiển thị tổng giá tiền
 */
function displayPriceBreakdown(data) {
    const total = data.totalPrice || 0;
    
    const totalRoomEl = document.querySelector('.price-row.total-room-price .price-value');
    const finalPriceEl = document.querySelector('.final-price');
    
    if (totalRoomEl) totalRoomEl.textContent = formatPrice(total) + ' VNĐ';
    if (finalPriceEl) finalPriceEl.textContent = formatPrice(total) + ' VNĐ';
}

/**
 * 4. Hiển thị điểm tích lũy
 */
async function displayLoyaltyPoints(data) {
    console.log('displayLoyaltyPoints called with data:', data);
    
    try {
        // Thử lấy từ API trước
        let currentPoints = 0;
        try {
            const customer = await BookingAPI.getCustomerInfo();
            console.log('Customer info from API:', customer);
            currentPoints = customer.diemthanhvien || customer.Diemthanhvien || 0;
        } catch (apiError) {
            console.warn('API thất bại, fallback về localStorage:', apiError);
            // Fallback: lấy từ localStorage
            const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            console.log('Local user data:', localUser);
            currentPoints = localUser.diemthanhvien || localUser.Diemthanhvien || localUser.diemThanhVien || 0;
        }
        
        const pointsToEarn = Math.floor((data.totalPrice || 0) * 0.001);

        const pointsEl = document.getElementById('customer-loyalty-points');
        const infoEl = document.getElementById('loyalty-points-info');
        
        console.log('Current points:', currentPoints, 'Points to earn:', pointsToEarn);
        
        if (pointsEl) {
            pointsEl.textContent = currentPoints.toLocaleString('vi-VN');
            console.log('Updated points display to:', currentPoints);
        } else {
            console.error('Element customer-loyalty-points not found!');
        }
        
        if (infoEl && pointsToEarn > 0) {
            infoEl.innerHTML = `
                
                <span>Nhận <strong>+${pointsToEarn}</strong> điểm sau check-out</span>
            `;
        } else if (infoEl) {
            infoEl.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>Điểm sẽ được cộng sau khi check-out</span>
            `;
        }
    } catch (err) {
        console.error('Lỗi hiển thị điểm tích lũy:', err);
    }
}

// ===== XỬ LÝ SỰ KIỆN =====

/**
 * Setup các event handlers
 */
function setupEventHandlers() {
    const form = document.getElementById('customer-booking-form');
    const editLink = document.querySelector('.edit-link');
    const modalOverlay = document.querySelector('.modal-overlay');
    
    // Points handling
    const applyPointsBtn = document.getElementById('apply-points-btn');
    const useAllPointsBtn = document.getElementById('use-all-points-btn');
    const removePointsBtn = document.getElementById('remove-points-btn');
    const usePointsInput = document.getElementById('use-points-input');
    
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (editLink) editLink.addEventListener('click', toggleRoomDetails);
    if (modalOverlay) modalOverlay.addEventListener('click', closeGroupBookingModal);
    
    // Points events
    if (applyPointsBtn) applyPointsBtn.addEventListener('click', handleApplyPoints);
    if (useAllPointsBtn) useAllPointsBtn.addEventListener('click', handleUseAllPoints);
    if (removePointsBtn) removePointsBtn.addEventListener('click', handleRemovePoints);
    if (usePointsInput) {
        usePointsInput.addEventListener('input', validatePointsInput);
        usePointsInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyPoints();
            }
        });
    }
}

// ===== XỬ LÝ ĐIỂM TÍCH LŨY =====

/**
 * Xử lý áp dụng điểm tích lũy
 */
function handleApplyPoints() {
    const pointsInput = document.getElementById('use-points-input');
    const pointsToUse = parseInt(pointsInput.value) || 0;
    if (pointsToUse < 1000) { alert('Cần tối thiểu 1000 điểm'); return; }

    // Lưu vào bookingData
    const bookingData = JSON.parse(localStorage.getItem('currentBooking') || '{}');
    bookingData.diemSuDung = pointsToUse;
    localStorage.setItem('currentBooking', JSON.stringify(bookingData));

    // Hiển thị UI giảm giá
    showPointsDiscount(pointsToUse, pointsToUse);

    // Disable input / buttons
    pointsInput.disabled = true;
    document.getElementById('apply-points-btn').disabled = true;
    document.getElementById('use-all-points-btn').disabled = true;

    // **CẬP NHẬT TỔNG TIỀN NGAY**
    updateTotalPrice();  // <-- thêm dòng này
}



/**
 * Xử lý sử dụng tất cả điểm
 */
function handleUseAllPoints() {
    const pointsInput = document.getElementById('use-points-input');
    const maxPoints = parseInt(pointsInput.max) || 0;
    
    if (maxPoints <= 0) {
        alert('Bạn không có điểm tích lũy nào!');
        return;
    }
    
    if (maxPoints < 1000) {
        alert('Bạn cần tối thiểu 1000 điểm để có thể sử dụng!');
        return;
    }
    
    pointsInput.value = maxPoints;
    handleApplyPoints();
}

/**
 * Xử lý hủy sử dụng điểm
 */
function handleRemovePoints() {
    // Reset input
    const pointsInput = document.getElementById('use-points-input');
    pointsInput.value = 0;
    pointsInput.disabled = false;
    
    // Enable buttons
    document.getElementById('apply-points-btn').disabled = false;
    document.getElementById('use-all-points-btn').disabled = false;
    
    // Ẩn section giảm giá
    const discountSection = document.getElementById('points-discount');
    if (discountSection) {
        discountSection.style.display = 'none';
    }
    
    // Cập nhật tổng tiền
    updateTotalPrice();
    
    console.log('Đã hủy sử dụng điểm tích lũy');
}

/**
 * Validate input điểm
 */
function validatePointsInput() {
    const pointsInput = document.getElementById('use-points-input');
    const maxPoints = parseInt(pointsInput.max) || 0;
    let currentValue = parseInt(pointsInput.value) || 0;
    
    if (currentValue > maxPoints) {
        pointsInput.value = maxPoints;
        return;
    }
    
    if (currentValue < 0) {
        pointsInput.value = 0;
        return;
    }
    
    // Nếu người dùng nhập, tự động làm tròn xuống bội số của 1000
    if (currentValue > 0 && currentValue < 1000) {
        pointsInput.value = 1000;
    } else if (currentValue >= 1000) {
        // Làm tròn xuống bội số gần nhất của 1000
        const roundedValue = Math.floor(currentValue / 1000) * 1000;
        if (roundedValue !== currentValue) {
            pointsInput.value = roundedValue;
        }
    }
}

/**
 * Hiển thị section giảm giá từ điểm
 */
function showPointsDiscount(discountAmount, pointsUsed) {
    const discountSection = document.getElementById('points-discount');
    const discountValue = document.getElementById('points-discount-value');
    
    if (discountSection && discountValue) {
        discountValue.textContent = `${discountAmount.toLocaleString('vi-VN')} VNĐ`;
        discountSection.style.display = 'flex';
    }
}

/**
 * Cập nhật tổng tiền sau khi áp dụng/hủy điểm
 */
function updateTotalPrice() {
    const bookingData = JSON.parse(localStorage.getItem('currentBooking') || '{}');
    const originalTotal = bookingData.totalPrice || 0;
    const pointsUsed = bookingData.diemSuDung || 0; // lấy từ bookingData
    const discountAmount = pointsUsed; // 1000 điểm = 1,000 VNĐ

    const finalTotal = Math.max(0, originalTotal - discountAmount);

    // Cập nhật UI
    document.querySelectorAll('.final-price').forEach(el => {
        el.textContent = `${finalTotal.toLocaleString('vi-VN')} VNĐ`;
    });

    console.log(`Tổng tiền sau giảm: ${finalTotal.toLocaleString('vi-VN')} VNĐ`);
}


/**
 * Xử lý submit form đặt phòng
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const btn = document.querySelector('.submit-btn');
    btn.disabled = true;
    btn.textContent = 'ĐANG XỬ LÝ...';

    try {
        const bookingData = JSON.parse(localStorage.getItem('currentBooking'));
        const result = await BookingAPI.bookRooms(bookingData);

        console.log(" Đặt phòng xong:", result);

        // === Kiểm tra tổng số phòng (để hiện modal giảm giá) ===
        const totalRooms = bookingData.rooms.reduce((sum, r) => sum + (r.quantity || 1), 0);

        // Nếu là đặt theo đoàn => Hiện modal thông báo giảm giá
        if (totalRooms >= 5) {
            showGroupBookingModal(totalRooms, result.tongTien);

            console.log(" Hiển thị modal giảm giá, chờ 3 giây...");
            await new Promise(r => setTimeout(r, 3000)); // chờ khách đọc 3 giây
        }
const finalAmount = result.tongTien;
        //  Sau khi hiển thị modal (nếu có), bắt đầu thanh toán
        const customerData = collectFormData();
        const vnpayUrl = await BookingAPI.createVNPayURL({
            name: customerData.fullName,
            orderId: result.hoaDonId,
            amount: invoice.tongTie,  // đã là giá sau giảm
            orderInfo: `Thanh toán đặt phòng DP${result.bookingId}`,
            orderDescription: `Khách sạn Thanh Trà - ${customerData.fullName}`,
            returnUrl: `${window.location.origin}/payment-result.html`
        });

        //  Xóa dữ liệu tạm trước khi chuyển trang
        localStorage.removeItem('currentBooking');
        localStorage.removeItem('bookingData');
        localStorage.removeItem('selectedRooms');
        localStorage.removeItem('cart');

        console.log(' Chuyển sang VNPay:', vnpayUrl);
        window.location.href = vnpayUrl;

    } catch (err) {
        alert(' ' + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'ĐẶT PHÒNG';
    }
}






/**
 * Validate form trước khi submit
 */
function validateForm() {
    // Chỉ validate các trường thực tế có trong HTML
    const requiredFields = ['first-name', 'last-name', 'email', 'phone'];
    let isValid = true;

    console.log(' Bắt đầu validate form...');

    // Kiểm tra các trường bắt buộc
    requiredFields.forEach(id => {
        const field = document.getElementById(id);
        const value = field?.value?.trim();
        console.log(`  - ${id}: "${value}"`);
        
        if (!value) {
            field?.classList.add('error');
            console.log(`   Trường ${id} trống!`);
            isValid = false;
        } else {
            field?.classList.remove('error');
            console.log(`   Trường ${id} OK`);
        }
    });

    // Kiểm tra email
    const emailField = document.getElementById('email');
    if (emailField?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        emailField.classList.add('error');
        console.log('   Email không hợp lệ');
        alert('Email không hợp lệ');
        isValid = false;
    }

    // Kiểm tra đồng ý điều khoản
    const agreeCheckbox = document.getElementById('agree');
    if (!agreeCheckbox?.checked) {
        alert('Vui lòng đồng ý với điều khoản đặt phòng');
        isValid = false;
    }

    return isValid;
}

/**
 * Thu thập dữ liệu từ form
 */
function collectFormData() {
    return {
        title: document.getElementById('title')?.value || 'Ông/Bà',
        firstName: document.getElementById('first-name')?.value?.trim() || '',
        lastName: document.getElementById('last-name')?.value?.trim() || '',
        fullName: `${document.getElementById('first-name')?.value} ${document.getElementById('last-name')?.value}`.trim(),
        email: document.getElementById('email')?.value?.trim() || '',
        cccd: document.getElementById('cccd')?.value?.trim() || '',
        phone: document.getElementById('phone')?.value?.trim() || '',
        country: document.getElementById('country')?.value || 'vn',
        request: document.getElementById('special-requests')?.value?.trim() || ''
    };
}

/**
 * Toggle hiển thị/ẩn chi tiết phòng
 */
function toggleRoomDetails() {
    const container = document.querySelector('.rooms-container');
    const link = document.querySelector('.edit-link');
    if (!container || !link) return;
    
    const isCollapsed = container.classList.toggle('collapsed');
    link.textContent = isCollapsed ? 'Mở rộng' : 'Thu gọn';
}

// ===== MODAL ĐẶT PHÒNG ĐOÀN =====

/**
 * Hiển thị modal đặt phòng đoàn
 */
function showGroupBookingModal(totalRooms, totalPrice) {
    let discountPercent = 0;
    if (totalRooms >= 10) discountPercent = 10;
    else if (totalRooms >= 7) discountPercent = 5;
    else if (totalRooms >= 5) discountPercent = 3;

    const discount = totalPrice * discountPercent / 100;
    const finalPrice = totalPrice - discount;

    document.getElementById('modalRoomCount').textContent = `${totalRooms} phòng`;
    document.getElementById('modalDiscount').textContent = 
        discountPercent > 0 ? `${discountPercent}% (${formatPrice(discount)} VNĐ)` : 'Không áp dụng';
    document.getElementById('modalTotal').textContent = formatPrice(finalPrice) + ' VNĐ';

    const modal = document.getElementById('groupBookingModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}




/**
 * Đóng modal đặt phòng đoàn
 */
function closeGroupBookingModal() {
    const modal = document.getElementById('groupBookingModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Export hàm đóng modal để HTML có thể gọi
window.closeGroupBookingModal = closeGroupBookingModal;

// ===== UTILITY FUNCTIONS =====

/**
 * Format số tiền
 */
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
}

/**
 * Format ngày tháng
 */
function formatDate(dateStr) {
    if (!dateStr) return 'Ngày không xác định';
    
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return dateStr;
    
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${dayNames[date.getDay()]}, ${day}/${month}/${year}`;
}

/**
 * Hiển thị thông báo lỗi
 */
function showErrorMessage(message) {
    const container = document.querySelector('.booking-summary, .booking-details, .booking-container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-warning" style="text-align:center; padding:20px; margin:20px 0; border:1px solid #ffc107; background:#fff3cd; border-radius:8px;">
                <h5 style="color:#856404; margin-bottom:15px;"> ${message}</h5>
                <button onclick="window.location.href='rooms.html'" 
                        class="btn btn-primary" 
                        style="padding:10px 20px; margin-top:10px;">
                    Chọn phòng
                </button>
            </div>
        `;
    }
}
document.getElementById('continuePayment').addEventListener('click', () => {
    closeGroupBookingModal();
   const btn = document.querySelector('.submit-btn');
    if (btn) btn.disabled = false;  // bật lại nút thanh toán
});