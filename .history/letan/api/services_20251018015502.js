const API_BASE = 'https://localhost:7076/api';

// Global variables
let currentGuestsData = [];
let availableServices = [];
let selectedServices = [];
let currentBookingId = null;

// Performance tracking
let loadingStartTime = null;
let guestsLoaded = false;
let servicesLoaded = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log(' Page loaded: services.html');

    checkUserLogin();
    setupEventListeners();

    // Check if data was preloaded from navigation
    const preloadedData = checkPreloadedData();

    if (preloadedData.hasData) {
        console.log(' Using preloaded data from navigation');

        if (preloadedData.guests) {
            currentGuestsData = preloadedData.guests;
            displayCurrentGuests(preloadedData.guests);
        }

        if (preloadedData.services) {
            availableServices = preloadedData.services;
        }

        // Load missing data only
        const promises = [];
        if (!preloadedData.guests) promises.push(loadCurrentGuests());
        if (!preloadedData.services) promises.push(loadAvailableServices());

        if (promises.length > 0) {
            showLoadingState();
            try {
                await Promise.all(promises);
            } finally {
                hideLoadingState();
            }
        }

    } else {
        // Show progressive loading - don't wait for everything
        showLoadingState();

        try {
            console.log('⚡ Loading data progressively...');
            const startTime = performance.now();

            // Load guests and services independently for better UX
            const guestsPromise = loadCurrentGuests().catch(err => {
                console.error('Failed to load guests:', err);
                return null;
            });

            const servicesPromise = loadAvailableServices().catch(err => {
                console.error('Failed to load services:', err);
                return null;
            });

            // Hide loading as soon as first critical data (guests) is ready
            guestsPromise.then((result) => {
                if (result !== null) {
                    console.log('⚡ Guests loaded - hiding loading state');
                    hideLoadingState();
                }
            });

            // Track completion of all data
            Promise.allSettled([guestsPromise, servicesPromise]).then((results) => {
                const endTime = performance.now();
                const guestsStatus = results[0].status === 'fulfilled' ? '✅' : '❌';
                const servicesStatus = results[1].status === 'fulfilled' ? '✅' : '❌';
                console.log(`⚡ Loading complete in ${(endTime - startTime).toFixed(0)}ms - Guests: ${guestsStatus} Services: ${servicesStatus}`);
            });

        } catch (error) {
            console.error(' Error loading data:', error);
            showErrorState('Lỗi tải dữ liệu: ' + error.message);
        } finally {
            hideLoadingState();
        }
    }
});

// Check user login
function checkUserLogin() {
    console.log(' Checking user login...');

    const currentUser = localStorage.getItem("currentUser");
    console.log(' CurrentUser from localStorage:', currentUser);

    if (!currentUser) {
        console.log(' No user found, redirecting to login...');
        alert("Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "../login.html";
        return;
    }

    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.name || user.username;
    }

    console.log(` Đăng nhập: ${user.username} (${user.name})`);
}

// Setup event listeners
function setupEventListeners() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Logout
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

    // Close modal on outside click
    const modal = document.getElementById('servicesModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeServicesModal();
            }
        });
    }

    // Search on Enter key
    const searchInputs = ['searchBookingCode', 'searchRoomNumber', 'searchCustomerName'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchGuest();
                }
            });
        }
    });
}

// Load current guests (checked-in customers) with timeout and caching  
async function loadCurrentGuests() {
    const startTime = performance.now();

    try {
        console.log('⚡ Đang tải danh sách khách đang ở...');
        updateLoadingMessage('Đang tải danh sách khách...', 'Kiểm tra cache dữ liệu...');

        // Check cache first (cache for 1 minute for guests)
        const guestsCacheKey = 'guests_cache';
        const guestsCacheTime = 1 * 60 * 1000; // 1 minute
        const cachedGuests = localStorage.getItem(guestsCacheKey);
        const guestsCacheTimestamp = localStorage.getItem(guestsCacheKey + '_timestamp');

        if (cachedGuests && guestsCacheTimestamp && (Date.now() - parseInt(guestsCacheTimestamp)) < guestsCacheTime) {
            console.log('⚡ Using cached guests data');
            updateLoadingMessage('Tải từ cache...', 'Sử dụng dữ liệu đã lưu');
            const guests = JSON.parse(cachedGuests);
            currentGuestsData = guests;
            displayCurrentGuests(guests);
            console.log(`⚡ Cached guests loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
            return;
        }

        updateLoadingMessage('Đang tải từ server...', 'Kết nối tới API...');

        // Add timeout to prevent hanging (reduced from 10s to 5s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${API_BASE}/Datphongs/checked-in`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);
        updateLoadingMessage('Xử lý dữ liệu...', 'Đang nhận phản hồi từ server...');

        console.log('⚡ Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const endTime = performance.now();

        console.log(`⚡ Guests loaded in ${(endTime - startTime).toFixed(0)}ms:`, data.length, 'guests');

        // Cache the successful result
        localStorage.setItem(guestsCacheKey, JSON.stringify(data));
        localStorage.setItem(guestsCacheKey + '_timestamp', Date.now().toString());

        currentGuestsData = data;
        displayCurrentGuests(data);

    } catch (error) {
        const endTime = performance.now();
        console.error(` Lỗi tải khách sau ${(endTime - startTime).toFixed(0)}ms:`, error);

        // Handle different error types
        let errorMessage = 'Lỗi không xác định';
        if (error.name === 'AbortError') {
            errorMessage = 'Timeout - Mạng chậm hoặc server không phản hồi';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Không thể kết nối tới server';
        } else {
            errorMessage = error.message;
        }

        const tbody = document.getElementById('currentGuestsList');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>Lỗi tải dữ liệu: ${errorMessage}</div>
                        <button onclick="loadCurrentGuests()" class="btn btn-sm btn-primary" style="margin-top: 10px;">
                            <i class="fas fa-redo"></i> Thử lại
                        </button>
                    </td>
                </tr>
            `;
        }

        // Don't throw error to continue with other data loading
        currentGuestsData = [];
    }
}

// Display current guests
function displayCurrentGuests(guests) {
    console.log(' Displaying guests:', guests);

    const tbody = document.getElementById('currentGuestsList');
    const guestCountEl = document.getElementById('guestCount');

    if (!tbody) {
        console.error(' Không tìm thấy element currentGuestsList');
        return;
    }

    // Update guest count
    if (guestCountEl) {
        guestCountEl.textContent = `${guests.length} khách`;
    }

    if (!guests || guests.length === 0) {
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

    // Use DocumentFragment for better performance with many rows
    const fragment = document.createDocumentFragment();

    guests.forEach((guest, index) => {
        // Debug only first item and only if needed
        if (index === 0 && guests.length > 0) {
            console.log(' Guest data sample:', {
                booking: guest.madatphong || guest.maDatPhong,
                customer: (guest.khachHang && guest.khachHang.hoten) || guest.tenKhachHang,
                rooms: (guest.danhSachPhong && guest.danhSachPhong.length) || 'no rooms array'
            });
        }

        const bookingCode = guest.madatphong || guest.maDatPhong;
        const customerName = (guest.khachHang && guest.khachHang.hoten) || guest.tenKhachHang || 'N/A';
        const phone = (guest.khachHang && guest.khachHang.sdt) || guest.soDienThoai || 'N/A';

        // Hiển thị TẤT CẢ số phòng (nếu có nhiều phòng)
        let roomNumber = 'N/A';
        if (guest.danhSachPhong && guest.danhSachPhong.length > 0) {
            // Lấy tất cả số phòng và nối bằng dấu phẩy
            const roomNumbers = guest.danhSachPhong.map(room =>
                room.sophong || room.soPhong || room.roomNumber || room.number || 'N/A'
            );
            roomNumber = roomNumbers.join(', ');
        } else {
            roomNumber = guest.phong || guest.sophong || guest.soPhong || guest.roomNumber || 'N/A';
        }
        const checkInDate = formatDate(guest.ngaynhanphong || guest.ngayNhanPhong);
        const checkOutDate = formatDate(guest.ngaytraphong || guest.ngayTraPhong);

        // Create row element for better performance
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${bookingCode}</strong></td>
            <td>${customerName}</td>
            <td>${phone}</td>
            <td class="room-number">${roomNumber}</td>
            <td>${checkInDate}</td>
            <td>${checkOutDate}</td>
            <td>
                <span class="status-badge status-checkedin">Đang ở</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-primary" onclick="openServicesModal('${bookingCode}')">
                        <i class="fas fa-concierge-bell"></i> Dịch vụ
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="showServiceHistory('${bookingCode}')" style="margin-left: 5px;">
                        <i class="fas fa-history"></i> Lịch sử
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });

    // Clear and append all rows at once for better performance
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// Search guest function
function searchGuest() {
    const bookingCodeEl = document.getElementById('searchBookingCode');
    const roomNumberEl = document.getElementById('searchRoomNumber');
    const customerNameEl = document.getElementById('searchCustomerName');

    const bookingCode = bookingCodeEl && bookingCodeEl.value ? bookingCodeEl.value.trim() : '';
    const roomNumber = roomNumberEl && roomNumberEl.value ? roomNumberEl.value.trim() : '';
    const customerName = customerNameEl && customerNameEl.value ? customerNameEl.value.trim() : '';

    if (!bookingCode && !roomNumber && !customerName) {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm!');
        return;
    }

    console.log(' Tìm kiếm local với:', { bookingCode, roomNumber, customerName });

    const filteredResults = currentGuestsData.filter(guest => {
        let matches = true;

        if (bookingCode) {
            const guestBookingCode = (guest.madatphong || guest.maDatPhong || '').toString();
            matches = matches && guestBookingCode.toLowerCase().includes(bookingCode.toLowerCase());
        }

        if (roomNumber) {
            const guestRoomNumber = (
                guest.danhSachPhong && guest.danhSachPhong[0] && guest.danhSachPhong[0].sophong ?
                guest.danhSachPhong[0].sophong :
                guest.phong || ''
            ).toString();
            matches = matches && guestRoomNumber.includes(roomNumber);
        }

        if (customerName) {
            const guestName = (guest.khachHang && guest.khachHang.hoten) || guest.tenKhachHang || '';
            matches = matches && guestName.toLowerCase().includes(customerName.toLowerCase());
        }

        return matches;
    });

    console.log(' Tìm thấy:', filteredResults.length, 'khách');
    displayCurrentGuests(filteredResults);

    if (filteredResults.length === 0) {
        alert('Không tìm thấy khách nào phù hợp!');
    }
}

// Reset search
function resetSearch() {
    // Clear search inputs
    ['searchBookingCode', 'searchRoomNumber', 'searchCustomerName'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });

    // Display all guests
    displayCurrentGuests(currentGuestsData);
}

// Load available services with optimization
async function loadAvailableServices() {
    const startTime = performance.now();

    try {
        console.log(' Đang tải danh sách dịch vụ...');

        // Check cache first (cache for 2 minutes for faster updates)
        const cacheKey = 'services_cache';
        const cacheTime = 2 * 60 * 1000; // 2 minutes
        const cached = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(cacheKey + '_timestamp');

        if (cached && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < cacheTime) {
            console.log(' Using cached services data');
            availableServices = JSON.parse(cached).filter(service => service.trangthai === "Hiệu lực");
            console.log(' Cached services loaded:', availableServices.length);
            return;
        }

        // Add timeout to prevent hanging (reduced from 8s to 4s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(`${API_BASE}/Dichvus`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const services = await response.json();
        const endTime = performance.now();

        console.log(` Services loaded in ${(endTime - startTime).toFixed(0)}ms:`, services.length, 'total');

        // Cache the data
        localStorage.setItem(cacheKey, JSON.stringify(services));
        localStorage.setItem(cacheKey + '_timestamp', Date.now().toString());

        // Filter only active services
        availableServices = services.filter(service => service.trangthai === "Hiệu lực");
        console.log(' Active services:', availableServices.length);

    } catch (error) {
        console.error(' Lỗi tải danh sách dịch vụ:', error);

        // Use mock data matching Dichvus structure if API fails
        availableServices = [
            { madv: 1, tendv: 'Bữa sáng buffet', mota: 'Buffet sáng đa dạng món ăn', giatien: 150000, trangthai: 'Hiệu lực' },
            { madv: 2, tendv: 'Giặt ủi nhanh', mota: 'Giặt ủi trong 24h', giatien: 50000, trangthai: 'Hiệu lực' },
            { madv: 3, tendv: 'Massage thư giãn', mota: 'Massage toàn thân 60 phút', giatien: 300000, trangthai: 'Hiệu lực' },
            { madv: 4, tendv: 'Đưa đón sân bay', mota: 'Đưa đón bằng xe riêng', giatien: 200000, trangthai: 'Hiệu lực' },
            { madv: 5, tendv: 'Thuê xe máy', mota: 'Xe máy cho thuê theo ngày', giatien: 100000, trangthai: 'Hiệu lực' }
        ];
        console.log(' Sử dụng dữ liệu mẫu cho dịch vụ');
    }
}

// Open services modal
function openServicesModal(bookingId) {
    console.log(' Mở modal dịch vụ cho booking:', bookingId);

    // Find guest info
    const guest = currentGuestsData.find(g =>
        (g.madatphong && g.madatphong.toString() === bookingId.toString()) ||
        (g.maDatPhong && g.maDatPhong.toString() === bookingId.toString())
    );

    if (!guest) {
        console.error(' Không tìm thấy thông tin khách:', bookingId);
        alert('Không tìm thấy thông tin khách hàng!');
        return;
    }

    currentBookingId = bookingId;
    selectedServices = [];

    // Populate guest info
    populateGuestInfo(guest);

    // Display available services
    displayAvailableServices();

    // Show modal
    const modal = document.getElementById('servicesModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Populate guest info in modal
function populateGuestInfo(guest) {
    const safeSetText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || 'N/A';
    };

    // Debug guest info for modal
    console.log(' DEBUG Modal Guest Info:');
    console.log('   - guest object:', guest);
    console.log('   - guest.danhSachPhong:', guest.danhSachPhong);
    console.log('   - guest.phong:', guest.phong);
    console.log('   - guest.sophong:', guest.sophong);
    console.log('   - guest.soPhong:', guest.soPhong);

    // Get room number with same logic as display function
    let roomNumber = 'N/A';
    if (guest.danhSachPhong && guest.danhSachPhong.length > 0) {
        // Array of rooms - take first one
        const firstRoom = guest.danhSachPhong[0];
        roomNumber = firstRoom.sophong || firstRoom.soPhong || firstRoom.roomNumber || firstRoom.number;
    } else if (guest.phong) {
        roomNumber = guest.phong;
    } else if (guest.sophong) {
        roomNumber = guest.sophong;
    } else if (guest.soPhong) {
        roomNumber = guest.soPhong;
    } else if (guest.roomNumber) {
        roomNumber = guest.roomNumber;
    }

    // Final fallback check
    if (!roomNumber || roomNumber === 'N/A') {
        roomNumber = 'N/A';
    }

    safeSetText('modalBookingCode', guest.madatphong || guest.maDatPhong);
    safeSetText('modalCustomerName', (guest.khachHang && guest.khachHang.hoten) || guest.tenKhachHang);
    safeSetText('modalRoomNumber', roomNumber);
    safeSetText('modalPhone', (guest.khachHang && guest.khachHang.sdt) || guest.soDienThoai);
}

// Display available services
function displayAvailableServices() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    if (availableServices.length === 0) {
        grid.innerHTML = '<p class="no-data">Không có dịch vụ nào</p>';
        return;
    }

    const html = availableServices.map(service => `
        <div class="service-card" onclick="addService(${service.madv || service.id})">
            <h4>${service.tendv || service.tenDichVu || service.name}</h4>
            <div class="price">${formatCurrency(service.giatien || service.giaDichVu || service.price)}</div>
            <div class="description">${service.mota || service.moTa || service.description || ''}</div>
        </div>
    `).join('');

    grid.innerHTML = html;
}

// Add service to selected list
function addService(serviceId) {
    const service = availableServices.find(s => (s.madv || s.id) === serviceId);
    if (!service) return;

    // Use consistent ID field
    const serviceIdField = service.madv || service.id;

    // Check if already selected
    const existingIndex = selectedServices.findIndex(s => (s.madv || s.id) === serviceIdField);
    if (existingIndex >= 0) {
        selectedServices[existingIndex].quantity += 1;
    } else {
        selectedServices.push({
            ...service,
            quantity: 1
        });
    }

    updateSelectedServicesList();
    updateTotalAmount();
}

// Update selected services list
function updateSelectedServicesList() {
    const list = document.getElementById('selectedServicesList');
    if (!list) return;

    if (selectedServices.length === 0) {
        list.innerHTML = '<p class="no-data">Chưa có dịch vụ nào được chọn</p>';
        return;
    }

    const html = selectedServices.map((service, index) => `
        <div class="selected-item">
            <div class="selected-item-info">
                <div class="selected-item-name">${service.tendv || service.tenDichVu || service.name}</div>
                <div class="selected-item-qty">Số lượng: ${service.quantity}</div>
            </div>
            <div class="selected-item-price">${formatCurrency((service.giatien || service.giaDichVu || service.price) * service.quantity)}</div>
            <div class="selected-item-actions">
                <div class="qty-control">
                    <button class="qty-btn" onclick="changeQuantity(${index}, -1)">-</button>
                    <input type="number" class="qty-input" value="${service.quantity}" onchange="setQuantity(${index}, this.value)" min="1">
                    <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeService(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');

    list.innerHTML = html;
}

// Change service quantity
function changeQuantity(index, change) {
    if (selectedServices[index]) {
        selectedServices[index].quantity = Math.max(1, selectedServices[index].quantity + change);
        updateSelectedServicesList();
        updateTotalAmount();
    }
}

// Set service quantity
function setQuantity(index, value) {
    const qty = Math.max(1, parseInt(value) || 1);
    if (selectedServices[index]) {
        selectedServices[index].quantity = qty;
        updateSelectedServicesList();
        updateTotalAmount();
    }
}

// Remove service
function removeService(index) {
    selectedServices.splice(index, 1);
    updateSelectedServicesList();
    updateTotalAmount();
}

// Update total amount
function updateTotalAmount() {
    const total = selectedServices.reduce((sum, service) => {
        return sum + ((service.giatien || service.giaDichVu || service.price) * service.quantity);
    }, 0);

    const totalEl = document.getElementById('totalServiceAmount');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }
}

// Confirm services - Đơn giản hóa với stored procedure TAO_SUDUNGDV
//         console.log(' currentBookingId:', currentBookingId);
//         console.log(' mahoadon:', mahoadon);

//         // Validation
//         if (!currentBookingId) {
//             console.error(' currentBookingId is null or undefined');
//             continue;
//         }

//         if (!mahoadon) {
//             console.error(' mahoadon is null or undefined');
//             continue;
//         }

//         const detailData = {
//             mahoadon: parseInt(mahoadon),
//             madatphong: parseInt(currentBookingId), // Thêm madatphong
//             loaiphi: 'Dịch vụ', // Thêm loaiphi
//             soluong: parseInt(service.quantity),
//             dongia: parseFloat(service.giatien || service.giaDichVu || service.price),
//             thanhtien: parseFloat(serviceTotal),
//             mota: `${service.tendv || service.tenDichVu || service.name}`
//         };

//         // Thêm các trường khác nếu có
//         if (service.madv || service.id) {
//             detailData.madv = parseInt(service.madv || service.id);
//         }

//         console.log(' Tạo chi tiết hóa đơn cho:', service.tendv || service.name);
//         console.log(' Payload chi tiết hóa đơn:', detailData);

//         try {
//             const response = await fetch(`${API_BASE}/Chitiethoadons`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify(detailData)
//             });

//             console.log(` Chitiethoadons API Response Status: ${response.status}`);

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 console.error(` Chi tiết API Error (${response.status}):`, errorText);

//                 // Nếu lỗi 400, thử với payload khác
//                 if (response.status === 400) {
//                     console.log(' Thử với cấu trúc payload khác...');

//                     const alternativeData = {
//                         mahoadon: parseInt(mahoadon),
//                         madatphong: parseInt(currentBookingId),
//                         loaiphi: 'Dịch vụ',
//                         mota: service.tendv || service.tenDichVu || service.name || 'Dịch vụ',
//                         soluong: parseInt(service.quantity),
//                         dongia: parseFloat(service.giatien || service.giaDichVu || service.price),
//                         thanhtien: parseFloat(serviceTotal)
//                     };

//                     const retryResponse = await fetch(`${API_BASE}/Chitiethoadons`, {
//                         method: 'POST',
//                         headers: {
//                             'Content-Type': 'application/json'
//                         },
//                         body: JSON.stringify(alternativeData)
//                     });

//                     if (retryResponse.ok) {
//                         const retryResult = await retryResponse.json();
//                         detailResults.push(retryResult);
//                         console.log(` Chi tiết hóa đơn (retry) cho ${service.tendv} đã tạo thành công:`, retryResult);
//                         continue;
//                     } else {
//                         const retryError = await retryResponse.text();
//                         console.error(` Retry cũng thất bại:`, retryError);

//                         // Thử payload tối giản cuối cùng
//                         console.log(' Thử với payload tối giản...');
//                         const minimalData = {
//                             mahoadon: parseInt(mahoadon),
//                             madatphong: parseInt(currentBookingId),
//                             loaiphi: 'Dịch vụ',
//                             thanhtien: parseFloat(serviceTotal)
//                         };

//                         const finalResponse = await fetch(`${API_BASE}/Chitiethoadons`, {
//                             method: 'POST',
//                             headers: {
//                                 'Content-Type': 'application/json'
//                             },
//                             body: JSON.stringify(minimalData)
//                         });

//                         if (finalResponse.ok) {
//                             const finalResult = await finalResponse.json();
//                             detailResults.push(finalResult);
//                             console.log(` Chi tiết hóa đơn (minimal) cho ${service.tendv} đã tạo thành công:`, finalResult);
//                             continue;
//                         }
//                     }
//                 }

//                 let errorDetails = errorText;
//                 try {
//                     const errorJson = JSON.parse(errorText);
//                     if (errorJson.errors) {
//                         errorDetails = Object.entries(errorJson.errors)
//                             .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
//                             .join('; ');
//                     } else if (errorJson.message || errorJson.title) {
//                         errorDetails = errorJson.message || errorJson.title;
//                     }
//                 } catch (e) {
//                     // Use original text if JSON parse fails
//                 }

//                 console.warn(` Lỗi tạo chi tiết cho ${service.tendv}: ${errorDetails}`);
//                 continue;
//             }

//             const result = await response.json();
//             detailResults.push(result);
//             console.log(` Chi tiết hóa đơn cho ${service.tendv} đã tạo thành công:`, result);

//         } catch (error) {
//             console.error(` Lỗi chi tiết hóa đơn cho ${service.tendv}:`, error);
//         }
//     }

//     return detailResults;
// }

// Confirm services - Đơn giản hóa với stored procedure TAO_SUDUNGDV
async function confirmServices() {
    if (!currentBookingId) {
        alert('Lỗi: Không tìm thấy thông tin booking!');
        return;
    }

    if (selectedServices.length === 0) {
        alert('Vui lòng chọn ít nhất một dịch vụ!');
        return;
    }

    try {
        console.log(' Bắt đầu đặt dịch vụ cho booking:', currentBookingId);
        console.log(' Dịch vụ được chọn:', selectedServices);

        // Gọi stored procedure TAO_SUDUNGDV cho từng dịch vụ
        const serviceResults = [];
        for (const service of selectedServices) {
            const serviceData = {
                madatphong: parseInt(currentBookingId),
                madv: parseInt(service.madv || service.id),
                soluong: parseInt(service.quantity)
            };

            console.log(' Gọi procedure TAO_SUDUNGDV:', serviceData);

            const response = await fetch(`${API_BASE}/Sudungdvs/sudungdv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serviceData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(` Lỗi khi thêm dịch vụ ${service.tendv}:`, errorText);
                throw new Error(`Lỗi thêm dịch vụ "${service.tendv}": ${errorText}`);
            }

            const result = await response.json();
            serviceResults.push(result);
            console.log(` ✓ Đã thêm dịch vụ: ${service.tendv} x${service.quantity}`);
        }

        // Tính tổng tiền
        const totalAmount = selectedServices.reduce((sum, s) =>
            sum + (s.giatien || s.giaDichVu || s.price) * s.quantity, 0
        );

        console.log('🎉 Hoàn tất đặt dịch vụ:', {
            booking: currentBookingId,
            services: selectedServices.length,
            total: totalAmount
        });

        // Thông báo thành công
        const successMessage = [
            '✓ Đặt dịch vụ thành công!',
            '',
            `📋 Mã booking: ${currentBookingId}`,
            `🛎️ Số dịch vụ: ${selectedServices.length}`,
            `💰 Tổng tiền: ${formatCurrency(totalAmount)}`,
            '',
            'Dịch vụ đã được thêm vào hóa đơn!'
        ].join('\n');

        alert(successMessage);

        // Đóng modal và refresh
        closeServicesModal();
        window.location.reload();

    } catch (error) {
        console.error(' Lỗi đặt dịch vụ:', error);
        alert('❌ Lỗi đặt dịch vụ: ' + error.message);
    }
}

// Handle successful service booking with enhanced UX
async function handleSuccessfulServiceBooking(result, bookedServices, bookingId) {
    const totalAmount = bookedServices.reduce((sum, s) => sum + (s.giatien || s.giaDichVu || s.price) * s.quantity, 0);
    const serviceNames = bookedServices.map(s => `${s.tendv || s.tenDichVu || s.name} (x${s.quantity})`).join('\n');

    // Store booking result for potential actions
    const bookingResult = {
        bookingId: bookingId,
        services: bookedServices,
        totalAmount: totalAmount,
        timestamp: new Date(),
        result: result
    };

    // Show success notification with action options
    const userChoice = await showServiceBookingSuccess(bookingResult);

    // Handle user choice
    switch (userChoice) {
        case 'history':
            await showServiceHistory(bookingId);
            break;
        case 'print':
            await generateServiceReceipt(bookingResult);
            break;
        case 'more':
            // Keep modal open for more services
            selectedServices = [];
            updateSelectedServicesList();
            updateTotalAmount();
            return; // Don't close modal
        default:
            break;
    }

    // Close modal and refresh data
    closeServicesModal();

    // Refresh guest list to show updated service status
    try {
        await loadCurrentGuests();
        console.log(' Guest list refreshed after service booking');
    } catch (error) {
        console.log(' Failed to refresh guest list:', error.message);
    }
}

// Show enhanced success notification with action options
async function showServiceBookingSuccess(bookingResult) {
    return new Promise((resolve) => {
        const { bookingId, services, totalAmount, timestamp } = bookingResult;
        const serviceNames = services.map(s => `${s.tendv || s.tenDichVu || s.name} (x${s.quantity})`).join('\n');

        // Create custom modal for better UX
        const modalHTML = `
            <div id="successModal" class="modal-overlay" style="display: flex;">
                <div class="modal-content success-modal">
                    <div class="success-header">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 3em; margin-bottom: 15px;"></i>
                        <h3>Đặt dịch vụ thành công!</h3>
                    </div>
                    
                    <div class="success-details">
                        <div class="detail-row">
                            <strong>Mã booking:</strong> ${bookingId}
                        </div>
                        <div class="detail-row">
                            <strong>Dịch vụ đã đặt:</strong><br>
                            <div class="service-list">${serviceNames}</div>
                        </div>
                        <div class="detail-row">
                            <strong>Tổng tiền:</strong> <span class="total-amount">${formatCurrency(totalAmount)}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Thời gian:</strong> ${timestamp.toLocaleString('vi-VN')}
                        </div>
                    </div>
                    
                    <div class="success-actions">
                        <button class="btn btn-primary" onclick="resolveSuccess('history')">
                            <i class="fas fa-history"></i> Xem lịch sử
                        </button>
                        <button class="btn btn-info" onclick="resolveSuccess('print')">
                            <i class="fas fa-print"></i> In hóa đơn
                        </button>
                        <button class="btn btn-warning" onclick="resolveSuccess('more')">
                            <i class="fas fa-plus"></i> Đặt thêm
                        </button>
                        <button class="btn btn-secondary" onclick="resolveSuccess('close')">
                            <i class="fas fa-times"></i> Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Add resolver function to window
        window.resolveSuccess = (choice) => {
            document.body.removeChild(modalContainer);
            delete window.resolveSuccess;
            resolve(choice);
        };
    });
}

// Generate service receipt
async function generateServiceReceipt(bookingResult) {
    try {
        console.log(' Generating service receipt...');

        // Create printable receipt content
        const receiptContent = generateReceiptHTML(bookingResult);

        // Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        printWindow.print();

        console.log(' Receipt generated successfully');

    } catch (error) {
        console.error(' Error generating receipt:', error);
        alert('Lỗi tạo hóa đơn: ' + error.message);
    }
}

// Generate receipt HTML
function generateReceiptHTML(bookingResult) {
    const { bookingId, services, totalAmount, timestamp } = bookingResult;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa đơn dịch vụ - ${bookingId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .detail { margin-bottom: 10px; }
                .services-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .services-table th, .services-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .services-table th { background-color: #f2f2f2; }
                .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>HÓA ĐƠN DỊCH VỤ KHÁCH SẠN</h2>
                <p>Ngày: ${timestamp.toLocaleDateString('vi-VN')} - ${timestamp.toLocaleTimeString('vi-VN')}</p>
            </div>
            
            <div class="detail">
                <strong>Mã đặt phòng:</strong> ${bookingId}
            </div>
            
            <table class="services-table">
                <thead>
                    <tr>
                        <th>Dịch vụ</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${services.map(service => `
                        <tr>
                            <td>${service.tendv || service.tenDichVu || service.name}</td>
                            <td>${service.quantity}</td>
                            <td>${formatCurrency(service.giatien || service.giaDichVu || service.price)}</td>
                            <td>${formatCurrency((service.giatien || service.giaDichVu || service.price) * service.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="total">
                Tổng cộng: ${formatCurrency(totalAmount)}
            </div>
            
            <div style="margin-top: 40px; text-align: center;">
                <p>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
            </div>
        </body>
        </html>
    `;
}

// Show service history for a booking
async function showServiceHistory(bookingId) {
    try {
        console.log(' Đang tải lịch sử dịch vụ cho booking:', bookingId);
        
        // Show loading state
        const modal = document.getElementById('serviceHistoryModal');
        const historyBody = document.getElementById('serviceHistoryBody');
        const noDataDiv = document.getElementById('noHistoryData');
        const historyContent = document.querySelector('.history-content');
        
        // Set basic booking info
        document.getElementById('historyBookingCode').textContent = bookingId;
        
        // Find booking info from current guests data
        const currentGuests = getCurrentGuestInfo(bookingId);
        if (currentGuests) {
            document.getElementById('historyCustomerName').textContent = currentGuests.customerName || '-';
            document.getElementById('historyRoomNumber').textContent = currentGuests.roomNumber || '-';
        } else {
            // Set default values if guest info not found
            document.getElementById('historyCustomerName').textContent = '-';
            document.getElementById('historyRoomNumber').textContent = '-';
            console.log(' Không tìm thấy thông tin khách trong bảng, sẽ hiển thị giá trị mặc định');
        }
        
        // Show modal with loading
        modal.style.display = 'flex';
        historyBody.innerHTML = '<tr><td colspan="6" class="history-loading"><i class="fas fa-spinner"></i><br>Đang tải lịch sử dịch vụ...</td></tr>';
        noDataDiv.style.display = 'none';
        historyContent.style.display = 'block';

        const response = await fetch(`${API_BASE}/Sudungdvs/history/${bookingId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const serviceHistory = await response.json();
        console.log(' Lịch sử dịch vụ:', serviceHistory);

        // Clear loading state
        historyBody.innerHTML = '';

        if (serviceHistory && serviceHistory.length > 0) {
            let totalHistoryAmount = 0;
            
            // Try to get customer info from first service record if available
            const firstService = serviceHistory[0];
            if (firstService && firstService.datphong) {
                const bookingInfo = firstService.datphong;
                if (bookingInfo.tenKhachHang) {
                    document.getElementById('historyCustomerName').textContent = bookingInfo.tenKhachHang;
                }
                if (bookingInfo.soPhong) {
                    document.getElementById('historyRoomNumber').textContent = bookingInfo.soPhong;
                }
                console.log(' Cập nhật thông tin khách từ API:', {
                    customerName: bookingInfo.tenKhachHang,
                    roomNumber: bookingInfo.soPhong
                });
            }
            
            serviceHistory.forEach((item, index) => {
                const serviceName = (item.dichvu && item.dichvu.tendv) || item.tenDichVu || 'Dịch vụ';
                const quantity = item.soLuong || item.quantity || 1;
                const unitPrice = item.donGia || item.giaPhuc || 0;
                const totalPrice = item.thanhTien || (unitPrice * quantity);
                const serviceDate = item.ngaySuDung || item.createdAt || new Date();

                totalHistoryAmount += totalPrice;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${serviceName}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(unitPrice)}</td>
                    <td>${formatCurrency(totalPrice)}</td>
                    <td>${formatDate(serviceDate)}</td>
                `;
                historyBody.appendChild(row);
            });

            // Update summary
            document.getElementById('totalServiceCount').textContent = serviceHistory.length;
            document.getElementById('totalHistoryAmount').textContent = formatCurrency(totalHistoryAmount);
            
            // Show history content
            historyContent.style.display = 'block';
            noDataDiv.style.display = 'none';
            
            // Enable print button
            document.getElementById('printHistoryBtn').style.display = 'inline-block';
        } else {
            // Show no data state
            historyContent.style.display = 'none';
            noDataDiv.style.display = 'block';
            
            // Hide print button
            document.getElementById('printHistoryBtn').style.display = 'none';
        }

    } catch (error) {
        console.error(' Lỗi tải lịch sử dịch vụ:', error);
        
        // Show error in modal
        const historyBody = document.getElementById('serviceHistoryBody');
        historyBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    Lỗi: ${error.message}
                    <br><br>
                    <button class="retry-btn" onclick="showServiceHistory('${bookingId}')">
                        <i class="fas fa-redo"></i> Thử lại
                    </button>
                </td>
            </tr>
        `;
        
        // Hide print button on error
        document.getElementById('printHistoryBtn').style.display = 'none';
    }
}

// Get current guest info helper function
function getCurrentGuestInfo(bookingId) {
    console.log(' Tìm thông tin khách cho booking:', bookingId);
    
    // Try to find guest info from the current guests table
    const guestRows = document.querySelectorAll('#currentGuestsList tr');
    console.log(' Tìm thấy', guestRows.length, 'dòng trong bảng khách');
    
    for (const row of guestRows) {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const rowBookingId = cells[0].textContent.trim();
            console.log(' So sánh:', rowBookingId, 'với', bookingId);
            
            if (rowBookingId === bookingId) {
                const guestInfo = {
                    customerName: cells[1] ? cells[1].textContent.trim() : '',
                    phone: cells[2] ? cells[2].textContent.trim() : '',
                    roomNumber: cells[3] ? cells[3].textContent.trim() : ''
                };
                console.log(' Tìm thấy thông tin khách:', guestInfo);
                return guestInfo;
            }
        }
    }
    console.log(' Không tìm thấy thông tin khách cho booking:', bookingId);
    return null;
}

// Add service history button to guest table
function addServiceHistoryButton() {
    // This function can be called after displaying guests to add history buttons
    const actionCells = document.querySelectorAll('.table-actions');
    actionCells.forEach(cell => {
        const bookingCodeCell = cell.closest('tr') && cell.closest('tr').querySelector('td');
        const bookingCode = bookingCodeCell ? bookingCodeCell.textContent.trim() : null;
        if (bookingCode && !Array.from(cell.children).some(child => child.classList.contains('btn-history'))) {
            const historyBtn = document.createElement('button');
            historyBtn.className = 'btn btn-sm btn-secondary btn-history';
            historyBtn.innerHTML = '<i class="fas fa-history"></i> Lịch sử';
            historyBtn.style.marginLeft = '5px';
            historyBtn.onclick = () => showServiceHistory(bookingCode);
            cell.appendChild(historyBtn);
        }
    });
}

// Close services modal
function closeServicesModal() {
    const modal = document.getElementById('servicesModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // Reset data
    currentBookingId = null;
    selectedServices = [];
    updateSelectedServicesList();
    updateTotalAmount();
}

// Preload data management
function checkPreloadedData() {
    const result = {
        hasData: false,
        guests: null,
        services: null
    };
    
    try {
        // Check sessionStorage for preloaded data (faster than localStorage)
        const preloadedGuests = sessionStorage.getItem('preloaded_guests');
        const preloadedServices = sessionStorage.getItem('preloaded_services');
        const preloadTimestamp = sessionStorage.getItem('preload_timestamp');
        
        // Data is valid for 2 minutes
        const maxAge = 2 * 60 * 1000; // 2 minutes
        const isDataFresh = preloadTimestamp && (Date.now() - parseInt(preloadTimestamp)) < maxAge;
        
        if (isDataFresh) {
            if (preloadedGuests) {
                result.guests = JSON.parse(preloadedGuests);
                result.hasData = true;
                console.log(' Found preloaded guests:', result.guests.length);
            }
            
            if (preloadedServices) {
                result.services = JSON.parse(preloadedServices);
                result.hasData = true;
                console.log(' Found preloaded services:', result.services.length);
            }
        } else {
            // Clear old preloaded data
            clearPreloadedData();
        }
        
    } catch (error) {
        console.error('Error checking preloaded data:', error);
        clearPreloadedData();
    }
    
    return result;
}

function clearPreloadedData() {
    sessionStorage.removeItem('preloaded_guests');
    sessionStorage.removeItem('preloaded_services');
    sessionStorage.removeItem('preload_timestamp');
}

// Background preloading function (call this from other pages)
async function preloadServicesData() {
    try {
        console.log(' Background preloading services data...');
        
        const promises = [];
        
        // Only preload if not already cached
        if (!sessionStorage.getItem('preloaded_guests')) {
            promises.push(
                fetch(`${API_BASE}/Datphongs/checked-in`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            sessionStorage.setItem('preloaded_guests', JSON.stringify(data));
                            console.log(' Preloaded guests:', data.length);
                        }
                    })
                    .catch(e => console.log('Failed to preload guests:', e.message))
            );
        }
        
        if (!sessionStorage.getItem('preloaded_services')) {
            promises.push(
                fetch(`${API_BASE}/Dichvus`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            const activeServices = data.filter(s => s.trangthai === "Hiệu lực");
                            sessionStorage.setItem('preloaded_services', JSON.stringify(activeServices));
                            console.log(' Preloaded services:', activeServices.length);
                        }
                    })
                    .catch(e => console.log('Failed to preload services:', e.message))
            );
        }
        
        if (promises.length > 0) {
            await Promise.all(promises);
            sessionStorage.setItem('preload_timestamp', Date.now().toString());
            console.log('🚀 Services data preloading completed');
        }
        
    } catch (error) {
        console.error('Background preload failed:', error);
    }
}

// Loading state management
function showLoadingState(message = 'Đang tải dữ liệu...') {
    const tbody = document.getElementById('currentGuestsList');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin" style="color: #007bff;"></i>
                        <span id="loadingMessage">${message}</span>
                        <div class="loading-details" style="font-size: 0.9em; color: #6c757d; margin-top: 5px;">
                            <span id="loadingDetails">Kết nối tới server...</span>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Add loading class to main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('loading');
    }
}

// Update loading message
function updateLoadingMessage(message, details = '') {
    const messageEl = document.getElementById('loadingMessage');
    const detailsEl = document.getElementById('loadingDetails');
    
    if (messageEl) messageEl.textContent = message;
    if (detailsEl) detailsEl.textContent = details;
}

function hideLoadingState() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.remove('loading');
    }
}

function showErrorState(message) {
    const tbody = document.getElementById('currentGuestsList');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>${message}</div>
                    <button onclick="window.location.reload()" class="btn btn-sm btn-primary" style="margin-top: 10px;">
                        <i class="fas fa-redo"></i> Tải lại trang
                    </button>
                </td>
            </tr>
        `;
    }
}

// Performance monitoring
function logPerformance(operationName, startTime, endTime, dataSize = null) {
    const duration = endTime - startTime;
    const sizeText = dataSize ? ` (${dataSize} items)` : '';
    
    if (duration > 3000) {
        console.warn(` Slow operation: ${operationName} took ${duration.toFixed(0)}ms${sizeText}`);
    } else if (duration > 1000) {
        console.log(` ${operationName} took ${duration.toFixed(0)}ms${sizeText}`);
    } else {
        console.log(` ${operationName} completed in ${duration.toFixed(0)}ms${sizeText}`);
    }
}

// Clear cache function
function clearServicesCache() {
    localStorage.removeItem('services_cache');
    localStorage.removeItem('services_cache_timestamp');
    console.log(' Services cache cleared');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    } catch (error) {
        return 'N/A';
    }
}

function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '0 VNĐ';

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Export functions for global access
window.searchGuest = searchGuest;
window.resetSearch = resetSearch;
window.openServicesModal = openServicesModal;
window.closeServicesModal = closeServicesModal;
window.confirmServices = confirmServices;
window.addService = addService;
window.changeQuantity = changeQuantity;
window.setQuantity = setQuantity;
window.removeService = removeService;
window.showServiceHistory = showServiceHistory;
window.addServiceHistoryButton = addServiceHistoryButton;
window.clearServicesCache = clearServicesCache;
window.loadCurrentGuests = loadCurrentGuests;
window.preloadServicesData = preloadServicesData;
window.checkPreloadedData = checkPreloadedData;
window.clearPreloadedData = clearPreloadedData;
window.handleSuccessfulServiceBooking = handleSuccessfulServiceBooking;
window.generateServiceReceipt = generateServiceReceipt;
// Removed: createServiceInvoice, getInvoiceDetails, getInvoicesByBooking (handled by stored procedure)

// Close service history modal
function closeServiceHistoryModal() {
    const modal = document.getElementById('serviceHistoryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Print service history
function printServiceHistory() {
    try {
        console.log(' Bắt đầu in lịch sử dịch vụ...');
        
        const bookingId = document.getElementById('historyBookingCode').textContent;
        const customerName = document.getElementById('historyCustomerName').textContent;
        const roomNumber = document.getElementById('historyRoomNumber').textContent;
        
        console.log(' Thông tin booking:', { bookingId, customerName, roomNumber });
        
        // Get service history data
        const historyRows = document.querySelectorAll('#serviceHistoryTable tbody tr');
        const totalAmount = document.getElementById('totalHistoryAmount').textContent;
        const totalCount = document.getElementById('totalServiceCount').textContent;
        
        console.log(' Dữ liệu lịch sử:', { historyRowsCount: historyRows.length, totalAmount, totalCount });
        
        if (historyRows.length === 0 || !historyRows[0] || historyRows[0].textContent.includes('Đang tải')) {
            alert('Không có dữ liệu để in hoặc dữ liệu đang tải!');
            return;
        }

        // Build service history table HTML
        let servicesHtml = '';
        let totalAmountValue = 0;
        
        historyRows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
                const serviceName = cells[1].textContent.trim();
                const quantity = cells[2].textContent.trim();
                const unitPrice = cells[3].textContent.trim();
                const totalPrice = cells[4].textContent.trim();
                const serviceDate = cells[5].textContent.trim();
                
                servicesHtml += `
                    <tr>
                        <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                        <td style="text-align: left; padding: 8px; border: 1px solid #ddd;">${serviceName}</td>
                        <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${quantity}</td>
                        <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${unitPrice}</td>
                        <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">${totalPrice}</td>
                        <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${serviceDate}</td>
                    </tr>
                `;
            }
        });

        // Create print window
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            alert('Không thể mở cửa sổ in! Vui lòng cho phép popup cho trang web này.');
            return;
        }
        
        console.log(' Đã tạo print window');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Lịch Sử Dịch Vụ - ${bookingId}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 20px;
                        color: #333;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #4a90e2;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #4a90e2;
                        margin: 0;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 14px;
                        margin-top: 5px;
                    }
                    .booking-info {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                        border-left: 4px solid #4a90e2;
                    }
                    .booking-info h3 {
                        margin: 0 0 15px 0;
                        color: #4a90e2;
                        font-size: 16px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 10px;
                    }
                    .info-item {
                        display: flex;
                        justify-content: space-between;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #555;
                    }
                    .info-value {
                        color: #333;
                    }
                    .services-section h3 {
                        color: #4a90e2;
                        margin-bottom: 15px;
                        font-size: 16px;
                    }
                    .services-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        border: 1px solid #ddd;
                    }
                    .services-table th {
                        background: #4a90e2;
                        color: white;
                        padding: 12px 8px;
                        text-align: center;
                        font-weight: bold;
                        border: 1px solid #ddd;
                    }
                    .services-table td {
                        padding: 8px;
                        border: 1px solid #ddd;
                    }
                    .services-table tbody tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .summary {
                        background: #e3f2fd;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #4a90e2;
                        margin-top: 20px;
                    }
                    .summary-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                    }
                    .summary-total {
                        font-weight: bold;
                        font-size: 16px;
                        color: #4a90e2;
                        border-top: 2px solid #4a90e2;
                        padding-top: 8px;
                        margin-top: 8px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        color: #666;
                        font-size: 12px;
                    }
                    @media print {
                        body { margin: 0; }
                        .header { page-break-after: avoid; }
                        .booking-info { page-break-inside: avoid; }
                        .summary { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1> LỊCH SỬ DỊCH VỤ</h1>
                    <div class="subtitle">Chi tiết các dịch vụ đã sử dụng</div>
                </div>

                <div class="booking-info">
                    <h3> Thông Tin Booking</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Mã Booking:</span>
                            <span class="info-value">${bookingId}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Khách Hàng:</span>
                            <span class="info-value">${customerName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Số Phòng:</span>
                            <span class="info-value">${roomNumber}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Ngày In:</span>
                            <span class="info-value">${formatDate(new Date())}</span>
                        </div>
                    </div>
                </div>

                <div class="services-section">
                    <h3> Chi Tiết Dịch Vụ</h3>
                    <table class="services-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên Dịch Vụ</th>
                                <th>Số Lượng</th>
                                <th>Đơn Giá</th>
                                <th>Thành Tiền</th>
                                <th>Ngày Sử Dụng</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${servicesHtml}
                        </tbody>
                    </table>
                </div>

                <div class="summary">
                    <div class="summary-item">
                        <span>Tổng số dịch vụ:</span>
                        <span><strong>${totalCount} dịch vụ</strong></span>
                    </div>
                    <div class="summary-item summary-total">
                        <span>TỔNG CỘNG:</span>
                        <span>${totalAmount}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>© 2024 Hotel Management System - Lịch sử dịch vụ được in lúc ${formatDate(new Date())} ${new Date().toLocaleTimeString('vi-VN')}</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        console.log(' Đã ghi nội dung vào print window');
        
        // Wait for content to load then print
        printWindow.onload = function() {
            console.log(' Print window đã load xong, chuẩn bị in...');
            setTimeout(() => {
                try {
                    printWindow.print();
                    console.log(' Đã gọi lệnh print');
                } catch (printError) {
                    console.error(' Lỗi khi gọi print:', printError);
                    alert('Lỗi khi in: ' + printError.message);
                }
            }, 500);
        };
        
        // Fallback if onload doesn't trigger
        setTimeout(() => {
            if (printWindow.document.readyState === 'complete') {
                console.log(' Fallback print...');
                try {
                    printWindow.print();
                } catch (printError) {
                    console.error(' Lỗi fallback print:', printError);
                }
            }
        }, 2000);

        console.log(' Đã tạo bản in lịch sử dịch vụ');

    } catch (error) {
        console.error(' Lỗi khi in lịch sử dịch vụ:', error);
        alert('Lỗi khi in lịch sử dịch vụ: ' + error.message);
    }
}

// Add new functions to global scope
window.closeServiceHistoryModal = closeServiceHistoryModal;
window.printServiceHistory = printServiceHistory;

// Debug function to test invoice detail creation (DISABLED - function not available)
// window.testCreateDetail = async function(mahoadon, testService) {
//     console.log(' Testing createServiceInvoiceDetails...');
    
//     const testServices = testService ? [testService] : [{
//         tendv: 'Test Service',
//         giatien: 100000,
//         quantity: 1,
//         madv: 1
//     }];
    
//     console.log(' Test data:', { mahoadon, testServices, currentBookingId });
    
//     try {
//         const result = await createServiceInvoiceDetails(mahoadon, testServices);
//         console.log(' Test result:', result);
//         return result;
//     } catch (error) {
//         console.error(' Test failed:', error);
//         return null;
//     }
// };

// Cache management functions
function clearAllCache() {
    localStorage.removeItem('guests_cache');
    localStorage.removeItem('guests_cache_timestamp');
    localStorage.removeItem('services_cache');
    localStorage.removeItem('services_cache_timestamp');
    console.log('⚡ All cache cleared');
}

function forceRefresh() {
    clearAllCache();
    currentGuestsData = [];
    availableServices = [];
    showLoadingState('Đang làm mới dữ liệu...');
    
    Promise.all([
        loadCurrentGuests(),
        loadAvailableServices()
    ]).then(() => {
        hideLoadingState();
        console.log('⚡ Force refresh completed');
    }).catch(error => {
        console.error('❌ Force refresh failed:', error);
        hideLoadingState();
    });
}

// Add refresh button event if it exists
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', forceRefresh);
    }
});

// console.log(' Use window.testCreateDetail(mahoadon, service) to test detail creation.');