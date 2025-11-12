// ===== VNPAY PAYMENT FUNCTION =====
async function createVNPayPayment(paymentInfo) {
    console.log(' Creating VNPay payment URL with:', paymentInfo);

    try {
        const payload = {
            Name: paymentInfo.name || 'Khách hàng',
            OrderId: parseInt(paymentInfo.orderId) || Math.floor(Date.now() / 1000),
            OrderType: paymentInfo.orderType || 'hotel_booking',
            Amount: paymentInfo.amount,
            OrderInfo: paymentInfo.orderInfo,
            OrderDescription: paymentInfo.orderDescription || paymentInfo.orderInfo,
            ReturnUrl: paymentInfo.returnUrl
        };

        console.log(' Sending to VNPay API:', payload);

        const response = await fetch('https://localhost:7076/api/Payment/CreateVNPayUrl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(' VNPay API error:', response.status, errorText);
            throw new Error(`VNPay API returned ${response.status}: ${errorText}`);
        }

        // Backend trả về JSON object có key "url"
        const responseData = await response.json();
        console.log(' Response data:', responseData);
        // alert(' Response: ' + JSON.stringify(responseData));

        const vnpayUrl = responseData.url || responseData.Url || responseData;
        console.log(' VNPay URL created:', vnpayUrl);
        // alert(' VNPay URL: ' + vnpayUrl);

        if (typeof vnpayUrl !== 'string' || !vnpayUrl.startsWith('http')) {
            // alert(' Invalid URL: ' + typeof vnpayUrl + ' - ' + vnpayUrl);
            throw new Error('Invalid VNPay URL format');
        }

        // alert(' Sẽ redirect đến: ' + vnpayUrl);
        return vnpayUrl;

    } catch (error) {
        console.error(' Error creating VNPay payment:', error);
        throw error;
    }
}

//Lây thông tin user từ localStorage và điền vào form
document.addEventListener('DOMContentLoaded', async() => {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!Object.keys(currentUser).length) {
            console.warn('Không có user');
            return;
        }

        let makhachhang = currentUser.customerId || currentUser.makhachhang || currentUser.makh || currentUser.MaKh || currentUser.id;

        // Nếu không có mã khách hàng, thử tìm bằng email
        if (!makhachhang && currentUser.email) {
            console.log(' Tìm khách hàng bằng email:', currentUser.email);
            try {
                const allCustomersRes = await fetch('https://localhost:7076/api/Khachhangs');
                if (allCustomersRes.ok) {
                    const allCustomers = await allCustomersRes.json();
                    const customer = allCustomers.find(c =>
                        (c.email || c.Email) === currentUser.email
                    );

                    if (customer) {
                        makhachhang = customer.makh || customer.maKh || customer.id;
                        console.log(' Tìm thấy mã khách hàng:', makhachhang);

                        // Cập nhật currentUser
                        currentUser.id = makhachhang;
                        currentUser.makh = makhachhang;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                }
            } catch (error) {
                console.error(' Lỗi khi tìm khách hàng:', error);
            }
        }

        if (!makhachhang) {
            return fillUserInfoToForm(currentUser);
        }

        const res = await fetch(`https://localhost:7076/api/Khachhangs/${makhachhang}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        fillUserInfoToForm(mapApiDataToUserInfo(data));
    } catch (err) {
        console.error('Lỗi tải user:', err);
        const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (Object.keys(localUser).length) fillUserInfoToForm(localUser);
    } finally {
        loadBookingData();
        setupFormHandlers();
    }
});

// Chuyển đổi dữ liệu API sang format form
function mapApiDataToUserInfo(d) {
    return {
        email: d.email || d.Email,
        fullName: d.hoten || d.HoTen || `${d.Ho || ''} ${d.Ten || ''}`.trim(),
        phone: d.sdt || d.SDT || d.phone,
        cccd: d.cccd || d.CCCD || d.cmnd || d.CMND,
        country: 'vn'
    };
}

// Điền thông tin vào form
function fillUserInfoToForm(u) {
    if (!u) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };

    const [ho, ...ten] = (u.fullName || '').trim().split(' ');
    setVal('email', u.email);
    setVal('cccd', u.cccd);
    setVal('last-name', ho || u.lastName);
    setVal('first-name', ten.join(' ') || u.firstName);
    setVal('phone', u.phone ? u.phone.toString().replace(/\D/g, '') : '');
    setVal('country', u.country || 'vn');
}

// Load dữ liệu booking từ localStorage
function loadBookingData() {
    try {
        const bookingDataString = localStorage.getItem('currentBooking');
        if (!bookingDataString) {
            console.warn('Không tìm thấy dữ liệu booking');
            return;
        }

        const bookingData = JSON.parse(bookingDataString);
        if (!bookingData.rooms || !Array.isArray(bookingData.rooms) || bookingData.rooms.length === 0) {
            console.error('Dữ liệu booking không hợp lệ');
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => displayAllBookingInfo(bookingData));
        } else {
            displayAllBookingInfo(bookingData);
        }
    } catch (error) {
        console.error('Lỗi khi load booking:', error);
    }
}

// Hiển thị tất cả thông tin booking
function displayAllBookingInfo(bookingData) {
    setTimeout(() => {
        displayHotelInfo(bookingData);
        displayRoomDetails(bookingData);
        displayPriceBreakdown(bookingData);
    }, 100);
}

// Hiển thị thông tin khách sạn và thời gian nhận/trả phòng
function displayHotelInfo(bookingData) {
    const searchInfo = bookingData.searchInfo || {};
    const hotelInfoElement = document.querySelector('.hotel-info');
    if (!hotelInfoElement) return;

    let checkinDate = 'Ngày không xác định';
    let checkoutDate = 'Ngày không xác định';
    let nightsText = '1 đêm';

    if (searchInfo.dateRange && searchInfo.dateRange.includes(' - ')) {
        const [startStr, endStr] = searchInfo.dateRange.split(' - ');
        checkinDate = formatDate(startStr);
        checkoutDate = formatDate(endStr);
        const nights = searchInfo.nights || 1;
        const actualNights = nights > 1 ? nights - 1 : 1;
        nightsText = `${nights} ngày ${actualNights} đêm`;
    }

    hotelInfoElement.innerHTML = `
        <h3>Thanh Trà Hotel</h3>
        <p><strong>Nhận phòng:</strong> ${checkinDate} từ 15:00</p>
        <p><strong>Trả phòng:</strong> ${checkoutDate} cho đến 12:00 (${nightsText})</p>
    `;
}

// Hiển thị chi tiết phòng
function displayRoomDetails(bookingData) {
    const roomsContainer = document.querySelector('.rooms-container');
    if (!roomsContainer || !bookingData.rooms || bookingData.rooms.length === 0) return;

    const searchInfo = bookingData.searchInfo || {};
    const nights = searchInfo.nights && searchInfo.nights > 1 ? searchInfo.nights - 1 : 1;
    let totalRoomPrice = 0;

    const roomsHTML = bookingData.rooms.map((room) => {
                const roomBasePrice = room.price * room.quantity * nights;
                const roomServicesTotal = Array.isArray(room.services) ?
                    room.services.reduce((sum, s) => sum + (s.dongia * s.soluong), 0) : 0;
                const roomTotalPrice = roomBasePrice + roomServicesTotal;
                totalRoomPrice += roomTotalPrice;

                const servicesHTML = Array.isArray(room.services) && room.services.length > 0 ? `
            <div class="services-breakdown">
                <div class="services-header">Dịch vụ:</div>
                ${room.services.map(s => `
                    <div class="service-line">
                        <span>${s.tendv} x${s.soluong}</span>
                        <span>${formatPrice(s.dongia * s.soluong)} VNĐ</span>
                    </div>
                `).join('')}
                <div class="price-line service-total">
                    <span>Tổng dịch vụ:</span>
                    <span>${formatPrice(roomServicesTotal)} VNĐ</span>
                </div>
            </div>
        ` : '';

        return `
            <div class="room-item">
                <div class="room-summary">
                    <span class="room-name">${room.name || room.title} ${room.quantity > 1 ? `x${room.quantity}` : ''}</span>
                    <span class="room-total">${formatPrice(roomTotalPrice)} VNĐ</span>
                </div>
                <div class="room-details-content collapsible-content">
                    <div class="price-breakdown">
                        <div class="price-line">
                            <span>Giá phòng:</span>
                            <span>${formatPrice(room.price)} VNĐ/đêm × ${nights} đêm</span>
                        </div>
                        ${room.quantity > 1 ? `
                        <div class="price-line">
                            <span>Số lượng:</span>
                            <span>${room.quantity} phòng</span>
                        </div>
                        ` : ''}
                        <div class="price-line">
                            <span>Tổng phòng:</span>
                            <span>${formatPrice(roomBasePrice)} VNĐ</span>
                        </div>
                        ${servicesHTML}
                        ${roomServicesTotal > 0 ? `
                        <div class="price-line total-line">
                            <span><strong>Tổng cộng (Phòng + Dịch vụ):</strong></span>
                            <span><strong>${formatPrice(roomTotalPrice)} VNĐ</strong></span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    roomsContainer.innerHTML = roomsHTML;
    bookingData.calculatedTotalPrice = totalRoomPrice;
    roomsContainer.classList.add('collapsed');
}

// Hiển thị breakdown giá
function displayPriceBreakdown(bookingData) {
    const totalPrice = bookingData.calculatedTotalPrice || bookingData.totalPrice || 0;
    const totalRoomPriceElement = document.querySelector('.price-row.total-room-price .price-value');
    const finalPriceElement = document.querySelector('.final-price');

    if (totalRoomPriceElement) totalRoomPriceElement.textContent = formatPrice(totalPrice) + ' VNĐ';
    if (finalPriceElement) finalPriceElement.textContent = formatPrice(totalPrice) + ' VNĐ';
}

// Format giá tiền
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
}

// Format ngày
function formatDate(dateStr) {
    if (!dateStr) return 'Ngày không xác định';
    
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return dateStr;
    
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${dayNames[date.getDay()]}, ${day}/${month}/${year}`;
}

// Setup event handlers
function setupFormHandlers() {
    const form = document.getElementById('customer-booking-form');
    const applyBtn = document.querySelector('.apply-btn');
    const editLink = document.querySelector('.edit-link');
    
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (applyBtn) applyBtn.addEventListener('click', handlePromoCode);
    if (editLink) editLink.addEventListener('click', toggleRoomDetails);
}

// Xử lý submit form
async function handleFormSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const submitBtn = document.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'ĐANG CHUYỂN SANG THANH TOÁN VNPAY...';
    submitBtn.disabled = true;

    try {
        const formData = collectFormData();
        const currentBooking = localStorage.getItem('currentBooking');
        if (!currentBooking) throw new Error('Không tìm thấy thông tin đặt phòng');

        const bookingData = JSON.parse(currentBooking);
        const paymentMethod = document.getElementById('payment-method-select')?.value || 'vnpay';

        const completeBookingData = {
            searchInfo: bookingData.searchInfo,
            rooms: bookingData.rooms || [],
            customer: {
                title: formData.title,
                firstName: formData.firstName,
                lastName: formData.lastName,
                fullName: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                cccd: formData.cccd,
                phone: formData.phone,
                country: formData.country,
                request: formData.specialRequests
            },
            paymentMethod: paymentMethod,
            submittedAt: new Date().toISOString()
        };

        console.log(' Complete Booking Data:', completeBookingData);

        // Bước 1: Lưu đặt phòng vào database
        console.log(' Bắt đầu lưu đặt phòng...');
        const result = await saveBooking(completeBookingData);
        
        console.log(' Kết quả từ saveBooking:', result);

        if (result.success) {
            console.log(' Lưu đặt phòng thành công!');
            localStorage.setItem('lastBookingResult', JSON.stringify(result));
            localStorage.setItem('completeBooking', JSON.stringify(completeBookingData));

            const maDatPhong = result.data.maDatPhong;
            const maHoaDon = result.data.maHoaDon;
            const tongTien = result.data.tongTien;
localStorage.removeItem('cartItems');
    localStorage.removeItem('currentBooking');
    cart = [];
            console.log(' Thông tin thanh toán:', { 
                maDatPhong, 
                maHoaDon, 
                tongTien, 
                paymentMethod,
                createVNPayPaymentExists: typeof createVNPayPayment
            });


            // Bước 2: Tạo URL thanh toán VNPay
            if (paymentMethod === 'vnpay') {
                console.log(' PaymentMethod = vnpay, bắt đầu tạo VNPay URL...');
                
                try {
                    const customerName = completeBookingData.customer.fullName || 'Khách hàng';
                    const orderInfo = `Thanh toan dat phong DP${maDatPhong}`;
                    
                    console.log(' Gọi createVNPayPayment với params:', {
                        name: customerName,
                        orderId: maHoaDon || maDatPhong,
                        orderType: 'hotel_booking',
                        amount: tongTien,
                        orderInfo: orderInfo,
                        orderDescription: `Dat phong khach san - ${customerName}`,
                        returnUrl: `${window.location.origin}/payment-result.html`
                    });

                    const vnpayUrl = await createVNPayPayment({
                        name: customerName,
                        orderId: maHoaDon || maDatPhong,
                        orderType: 'hotel_booking',
                        amount: tongTien,
                        orderInfo: orderInfo,
                        orderDescription: `Dat phong khach san - ${customerName}`,
                        returnUrl: `${window.location.origin}/payment-result.html`
                    });

                    console.log(' VNPay URL nhận được:', vnpayUrl);

                    if (vnpayUrl) {
                        // Chuyển hướng sang trang thanh toán VNPay
                        // alert(` Đặt phòng thành công!\n\nMã đặt phòng: DP${maDatPhong}\n\nBạn sẽ được chuyển sang trang thanh toán VNPay...`);
                        console.log(' Đang chuyển hướng đến:', vnpayUrl);
                        window.location.href = vnpayUrl;
                        return;
                    } else {
                        console.error(' VNPay URL trống!');
                        throw new Error('Không nhận được URL thanh toán từ VNPay');
                    }
                } catch (vnpayError) {
                    console.error(' Lỗi tạo thanh toán VNPay:', vnpayError);
                    // alert(` Đặt phòng thành công nhưng không thể tạo thanh toán VNPay.\n\nLỗi: ${vnpayError.message}\n\nMã đặt phòng: DP${maDatPhong}\nVui lòng liên hệ để hoàn tất thanh toán.`);
                    setTimeout(() => window.location.href = 'home.html', 3000);
                    return;
                }
            }

            // Fallback: Nếu không dùng VNPay hoặc có lỗi
            // alert(` Đặt phòng thành công!\n\n` +
            //       ` Mã đặt phòng: ${result.data.maDatPhongDisplay}\n` +
            //       ` Mã hóa đơn: ${result.data.maHoaDonDisplay || 'Đang xử lý'}\n` +
            //       ` Tổng tiền: ${tongTien?.toLocaleString('vi-VN')} VNĐ\n\n` +
            //       `Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!`);

            setTimeout(() => window.location.href = 'my_room.html', 2000);
        } else {
            throw new Error(result.message || 'Đã có lỗi xảy ra khi đặt phòng');
        }
    } catch (error) {
        console.error(' Lỗi đặt phòng - Full Error:', error);
        console.error(' Error message:', error.message);
        console.error(' Error stack:', error.stack);
        
        let errorMessage = error.message || 'Lỗi không xác định';
        let userFriendlyMessage = '';
        
        // Tùy chỉnh thông báo lỗi dựa trên loại lỗi
        if (errorMessage.includes('Không tìm thấy thông tin khách hàng')) {
            userFriendlyMessage = ' Lỗi xác thực khách hàng!\n\n' +
                                'Hệ thống không thể xác định thông tin khách hàng của bạn.\n' +
                'Vui lòng đăng xuất và đăng nhập lại để thử lại.\n\n' +
                ' Nếu vấn đề tiếp tục xảy ra, vui lòng liên hệ hỗ trợ.';
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            userFriendlyMessage = ' Lỗi kết nối mạng!\n\n' +
                                'Không thể kết nối đến server.\n' +
                                'Vui lòng kiểm tra kết nối internet và thử lại.';
        } else {
            userFriendlyMessage = ` Lỗi đặt phòng: ${errorMessage}\n\n` +
                                'Vui lòng thử lại hoặc liên hệ hỗ trợ.';
        }
        
        alert(userFriendlyMessage);
        
        // Nếu là lỗi xác thực khách hàng, chuyển về trang đăng nhập
        if (errorMessage.includes('Không tìm thấy thông tin khách hàng')) {
            setTimeout(() => {
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }, 3000);
        }
    } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Validate form
function validateForm() {
    const requiredFields = ['first-name', 'last-name', 'email', 'phone', 'cccd'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else if (field) {
            field.classList.remove('error');
        }
    });
    
    const emailField = document.getElementById('email');
    if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        emailField.classList.add('error');
        alert('Email không hợp lệ.');
        isValid = false;
    }
    
    const cccdField = document.getElementById('cccd');
    if (cccdField && cccdField.value && !/^\d{12}$/.test(cccdField.value)) {
        cccdField.classList.add('error');
        alert('CCCD phải có đúng 12 chữ số.');
        isValid = false;
    } else if (cccdField) {
        cccdField.classList.remove('error');
    }
    
    const agreeCheckbox = document.getElementById('agree');
    if (agreeCheckbox && !agreeCheckbox.checked) {
        alert('Vui lòng đồng ý với điều khoản đặt phòng.');
        isValid = false;
    }
    
    return isValid;
}

// Collect form data
function collectFormData() {
    const countryCode = document.querySelector('.country-code')?.value || '+84';
    const phoneNumber = document.getElementById('phone')?.value || '';
    
    return {
        title: document.getElementById('title')?.value || 'Ông/Bà',
        firstName: document.getElementById('first-name')?.value?.trim() || '',
        lastName: document.getElementById('last-name')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim() || '',
        cccd: document.getElementById('cccd')?.value?.trim() || '',
        phone: phoneNumber.trim(),
        phoneWithCode: `${countryCode} ${phoneNumber}`.trim(),
        country: document.getElementById('country')?.value || 'vn',
        specialRequests: document.getElementById('special-requests')?.value?.trim() || '',
        arrivalTime: document.getElementById('arrival-time')?.value || '',
        agreed: document.getElementById('agree')?.checked || false,
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
}

// Xử lý mã khuyến mại
function handlePromoCode(event) {
    event.preventDefault();
    const promoInput = document.querySelector('.promo-code-input input');
    const promoCode = promoInput?.value?.trim();
    
    if (!promoCode) {
        alert('Vui lòng nhập mã khuyến mại.');
        return;
    }
    
    alert('Chức năng mã khuyến mại đang được phát triển.');
}

// Toggle hiển thị chi tiết phòng
function toggleRoomDetails() {
    const roomsContainer = document.querySelector('.rooms-container');
    const editLink = document.querySelector('.edit-link');
    if (!roomsContainer || !editLink) return;
    
    const isCollapsed = roomsContainer.classList.contains('collapsed');
    roomsContainer.classList.toggle('collapsed');
    editLink.textContent = isCollapsed ? 'Thu gọn' : 'Mở rộng';
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadBookingData,
        displayHotelInfo,
        displayRoomDetails,
        displayPriceBreakdown,
        formatPrice,
        formatDate
    };
}