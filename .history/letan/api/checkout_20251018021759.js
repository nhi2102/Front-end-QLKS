
const API_BASE_URL = "https://localhost:7076/api";
let currentBooking = null;
let originalRoomCharge = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    loadCurrentGuests();
    setupEventListeners();
    setDefaultCheckOutTime();
});

// Check user login
function checkUserLogin() {
    const currentUser = localStorage.getItem("currentUser");

    if (!currentUser) {
        alert("Bạn cần đăng nhập để truy cập trang này!");
        window.location.href = "../login.html";
        return;
    }

    try {
        const userData = JSON.parse(currentUser);
        document.getElementById("userName").textContent = userData.hoTen || userData.name || "Nhân Viên";
    } catch (error) {
        console.error("Lỗi parse user data:", error);
        document.getElementById("userName").textContent = "Nhân Viên";
    }
}

// Helper function to safely set text content
function safeSetText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value || '-';
    } else {
        console.warn(` Element not found: ${elementId}`);
    }
}

// Format currency
function formatCurrency(amount) {
    if (!amount || amount === 0) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Setup event listeners
function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    // Equipment status change handler
    window.handleEquipmentStatusChange = handleEquipmentStatusChange;

    // Extra charge manual change handler
    document.addEventListener('input', function(event) {
        if (event.target.id === 'extraCharge') {
            // Update base amount when user manually changes extra charge
            const extraChargeEl = document.getElementById('extraCharge');
            if (extraChargeEl) {
                extraChargeEl.dataset.baseAmount = extraChargeEl.value;
            }
        }
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Set default checkout time
function setDefaultCheckOutTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    const checkOutTimeEl = document.getElementById('checkOutTime');
    if (checkOutTimeEl) {
        checkOutTimeEl.value = currentTime;
    }
}

// Check if date is today
function isToday(dateString) {
    if (!dateString) return false;

    try {
        const date = new Date(dateString);
        const today = new Date();

        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    } catch (error) {
        return false;
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

// Load current guests (pending checkouts for today)
async function loadCurrentGuests() {
    try {
        console.log(' Loading pending checkouts for today...');

        const response = await fetch(`${API_BASE_URL}/Datphongs/pending-checkouts`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const todayCheckouts = await response.json();
        console.log(' Pending checkouts loaded:', todayCheckouts.length);

        // Debug API response structure
        if (todayCheckouts.length > 0) {
            console.log(' Sample checkout record:', todayCheckouts[0]);
            console.log(' Available fields:', Object.keys(todayCheckouts[0]));
        }

        displayCurrentGuests(todayCheckouts);
        updateGuestCount(todayCheckouts.length);

    } catch (error) {
        console.error(' Error loading current guests:', error);
        displayError('Không thể tải dữ liệu khách hàng');
    }
}

// Extract ALL room numbers (hiển thị tất cả phòng nếu đặt nhiều phòng)
function extractRoomNumber(booking) {
    console.log('🔍 extractRoomNumber - Debug booking data:', {
        bookingId: booking.maDatPhong || booking.madatphong,
        soPhong: booking.soPhong,
        SoPhong: booking.SoPhong,
        sophong: booking.sophong,
        roomNumber: booking.roomNumber,
        danhSachPhong: booking.danhSachPhong,
        hasChitiet: !!booking.chitietdatphongs,
        chitietLength: booking.chitietdatphongs ? booking.chitietdatphongs.length : 0,
        allKeys: Object.keys(booking),
        fullBooking: booking // In toàn bộ object để debug
    });

    // Strategy 1: From pending-checkouts API response (new structure)
    if (booking.soPhong) {
        console.log('✅ Found: booking.soPhong =', booking.soPhong);
        return booking.soPhong;
    }
    if (booking.SoPhong) {
        console.log('✅ Found: booking.SoPhong =', booking.SoPhong);
        return booking.SoPhong;
    }

    // Strategy 2: Legacy direct room number fields
    if (booking.sophong) {
        console.log('✅ Found: booking.sophong =', booking.sophong);
        return booking.sophong;
    }
    if (booking.roomNumber) {
        console.log('✅ Found: booking.roomNumber =', booking.roomNumber);
        return booking.roomNumber;
    }

    // Strategy 2.5: From danhSachPhong array (giống services.js)
    if (booking.danhSachPhong && booking.danhSachPhong.length > 0) {
        console.log('🔍 Checking danhSachPhong array:', booking.danhSachPhong.length, 'items');

        const roomNumbers = booking.danhSachPhong.map(room =>
            room.sophong || room.soPhong || room.Sophong || room.SoPhong || room.roomNumber || room.number || 'N/A'
        ).filter(num => num !== 'N/A');

        if (roomNumbers.length > 0) {
            console.log('✅ Found rooms in danhSachPhong:', roomNumbers.join(', '));
            return roomNumbers.join(', ');
        }
    }

    // Strategy 3: From chitietdatphongs array - LẤY TẤT CẢ PHÒNG
    if (booking.chitietdatphongs && Array.isArray(booking.chitietdatphongs) && booking.chitietdatphongs.length > 0) {
        console.log('🔍 Checking chitietdatphongs array:', booking.chitietdatphongs.length, 'items');

        const roomNumbers = [];

        for (const detail of booking.chitietdatphongs) {
            console.log('🔍 Detail item:', {
                sophong: detail.sophong,
                soPhong: detail.soPhong,
                hasMaphongNav: !!detail.maphongNavigation,
                maphongNavKeys: detail.maphongNavigation ? Object.keys(detail.maphongNavigation) : [],
                allDetailKeys: Object.keys(detail)
            });

            let roomNum = null;

            // Try all possible field names
            if (detail.sophong) roomNum = detail.sophong;
            else if (detail.soPhong) roomNum = detail.soPhong;
            else if (detail.Sophong) roomNum = detail.Sophong;
            else if (detail.SoPhong) roomNum = detail.SoPhong;
            // Check maphongNavigation
            else if (detail.maphongNavigation) {
                roomNum = detail.maphongNavigation.sophong ||
                    detail.maphongNavigation.soPhong ||
                    detail.maphongNavigation.Sophong ||
                    detail.maphongNavigation.SoPhong;
            }
            // Check phongNavigation (alternative name)
            else if (detail.phongNavigation) {
                roomNum = detail.phongNavigation.sophong ||
                    detail.phongNavigation.soPhong ||
                    detail.phongNavigation.Sophong ||
                    detail.phongNavigation.SoPhong;
            }
            // Check maphong field directly
            else if (detail.maphong) roomNum = detail.maphong;
            else if (detail.maPhong) roomNum = detail.maPhong;

            if (roomNum) {
                console.log('✅ Found room in detail:', roomNum);
                roomNumbers.push(roomNum);
            } else {
                console.warn('⚠️ No room number found in this detail item');
            }
        }

        // Nếu có nhiều phòng, nối bằng dấu phẩy
        if (roomNumbers.length > 0) {
            console.log('✅ Final result:', roomNumbers.join(', '));
            return roomNumbers.join(', ');
        }
    }

    console.warn('❌ No room number found anywhere - returning "-"');
    return '-';
}

// Display current guests in table
function displayCurrentGuests(bookings) {
    const tbody = document.getElementById('currentGuestsList');
    if (!tbody) {
        console.error(' Table body not found');
        return;
    }

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="no-data">
                    <i class="fas fa-calendar-check"></i> 
                    Không có khách checkout hôm nay
                </td>
            </tr>
        `;
        return;
    }

    // Debug: Log first booking structure to see available fields
    if (bookings.length > 0) {
        console.log(' Sample booking structure from pending-checkouts:', bookings[0]);
        console.log(' Available fields:', Object.keys(bookings[0]));
    }

    tbody.innerHTML = bookings.map(booking => {
        // Extract booking information with pending-checkouts API structure
        const bookingId = booking.maDatPhong || booking.MaDatPhong || booking.madatphong || booking.id || '-';

        // Customer name from pending-checkouts API
        let customerName = '-';
        if (booking.tenKhachHang) {
            customerName = booking.tenKhachHang;
        } else if (booking.TenKhachHang) {
            customerName = booking.TenKhachHang;
        } else if (booking.ten) {
            customerName = booking.ten;
        } else if (booking.customerName) {
            customerName = booking.customerName;
        }

        // Phone number from pending-checkouts API
        let phone = '-';
        if (booking.soDienThoai) {
            phone = booking.soDienThoai;
        } else if (booking.SoDienThoai) {
            phone = booking.SoDienThoai;
        } else if (booking.sdt) {
            phone = booking.sdt;
        } else if (booking.SDT) {
            phone = booking.SDT;
        } else if (booking.phone) {
            phone = booking.phone;
        }

        const roomNumber = extractRoomNumber(booking);

        // Handle dates with pending-checkouts API fields
        const checkInDateRaw = booking.ngayNhanPhong || booking.NgayNhanPhong || booking.ngaynhanphong || booking.checkInDate;
        const checkOutDateRaw = booking.ngayTraPhong || booking.NgayTraPhong || booking.ngaytraphong || booking.checkOutDate;

        const checkInDate = formatDate(checkInDateRaw);
        const checkOutDate = formatDate(checkOutDateRaw);

        // Calculate nights
        let nights = 1;
        if (checkInDateRaw && checkOutDateRaw) {
            const checkIn = new Date(checkInDateRaw);
            const checkOut = new Date(checkOutDateRaw);
            if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
                nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
            }
        }

        return `
            <tr>
                <td><span class="booking-code">${bookingId}</span></td>
                <td><strong>${customerName}</strong></td>
                <td>${phone}</td>
                <td><span class="room-number">${roomNumber}</span></td>
                <td>${checkInDate}</td>
                <td>${checkOutDate}</td>
                <td>${nights} đêm</td>
                <td><span class="status-badge status-checkedin">Đang ở</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-checkout" onclick='openCheckOutModal(${JSON.stringify(booking).replace(/'/g, "&apos;")})'>
                            <i class="fas fa-sign-out-alt"></i> Check-out
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    console.log(' HTML generated successfully for', bookings.length, 'bookings');
}

// Update guest count display
function updateGuestCount(count) {
    const guestCountEl = document.getElementById('guestCount');
    if (guestCountEl) {
        guestCountEl.textContent = `${count} khách`;
    }
}

// Display error message
function displayError(message) {
    const tbody = document.getElementById('currentGuestsList');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="error">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </td>
            </tr>
        `;
    }
}

// Search checkout functionality
async function searchCheckout() {
    const bookingCode = document.getElementById('searchBookingCode').value.trim();
    const roomNumber = document.getElementById('searchRoomNumber').value.trim();
    const customerName = document.getElementById('searchName').value.trim();

    if (!bookingCode && !roomNumber && !customerName) {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Datphongs/pending-checkouts`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const allBookings = await response.json();

        // Filter based on search criteria using pending-checkouts API fields
        const filteredBookings = allBookings.filter(booking => {
            const matchBookingCode = !bookingCode ||
                String(booking.maDatPhong || booking.MaDatPhong || booking.madatphong || '').includes(bookingCode);

            const matchRoomNumber = !roomNumber ||
                String(extractRoomNumber(booking)).includes(roomNumber);

            const matchCustomerName = !customerName ||
                String(booking.tenKhachHang || booking.TenKhachHang || booking.ten || '').toLowerCase().includes(customerName.toLowerCase());

            return matchBookingCode && matchRoomNumber && matchCustomerName;
        });

        displayCurrentGuests(filteredBookings);
        updateGuestCount(filteredBookings.length);

    } catch (error) {
        console.error(' Search error:', error);
        alert('Lỗi tìm kiếm: ' + error.message);
    }
}

// Fetch service charges from multiple possible sources
async function fetchServiceCharges(maDatPhong) {
    try {
        console.log(' Fetching service charges for booking:', maDatPhong);

        let totalServiceAmount = 0;

        // Method 1: Try to get from Chitiethoadons (invoice details)
        try {
            const response = await fetch(`${API_BASE_URL}/Chitiethoadons`);
            if (response.ok) {
                const allServices = await response.json();
                console.log(' Found', allServices.length, 'invoice detail records');

                // Filter services for this booking - only service charges
                const bookingServices = allServices.filter(service => {
                    const serviceBookingId = service.madatphong || service.maDatPhong || service.bookingId;
                    const loaiPhi = service.loaiphi || service.loaiPhi || service.type || '';

                    const matchesBooking = serviceBookingId == maDatPhong;
                    const isServiceCharge = loaiPhi.toLowerCase().includes('dịch vụ') ||
                        loaiPhi.toLowerCase().includes('service');

                    return matchesBooking && isServiceCharge;
                });

                console.log(' Service charges found in Chitiethoadons:', bookingServices.length);

                // Calculate total service amount
                bookingServices.forEach(service => {
                    const amount = service.thanhtien || service.thanhTien || service.dongia || service.donGia || service.price || service.amount || 0;
                    totalServiceAmount += parseFloat(amount) || 0;
                });
            }
        } catch (error) {
            console.warn(' Could not fetch from Chitiethoadons:', error.message);
        }

        // Method 2: Try to get from Sudungdvs (service usage) if no results from method 1
        if (totalServiceAmount === 0) {
            try {
                const response = await fetch(`${API_BASE_URL}/Sudungdvs`);
                if (response.ok) {
                    const allServiceUsage = await response.json();
                    console.log(' Found', allServiceUsage.length, 'service usage records');

                    // Filter for this booking
                    const bookingServiceUsage = allServiceUsage.filter(usage => {
                        const usageBookingId = usage.madatphong || usage.maDatPhong || usage.bookingId;
                        return usageBookingId == maDatPhong;
                    });

                    console.log(' Service usage found in Sudungdvs:', bookingServiceUsage.length);

                    // Calculate total from service usage
                    for (const usage of bookingServiceUsage) {
                        const quantity = usage.soluong || usage.soLuong || usage.quantity || 1;

                        // Try to get service price from the usage record or fetch from Dichvus
                        let servicePrice = 0;

                        if (usage.dichvu && usage.dichvu.giatien) {
                            servicePrice = usage.dichvu.giatien;
                        } else if (usage.dichvu && usage.dichvu.giaTien) {
                            servicePrice = usage.dichvu.giaTien;
                        } else if (usage.giatien || usage.giaTien) {
                            servicePrice = usage.giatien || usage.giaTien;
                        } else if (usage.madv || usage.maDv) {
                            // Fetch service price from Dichvus
                            try {
                                const serviceResponse = await fetch(`${API_BASE_URL}/Dichvus/${usage.madv || usage.maDv}`);
                                if (serviceResponse.ok) {
                                    const serviceData = await serviceResponse.json();
                                    servicePrice = serviceData.giatien || serviceData.giaTien || 0;
                                }
                            } catch (e) {
                                console.warn('Could not fetch service price for:', usage.madv || usage.maDv);
                            }
                        }

                        totalServiceAmount += servicePrice * quantity;
                    }
                }
            } catch (error) {
                console.warn(' Could not fetch from Sudungdvs:', error.message);
            }
        }

        // Method 3: Try specific service history endpoint if available
        if (totalServiceAmount === 0) {
            try {
                const response = await fetch(`${API_BASE_URL}/Sudungdvs/history/${maDatPhong}`);
                if (response.ok) {
                    const serviceHistory = await response.json();
                    console.log(' Service history found:', serviceHistory.length, 'records');

                    serviceHistory.forEach(item => {
                        const amount = item.thanhTien || item.donGia || item.giaPhuc || 0;
                        totalServiceAmount += parseFloat(amount) || 0;
                    });
                }
            } catch (error) {
                console.warn(' Could not fetch service history:', error.message);
            }
        }

        console.log(' Total service amount calculated:', totalServiceAmount);
        return totalServiceAmount;

    } catch (error) {
        console.error(' Error fetching service charges:', error);
        return 0;
    }
}

// Fetch and display service history in checkout modal
async function fetchAndDisplayServiceHistory(maDatPhong) {
    try {
        console.log(' Fetching service history for checkout modal:', maDatPhong);

        let serviceHistory = [];

        // Method 1: Try service history endpoint first
        try {
            const response = await fetch(`${API_BASE_URL}/Sudungdvs/history/${maDatPhong}`);
            if (response.ok) {
                serviceHistory = await response.json();
                console.log(' Service history from API:', serviceHistory.length, 'records');
            }
        } catch (error) {
            console.warn(' Service history API not available:', error.message);
        }

        // Method 2: Fallback to Sudungdvs with service details
        if (serviceHistory.length === 0) {
            try {
                const response = await fetch(`${API_BASE_URL}/Sudungdvs`);
                if (response.ok) {
                    const allServiceUsage = await response.json();

                    // Filter for this booking and get service details
                    const bookingServices = allServiceUsage.filter(usage => {
                        const usageBookingId = usage.madatphong || usage.maDatPhong || usage.bookingId;
                        return usageBookingId == maDatPhong;
                    });

                    // Get service names and prices
                    for (const usage of bookingServices) {
                        let serviceName = usage.tenDichVu || 'Dịch vụ';
                        let servicePrice = usage.giatien || usage.giaTien || 0;

                        // Try to get service details if we have service ID
                        if ((usage.madv || usage.maDv) && !usage.tenDichVu) {
                            try {
                                const serviceResponse = await fetch(`${API_BASE_URL}/Dichvus/${usage.madv || usage.maDv}`);
                                if (serviceResponse.ok) {
                                    const serviceData = await serviceResponse.json();
                                    serviceName = serviceData.tendv || serviceData.tenDichVu || serviceName;
                                    servicePrice = serviceData.giatien || serviceData.giaTien || servicePrice;
                                }
                            } catch (e) {
                                console.warn('Could not fetch service details for:', usage.madv || usage.maDv);
                            }
                        }

                        serviceHistory.push({
                            tenDichVu: serviceName,
                            soLuong: usage.soluong || usage.soLuong || usage.quantity || 1,
                            donGia: servicePrice,
                            thanhTien: servicePrice * (usage.soluong || usage.soLuong || usage.quantity || 1),
                            ngaySuDung: usage.ngaySuDung || usage.createdAt || new Date()
                        });
                    }
                }
            } catch (error) {
                console.warn(' Could not fetch service usage:', error.message);
            }
        }

        // Display service history in modal
        displayServiceHistoryInModal(serviceHistory);

        return serviceHistory;

    } catch (error) {
        console.error('Error fetching service history:', error);
        displayServiceHistoryInModal([]);
        return [];
    }
}

// Display service history in checkout modal
function displayServiceHistoryInModal(serviceHistory) {
    const serviceHistoryContainer = document.getElementById('serviceHistoryList');

    if (!serviceHistoryContainer) {
        console.warn(' Service history container not found in modal');
        return;
    }

    if (!serviceHistory || serviceHistory.length === 0) {
        serviceHistoryContainer.innerHTML = `
            <div class="no-service-history">
                <i class="fas fa-info-circle"></i>
                <span>Chưa có dịch vụ nào được sử dụng</span>
            </div>
        `;
        return;
    }

    let totalServiceAmount = 0;
    const historyHTML = serviceHistory.map((service, index) => {
        const serviceName = service.tenDichVu || (service.dichvu && service.dichvu.tendv) || service.name || 'Dịch vụ';
        const quantity = service.soLuong || service.quantity || 1;
        const unitPrice = service.donGia || service.giaPhuc || service.price || 0;
        const totalPrice = service.thanhTien || (unitPrice * quantity);
        const serviceDate = service.ngaySuDung || service.createdAt || new Date();

        // Debug individual service calculation
        console.log(` Service ${index + 1}: ${serviceName} - Qty: ${quantity}, Unit: ${unitPrice}, Total: ${totalPrice}`);

        totalServiceAmount += totalPrice;

        return `
            <div class="service-history-item">
                <div class="service-info">
                    <div class="service-name">${serviceName}</div>
                    <div class="service-date">${formatDate(serviceDate)}</div>
                </div>
                <div class="service-quantity">x${quantity}</div>
                <div class="service-price">
                    <div class="unit-price">${formatCurrency(unitPrice)}</div>
                    <div class="total-price">${formatCurrency(totalPrice)}</div>
                </div>
            </div>
        `;
    }).join('');

    serviceHistoryContainer.innerHTML = `
        <div class="service-history-header">
            <h4>Lịch sử dịch vụ (${serviceHistory.length} món)</h4>
        </div>
        <div class="service-history-items">
            ${historyHTML}
        </div>
        <div class="service-history-total">
            <strong>Tổng tiền dịch vụ: ${formatCurrency(totalServiceAmount)}</strong>
        </div>
    `;

    console.log('Displayed', serviceHistory.length, 'services, Total amount in history:', totalServiceAmount);
}

// Open checkout modal
function openCheckOutModal(booking) {
    currentBooking = booking;
    console.log('Opening checkout modal for booking:', booking);

    // Extract booking information from pending-checkouts API
    const bookingId = booking.maDatPhong || booking.MaDatPhong || booking.madatphong || booking.id || '-';

    var customerName = '-';
    if (booking.tenKhachHang) {
        customerName = booking.tenKhachHang;
    } else if (booking.TenKhachHang) {
        customerName = booking.TenKhachHang;
    } else if (booking.ten) {
        customerName = booking.ten;
    } else if (booking.customerName) {
        customerName = booking.customerName;
    }

    // Phone extraction from pending-checkouts API
    var phone = '-';
    if (booking.soDienThoai) {
        phone = booking.soDienThoai;
    } else if (booking.SoDienThoai) {
        phone = booking.SoDienThoai;
    } else if (booking.sdt) {
        phone = booking.sdt;
    } else if (booking.SDT) {
        phone = booking.SDT;
    } else if (booking.phone) {
        phone = booking.phone;
    }

    const roomNumber = extractRoomNumber(booking);

    var idCard = '-';
    if (booking.cccd) {
        idCard = booking.cccd;
    } else if (booking.Cccd) {
        idCard = booking.Cccd;
    } else if (booking.CCCD) {
        idCard = booking.CCCD;
    } else if (booking.cmnd) {
        idCard = booking.cmnd;
    }

    var roomType = '-';
    if (booking.tenLoaiPhong) {
        roomType = booking.tenLoaiPhong;
    } else if (booking.TenLoaiPhong) {
        roomType = booking.TenLoaiPhong;
    } else if (booking.loaiphong) {
        roomType = booking.loaiphong;
    } else if (booking.roomType) {
        roomType = booking.roomType;
    }

    const checkInDateRaw = booking.ngayNhanPhong || booking.NgayNhanPhong || booking.ngaynhanphong || booking.checkInDate;
    const checkOutDateRaw = booking.ngayTraPhong || booking.NgayTraPhong || booking.ngaytraphong || booking.checkOutDate;

    const totalAmount = booking.tongTienDatPhong || booking.TongTienDatPhong || booking.tongtien || booking.total || 0;
    originalRoomCharge = totalAmount;

    // Fill booking info
    safeSetText('modalBookingCode', bookingId);
    safeSetText('modalCustomerName', customerName);
    safeSetText('modalPhone', phone);
    safeSetText('modalIdCard', idCard);
    safeSetText('modalRoomNumber', roomNumber);
    safeSetText('modalRoomType', roomType);
    safeSetText('modalCheckInDate', formatDate(checkInDateRaw));
    safeSetText('modalCheckOutDate', formatDate(checkOutDateRaw));

    // Calculate nights
    let nights = 1;
    if (checkInDateRaw && checkOutDateRaw) {
        const checkIn = new Date(checkInDateRaw);
        const checkOut = new Date(checkOutDateRaw);
        if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
            nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
        }
    }
    safeSetText('modalNights', nights + ' đêm');

    // Fill payment info
    safeSetText('roomCharge', formatCurrency(originalRoomCharge));

    // Reset form values
    const extraChargeEl = document.getElementById('extraCharge');
    const discountEl = document.getElementById('discount');
    const serviceChargeEl = document.getElementById('serviceCharge');

    if (extraChargeEl) {
        extraChargeEl.value = 0;
        extraChargeEl.dataset.baseAmount = 0;
    }
    if (discountEl) discountEl.value = 0;
    if (serviceChargeEl) serviceChargeEl.textContent = '⏳ Đang tải...';

    // Calculate initial total
    calculateTotal();

    // Fetch service history and use it for both display and payment calculation
    fetchAndDisplayServiceHistory(bookingId).then(serviceHistory => {
        // Calculate total service amount from the same data
        let totalServiceAmount = 0;
        serviceHistory.forEach(service => {
            const unitPrice = service.donGia || service.giaPhuc || service.price || 0;
            const quantity = service.soLuong || service.quantity || 1;
            const totalPrice = service.thanhTien || (unitPrice * quantity);
            totalServiceAmount += totalPrice;
        });

        // Update service charge display with the calculated amount
        if (serviceChargeEl) {
            serviceChargeEl.textContent = formatCurrency(totalServiceAmount);
        }

        console.log('Service charge from history data:', totalServiceAmount);
        calculateTotal();
    }).catch(error => {
        console.error(' Error loading service data:', error);
        if (serviceChargeEl) {
            serviceChargeEl.textContent = formatCurrency(0);
        }
        calculateTotal();
    });

    // Reset form checkboxes and equipment status
    document.getElementById('keysReturned').checked = false;
    document.getElementById('itemsChecked').checked = false;
    document.getElementById('paymentCompleted').checked = false;
    document.getElementById('equipmentStatus').value = 'good';
    document.getElementById('paymentMethod').value = '';

    setDefaultCheckOutTime();

    // Show modal
    const modal = document.getElementById('checkOutModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close checkout modal
function closeCheckOutModal() {
    const modal = document.getElementById('checkOutModal');
    if (modal) {
        modal.classList.remove('show');
    }
    currentBooking = null;
}

// Calculate total (only unpaid items)
function calculateTotal() {
    // Get service charge from display
    const serviceChargeEl = document.getElementById('serviceCharge');
    const serviceChargeText = serviceChargeEl ? serviceChargeEl.textContent || '0 ₫' : '0 ₫';
    const serviceCharge = parseFloat(serviceChargeText.replace(/[^\d]/g, '')) || 0;

    // Get other charges from inputs
    const extraChargeEl = document.getElementById('extraCharge');
    const extraCharge = extraChargeEl ? parseFloat(extraChargeEl.value || 0) : 0;
    const discountEl = document.getElementById('discount');
    const discount = discountEl ? parseFloat(discountEl.value || 0) : 0;

    // Calculate total unpaid
    const totalUnpaid = serviceCharge + extraCharge - discount;

    // Update display
    const totalAmountEl = document.getElementById('totalAmount');
    if (totalAmountEl) {
        totalAmountEl.textContent = formatCurrency(totalUnpaid);
    }

    console.log(' Calculate Total:', {
        serviceCharge,
        extraCharge,
        discount,
        totalUnpaid
    });
}

// Handle equipment status change
function handleEquipmentStatusChange() {
    const equipmentStatus = document.getElementById('equipmentStatus').value;
    const equipmentCheckGroup = document.getElementById('equipmentCheckGroup');

    if (equipmentStatus === 'damaged') {
        equipmentCheckGroup.style.display = 'block';

        // Load equipment list if not loaded yet
        const container = document.getElementById('equipmentCheckList');
        if (container && (container.innerHTML.includes('Đang tải') || container.innerHTML.trim() === '')) {
            loadEquipmentForDamageCheck();
        }
    } else {
        equipmentCheckGroup.style.display = 'none';

        // Reset all equipment damage and update extra charge
        resetAllEquipmentDamage();
    }
}

// Load equipment for damage checking
async function loadEquipmentForDamageCheck() {
    try {
        console.log('Loading equipment for damage check...');

        const container = document.getElementById('equipmentCheckList');
        if (container) {
            container.innerHTML = '<div class="loading">⏳ Đang tải danh sách thiết bị...</div>';
        }

        const bookingId = currentBooking && (currentBooking.maDatPhong || currentBooking.MaDatPhong || currentBooking.madatphong);
        const [equipmentList, existingDamages] = await Promise.all([
            fetchHotelEquipment(),
            fetchDamageCompensation(bookingId)
        ]);

        displayEquipmentChecklist(equipmentList, existingDamages);

    } catch (error) {
        console.error(' Error loading equipment for damage check:', error);
        const container = document.getElementById('equipmentCheckList');
        if (container) {
            container.innerHTML = '<div class="error">❌ Không thể tải danh sách thiết bị</div>';
        }
    }
}

// Fetch hotel equipment list
async function fetchHotelEquipment() {
    try {
        console.log(' Fetching hotel equipment list...');

        const response = await fetch(`${API_BASE_URL}/Thietbikhachsans`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const equipment = await response.json();
        console.log('Equipment loaded:', equipment.length, 'items');
        return equipment;

    } catch (error) {
        console.error(' Error fetching equipment:', error);
        return [];
    }
}

// Fetch damage compensation for booking
async function fetchDamageCompensation(maDatPhong) {
    try {
        console.log(' Fetching damage compensation for booking:', maDatPhong);

        const response = await fetch(`${API_BASE_URL}/Denbuthiethais`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const allDamages = await response.json();
        const bookingDamages = allDamages.filter(damage =>
            damage.madatphong == maDatPhong || damage.maDatPhong == maDatPhong
        );

        console.log(' Damage records found:', bookingDamages.length);
        return bookingDamages;

    } catch (error) {
        console.error(' Error fetching damage compensation:', error);
        return [];
    }
}

// Helper function to get room list from booking
function getRoomListFromBooking(booking) {
    if (!booking) {
        console.log('❌ No booking data');
        return [];
    }
    
    console.log('🏨 Booking data:', booking);
    console.log('📋 danhSachPhong:', booking.danhSachPhong);
    console.log('📋 chitietdatphongs:', booking.chitietdatphongs);
    
    const roomSet = new Set();
    
    // Get from danhSachPhong
    if (booking.danhSachPhong && Array.isArray(booking.danhSachPhong)) {
        booking.danhSachPhong.forEach(room => {
            console.log('  Room object:', room);
            if (room.sophong) {
                roomSet.add(room.sophong);
                console.log('  ✅ Added room from danhSachPhong:', room.sophong);
            }
            if (room.soPhong) {
                roomSet.add(room.soPhong);
                console.log('  ✅ Added room from danhSachPhong (soPhong):', room.soPhong);
            }
        });
    }
    
    // Get from chitietdatphongs
    if (booking.chitietdatphongs && Array.isArray(booking.chitietdatphongs)) {
        booking.chitietdatphongs.forEach(ct => {
            console.log('  ChiTiet object:', ct);
            if (ct.phong?.sophong) {
                roomSet.add(ct.phong.sophong);
                console.log('  ✅ Added room from phong.sophong:', ct.phong.sophong);
            } else if (ct.phong?.soPhong) {
                roomSet.add(ct.phong.soPhong);
                console.log('  ✅ Added room from phong.soPhong:', ct.phong.soPhong);
            } else if (ct.sophong) {
                roomSet.add(ct.sophong);
                console.log('  ✅ Added room from ct.sophong:', ct.sophong);
            } else if (ct.soPhong) {
                roomSet.add(ct.soPhong);
                console.log('  ✅ Added room from ct.soPhong:', ct.soPhong);
            }
        });
    }
    
    const rooms = Array.from(roomSet).sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
    });
    
    console.log('🔑 Final room list:', rooms);
    return rooms.length > 0 ? rooms : ['Không có phòng'];
}

// Display equipment checklist
function displayEquipmentChecklist(equipmentList, existingDamages = []) {
    const container = document.getElementById('equipmentCheckList');
    if (!container) return;

    if (!equipmentList || equipmentList.length === 0) {
        container.innerHTML = '<div class="no-data">Không có dữ liệu thiết bị</div>';
        return;
    }

    // Lấy danh sách phòng từ booking
    const roomList = getRoomListFromBooking(currentBooking);
    console.log('🔑 Room list for dropdown:', roomList);
    
    if (roomList.length === 0 || (roomList.length === 1 && roomList[0] === 'Không có phòng')) {
        console.warn('⚠️ No rooms found! Check booking data structure.');
    }
    
    const roomOptions = roomList.map(room => 
        `<option value="${room}">${room}</option>`
    ).join('');
    
    console.log('📝 Room options HTML:', roomOptions);

    container.innerHTML = equipmentList.map(equipment => {
        const equipmentId = equipment.mathietbi || equipment.maThietBi;
        const equipmentName = equipment.tenthietbi || equipment.tenThietBi;
        const equipmentPrice = equipment.dongia || equipment.donGia || 0;

        // Check if this equipment has existing damage
        const existingDamage = existingDamages.find(d =>
            (d.mathietbi || d.maThietBi) == equipmentId
        );
        const quantity = existingDamage ? (existingDamage.soluong || existingDamage.soLuong || 0) : 0;
        const isDamaged = quantity > 0;
        const selectedRoom = existingDamage ? (existingDamage.sophong || existingDamage.soPhong || roomList[0]) : roomList[0];

        return `
            <div class="equipment-item" data-equipment-id="${equipmentId}">
                <div class="equipment-info">
                    <div class="equipment-name">${equipmentName}</div>
                    <div class="equipment-price">Giá: ${formatCurrency(equipmentPrice)}</div>
                </div>
                <div class="damage-controls">
                    <label>
                        <input type="checkbox" 
                               id="damage_${equipmentId}" 
                               ${isDamaged ? 'checked' : ''}
                               onchange="handleEquipmentDamage(${equipmentId}, '${equipmentName}', ${equipmentPrice})">
                        <span>Bị hư</span>
                    </label>
                    <select class="room-select" id="room_${equipmentId}" 
                            style="display: ${isDamaged ? 'inline-block' : 'none'}; margin-left: 10px; padding: 4px;">
                        ${roomOptions}
                    </select>
                    <input type="number" 
                           class="quantity-input" 
                           id="quantity_${equipmentId}" 
                           min="1" 
                           max="99"
                           value="${quantity || 1}"
                           style="display: ${isDamaged ? 'inline-block' : 'none'}; margin-left: 10px; width: 60px; padding: 4px; text-align: center;"
                           onchange="calculateTotalCompensation()">
                </div>
            </div>
        `;
    }).join('');

    // Set selected room for existing damages
    existingDamages.forEach(damage => {
        const equipmentId = damage.mathietbi || damage.maThietBi;
        const roomSelect = document.getElementById(`room_${equipmentId}`);
        const selectedRoom = damage.sophong || damage.soPhong;
        if (roomSelect && selectedRoom) {
            roomSelect.value = selectedRoom;
        }
    });

    calculateTotalCompensation();

    console.log(' Equipment checklist displayed:', equipmentList.length, 'items');
}

// Handle equipment damage checkbox
function handleEquipmentDamage(equipmentId, equipmentName, equipmentPrice) {
    const checkbox = document.getElementById(`damage_${equipmentId}`);
    const roomSelect = document.getElementById(`room_${equipmentId}`);
    const quantityInput = document.getElementById(`quantity_${equipmentId}`);
    
    if (checkbox) {
        // Show/hide room select and quantity input based on checkbox
        if (checkbox.checked) {
            if (roomSelect) roomSelect.style.display = 'inline-block';
            if (quantityInput) quantityInput.style.display = 'inline-block';
        } else {
            if (roomSelect) roomSelect.style.display = 'none';
            if (quantityInput) quantityInput.style.display = 'none';
        }
    }
    
    updateDamageList();
    calculateTotalCompensation();
}

// Update damage equipment list display
function updateDamageList() {
    const damageList = [];
    const equipmentItems = document.querySelectorAll('.equipment-item');

    equipmentItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            const equipmentName = item.querySelector('.equipment-name').textContent;
            damageList.push(equipmentName);
        }
    });

    console.log(' Damaged equipment list:', damageList);
}

// Calculate total compensation and update extra charge
function calculateTotalCompensation() {
    let totalCompensation = 0;
    const equipmentItems = document.querySelectorAll('.equipment-item');

    equipmentItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            const priceText = item.querySelector('.equipment-price').textContent;
            const price = parseFloat(priceText.replace(/[^\d]/g, '')) || 0;
            
            // Get quantity
            const quantityInput = item.querySelector('.quantity-input');
            const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1;
            
            totalCompensation += price * quantity;
        }
    });

    // Update equipment compensation display
    const compensationDisplay = document.getElementById('equipmentCompensation');
    if (compensationDisplay) {
        compensationDisplay.textContent = formatCurrency(totalCompensation);
    }

    // Update extra charge with equipment compensation
    updateExtraChargeWithEquipmentCompensation(totalCompensation);

    console.log(' Equipment compensation calculated:', totalCompensation);
}

// Update extra charge field with equipment compensation
function updateExtraChargeWithEquipmentCompensation(compensationAmount) {
    const extraChargeEl = document.getElementById('extraCharge');
    if (!extraChargeEl) return;

    // Get current extra charge (excluding previous equipment compensation)
    if (!extraChargeEl.dataset.baseAmount) {
        extraChargeEl.dataset.baseAmount = extraChargeEl.value || 0;
    }

    // Update extra charge = base amount + equipment compensation
    const newExtraCharge = parseFloat(extraChargeEl.dataset.baseAmount) + compensationAmount;
    extraChargeEl.value = newExtraCharge;

    // Update the display note
    updateEquipmentCompensationNote(compensationAmount);

    // Recalculate total
    calculateTotal();
}

// Update equipment compensation note
function updateEquipmentCompensationNote(amount) {
    let noteEl = document.getElementById('equipmentCompensationNote');

    if (amount > 0) {
        if (!noteEl) {
            // Create note element if not exists
            noteEl = document.createElement('div');
            noteEl.id = 'equipmentCompensationNote';
            noteEl.className = 'equipment-compensation-note';
            noteEl.style.cssText = 'font-size: 0.85em; color: #dc3545; margin-top: 5px;';

            const extraChargeEl = document.getElementById('extraCharge');
            if (extraChargeEl && extraChargeEl.parentNode) {
                extraChargeEl.parentNode.appendChild(noteEl);
            }
        }
        noteEl.innerHTML = `<i class="fas fa-tools"></i> Bao gồm đền bù thiết bị: ${formatCurrency(amount)}`;
    } else {
        if (noteEl) {
            noteEl.remove();
        }
    }
}

// Reset all equipment damage
function resetAllEquipmentDamage() {
    // Reset all checkboxes
    const equipmentItems = document.querySelectorAll('.equipment-item');
    equipmentItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = false;
    });

    // Reset equipment compensation display
    const compensationDisplay = document.getElementById('equipmentCompensation');
    if (compensationDisplay) {
        compensationDisplay.textContent = '0 ₫';
    }

    // Update extra charge by removing equipment compensation
    updateExtraChargeWithEquipmentCompensation(0);
}

// Confirm checkout using API with stored procedure
async function confirmCheckOut() {
    if (!currentBooking) {
        alert("Không có thông tin booking!");
        return;
    }

    // Validate form
    const checkOutTime = document.getElementById('checkOutTime').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const keysReturned = document.getElementById('keysReturned').checked;
    const itemsChecked = document.getElementById('itemsChecked').checked;
    const paymentCompleted = document.getElementById('paymentCompleted').checked;

    if (!checkOutTime || !paymentMethod || !keysReturned || !itemsChecked || !paymentCompleted) {
        alert("Vui lòng điền đầy đủ thông tin và xác nhận các mục bắt buộc!");
        return;
    }

    try {
        const bookingId = currentBooking.maDatPhong || currentBooking.MaDatPhong || currentBooking.madatphong;

        console.log(' Starting checkout process for booking:', bookingId);

        // Build invoice object to print immediately
        const roomChargeText = document.getElementById('roomCharge') ? document.getElementById('roomCharge').textContent : '0 ₫';
        const serviceChargeText = document.getElementById('serviceCharge') ? document.getElementById('serviceCharge').textContent : '0 ₫';
        const extraChargeVal = document.getElementById('extraCharge') ? parseFloat(document.getElementById('extraCharge').value || 0) : 0;
        const discountVal = document.getElementById('discount') ? parseFloat(document.getElementById('discount').value || 0) : 0;
        const totalAmountText = document.getElementById('totalAmount') ? document.getElementById('totalAmount').textContent : '0 ₫';

        const invoiceData = {
            bookingId: bookingId,
            customerName: currentBooking.tenKhachHang || currentBooking.TenKhachHang || currentBooking.ten || 'N/A',
            phone: currentBooking.soDienThoai || currentBooking.SDT || currentBooking.sdt || '',
            roomNumber: extractRoomNumber(currentBooking),
            checkInDate: currentBooking.ngayNhanPhong || currentBooking.NgayNhanPhong || currentBooking.checkInDate || '',
            checkOutDate: currentBooking.ngayTraPhong || currentBooking.NgayTraPhong || currentBooking.checkOutDate || '',
            nights: document.getElementById('modalNights') ? document.getElementById('modalNights').textContent : '',
            roomCharge: parseFloat(roomChargeText.replace(/[^\d]/g, '')) || 0,
            serviceCharge: parseFloat(serviceChargeText.replace(/[^\d]/g, '')) || 0,
            extraCharge: parseFloat(extraChargeVal) || 0,
            discount: parseFloat(discountVal) || 0,
            totalToPay: parseFloat(totalAmountText.replace(/[^\d]/g, '')) || 0,
            paymentMethod: paymentMethod,
            checkOutTime: checkOutTime
        };

        // Print invoice now
        try {
            printInvoiceNow(invoiceData);
        } catch (e) {
            console.warn(' Printing invoice failed:', e);
        }

        // CHECKOUT WORKFLOW:
        // 1. Call THANHTOANCHECKOUT procedure to calculate remaining amount
        // 2. Show payment status to user and get confirmation
        // 3. Call CHECKOUT procedure to update booking status to "Đã trả"

        // Show loading state
        const confirmBtn = document.querySelector('.btn-primary');
        const originalText = confirmBtn ? confirmBtn.innerHTML : '';
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý checkout...';
            confirmBtn.disabled = true;
        }

        // Step 1: Get remaining amount using THANHTOANCHECKOUT procedure
        console.log(' Calling Sotienthieu API to get remaining amount...');
        const sotienthieuResponse = await fetch(`${API_BASE_URL}/Datphongs/Sotienthieu/${bookingId}`, {
            method: 'GET'
        });

        if (!sotienthieuResponse.ok) {
            const errorText = await sotienthieuResponse.text();
            console.error(' Sotienthieu API error:', sotienthieuResponse.status, errorText);
            throw new Error(`Failed to get remaining amount: ${sotienthieuResponse.status} - ${errorText}`);
        }

        const sotienthieuResult = await sotienthieuResponse.json();
        console.log(' Sotienthieu result:', sotienthieuResult);

        // Extract remaining amount from THANHTOANCHECKOUT procedure result
        const soTienThieu = sotienthieuResult.SoTienThieu || sotienthieuResult.sotienthieu || 0;
        const maDatPhong = sotienthieuResult.MaDatPhong || sotienthieuResult.madatphong || bookingId;

        // Validate the result
        if (typeof soTienThieu !== 'number') {
            console.warn(' Invalid soTienThieu value:', soTienThieu);
        }

        console.log(` Remaining amount to pay: ${formatCurrency(soTienThieu)}`);

        // Step 2: Execute checkout using CHECKOUT procedure
        console.log(' Calling Checkout API to execute stored procedure...');
        const checkoutResponse = await fetch(`${API_BASE_URL}/Datphongs/Checkout/${bookingId}`, {
            method: 'GET'
        });

        if (!checkoutResponse.ok) {
            const errorText = await checkoutResponse.text();
            console.error(' Checkout API error:', checkoutResponse.status, errorText);
            throw new Error(`Checkout failed: ${checkoutResponse.status} - ${errorText}`);
        }

        const checkoutResult = await checkoutResponse.json();
        console.log(' Checkout procedure executed successfully:', checkoutResult);

        // Validate that checkout was successful
        if (!checkoutResult.message || !checkoutResult.message.includes('thành công')) {
            console.warn(' Unexpected checkout result:', checkoutResult);
        }

        // Check payment status BEFORE executing checkout
        if (soTienThieu > 0) {
            const shouldProceed = confirm(
                ` CẢNH BÁO: Khách hàng còn nợ ${formatCurrency(soTienThieu)}\n\n` +
                `Bạn có muốn tiếp tục checkout không?\n` +
                `- Chọn "OK" để tiếp tục checkout (ghi nhận nợ)\n` +
                `- Chọn "Cancel" để quay lại thu tiền`
            );

            if (!shouldProceed) {
                return; // Exit without completing checkout
            }
        }

        // Create detailed success message
        let successMessage = ` CHECKOUT HOÀN TẤT!\n\n`;
        successMessage += ` Mã đặt phòng: ${maDatPhong}\n`;
        successMessage += ` Khách hàng: ${currentBooking.tenKhachHang || currentBooking.TenKhachHang || 'N/A'}\n`;
        successMessage += ` Phòng: ${extractRoomNumber(currentBooking)}\n`;
        successMessage += ` Thời gian checkout: ${checkOutTime}\n`;
        successMessage += ` Phương thức thanh toán: ${paymentMethod}\n\n`;

        // Display payment status based on stored procedure result
        if (soTienThieu > 0) {
            successMessage += ` CẢNH BÁO: CÒN THIẾU TIỀN!\n`;
            successMessage += ` Số tiền còn thiếu: ${formatCurrency(soTienThieu)}\n`;
            successMessage += `Đã ghi nhận nợ trong hệ thống\n`;
            successMessage += ` Cần theo dõi thu tiền từ khách hàng!`;
        } else if (soTienThieu < 0) {
            successMessage += ` THỐI LẠI KHÁCH HÀNG!\n`;
            successMessage += ` Số tiền thối lại: ${formatCurrency(Math.abs(soTienThieu))}\n`;
            successMessage += ` Thanh toán hoàn tất!`;
        } else {
            successMessage += ` THANH TOÁN CHÍNH XÁC!\n`;
            successMessage += ` Không còn nợ, không cần thối tiền\n`;
            successMessage += ` Checkout hoàn tất thành công!`;
        }

        // Show detailed success message
        alert(successMessage);

        // Handle equipment damage compensation if any
        const equipmentStatus = document.getElementById('equipmentStatus').value;
        console.log('🔧 Equipment status:', equipmentStatus);
        
        if (equipmentStatus === 'damaged') {
            console.log('🔧 Calling handleEquipmentDamageOnCheckout...');
            await handleEquipmentDamageOnCheckout(bookingId);
            console.log('🔧 Equipment damage handling completed');
        } else {
            console.log('ℹ️ No equipment damage selected, skipping damage handling');
        }

        // Log successful checkout
        console.log(' Checkout completed successfully:', {
            bookingId: maDatPhong,
            remainingAmount: soTienThieu,
            checkoutTime: checkOutTime,
            paymentMethod: paymentMethod
        });

        // Close modal and refresh guest list
        closeCheckOutModal();
        await loadCurrentGuests();

        // Show brief success notification
        showSuccessNotification(`Checkout thành công cho booking ${maDatPhong}`);

    } catch (error) {
        console.error(' Checkout error:', error);

        // Show detailed erro message
        let errorMessage = ' LỖI CHECKOUT:\n\n';

        if (error.message.includes('Failed to fetch')) {
            errorMessage += ' Không thể kết nối tới server\n';
            errorMessage += ' Vui lòng kiểm tra kết nối mạng và thử lại';
        } else if (error.message.includes('Failed to get remaining amount')) {
            errorMessage += 'Lỗi khi tính toán số tiền còn thiếu\n';
            errorMessage += ' Vui lòng kiểm tra dữ liệu hóa đơn và thanh toán';
        } else if (error.message.includes('Checkout failed')) {
            errorMessage += ' Lỗi khi thực hiện checkout\n';
            errorMessage += ' Có thể do trạng thái booking không hợp lệ';
        } else if (error.message.includes('500')) {
            errorMessage += ' Lỗi stored procedure trên server\n';
            errorMessage += ' Vui lòng liên hệ bộ phận IT để kiểm tra database';
        } else if (error.message.includes('400')) {
            errorMessage += ' Dữ liệu không hợp lệ\n';
            errorMessage += ' Vui lòng kiểm tra mã đặt phòng và thử lại';
        } else {
            errorMessage += ` Chi tiết lỗi: ${error.message}\n`;
            errorMessage += ' Vui lòng liên hệ bộ phận kỹ thuật';
        }

        alert(errorMessage);

    } finally {
        // Always restore button state
        const confirmBtn = document.querySelector('.btn-primary');

        if (confirmBtn) {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
}

// Add CSS styles for service history in modal (inject into document)
function addServiceHistoryStyles() {
    if (document.getElementById('serviceHistoryStyles')) return; // Already added

    const styles = document.createElement('style');
    styles.id = 'serviceHistoryStyles';
    styles.textContent = `
        .no-service-history {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-style: italic;
        }
        
        .service-history-header h4 {
            margin: 0 0 15px 0;
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 8px;
        }
        
        .service-history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            margin-bottom: 8px;
            background: #f8f9fa;
        }
        
        .service-info {
            flex: 1;
        }
        
        .service-name {
            font-weight: 600;
            color: #212529;
            margin-bottom: 4px;
        }
        
        .service-date {
            font-size: 0.85em;
            color: #6c757d;
        }
        
        .service-quantity {
            font-weight: 600;
            color: #495057;
            margin: 0 15px;
            min-width: 40px;
            text-align: center;
        }
        
        .service-price {
            text-align: right;
            min-width: 120px;
        }
        
        .unit-price {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 2px;
        }
        
        .total-price {
            font-weight: 600;
            color: #007bff;
        }
        
        .service-history-total {
            text-align: right;
            padding: 15px 0 10px;
            border-top: 2px solid #007bff;
            margin-top: 10px;
            color: #007bff;
        }
        
        .service-history-items {
            max-height: 300px;
            overflow-y: auto;
        }
        
        /* Equipment Checklist Styles */
        .equipment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            margin-bottom: 8px;
            background: #f8f9fa;
        }
        
        .equipment-info {
            flex: 1;
        }
        
        .equipment-name {
            font-weight: 600;
            color: #212529;
            margin-bottom: 4px;
        }
        
        .equipment-price {
            font-size: 0.9em;
            color: #6c757d;
        }
        
        .damage-controls {
            margin-left: 15px;
        }
        
        .damage-controls label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-weight: 500;
        }
        
        .damage-controls input[type="checkbox"] {
            margin-right: 8px;
            transform: scale(1.2);
        }
        
        .loading, .error, .no-data {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-style: italic;
        }
        
        .error {
            color: #dc3545;
        }
        
        .equipment-compensation-note {
            font-size: 0.85em;
            color: #dc3545;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(styles);
}

// Print invoice helper - opens print preview with a simple invoice layout
function printInvoiceNow(invoice) {
    const win = window.open('', '_blank');
    if (!win) {
        throw new Error('Could not open print window (popup blocked)');
    }
    const styles = `
        :root{--primary:#112173; --muted:#6c757d}
        body{font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#212529; margin:0; padding:20px; background:#f5f7fb}
        .invoice-wrap{max-width:800px; margin:20px auto; background:#fff; padding:28px; border-radius:8px; box-shadow:0 6px 20px rgba(17,33,115,0.06)}
        .header{display:flex; justify-content:space-between; align-items:center}
        .brand{display:flex; gap:12px; align-items:center}
        .brand img{width:64px; height:64px; object-fit:cover; border-radius:6px}
        .brand h1{font-size:20px; margin:0; color:var(--primary)}
        .meta{font-size:14px; color:var(--muted)}
        .section{margin-top:18px}
        .section .row{display:flex; justify-content:space-between; gap:16px}
        table{width:100%; border-collapse:collapse; margin-top:14px}
        th, td{padding:12px 10px; text-align:left}
        thead th{color:var(--muted); font-size:13px; border-bottom:1px solid #eef2fb}
        tbody tr + tr td{border-top:1px solid #f1f4fb}
        .right{text-align:right}
        .totals{margin-top:16px; display:flex; justify-content:flex-end}
        .totals .box{background:#f8f9ff; padding:14px 18px; border-radius:8px; min-width:260px}
        .totals .box .line{display:flex; justify-content:space-between; margin-bottom:8px}
        .grand{font-size:18px; font-weight:700; color:var(--primary)}
        .small{font-size:12px; color:var(--muted)}
        @media print{
            body{background:#fff}
            .invoice-wrap{box-shadow:none; border-radius:0; margin:0; padding:8mm}
            .no-print{display:none}
        }
    `;

    const logoUrl = (function() {
        // try to use local logo if available
        try { return window.location.origin + '/assets/img/logo.jpg'; } catch (e) { return ''; }
    })();

    const html = `
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Hóa đơn - ${invoice.bookingId}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="invoice-wrap">
                <div class="header">
                    <div class="brand">
                        ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ''}
                        <div>
                            <h1>Thanh Trà Hotel</h1>
                            <div class="meta">Địa chỉ: Đường ABC, Đà Nẵng • Tel: 0123 456 789</div>
                        </div>
                    </div>
                    <div class="meta" style="text-align:right">
                        <div><strong>HÓA ĐƠN THANH TOÁN</strong></div>
                        <div class="small">Mã: ${invoice.bookingId}</div>
                        <div class="small">${new Date().toLocaleString('vi-VN')}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="row">
                        <div>
                            <div><strong>Khách hàng</strong></div>
                            <div>${invoice.customerName || ''}</div>
                            <div class="small">SĐT: ${invoice.phone || ''}</div>
                        </div>
                        <div>
                            <div><strong>Thông tin phòng</strong></div>
                            <div>Phòng: ${invoice.roomNumber || ''} ${invoice.nights ? '('+invoice.nights+')' : ''}</div>
                            <div class="small">Nhận: ${invoice.checkInDate || '-'} • Trả: ${invoice.checkOutDate || '-'}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <table>
                        <thead>
                            <tr><th>Mô tả</th><th class="right">Số lượng</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Tiền phòng</td>
                                <td class="right">1</td>
                                <td class="right">${formatCurrency(invoice.roomCharge || 0)}</td>
                                <td class="right">${formatCurrency(invoice.roomCharge || 0)}</td>
                            </tr>
                            <tr>
                                <td>Tiền dịch vụ</td>
                                <td class="right">-</td>
                                <td class="right">-</td>
                                <td class="right">${formatCurrency(invoice.serviceCharge || 0)}</td>
                            </tr>
                            <tr>
                                <td>Phụ thu / Đền bù</td>
                                <td class="right">-</td>
                                <td class="right">-</td>
                                <td class="right">${formatCurrency(invoice.extraCharge || 0)}</td>
                            </tr>
                            <tr>
                                <td>Giảm giá</td>
                                <td class="right">-</td>
                                <td class="right">-</td>
                                <td class="right">-${formatCurrency(invoice.discount || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="totals">
                    <div class="box">
                        <div class="line"><div class="small">Tổng trước thuế</div><div>${formatCurrency((invoice.roomCharge||0)+(invoice.serviceCharge||0)+(invoice.extraCharge||0))}</div></div>
                        <div class="line"><div class="small">Giảm giá</div><div>-${formatCurrency(invoice.discount||0)}</div></div>
                        <div class="line grand"><div>TỔNG CẦN THU</div><div>${formatCurrency(invoice.totalToPay||0)}</div></div>
                    </div>
                </div>

                <div class="section" style="margin-top:22px; display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <div class="small">Phương thức: ${invoice.paymentMethod || 'Chưa chọn'}</div>
                        <div class="small">Ghi chú: _______________________________</div>
                    </div>
                    <div style="text-align:center">
                        <div class="small">Người thu tiền</div>
                        <div style="margin-top:36px">(Ký & ghi rõ họ tên)</div>
                    </div>
                </div>

                <div class="no-print" style="margin-top:18px; text-align:center">
                    <button onclick="window.print()" style="background:var(--primary); color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer">In lại</button>
                </div>
            </div>
        </body>
        </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // Allow render then trigger print
    setTimeout(() => { try { win.print(); } catch (e) { console.warn('Print error', e); } }, 600);
}

// Initialize styles when page loads
document.addEventListener('DOMContentLoaded', function() {
    addServiceHistoryStyles();
});

// Handle equipment damage during checkout
async function handleEquipmentDamageOnCheckout(bookingId) {
    try {
        const equipmentItems = document.querySelectorAll('.equipment-item input[type="checkbox"]:checked');

        if (equipmentItems.length === 0) {
            console.log(' No equipment damage to process');
            return;
        }

        console.log('🔧 Processing equipment damage for', equipmentItems.length, 'items');

        for (const checkbox of equipmentItems) {
            const equipmentId = checkbox.id.replace('damage_', '');
            const equipmentItem = checkbox.closest('.equipment-item');
            const equipmentName = equipmentItem.querySelector('.equipment-name').textContent;
            const priceText = equipmentItem.querySelector('.equipment-price').textContent;
            const equipmentPrice = parseFloat(priceText.replace(/[^\d]/g, '')) || 0;
            
            // Get selected room
            const roomSelect = document.getElementById(`room_${equipmentId}`);
            const selectedRoom = roomSelect ? roomSelect.value : '';
            
            // Get quantity
            const quantityInput = document.getElementById(`quantity_${equipmentId}`);
            const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1;
            
            // Calculate total amount
            const totalAmount = equipmentPrice * quantity;

            // Create damage compensation record
            const damageData = {
                maDatPhong: bookingId,
                maThietBi: equipmentId,
                soPhong: selectedRoom,  // Add room number
                soLuong: quantity, // Get from input
                donGia: equipmentPrice,
                thanhTien: totalAmount,
                lyDo: `Thiết bị ${equipmentName} bị hư hỏng ở phòng ${selectedRoom} khi checkout (SL: ${quantity})`,
                ngayGhiNhan: new Date().toISOString()
            };

            console.log('📤 Sending damage data:', damageData);
            console.log('📤 API URL:', `${API_BASE_URL}/Denbuthiethais`);

            try {
                const response = await fetch(`${API_BASE_URL}/Denbuthiethais`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(damageData)
                });

                console.log('📥 Response status:', response.status);
                console.log('📥 Response ok:', response.ok);

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Equipment damage recorded successfully:', result);
                    console.log(`✅ ${equipmentName} - Room ${selectedRoom} - Qty ${quantity}`);
                } else {
                    const errorText = await response.text();
                    console.error('❌ Failed to record damage for:', equipmentName);
                    console.error('❌ Status:', response.status);
                    console.error('❌ Error details:', errorText);
                }
            } catch (error) {
                console.error('❌ Error recording equipment damage:', error);
                console.error('❌ Error details:', error.message);
            }
        }

    } catch (error) {
        console.error(' Error processing equipment damage:', error);
    }
}

// Show success notification
function showSuccessNotification(message) {
    // Simple notification - you can replace this with a more sophisticated notification system
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Make functions globally available
window.searchCheckout = searchCheckout;
window.openCheckOutModal = openCheckOutModal;
window.closeCheckOutModal = closeCheckOutModal;
window.confirmCheckOut = confirmCheckOut;
window.handleEquipmentStatusChange = handleEquipmentStatusChange;
window.handleEquipmentDamage = handleEquipmentDamage;
window.calculateTotal = calculateTotal;
window.handleEquipmentDamageOnCheckout = handleEquipmentDamageOnCheckout;