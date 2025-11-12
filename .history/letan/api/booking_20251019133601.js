// ============================================
// BOOKING PAGE - JAVASCRIPT
// ============================================

const API_BASE_URL = "https://localhost:7076/api";

// Support multiple selected rooms for receptionist
let selectedRooms = [];
let availableRooms = [];
let bookingData = {
    checkInDate: null,
    checkOutDate: null,
    guestCount: 2,
    roomType: '',
    nights: 0,
    roomPrice: 0,
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    depositAmount: 0,
    remainingAmount: 0
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    setupEventListeners();
    setDefaultDates();
    // Load room types from API and populate the roomType select
    try {
        loadRoomTypes();
    } catch (e) {
        console.warn('Failed to load room types on init:', e);
    }
    // Initialize Litepicker for receptionist booking page if available
    try {
        const dr = document.getElementById('date-range-picker');
        if (dr && typeof Litepicker !== 'undefined') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            // Allow selecting today regardless of current hour
            const minDate = today;

            window.receptionPicker = new Litepicker({
                element: dr,
                singleMode: false,
                numberOfMonths: 2,
                numberOfColumns: 2,
                format: 'DD/MM/YYYY',
                lang: 'vi-VN',
                minDate: minDate,
                startDate: today,
                endDate: tomorrow
            });

            console.log('Litepicker receptionist initialized, minDate =', minDate.toISOString().split('T')[0]);

            // Set initial input value
            const fmt = d => (`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
            dr.value = `${fmt(today)} - ${fmt(tomorrow)}`;

            // When user selects dates, update hidden inputs and bookingData
            window.receptionPicker.on('selected', function(date1, date2) {
                // date1 and date2 are Luxon Date objects from Litepicker; convert to yyyy-MM-dd for hidden inputs
                const toInputDate = (d) => {
                    const dt = new Date(d.year, d.month - 1, d.day);
                    return dt.toISOString().split('T')[0];
                };
                const inEl = document.getElementById('checkInDate');
                const outEl = document.getElementById('checkOutDate');
                if (inEl && outEl) {
                    inEl.value = toInputDate(date1);
                    outEl.value = toInputDate(date2);
                    // Update bookingData.nights
                    const ci = new Date(inEl.value);
                    const co = new Date(outEl.value);
                    bookingData.checkInDate = inEl.value;
                    bookingData.checkOutDate = outEl.value;
                    bookingData.nights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
                    // Recalculate pricing if a room is selected
                    if (selectedRooms && selectedRooms.length > 0) calculatePricing();
                }
            });
        }
    } catch (e) {
        console.warn('Litepicker init for receptionist failed:', e);
    }
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

// Setup event listeners
function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Search rooms button
    const searchRoomsBtn = document.getElementById('searchRoomsBtn');
    if (searchRoomsBtn) {
        // Primary listener
        searchRoomsBtn.addEventListener('click', searchAvailableRooms);
        // Direct onclick fallback (overrides inline handler issues)
        searchRoomsBtn.onclick = function(e) {
            console.log('searchRoomsBtn.onclick fired');
            try { e.preventDefault(); } catch (err) {}
            try { searchAvailableRooms(); } catch (err) { console.error('searchAvailableRooms error (onclick):', err); }
        };
        // Touch handler for mobile/touch screens
        searchRoomsBtn.addEventListener('touchstart', function(e) {
            console.log('searchRoomsBtn.touchstart');
            try { e.preventDefault(); } catch (err) {}
            try { searchAvailableRooms(); } catch (err) { console.error('searchAvailableRooms error (touch):', err); }
        }, { passive: true });
        // Ensure it's clickable
        try { searchRoomsBtn.style.pointerEvents = 'auto'; } catch (err) {}
        console.log('Attached robust handlers to #searchRoomsBtn');
    }

    // Date change listeners
    const checkInDate = document.getElementById('checkInDate');
    const checkOutDate = document.getElementById('checkOutDate');

    if (checkInDate) {
        checkInDate.addEventListener('change', function() {
            validateDates();
            if (selectedRooms && selectedRooms.length > 0) calculatePricing();
        });
    }

    if (checkOutDate) {
        checkOutDate.addEventListener('change', function() {
            validateDates();
            if (selectedRooms && selectedRooms.length > 0) calculatePricing();
        });
    }

    // Deposit input removed from UI - pricing will assume full payment at checkout/check-in

    // Booking form submit
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBooking();
        });
    }

    // Cancel booking
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', function(e) {
            try {
                if (typeof cancelBooking === 'function') {
                    cancelBooking(e);
                } else if (typeof window.cancelBooking === 'function') {
                    window.cancelBooking(e);
                } else {
                    console.warn('cancelBooking function not available');
                }
            } catch (err) {
                console.error('Error calling cancelBooking:', err);
            }
        });
    }

    // Full payment control removed from UI
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function logout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem("currentUser");
        window.location.href = "../login.html";
    }
}

// Set default dates (today and tomorrow)
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkInDate = document.getElementById('checkInDate');
    const checkOutDate = document.getElementById('checkOutDate');

    if (checkInDate) {
        checkInDate.value = formatDateForInput(today);
        checkInDate.min = formatDateForInput(today);
    }

    if (checkOutDate) {
        checkOutDate.value = formatDateForInput(tomorrow);
        checkOutDate.min = formatDateForInput(tomorrow);
    }

    // Set default check-in time to current time
    const checkinTime = document.getElementById('checkinTime');
    if (checkinTime) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        checkinTime.value = `${hours}:${minutes}`;
    }
}

// Format date for HTML input
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
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

// Format currency
function formatCurrency(amount) {
    const num = Number(amount);
    if (!num || isNaN(num)) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(num);
}

// Helper: get canonical room price (prefer LoaiPhong.giaphong)
function getRoomPrice(room) {
    if (!room) return 500000;
    // Prefer Loaiphongs.giacoban (or Giacoban) -> legacy giaphong/giaPhong -> room.giaPhong/gia
    const raw = (room.loaiPhong && (room.loaiPhong.giacoban || room.loaiPhong.Giacoban || room.loaiPhong.giaphong || room.loaiPhong.giaPhong)) || room.giaPhong || room.gia || 0;
    const n = Number(raw);
    return (n && !isNaN(n)) ? n : 500000;
}

// Validate dates
function validateDates() {
    const checkInDate = document.getElementById('checkInDate');
    const checkOutDate = document.getElementById('checkOutDate');

    if (!checkInDate || !checkOutDate) return false;

    const checkIn = new Date(checkInDate.value);
    const checkOut = new Date(checkOutDate.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if check-in is not in the past
    if (checkIn < today) {
        alert("Ngày nhận phòng không thể trong quá khứ!");
        checkInDate.value = formatDateForInput(today);
        return false;
    }

    // Check if check-out is after check-in
    if (checkOut <= checkIn) {
        const nextDay = new Date(checkIn);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOutDate.value = formatDateForInput(nextDay);
        alert("Ngày trả phòng phải sau ngày nhận phòng!");
        return false;
    }

    // Update minimum dates
    checkOutDate.min = checkInDate.value;

    return true;
}

// Load room types from API and populate roomType select
async function loadRoomTypes() {
    try {
        const res = await fetch(`${API_BASE_URL}/Loaiphongs`);
        if (!res.ok) throw new Error('Failed to load room types');
        const data = await res.json();
        const select = document.getElementById('roomType');
        if (!select) return;
        // Clear existing options but keep the first 'all' option
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        data.forEach(rt => {
            const opt = document.createElement('option');
            opt.value = rt.maloaiphong; // use id as value
            opt.textContent = rt.tenloaiphong || rt.tenLoaiPhong || `Loại ${rt.maloaiphong}`;
            select.appendChild(opt);
        });
        console.log('🔔 Loaded room types:', data.length);
    } catch (error) {
        console.error('Error loading room types:', error);
    }
}

// Search available rooms
async function searchAvailableRooms() {
    if (!validateDates()) return;

    try {
        const checkInDate = document.getElementById('checkInDate').value;
        const checkOutDate = document.getElementById('checkOutDate').value;
        const guestCount = document.getElementById('guestCount').value;
        const roomType = document.getElementById('roomType').value;

        // Update booking data
        bookingData.checkInDate = checkInDate;
        bookingData.checkOutDate = checkOutDate;
        bookingData.guestCount = parseInt(guestCount);
        bookingData.roomType = roomType;

        // Calculate nights
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        bookingData.nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        console.log('🔍 Searching for available rooms:', bookingData);

        // Show loading (guarded in case function is not available yet)
        if (typeof showRoomsLoading === 'function') {
            showRoomsLoading();
        } else {
            console.warn('showRoomsLoading is not available - falling back to DOM loading state');
            // Fallback: ensure rooms section is visible and show a loading message
            const roomsSectionEl = document.getElementById('roomsSection');
            const roomsGridEl = document.getElementById('roomsGrid');
            const roomCountEl = document.getElementById('roomCount');
            if (roomsSectionEl) roomsSectionEl.style.display = 'block';
            if (roomCountEl) roomCountEl.textContent = '...';
            if (roomsGridEl) {
                roomsGridEl.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang tìm kiếm phòng trống...</p>
                    </div>
                `;
            }
        }

        // Fetch available rooms
        const rooms = await fetchAvailableRooms(checkInDate, checkOutDate, guestCount, roomType);

        availableRooms = rooms;
        console.log('🔎 fetchAvailableRooms returned', Array.isArray(rooms) ? rooms.length : typeof rooms, 'items');
        displayAvailableRooms(rooms);

    } catch (error) {
        console.error('❌ Error searching rooms:', error);
        if (typeof showRoomsError === 'function') {
            showRoomsError('Không thể tìm kiếm phòng trống. Vui lòng thử lại sau.');
        } else {
            console.warn('showRoomsError is not available');
            alert('Không thể tìm kiếm phòng trống. Vui lòng thử lại sau.');
        }
    }
}

// Fetch available rooms from API
async function fetchAvailableRooms(checkInDate, checkOutDate, guestCount, roomType) {
    try {
        // Robust date formatter: accepts dd/MM/yyyy, yyyy-MM-dd, or Date objects
        const formatDateForAPI = (dateInput) => {
            if (!dateInput) throw new Error('Missing date');

            // If Date object
            if (dateInput instanceof Date) {
                return dateInput.toISOString().split('T')[0];
            }

            // If string
            if (typeof dateInput === 'string') {
                // If already yyyy-MM-dd or other ISO-like, try parsing
                if (dateInput.includes('-')) {
                    const d = new Date(dateInput);
                    if (isNaN(d)) throw new Error('Invalid date string: ' + dateInput);
                    return d.toISOString().split('T')[0];
                }

                // If dd/MM/yyyy
                if (dateInput.includes('/')) {
                    const parts = dateInput.split('/').map(p => p.trim());
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        return `${year}-${month}-${day}`;
                    }
                }

                // Last resort: try Date parse
                const d = new Date(dateInput);
                if (!isNaN(d)) return d.toISOString().split('T')[0];
            }

            throw new Error('Unrecognized date format: ' + dateInput);
        };

        let apiUrl;
        try {
            apiUrl = `${API_BASE_URL}/Phongs/timphong/${formatDateForAPI(checkInDate)}/${formatDateForAPI(checkOutDate)}`;
        } catch (err) {
            throw new Error('Invalid check-in/check-out dates: ' + err.message);
        }

        console.log('🔍 Calling room search API:', apiUrl);

        // Step 1: Call API to find available rooms
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API returned status ${res.status}`);

        const roomsData = await res.json();
        const count = Array.isArray(roomsData) ? roomsData.length : 0;

        console.log(`✅ Found ${count} available rooms from API`);

        if (count === 0) {
            return [];
        }

        // Step 2: Get details for each room (parallel requests)
        const roomsWithDetails = await Promise.all(
            roomsData.map(room => getRoomDetails(room.maphong))
        );

        // Filter out null results (failed requests)
        let validRooms = roomsWithDetails.filter(room => room !== null);
        console.log(`ℹ️ Rooms after details fetch: ${validRooms.length} (requested ${roomsData.length})`);

        if (validRooms.length === 0) {
            console.log('⚠️ No valid room details could be fetched. Returning empty list.');
            return [];
        }

        // Enrich rooms with normalized fields for filtering/display
        const enrichedRooms = validRooms.map(room => ({
            ...room,
            sophong: room.sophong || room.soPhong || room.sophong || room.soPhong || room.sophong,
            maphong: room.maphong || room.maPhong || room.maphong,
            trangthai: room.trangthai || room.trangThai || 'Trống',
            tenLoaiPhong: room.loaiPhong ? (room.loaiPhong.tenloaiphong || room.loaiPhong.tenLoaiPhong || 'Standard') : (room.tenLoaiPhong || 'Standard'),
            giaPhong: getRoomPrice(room),
            soLuongNguoi: room.loaiPhong ? (room.loaiPhong.songuoitoida || room.loaiPhong.soluongnguoi || room.loaiPhong.soLuongNguoi || room.succhua || 2) : (room.succhua || 2),
            moTa: room.loaiPhong ? (room.loaiPhong.mota || room.loaiPhong.moTa || '') : (room.moTa || ''),
            roomType: room.loaiPhong || null
        }));

        console.log('ℹ️ Rooms after enrichment:', enrichedRooms.length);
        console.log('🔍 LoaiPhong price samples:', enrichedRooms.map(r => ({ maphong: r.maphong, loai: r.roomType && (r.roomType.giacoban || r.roomType.Giacoban || r.roomType.giaphong) })));

        // Apply filtering by guest count and room type (maloaiphong) and return only matching rooms
        let filtered = enrichedRooms;

        if (guestCount) {
            const numGuests = parseInt(guestCount);
            filtered = filtered.filter(r => {
                const max = Number(r.soLuongNguoi || r.succhua || 0);
                return max >= numGuests;
            });
            console.log(`👥 After guestCount filter (${guestCount}): ${filtered.length}/${enrichedRooms.length}`);
        }

        if (roomType) {
            // roomType should be maloaiPhong id (string or number)
            filtered = filtered.filter(r => String(r.maphong && r.maloaiphong ? r.maloaiphong : r.maphong && r.maLoaiPhong ? r.maLoaiPhong : r.loaiPhong && r.loaiPhong.maloaiphong) === String(roomType) || String(r.maloaiphong) === String(roomType) || String(r.roomType && (r.roomType.maloaiphong || r.roomType.maLoaiPhong)) === String(roomType));
            console.log(`🏠 After roomType filter (maloaiphong=${roomType}): ${filtered.length}/${enrichedRooms.length}`);
        }

        console.log('✅ Final available rooms:', filtered.length);
        return filtered;

    } catch (error) {
        console.error('❌ Error fetching available rooms:', error);
        console.error('    checkInDate:', checkInDate, 'checkOutDate:', checkOutDate);
        throw error;
    }
}

// Get detailed information for a specific room
async function getRoomDetails(maPhong) {
    try {
        // Step 1: Get room information
        const phongRes = await fetch(`${API_BASE_URL}/Phongs/${maPhong}`);
        if (!phongRes.ok) throw new Error(`Cannot get room info ${maPhong}`);
        const phong = await phongRes.json();

        // Step 2: Get room type information (based on maloaiphong from phong)
        const loaiPhongRes = await fetch(`${API_BASE_URL}/Loaiphongs/${phong.maloaiphong}`);
        const loaiPhong = loaiPhongRes.ok ? await loaiPhongRes.json() : null;

        // Step 3: Get room images (based on mahinhphong)
        const hinhAnhRes = await fetch(`${API_BASE_URL}/Hinhanhphongs/${phong.mahinhphong}`);
        const hinhAnhData = hinhAnhRes.ok ? await hinhAnhRes.json() : null;

        // Convert image object to array
        let hinhAnh = [];
        if (hinhAnhData) {
            if (hinhAnhData.hinhchinh) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhchinh}` });
            if (hinhAnhData.hinhphu1) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu1}` });
            if (hinhAnhData.hinhphu2) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu2}` });
            if (hinhAnhData.hinhphu3) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu3}` });
            if (hinhAnhData.hinhphu4) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu4}` });
            if (hinhAnhData.hinhphu5) hinhAnh.push({ duongdan: `../assets/img/${hinhAnhData.hinhphu5}` });
        }

        return {
            ...phong,
            loaiPhong: loaiPhong,
            hinhAnh: hinhAnh
        };
    } catch (error) {
        console.error(`Error getting room details ${maPhong}:`, error);
        return null;
    }
}
// Convert English room types to Vietnamese
function getVietnameseRoomType(englishType) {
    const typeMap = {
        'standard': 'tiêu chuẩn',
        'deluxe': 'deluxe',
        'suite': 'suite',
        'vip': 'vip'
    };
    return typeMap[englishType] || englishType;
}

// Show rooms loading state
function showRoomsLoading() {
    const roomsSection = document.getElementById('roomsSection');
    const roomsGrid = document.getElementById('roomsGrid');
    const roomCount = document.getElementById('roomCount');

    if (roomsSection) roomsSection.style.display = 'block';
    if (roomCount) roomCount.textContent = '0';

    if (roomsGrid) {
        roomsGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tìm kiếm phòng trống...</p>
            </div>
        `;
    }
}

// Show rooms error
function showRoomsError(message) {
    const roomsGrid = document.getElementById('roomsGrid');
    const roomCount = document.getElementById('roomCount');

    if (roomCount) roomCount.textContent = '0';

    if (roomsGrid) {
        roomsGrid.innerHTML = '<div class="error">' +
            '<i class="fas fa-exclamation-triangle"></i>' +
            '<p>' + (message || '') + '</p>' +
            '</div>';
    }
}

// Display available rooms
function displaySelectedRoomInfo() {
    const selectedRoomInfo = document.getElementById('selectedRoomInfo');
    if (!selectedRoomInfo) return;

    if (!selectedRooms || selectedRooms.length === 0) {
        selectedRoomInfo.innerHTML = '<p class="no-data">Chưa chọn phòng nào</p>';
        selectedRoomInfo.classList.add('empty');
        return;
    }

    const items = selectedRooms.map((room, idx) => {
        const roomNumber = room.sophong || room.soPhong || '';
        const roomType = room.tenLoaiPhong || (room.roomType && (room.roomType.tenloaiphong || room.roomType.tenLoaiPhong)) || 'Standard';
        const roomPrice = getRoomPrice(room);
        const nights = Number(bookingData.nights) || 1;
        const subtotal = roomPrice * nights;

        return `
            <div class="selected-room-card" data-selected-index="${idx}">
                <div class="selected-room-left">
                    <div class="selected-room-number">Phòng ${roomNumber}</div>
                    <div class="selected-room-type">${roomType} • ${room.soLuongNguoi || room.succhua || 2} người</div>
                </div>
                <div class="selected-room-right">
                    <div class="selected-room-price">${formatCurrency(roomPrice)}/đêm</div>
                    <div class="selected-room-sub">${nights} đêm • ${formatCurrency(subtotal)}</div>
                    <button class="remove-selected-room" onclick="removeSelectedRoom(${idx})">&times;</button>
                </div>
            </div>
        `;
    }).join('');

    selectedRoomInfo.innerHTML = `<div class="selected-rooms-list">${items}</div>`;

    selectedRoomInfo.classList.remove('empty');
    console.log('🔢 displaySelectedRoomInfo values:', { count: selectedRooms.length, nights: bookingData.nights });
}

// Remove a selected room by index
function removeSelectedRoom(index) {
    if (!selectedRooms || index < 0 || index >= selectedRooms.length) return;
    const removed = selectedRooms.splice(index, 1);
    console.log('Removed selected room', removed);
    // Update UI
    displaySelectedRoomInfo();
    calculatePricing();
    // Update room card button if present
    const room = removed[0];
    const roomId = room && (room.maphong || room.maPhong);
    if (roomId) {
        const card = document.querySelector(`.room-card[data-room-id="${roomId}"]`);
        if (card) {
            card.classList.remove('selected');
            const btn = card.querySelector('.select-room-btn');
            if (btn) btn.textContent = 'Chọn Phòng';
        }
    }
}

// Select room
function selectRoom(roomId) {
    // Find the room data
    const room = availableRooms.find(r => (r.maphong || r.maPhong) == roomId);
    if (!room) {
        alert('Không tìm thấy thông tin phòng!');
        return;
    }

    // Validate against current filters
    const guestCountEl = document.getElementById('guestCount');
    const currentGuestCount = guestCountEl ? parseInt(guestCountEl.value || '0') : 0;
    const roomTypeEl = document.getElementById('roomType');
    const currentRoomType = roomTypeEl ? roomTypeEl.value : '';
    const capacity = room.soLuongNguoi || room.succhua || 0;

    if (currentGuestCount && capacity < currentGuestCount) {
        alert('Phòng này không đủ sức chứa cho số người đã chọn. Vui lòng chọn phòng khác.');
        return;
    }

    if (currentRoomType && String(room.maloaiphong) !== String(currentRoomType)) {
        alert('Phòng này không thuộc loại phòng đã chọn. Vui lòng chọn phòng khác.');
        return;
    }

    // Toggle selection: add if not selected, remove if already selected
    const idx = selectedRooms.findIndex(r => (r.maphong || r.maPhong) == roomId);
    if (idx >= 0) {
        // Deselect
        selectedRooms.splice(idx, 1);
        const card = document.querySelector(`.room-card[data-room-id="${roomId}"]`);
        if (card) {
            card.classList.remove('selected');
            const btn = card.querySelector('.select-room-btn');
            if (btn) btn.textContent = 'Chọn Phòng';
        }
    } else {
        // Select
        selectedRooms.push(room);
        const card = document.querySelector(`.room-card[data-room-id="${roomId}"]`);
        if (card) {
            card.classList.add('selected');
            const btn = card.querySelector('.select-room-btn');
            if (btn) btn.textContent = 'Đã Chọn';
        }
    }

    console.log('🛏️ Selected rooms:', selectedRooms.map(r => r.maphong || r.maPhong));

    // Update UI and pricing
    displaySelectedRoomInfo();
    calculatePricing();
    showBookingForm();
}

// Display selected room information
// Display the available rooms in the grid
function displayAvailableRooms(rooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    const roomCount = document.getElementById('roomCount');

    if (!roomsGrid) return;
    if (!rooms || rooms.length === 0) {
        roomsGrid.innerHTML = '<p class="no-data">Không có phòng phù hợp.</p>';
        if (roomCount) roomCount.textContent = '0';
        console.log('ℹ️ No rooms to display');
        return;
    }

    const html = rooms.map(room => {
                const roomId = room.maphong || room.maPhong;
                const roomNumber = room.sophong || room.soPhong || '';
                const roomType = room.tenLoaiPhong || (room.roomType && (room.roomType.tenloaiphong || room.roomType.tenLoaiPhong)) || 'Standard';
                const capacity = room.soLuongNguoi || room.succhua || 2;
                const roomPrice = getRoomPrice(room);
                const selected = selectedRooms.some(r => (r.maphong || r.maPhong) == roomId);
                const selectBtn = `<button class="select-room-btn" onclick="selectRoom('${roomId}')">${selected ? 'Đã Chọn' : 'Chọn Phòng'}</button>`;

                return `
            <div class="room-card ${selected ? 'selected' : ''}" data-room-id="${roomId}">
                <div class="room-card-header">
                    <div class="room-number">Phòng ${roomNumber}</div>
                    <div class="room-type">${roomType}</div>
                    <div class="room-status">Trống</div>
                </div>
                <div class="room-card-body">
                    <div class="room-features">
                        <span class="feature-tag"><i class="fas fa-users"></i> ${capacity} người</span>
                    </div>
                    ${room.moTa ? `<p class="room-description">${room.moTa}</p>` : ''}
                    <div class="room-price">
                        <div class="price-info">
                            <span class="price-amount">${formatCurrency(roomPrice)}</span>
                            <span class="price-unit">/ đêm</span>
                        </div>
                        ${selectBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    roomsGrid.innerHTML = html;
    if (roomCount) roomCount.textContent = String(rooms.length);
    console.log('✅ Displayed', rooms.length, 'available rooms');
}

// Calculate pricing
function calculatePricing() {
    // Ensure we have numbers
    const nights = Number(bookingData.nights) || 1;
    if (!selectedRooms || selectedRooms.length === 0) return;

    // Sum prices across selected rooms
    const subtotal = selectedRooms.reduce((sum, r) => {
        const p = getRoomPrice(r) || 0;
        return sum + (Number(p) * nights);
    }, 0);

    // Tax removed: total equals subtotal
    const taxAmount = 0;
    const totalAmount = subtotal;

    // Deposit input has been removed from UI; assume 0 deposit by default.
    // If bookingType is 'checkin-now' we will treat total as paid at check-in time.
    let depositAmount = 0;
    const bookingType = document.getElementById('bookingType') ? document.getElementById('bookingType').value : 'advance';
    if (bookingType === 'checkin-now') {
        depositAmount = totalAmount; // treat as paid now
    }
    const remainingAmount = Math.max(0, totalAmount - depositAmount);

    // Update booking data
    // Store numeric per-room prices
    bookingData.roomPrice = selectedRooms.map(r => Number(getRoomPrice(r) || 0));
    bookingData.subtotal = subtotal;
    bookingData.taxAmount = taxAmount;
    bookingData.totalAmount = totalAmount;
    bookingData.depositAmount = depositAmount;
    bookingData.remainingAmount = remainingAmount;

    // Update UI
    // Show sum of per-night prices across selected rooms
    const perNightSum = bookingData.roomPrice.reduce((s, v) => s + (Number(v) || 0), 0);
    document.getElementById('roomPricePerNight').textContent = formatCurrency(perNightSum);
    document.getElementById('totalNights').textContent = nights + ' đêm';
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    const taxAmountEl = document.getElementById('taxAmount');
    if (taxAmountEl) taxAmountEl.textContent = formatCurrency(taxAmount);
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
    // Deposit/display elements were removed from DOM; guard updates
    const displayDepositEl = document.getElementById('displayDeposit');
    const remainingEl = document.getElementById('remainingAmount');
    if (displayDepositEl) displayDepositEl.textContent = formatCurrency(depositAmount);
    if (remainingEl) remainingEl.textContent = formatCurrency(remainingAmount);
    console.log('💰 Pricing calculated (multi-room):', bookingData);
}

// Show booking form
function showBookingForm() {
    const bookingFormSection = document.getElementById('bookingFormSection');
    if (bookingFormSection) {
        bookingFormSection.style.display = 'block';
        bookingFormSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Cancel booking
function cancelBooking() {
    if (confirm('Bạn có chắc chắn muốn hủy đặt phòng này?')) {
        // Reset form
        const formEl = document.getElementById('bookingForm');
        if (formEl) formEl.reset();

        // Reset selected rooms
        selectedRooms = [];
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
            const btn = card.querySelector('.select-room-btn'); if (btn) btn.textContent = 'Chọn Phòng';
        });

        // Hide booking form
        const bookingFormSection = document.getElementById('bookingFormSection');
        if (bookingFormSection) {
            bookingFormSection.style.display = 'none';
        }

        // Reset selected room info
        const selectedRoomInfo = document.getElementById('selectedRoomInfo');
        if (selectedRoomInfo) {
            selectedRoomInfo.innerHTML = '<p class="no-data">Chưa chọn phòng nào</p>';
            selectedRoomInfo.classList.add('empty');
        }
    }
}

// Submit booking
async function submitBooking() {
    if (!selectedRooms || selectedRooms.length === 0) {
        alert('Vui lòng chọn ít nhất một phòng!');
        return;
    }

    // Validate form
    const form = document.getElementById('bookingForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form data
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerIdCard = document.getElementById('customerIdCard').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    const customerGender = document.getElementById('customerGender').value;
    const specialRequests = document.getElementById('specialRequests').value.trim();
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : '';

    if (!customerName || !customerPhone || !customerIdCard) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
        return;
    }

    // Note: payment method selection is optional for receptionist flow. For 'checkin-now' we'll set payment to 'cash' by default and treat total as paid.

    // Helper to format yyyy-MM-dd for DateOnly fields
    function formatDateOnlyForAPI(dateInput) {
        try {
            if (!dateInput) return null;
            const d = new Date(dateInput);
            if (isNaN(d)) return null;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        } catch (e) { return null; }
    }

    let originalText;
    let submitBtn = document.getElementById('confirmBookingBtn');
    try {
        console.log('📝 Submitting booking...');

        // Show loading state
        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            submitBtn.disabled = true;
        }

        // Build a single Datphong payload that includes chitietdatphongs (one entry per selected room)
        const nights = Number(bookingData.nights) || 1;
        const perRoomDetails = selectedRooms.map(r => {
            const price = Number(getRoomPrice(r) || 0);
            // Derive room number from available aliases
            const roomNumber = r.sophong || r.soPhong || '';
            // Normalize room id and only include it if valid
            const rawRoomId = r.maphong || r.maPhong || null;
            const roomIdNum = (rawRoomId !== null && rawRoomId !== undefined && String(rawRoomId).trim() !== '') ? Number(rawRoomId) : null;

            const detail = {
                Tongcong: Number(price * nights),
                Trangthai: 'Đã đặt'
            };

            // Only add Maphong if it's a valid finite number
            if (Number.isFinite(roomIdNum)) {
                detail.Maphong = roomIdNum;
                // Include minimal navigation info but only when room id exists
                detail.MaphongNavigation = { Sophong: roomNumber };
            } else {
                console.warn('submitBooking: skipping Maphong for room because id is invalid', r);
            }

            // Do NOT include MadatphongNavigation or other nested navigation objects here —
            // sending those has caused the server to create unexpected room records.

            return detail;
        });

        const totalAmount = perRoomDetails.reduce((s, d) => s + (Number(d.Tongcong) || 0), 0);
        const isCheckinNow = document.getElementById('bookingType') && document.getElementById('bookingType').value === 'checkin-now';

        // Ensure customer exists (Khachhangs) so other pages can reference makh
        let makhId = null;
        try {
            // Helper to normalise response shapes into an array of customers
            const normaliseCustomers = async (res) => {
                if (!res || !res.ok) return [];
                const body = await res.json();
                if (!body) return [];
                if (Array.isArray(body)) return body;
                // Some endpoints return a single object
                if (typeof body === 'object') return [body];
                return [];
            };

            // Try to find existing customer by several query params (cccd, cccdNumber, phone, sdt)
            const searches = [];
            if (customerIdCard) {
                searches.push(`${API_BASE_URL}/Khachhangs?cccd=${encodeURIComponent(customerIdCard)}`);
                searches.push(`${API_BASE_URL}/Khachhangs?cccdNumber=${encodeURIComponent(customerIdCard)}`);
            }
            if (customerPhone) {
                searches.push(`${API_BASE_URL}/Khachhangs?phone=${encodeURIComponent(customerPhone)}`);
                searches.push(`${API_BASE_URL}/Khachhangs?sdt=${encodeURIComponent(customerPhone)}`);
            }

            for (const url of searches) {
                try {
                    const res = await fetch(url);
                    const arr = await normaliseCustomers(res);
                    if (arr && arr.length > 0) {
                        const customer = arr[0];
                        makhId = customer.makh || customer.MaKh || customer.id || customer.Makh || null;
                        if (makhId) {
                            console.log('Found existing Khachhang via', url, makhId);
                            break;
                        }
                    }
                } catch (e) {
                    // ignore and try next
                }
            }

            // If still not found, create a new Khachhang record
            if (!makhId) {
                const khPayload = {
                    hoten: customerName,
                    sdt: customerPhone,
                    email: customerEmail || null,
                    cccd: customerIdCard || null,
                    diachi: customerAddress || null
                };

                const createRes = await fetch(`${API_BASE_URL}/Khachhangs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(khPayload)
                });

                if (createRes.ok) {
                    const kh = await createRes.json();
                    makhId = kh.makh || kh.MaKh || kh.id || kh.Makh || null;
                    console.log('Created new Khachhang:', makhId);
                } else {
                    console.warn('Could not create Khachhang, server returned', createRes.status);
                }
            }
        } catch (err) {
            console.warn('Khachhang lookup/create failed, proceeding without makh:', err);
        }

        const bookingApiData = {
            TenKhachHang: customerName,
            // Link to customer record when available so other pages can query makh
            Makh: makhId || null,
            SoDienThoai: customerPhone,
            Email: customerEmail || null,
            CCCD: customerIdCard,
            DiaChi: customerAddress || null,
            GioiTinh: customerGender || null,
            Ngaynhanphong: formatDateOnlyForAPI(bookingData.checkInDate),
            Ngaytraphong: formatDateOnlyForAPI(bookingData.checkOutDate),
            Tongtien: totalAmount,
            Tiencoc: isCheckinNow ? totalAmount : 0,
            Ghichu: specialRequests || null,
            PhuongThucThanhToan: isCheckinNow ? 'cash' : (paymentMethod || null),
            ThoiGianCheckin: (isCheckinNow && document.getElementById('checkinTime')) ? document.getElementById('checkinTime').value : null,
            Trangthai: 'Đã đặt',
            Ngaydat: formatDateOnlyForAPI(new Date().toISOString()),
            SoLuongKhach: Number(bookingData.guestCount || 1),
            // Important: include child details so server will create Chitietdatphongs rows
            Chitietdatphongs: perRoomDetails
        };

        console.log('📤 Booking API data (single payload with Chitietdatphongs):', bookingApiData);

        const response = await fetch(`${API_BASE_URL}/Datphongs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingApiData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Booking created (with details):', result);

        // If immediate check-in requested, perform it once for the booking
        let checkinResult = null;
        if (isCheckinNow) {
            checkinResult = await performImmediateCheckin(result, bookingApiData);
        }

        // Show success modal with number of rooms
        showBookingSuccess(result, { ...bookingApiData, tenKhachHang: customerName }, checkinResult, selectedRooms.length);

    } catch (error) {
        console.error('❌ Booking submission error:', error);
        
        let errorMessage = 'Có lỗi xảy ra khi đặt phòng:\n\n';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += '🌐 Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng.';
        } else if (error.message.includes('500')) {
            errorMessage += '💾 Lỗi server. Vui lòng thử lại sau hoặc liên hệ bộ phận kỹ thuật.';
        } else if (error.message.includes('400')) {
            errorMessage += '📝 Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        
    } finally {
        // Restore button
        const submitBtn = document.getElementById('confirmBookingBtn');
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Show booking success modal
function showBookingSuccess(result, bookingData, checkinResult = null, totalRooms = 1) {
    const modal = document.getElementById('bookingSuccessModal');

    // Fill success information
    const bookingId = result.maDatPhong || result.madatphong || result.id || 'N/A';
    const bookingType = document.getElementById('bookingType').value;

    document.getElementById('bookingCode').textContent = bookingId;
    document.getElementById('successCustomerName').textContent = bookingData.tenKhachHang || bookingData.tenKhachHang || '';
    document.getElementById('successRoomNumber').textContent = totalRooms > 1 ? `${totalRooms} phòng` : `Phòng ${selectedRooms[0] ? (selectedRooms[0].sophong || selectedRooms[0].soPhong) : ''}`;
    document.getElementById('successDates').textContent = `${formatDate(bookingData.ngayNhanPhong || bookingData.checkInDate)} - ${formatDate(bookingData.ngayTraPhong || bookingData.checkOutDate)}`;
    // Try multiple possible field names returned from API
    const apiTotal = bookingData.Tongtien || bookingData.tongTienDatPhong || bookingData.totalAmount || 0;
    document.getElementById('successTotalAmount').textContent = formatCurrency(apiTotal || 0);

    // Update modal content based on booking type
    const modalHeader = document.querySelector('#bookingSuccessModal .modal-header h3');
    const modalBody = document.querySelector('#bookingSuccessModal .modal-body');

    if (bookingType === 'checkin-now' && checkinResult) {
        if (modalHeader) {
            modalHeader.innerHTML = '<i class="fas fa-check-circle"></i> Đặt Phòng & Check-in Thành Công!';
        }

        // Add check-in info to modal body
        const successInfo = modalBody.querySelector('.success-info');
        if (successInfo) {
            const checkinTime = document.getElementById('checkinTime').value;
            const checkinInfo = document.createElement('p');
            checkinInfo.innerHTML = `<strong>Thời gian check-in:</strong> <span>${checkinTime} - ${formatDate(new Date())}</span>`;
            successInfo.appendChild(checkinInfo);

            const statusInfo = document.createElement('p');
            statusInfo.innerHTML = `<strong>Trạng thái:</strong> <span style="color: #28a745; font-weight: bold;">Đã Check-in</span>`;
            successInfo.appendChild(statusInfo);
        }
    } else if (bookingType === 'checkin-now' && !checkinResult) {
        if (modalHeader) {
            modalHeader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Đặt Phòng Thành Công - Lỗi Check-in';
        }

        const successInfo = modalBody.querySelector('.success-info');
        if (successInfo) {
            const warningInfo = document.createElement('p');
            warningInfo.innerHTML = `<strong style="color: #ffc107;">Cảnh báo:</strong> <span style="color: #856404;">Cần check-in thủ công</span>`;
            successInfo.appendChild(warningInfo);
        }
    }

    // Show modal
    if (modal) {
        modal.classList.add('show');
    }
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('bookingSuccessModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // Reset form and redirect
    setTimeout(() => {
        window.location.href = 'letan_dashboard.html';
    }, 500);
}

// Print booking information
function printBookingInfo() {
    // Simple print functionality - you can enhance this
    window.print();
}

// Handle booking type change
function handleBookingTypeChange() {
    const bookingType = document.getElementById('bookingType').value;
    const checkinTimeGroup = document.getElementById('checkinTimeGroup');
    const immediatePaymentSection = document.getElementById('immediatePaymentSection');
    const confirmButtonText = document.getElementById('confirmButtonText');
    const checkInDate = document.getElementById('checkInDate');
    
    if (bookingType === 'checkin-now') {
        // Show check-in time and immediate payment options
        if (checkinTimeGroup) checkinTimeGroup.style.display = 'block';
        if (immediatePaymentSection) immediatePaymentSection.style.display = 'block';
        if (confirmButtonText) confirmButtonText.textContent = 'Đặt Phòng & Check-in Ngay';
        
        // Set check-in date to today (cannot change)
        if (checkInDate) {
            const today = new Date();
            checkInDate.value = formatDateForInput(today);
            checkInDate.disabled = true;
        }
        
        // Auto-check full payment for immediate check-in
        const fullPaymentNow = document.getElementById('fullPaymentNow');
        if (fullPaymentNow) {
            fullPaymentNow.checked = true;
            fullPaymentNow.dispatchEvent(new Event('change'));
        }
        
    } else {
        // Hide check-in time and immediate payment options
        if (checkinTimeGroup) checkinTimeGroup.style.display = 'none';
        if (immediatePaymentSection) immediatePaymentSection.style.display = 'none';
        if (confirmButtonText) confirmButtonText.textContent = 'Xác Nhận Đặt Phòng';
        
        // Enable check-in date selection
        if (checkInDate) {
            checkInDate.disabled = false;
        }
        
        // Uncheck full payment
        const fullPaymentNow = document.getElementById('fullPaymentNow');
        if (fullPaymentNow) {
            fullPaymentNow.checked = false;
            fullPaymentNow.dispatchEvent(new Event('change'));
        }
    }
    
    // Recalculate pricing if any room is selected
    if (selectedRooms && selectedRooms.length > 0) {
        calculatePricing();
    }
}

// Check-in immediately after booking
async function performImmediateCheckin(bookingResult, bookingData) {
    try {
        console.log('🏨 Performing immediate check-in for booking:', bookingResult.maDatPhong || bookingResult.id);
        
        const checkinData = {
            maDatPhong: bookingResult.maDatPhong || bookingResult.id,
            thoiGianCheckin: document.getElementById('checkinTime').value,
            nhanVienCheckin: JSON.parse(localStorage.getItem("currentUser") || '{}').hoTen || 'Lễ tân',
            ghiChu: `Check-in ngay sau khi đặt phòng - ${new Date().toLocaleString('vi-VN')}`
        };
        
        // Call check-in API
        const checkinResponse = await fetch(`${API_BASE_URL}/Datphongs/checkin/${checkinData.maDatPhong}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkinData)
        });
        
        if (!checkinResponse.ok) {
            throw new Error(`Check-in failed: ${checkinResponse.status}`);
        }
        
        const checkinResult = await checkinResponse.json();
        console.log('✅ Check-in completed:', checkinResult);
        
        return checkinResult;
        
    } catch (error) {
        console.error('❌ Immediate check-in error:', error);
        // Don't throw error, just log it - booking was successful
        alert('⚠️ Đặt phòng thành công nhưng có lỗi khi check-in tự động.\nVui lòng thực hiện check-in thủ công tại trang Check-in.');
        return null;
    }
}

// Debug function to check room and booking data
async function debugRoomData() {
    try {
        console.log('🐛 DEBUG: Fetching all data...');
        
        // Get all data
        const [roomsResponse, roomTypesResponse, bookingsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/Phongs`),
            fetch(`${API_BASE_URL}/Loaiphongs`),
            fetch(`${API_BASE_URL}/Datphongs`)
        ]);

        const rooms = await roomsResponse.json();
        const roomTypes = await roomTypesResponse.json();
        const bookings = await bookingsResponse.json();

        console.group('🐛 DEBUG DATA');
        console.log('📋 All Rooms:', rooms);
        console.log('🏷️ Room Types:', roomTypes);
        console.log('📅 All Bookings:', bookings);
        
        // Check specific date (today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log('📅 Checking for date:', today.toDateString());
        
        // Check each room individually
        rooms.forEach(room => {
            const roomId = room.maphong || room.maPhong;
            const roomNumber = room.sophong || room.soPhong;
            
            const roomBookings = bookings.filter(booking => {
                const bookingRoomId = booking.maphong || booking.maPhong || 
                                    (booking.chitietdatphongs && booking.chitietdatphongs[0] && booking.chitietdatphongs[0].maphong);
                return bookingRoomId == roomId;
            });
            
            console.log(`🏠 Room ${roomNumber} (ID: ${roomId}):`, {
                totalBookings: roomBookings.length,
                bookings: roomBookings.map(b => ({
                    id: b.maDatPhong || b.madatphong,
                    checkIn: b.ngaynhanphong || b.ngayNhanPhong,
                    checkOut: b.ngaytraphong || b.ngayTraPhong,
                    status: b.trangthai || b.trangThai
                }))
            });
        });
        
        console.groupEnd();
        
        alert('Kiểm tra Console để xem debug data!');
        
    } catch (error) {
        console.error('🐛 Debug error:', error);
        alert('Lỗi khi debug: ' + error.message);
    }
}

// Make functions globally available
window.selectRoom = selectRoom;
window.closeSuccessModal = closeSuccessModal;
window.printBookingInfo = printBookingInfo;
window.handleBookingTypeChange = handleBookingTypeChange;
window.debugRoomData = debugRoomData;
// Ensure searchAvailableRooms is usable from inline handlers or other scripts
window.searchAvailableRooms = searchAvailableRooms;
// Expose room UI helpers
window.showRoomsLoading = typeof showRoomsLoading === 'function' ? showRoomsLoading : undefined;
window.showRoomsError = typeof showRoomsError === 'function' ? showRoomsError : undefined;
// Expose cancelBooking explicitly and log that script loaded (helps detect caching/truncation issues)
try {
    window.cancelBooking = cancelBooking;
    console.log('booking.js loaded OK');
} catch (e) {
    console.warn('booking.js load helper: cancelBooking not available yet', e);
}