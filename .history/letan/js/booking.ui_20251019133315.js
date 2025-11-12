// ============================================
// BOOKING UI MODULE (DOM & EVENTS ONLY)
// ============================================

import {
    API_BASE_URL,
    // Helpers
    formatDateForInput,
    formatDateDisplay,
    formatCurrency,
    getRoomPrice,
    formatDateForAPI,
    // API room
    apiLoadRoomTypes,
    apiFetchAvailableRooms,
    apiGetRoomDetails,
    enrichRooms,
    filterRooms,
    // API customer & booking
    apiFindOrCreateCustomer,
    apiCreateBooking,
    apiPerformImmediateCheckin,
    // Debug
    apiDebugGetAll,
    // misc
    getVietnameseRoomType
} from './booking.api.js';

// ======= State =======
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

// ================== Init ==================
document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin();
    setupEventListeners();
    setDefaultDates();

    // Load room types from API and populate the roomType select
    (async() => {
        try {
            const data = await apiLoadRoomTypes();
            const select = document.getElementById('roomType');
            if (!select) return;
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);
            data.forEach(rt => {
                const opt = document.createElement('option');
                opt.value = rt.maloaiphong;
                opt.textContent = rt.tenloaiphong || rt.tenLoaiPhong || `Loại ${rt.maloaiphong}`;
                select.appendChild(opt);
            });
            console.log('🔔 Loaded room types:', data.length);
        } catch (e) {
            console.warn('Failed to load room types on init:', e);
        }
    })();

    // Init Litepicker nếu có
    try {
        const dr = document.getElementById('date-range-picker');
        if (dr && typeof Litepicker !== 'undefined') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
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

            const fmt = d => (`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
            dr.value = `${fmt(today)} - ${fmt(tomorrow)}`;

            window.receptionPicker.on('selected', function(date1, date2) {
                const toInputDate = (d) => {
                    const dt = new Date(d.year, d.month - 1, d.day);
                    return dt.toISOString().split('T')[0];
                };
                const inEl = document.getElementById('checkInDate');
                const outEl = document.getElementById('checkOutDate');
                if (inEl && outEl) {
                    inEl.value = toInputDate(date1);
                    outEl.value = toInputDate(date2);
                    const ci = new Date(inEl.value);
                    const co = new Date(outEl.value);
                    bookingData.checkInDate = inEl.value;
                    bookingData.checkOutDate = outEl.value;
                    bookingData.nights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
                    if (selectedRooms && selectedRooms.length > 0) calculatePricing();
                }
            });
        }
    } catch (e) {
        console.warn('Litepicker init for receptionist failed:', e);
    }
});

// ================== Auth ==================
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

function logout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem("currentUser");
        window.location.href = "../login.html";
    }
}

// ================== Events ==================
function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    const searchRoomsBtn = document.getElementById('searchRoomsBtn');
    if (searchRoomsBtn) {
        searchRoomsBtn.addEventListener('click', searchAvailableRooms);
        searchRoomsBtn.onclick = function(e) {
            console.log('searchRoomsBtn.onclick fired');
            try { e.preventDefault(); } catch (err) {}
            try { searchAvailableRooms(); } catch (err) { console.error('searchAvailableRooms error (onclick):', err); }
        };
        searchRoomsBtn.addEventListener('touchstart', function(e) {
            console.log('searchRoomsBtn.touchstart');
            try { e.preventDefault(); } catch (err) {}
            try { searchAvailableRooms(); } catch (err) { console.error('searchAvailableRooms error (touch):', err); }
        }, { passive: true });
        try { searchRoomsBtn.style.pointerEvents = 'auto'; } catch (err) {}
        console.log('Attached robust handlers to #searchRoomsBtn');
    }

    const checkInDate = document.getElementById('checkInDate');
    const checkOutDate = document.getElementById('checkOutDate');
    if (checkInDate) checkInDate.addEventListener('change', () => { validateDates(); if (selectedRooms ? .length) calculatePricing(); });
    if (checkOutDate) checkOutDate.addEventListener('change', () => { validateDates(); if (selectedRooms ? .length) calculatePricing(); });

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitBooking();
    });

    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', function(e) {
            try {
                if (typeof cancelBooking === 'function') cancelBooking(e);
                else if (typeof window.cancelBooking === 'function') window.cancelBooking(e);
                else console.warn('cancelBooking function not available');
            } catch (err) {
                console.error('Error calling cancelBooking:', err);
            }
        });
    }
}

// ================== UI utilities ==================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

// Set default dates (today & tomorrow) + default checkin time
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

    const checkinTime = document.getElementById('checkinTime');
    if (checkinTime) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        checkinTime.value = `${hours}:${minutes}`;
    }
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

    if (checkIn < today) {
        alert("Ngày nhận phòng không thể trong quá khứ!");
        checkInDate.value = formatDateForInput(today);
        return false;
    }
    if (checkOut <= checkIn) {
        const nextDay = new Date(checkIn);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOutDate.value = formatDateForInput(nextDay);
        alert("Ngày trả phòng phải sau ngày nhận phòng!");
        return false;
    }
    checkOutDate.min = checkInDate.value;
    return true;
}

// ================== Search rooms ==================
async function searchAvailableRooms() {
    if (!validateDates()) return;

    try {
        const checkInDate = document.getElementById('checkInDate').value;
        const checkOutDate = document.getElementById('checkOutDate').value;
        const guestCount = document.getElementById('guestCount').value;
        const roomType = document.getElementById('roomType').value;

        bookingData.checkInDate = checkInDate;
        bookingData.checkOutDate = checkOutDate;
        bookingData.guestCount = parseInt(guestCount);
        bookingData.roomType = roomType;

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        bookingData.nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        console.log('🔍 Searching for available rooms:', bookingData);

        if (typeof showRoomsLoading === 'function') showRoomsLoading();
        else {
            console.warn('showRoomsLoading is not available - fallback');
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
                    </div>`;
            }
        }

        const roomsBrief = await apiFetchAvailableRooms(checkInDate, checkOutDate);
        const roomsWithDetails = await Promise.all((roomsBrief || []).map(room => apiGetRoomDetails(room.maphong)));
        const enriched = enrichRooms(roomsWithDetails);
        const filtered = filterRooms(enriched, { guestCount, roomType });

        availableRooms = filtered;
        console.log('✅ Final available rooms:', filtered.length);
        displayAvailableRooms(filtered);

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

// ================== UI render ==================
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
            </div>`;
    }
}

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
            </div>`;
    }).join('');

    roomsGrid.innerHTML = html;
    if (roomCount) roomCount.textContent = String(rooms.length);
    console.log('✅ Displayed', rooms.length, 'available rooms');
}

// Selected rooms panel
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
            </div>`;
    }).join('');

    selectedRoomInfo.innerHTML = `<div class="selected-rooms-list">${items}</div>`;
    selectedRoomInfo.classList.remove('empty');
    console.log('🔢 displaySelectedRoomInfo values:', { count: selectedRooms.length, nights: bookingData.nights });
}

function removeSelectedRoom(index) {
    if (!selectedRooms || index < 0 || index >= selectedRooms.length) return;
    const removed = selectedRooms.splice(index, 1);
    console.log('Removed selected room', removed);

    displaySelectedRoomInfo();
    calculatePricing();

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

function selectRoom(roomId) {
    const room = availableRooms.find(r => (r.maphong || r.maPhong) == roomId);
    if (!room) { alert('Không tìm thấy thông tin phòng!'); return; }

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

    const idx = selectedRooms.findIndex(r => (r.maphong || r.maPhong) == roomId);
    if (idx >= 0) {
        selectedRooms.splice(idx, 1);
        const card = document.querySelector(`.room-card[data-room-id="${roomId}"]`);
        if (card) {
            card.classList.remove('selected');
            const btn = card.querySelector('.select-room-btn');
            if (btn) btn.textContent = 'Chọn Phòng';
        }
    } else {
        selectedRooms.push(room);
        const card = document.querySelector(`.room-card[data-room-id="${roomId}"]`);
        if (card) {
            card.classList.add('selected');
            const btn = card.querySelector('.select-room-btn');
            if (btn) btn.textContent = 'Đã Chọn';
        }
    }

    console.log('🛏️ Selected rooms:', selectedRooms.map(r => r.maphong || r.maPhong));
    displaySelectedRoomInfo();
    calculatePricing();
    showBookingForm();
}

// ================== Pricing ==================
function calculatePricing() {
    const nights = Number(bookingData.nights) || 1;
    if (!selectedRooms || selectedRooms.length === 0) return;

    const subtotal = selectedRooms.reduce((sum, r) => {
        const p = getRoomPrice(r) || 0;
        return sum + (Number(p) * nights);
    }, 0);

    const taxAmount = 0;
    const totalAmount = subtotal;

    let depositAmount = 0;
    const bookingType = document.getElementById('bookingType') ? document.getElementById('bookingType').value : 'advance';
    if (bookingType === 'checkin-now') {
        depositAmount = totalAmount;
    }
    const remainingAmount = Math.max(0, totalAmount - depositAmount);

    bookingData.roomPrice = selectedRooms.map(r => Number(getRoomPrice(r) || 0));
    bookingData.subtotal = subtotal;
    bookingData.taxAmount = taxAmount;
    bookingData.totalAmount = totalAmount;
    bookingData.depositAmount = depositAmount;
    bookingData.remainingAmount = remainingAmount;

    const perNightSum = bookingData.roomPrice.reduce((s, v) => s + (Number(v) || 0), 0);
    const el = id => document.getElementById(id);

    el('roomPricePerNight') && (el('roomPricePerNight').textContent = formatCurrency(perNightSum));
    el('totalNights') && (el('totalNights').textContent = (Number(nights) || 1) + ' đêm');
    el('subtotal') && (el('subtotal').textContent = formatCurrency(subtotal));
    el('taxAmount') && (el('taxAmount').textContent = formatCurrency(taxAmount));
    el('totalAmount') && (el('totalAmount').textContent = formatCurrency(totalAmount));
    el('displayDeposit') && (el('displayDeposit').textContent = formatCurrency(depositAmount));
    el('remainingAmount') && (el('remainingAmount').textContent = formatCurrency(remainingAmount));

    console.log('💰 Pricing calculated (multi-room):', bookingData);
}

function showBookingForm() {
    const bookingFormSection = document.getElementById('bookingFormSection');
    if (bookingFormSection) {
        bookingFormSection.style.display = 'block';
        bookingFormSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ================== Booking submit ==================
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

async function submitBooking() {
    if (!selectedRooms || selectedRooms.length === 0) {
        alert('Vui lòng chọn ít nhất một phòng!');
        return;
    }

    const form = document.getElementById('bookingForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }

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

    let originalText;
    let submitBtn = document.getElementById('confirmBookingBtn');

    try {
        console.log('📝 Submitting booking...');
        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            submitBtn.disabled = true;
        }

        const nights = Number(bookingData.nights) || 1;
        const perRoomDetails = selectedRooms.map(r => {
            const price = Number(getRoomPrice(r) || 0);
            const roomNumber = r.sophong || r.soPhong || '';
            const rawRoomId = r.maphong || r.maPhong || null;
            const roomIdNum = (rawRoomId !== null && rawRoomId !== undefined && String(rawRoomId).trim() !== '') ? Number(rawRoomId) : null;

            const detail = {
                Tongcong: Number(price * nights),
                Trangthai: 'Đã đặt'
            };
            if (Number.isFinite(roomIdNum)) {
                detail.Maphong = roomIdNum;
                detail.MaphongNavigation = { Sophong: roomNumber };
            } else {
                console.warn('submitBooking: skipping Maphong for room because id is invalid', r);
            }
            return detail;
        });

        const totalAmount = perRoomDetails.reduce((s, d) => s + (Number(d.Tongcong) || 0), 0);
        const isCheckinNow = document.getElementById('bookingType') && document.getElementById('bookingType').value === 'checkin-now';

        const makhId = await apiFindOrCreateCustomer({
            customerName,
            customerPhone,
            customerEmail,
            customerIdCard,
            customerAddress
        });

        const bookingApiData = {
            TenKhachHang: customerName,
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
            Chitietdatphongs: perRoomDetails
        };

        console.log('📤 Booking API data (single payload with Chitietdatphongs):', bookingApiData);

        const result = await apiCreateBooking(bookingApiData);
        console.log('✅ Booking created (with details):', result);

        let checkinResult = null;
        if (isCheckinNow) {
            const maDatPhong = result.maDatPhong || result.id;
            checkinResult = await apiPerformImmediateCheckin(maDatPhong, {
                thoiGianCheckin: document.getElementById('checkinTime').value,
                nhanVienCheckin: JSON.parse(localStorage.getItem("currentUser") || '{}').hoTen || 'Lễ tân'
            });
        }

        showBookingSuccess(result, { ...bookingApiData, tenKhachHang: customerName }, checkinResult, selectedRooms.length);

    } catch (error) {
        console.error('❌ Booking submission error:', error);

        let errorMessage = 'Có lỗi xảy ra khi đặt phòng:\n\n';
        if (String(error.message || '').includes('Failed to fetch')) {
            errorMessage += '🌐 Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng.';
        } else if (String(error.message || '').includes('500')) {
            errorMessage += '💾 Lỗi server. Vui lòng thử lại sau hoặc liên hệ bộ phận kỹ thuật.';
        } else if (String(error.message || '').includes('400')) {
            errorMessage += '📝 Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
        } else {
            errorMessage += (error?.message || error);
        }
        alert(errorMessage);

    } finally {
        const btn = document.getElementById('confirmBookingBtn');
        if (btn) {
            btn.innerHTML = originalText || 'Xác Nhận Đặt Phòng';
            btn.disabled = false;
        }
    }
}

// ================== Success modal ==================
function showBookingSuccess(result, bookingApiData, checkinResult = null, totalRooms = 1) {
    const modal = document.getElementById('bookingSuccessModal');

    const bookingId = result.maDatPhong || result.madatphong || result.id || 'N/A';
    const bookingTypeEl = document.getElementById('bookingType');
    const bookingType = bookingTypeEl ? bookingTypeEl.value : 'advance';

    const el = id => document.getElementById(id);
    el('bookingCode') && (el('bookingCode').textContent = bookingId);
    el('successCustomerName') && (el('successCustomerName').textContent = bookingApiData.tenKhachHang || bookingApiData.tenKhachHang || '');
    el('successRoomNumber') && (el('successRoomNumber').textContent = totalRooms > 1 ? `${totalRooms} phòng` : `Phòng ${selectedRooms[0] ? (selectedRooms[0].sophong || selectedRooms[0].soPhong) : ''}`);
    el('successDates') && (el('successDates').textContent = `${formatDateDisplay(bookingApiData.ngayNhanPhong || bookingApiData.checkInDate)} - ${formatDateDisplay(bookingApiData.ngayTraPhong || bookingApiData.checkOutDate)}`);
    const apiTotal = bookingApiData.Tongtien || bookingApiData.tongTienDatPhong || bookingApiData.totalAmount || 0;
    el('successTotalAmount') && (el('successTotalAmount').textContent = formatCurrency(apiTotal || 0));

    const modalHeader = document.querySelector('#bookingSuccessModal .modal-header h3');
    const modalBody = document.querySelector('#bookingSuccessModal .modal-body');

    if (bookingType === 'checkin-now' && checkinResult) {
        if (modalHeader) modalHeader.innerHTML = '<i class="fas fa-check-circle"></i> Đặt Phòng & Check-in Thành Công!';
        const successInfo = modalBody && modalBody.querySelector('.success-info');
        if (successInfo) {
            const checkinTime = (document.getElementById('checkinTime') || {}).value || '';
            const checkinInfo = document.createElement('p');
            checkinInfo.innerHTML = `<strong>Thời gian check-in:</strong> <span>${checkinTime} - ${formatDateDisplay(new Date())}</span>`;
            successInfo.appendChild(checkinInfo);

            const statusInfo = document.createElement('p');
            statusInfo.innerHTML = `<strong>Trạng thái:</strong> <span style="color: #28a745; font-weight: bold;">Đã Check-in</span>`;
            successInfo.appendChild(statusInfo);
        }
    } else if (bookingType === 'checkin-now' && !checkinResult) {
        if (modalHeader) modalHeader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Đặt Phòng Thành Công - Lỗi Check-in';
        const successInfo = modalBody && modalBody.querySelector('.success-info');
        if (successInfo) {
            const warningInfo = document.createElement('p');
            warningInfo.innerHTML = `<strong style="color: #ffc107;">Cảnh báo:</strong> <span style="color: #856404;">Cần check-in thủ công</span>`;
            successInfo.appendChild(warningInfo);
        }
    }

    if (modal) modal.classList.add('show');
}

function closeSuccessModal() {
    const modal = document.getElementById('bookingSuccessModal');
    if (modal) modal.classList.remove('show');
    setTimeout(() => { window.location.href = 'letan_dashboard.html'; }, 500);
}

function printBookingInfo() { window.print(); }

// ================== Booking type change ==================
function handleBookingTypeChange() {
    const bookingType = document.getElementById('bookingType').value;
    const checkinTimeGroup = document.getElementById('checkinTimeGroup');
    const immediatePaymentSection = document.getElementById('immediatePaymentSection');
    const confirmButtonText = document.getElementById('confirmButtonText');
    const checkInDate = document.getElementById('checkInDate');

    if (bookingType === 'checkin-now') {
        if (checkinTimeGroup) checkinTimeGroup.style.display = 'block';
        if (immediatePaymentSection) immediatePaymentSection.style.display = 'block';
        if (confirmButtonText) confirmButtonText.textContent = 'Đặt Phòng & Check-in Ngay';

        if (checkInDate) {
            const today = new Date();
            checkInDate.value = formatDateForInput(today);
            checkInDate.disabled = true;
        }

        const fullPaymentNow = document.getElementById('fullPaymentNow');
        if (fullPaymentNow) {
            fullPaymentNow.checked = true;
            fullPaymentNow.dispatchEvent(new Event('change'));
        }
    } else {
        if (checkinTimeGroup) checkinTimeGroup.style.display = 'none';
        if (immediatePaymentSection) immediatePaymentSection.style.display = 'none';
        if (confirmButtonText) confirmButtonText.textContent = 'Xác Nhận Đặt Phòng';

        if (checkInDate) checkInDate.disabled = false;

        const fullPaymentNow = document.getElementById('fullPaymentNow');
        if (fullPaymentNow) {
            fullPaymentNow.checked = false;
            fullPaymentNow.dispatchEvent(new Event('change'));
        }
    }
    if (selectedRooms && selectedRooms.length > 0) calculatePricing();
}

// ================== Cancel booking ==================
function cancelBooking() {
    if (confirm('Bạn có chắc chắn muốn hủy đặt phòng này?')) {
        const formEl = document.getElementById('bookingForm');
        if (formEl) formEl.reset();

        selectedRooms = [];
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
            const btn = card.querySelector('.select-room-btn'); if (btn) btn.textContent = 'Chọn Phòng';
        });

        const bookingFormSection = document.getElementById('bookingFormSection');
        if (bookingFormSection) bookingFormSection.style.display = 'none';

        const selectedRoomInfo = document.getElementById('selectedRoomInfo');
        if (selectedRoomInfo) {
            selectedRoomInfo.innerHTML = '<p class="no-data">Chưa chọn phòng nào</p>';
            selectedRoomInfo.classList.add('empty');
        }
    }
}

// ================== Debug ==================
async function debugRoomData() {
    try {
        console.log('🐛 DEBUG: Fetching all data...');
        const { rooms, roomTypes, bookings } = await apiDebugGetAll();

        console.group('🐛 DEBUG DATA');
        console.log('📋 All Rooms:', rooms);
        console.log('🏷️ Room Types:', roomTypes);
        console.log('📅 All Bookings:', bookings);

        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        console.log('📅 Checking for date:', today.toDateString());

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

// ================== Expose to window for inline handlers ==================
window.selectRoom = selectRoom;
window.closeSuccessModal = closeSuccessModal;
window.printBookingInfo = printBookingInfo;
window.handleBookingTypeChange = handleBookingTypeChange;
window.debugRoomData = debugRoomData;
window.searchAvailableRooms = searchAvailableRooms;
window.showRoomsLoading = typeof showRoomsLoading === 'function' ? showRoomsLoading : undefined;
window.showRoomsError = typeof showRoomsError === 'function' ? showRoomsError : undefined;

try {
    window.cancelBooking = cancelBooking;
    console.log('booking.ui.js loaded OK');
} catch (e) {
    console.warn('booking.ui.js load helper: cancelBooking not available yet', e);
}