// ============================================
// ROOM CHANGE PAGE - API & LOGIC
// ============================================

const API_BASE_URL = 'https://localhost:7076/api';

let currentBooking = null;
let selectedNewRoom = null;
let availableRooms = [];
let allRoomTypes = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadRoomTypes();
    checkUserLogin();
});

function initializeEventListeners() {
    // Search booking
    document.getElementById('searchBookingBtn').addEventListener('click', searchBookings);
    document.getElementById('searchValue').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBookings();
    });

    // Filter rooms
    document.getElementById('filterRoomsBtn').addEventListener('click', filterRooms);
    
    // Actions
    document.getElementById('cancelChangeBtn').addEventListener('click', resetForm);
    document.getElementById('confirmChangeBtn').addEventListener('click', confirmRoomChange);
    
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
}

// ============================================
// USER LOGIN CHECK
// ============================================

function checkUserLogin() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.hoten) {
        document.getElementById('userName').textContent = user.hoten;
    }
}

// ============================================
// LOAD ROOM TYPES
// ============================================

async function loadRoomTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/LoaiPhong`);
        if (!response.ok) throw new Error('Không thể tải danh sách loại phòng');
        
        allRoomTypes = await response.json();
        
        // Populate filter dropdown
        const select = document.getElementById('filterRoomType');
        select.innerHTML = '<option value="">Tất cả loại phòng</option>';
        allRoomTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.maloaiphong;
            option.textContent = `${type.tenloaiphong} - ${formatCurrency(type.giacoban)}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Lỗi tải loại phòng:', error);
    }
}

// ============================================
// SEARCH BOOKINGS
// ============================================

async function searchBookings() {
    const searchType = document.getElementById('searchType').value;
    const searchValue = document.getElementById('searchValue').value.trim();
    
    if (!searchValue) {
        alert('Vui lòng nhập từ khóa tìm kiếm');
        return;
    }
    
    showLoading(true);
    
    try {
        // Fetch all active bookings (checked-in)
        const response = await fetch(`${API_BASE_URL}/DatPhong`);
        if (!response.ok) throw new Error('Không thể tải danh sách đặt phòng');
        
        let bookings = await response.json();
        
        // Filter only checked-in bookings
        bookings = bookings.filter(b => b.trangthai === 'Đã nhận phòng');
        
        // Filter based on search criteria
        let filteredBookings = [];
        
        switch (searchType) {
            case 'booking':
                filteredBookings = bookings.filter(b => 
                    b.madatphong.toString().includes(searchValue)
                );
                break;
            case 'customer':
                filteredBookings = bookings.filter(b => 
                    b.tenkhachhang && b.tenkhachhang.toLowerCase().includes(searchValue.toLowerCase())
                );
                break;
            case 'phone':
                // Fetch customer details for phone search
                for (const booking of bookings) {
                    try {
                        const customer = await getCustomerById(booking.makh);
                        if (customer && customer.sdt && customer.sdt.includes(searchValue)) {
                            filteredBookings.push(booking);
                        }
                    } catch (err) {
                        console.error('Lỗi tải thông tin khách:', err);
                    }
                }
                break;
            case 'room':
                // Get room details for each booking
                for (const booking of bookings) {
                    try {
                        const details = await getRoomDetailsByBookingId(booking.madatphong);
                        if (details && details.some(d => d.phong && d.phong.sophong.toString().includes(searchValue))) {
                            filteredBookings.push(booking);
                        }
                    } catch (err) {
                        console.error('Lỗi tải chi tiết phòng:', err);
                    }
                }
                break;
        }
        
        displaySearchResults(filteredBookings);
    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        alert('Có lỗi xảy ra khi tìm kiếm: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function getCustomerById(customerId) {
    const response = await fetch(`${API_BASE_URL}/KhachHang/${customerId}`);
    if (!response.ok) throw new Error('Không thể tải thông tin khách hàng');
    return await response.json();
}

async function getRoomDetailsByBookingId(bookingId) {
    const response = await fetch(`${API_BASE_URL}/ChiTietDatPhong/booking/${bookingId}`);
    if (!response.ok) throw new Error('Không thể tải chi tiết phòng');
    return await response.json();
}

function displaySearchResults(bookings) {
    const resultsSection = document.getElementById('searchResults');
    const bookingsList = document.getElementById('bookingsList');
    const resultCount = document.getElementById('resultCount');
    
    resultCount.textContent = bookings.length;
    
    if (bookings.length === 0) {
        bookingsList.innerHTML = '<p class="text-center">Không tìm thấy đơn đặt phòng nào</p>';
        resultsSection.style.display = 'block';
        return;
    }
    
    bookingsList.innerHTML = '';
    
    bookings.forEach(async (booking) => {
        const card = await createBookingCard(booking);
        bookingsList.appendChild(card);
    });
    
    resultsSection.style.display = 'block';
}

async function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'booking-card';
    
    // Get room details
    let roomInfo = 'Đang tải...';
    try {
        const details = await getRoomDetailsByBookingId(booking.madatphong);
        if (details && details.length > 0) {
            const rooms = details.map(d => `Phòng ${d.phong.sophong}`).join(', ');
            roomInfo = rooms;
        }
    } catch (err) {
        roomInfo = 'N/A';
    }
    
    card.innerHTML = `
        <div class="booking-card-header">
            <span class="booking-code">Mã ĐP: ${booking.madatphong}</span>
            <span class="booking-status checked-in">
                <i class="fas fa-check-circle"></i> ${booking.trangthai}
            </span>
        </div>
        <div class="booking-card-body">
            <div class="booking-info-item">
                <i class="fas fa-user"></i>
                <span class="label">Khách:</span>
                <span class="value">${booking.tenkhachhang || 'N/A'}</span>
            </div>
            <div class="booking-info-item">
                <i class="fas fa-bed"></i>
                <span class="label">Phòng:</span>
                <span class="value">${roomInfo}</span>
            </div>
            <div class="booking-info-item">
                <i class="fas fa-calendar"></i>
                <span class="label">Ngày nhận:</span>
                <span class="value">${formatDate(booking.ngaynhanphong)}</span>
            </div>
            <div class="booking-info-item">
                <i class="fas fa-calendar-check"></i>
                <span class="label">Ngày trả:</span>
                <span class="value">${formatDate(booking.ngaytraphong)}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => selectBooking(booking));
    
    return card;
}

// ============================================
// SELECT BOOKING
// ============================================

async function selectBooking(booking) {
    // Remove previous selection
    document.querySelectorAll('.booking-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Mark as selected
    event.currentTarget.classList.add('selected');
    
    currentBooking = booking;
    selectedNewRoom = null;
    
    showLoading(true);
    
    try {
        // Get booking details
        const roomDetails = await getRoomDetailsByBookingId(booking.madatphong);
        const customer = await getCustomerById(booking.makh);
        
        // Display current booking info
        displayCurrentBookingInfo(booking, roomDetails, customer);
        
        // Load available rooms for the remaining period
        await loadAvailableRooms(booking);
        
        // Show form sections
        document.getElementById('currentBookingSection').style.display = 'block';
        document.getElementById('roomChangeFormSection').style.display = 'block';
        
        // Scroll to current booking section
        document.getElementById('currentBookingSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Lỗi tải thông tin đặt phòng:', error);
        alert('Có lỗi xảy ra khi tải thông tin đặt phòng');
    } finally {
        showLoading(false);
    }
}

function displayCurrentBookingInfo(booking, roomDetails, customer) {
    const infoDiv = document.getElementById('currentBookingInfo');
    
    const currentRoom = roomDetails && roomDetails.length > 0 ? roomDetails[0] : null;
    
    infoDiv.innerHTML = `
        <div class="booking-info-grid">
            <div class="info-item">
                <span class="label">Mã Đặt Phòng</span>
                <span class="value">${booking.madatphong}</span>
            </div>
            <div class="info-item">
                <span class="label">Khách Hàng</span>
                <span class="value">${customer.hoten}</span>
            </div>
            <div class="info-item">
                <span class="label">Số Điện Thoại</span>
                <span class="value">${customer.sdt}</span>
            </div>
            <div class="info-item">
                <span class="label">Email</span>
                <span class="value">${customer.email || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="label">Ngày Nhận Phòng</span>
                <span class="value">${formatDate(booking.ngaynhanphong)}</span>
            </div>
            <div class="info-item">
                <span class="label">Ngày Trả Phòng</span>
                <span class="value">${formatDate(booking.ngaytraphong)}</span>
            </div>
            <div class="info-item">
                <span class="label">Trạng Thái</span>
                <span class="value">${booking.trangthai}</span>
            </div>
            <div class="info-item">
                <span class="label">Tổng Tiền</span>
                <span class="value">${formatCurrency(booking.tongcong)}</span>
            </div>
        </div>
    `;
    
    // Display current room details
    if (currentRoom) {
        const currentRoomDiv = document.getElementById('currentRoomDetails');
        currentRoomDiv.innerHTML = `
            <div class="room-details">
                <div class="room-detail-item">
                    <span class="label">Số Phòng</span>
                    <span class="value">${currentRoom.phong.sophong}</span>
                </div>
                <div class="room-detail-item">
                    <span class="label">Loại Phòng</span>
                    <span class="value">${currentRoom.phong.loaiPhong.tenloaiphong}</span>
                </div>
                <div class="room-detail-item">
                    <span class="label">Giá/Đêm</span>
                    <span class="value">${formatCurrency(currentRoom.phong.loaiPhong.giacoban)}</span>
                </div>
                <div class="room-detail-item">
                    <span class="label">Sức Chứa</span>
                    <span class="value">${currentRoom.phong.loaiPhong.succhua} người</span>
                </div>
            </div>
        `;
        
        // Store current room price
        currentBooking.currentRoomPrice = currentRoom.phong.loaiPhong.giacoban;
        currentBooking.currentRoomId = currentRoom.phong.maphong;
    }
}

// ============================================
// LOAD AVAILABLE ROOMS
// ============================================

async function loadAvailableRooms(booking) {
    try {
        const checkInDate = booking.ngaynhanphong.split('T')[0];
        const checkOutDate = booking.ngaytraphong.split('T')[0];
        
        // Get available rooms for the period
        const response = await fetch(
            `${API_BASE_URL}/Phong/available?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`
        );
        
        if (!response.ok) throw new Error('Không thể tải danh sách phòng trống');
        
        const availableRoomIds = await response.json();
        
        // Get full room details
        availableRooms = [];
        for (const roomData of availableRoomIds) {
            try {
                const roomResponse = await fetch(`${API_BASE_URL}/Phong/${roomData.maphong}`);
                if (roomResponse.ok) {
                    const room = await roomResponse.json();
                    availableRooms.push(room);
                }
            } catch (err) {
                console.error('Lỗi tải chi tiết phòng:', err);
            }
        }
        
        displayAvailableRooms(availableRooms);
    } catch (error) {
        console.error('Lỗi tải phòng trống:', error);
        alert('Có lỗi xảy ra khi tải danh sách phòng trống');
    }
}

function displayAvailableRooms(rooms) {
    const roomsGrid = document.getElementById('availableRoomsList');
    
    if (rooms.length === 0) {
        roomsGrid.innerHTML = '<p class="text-center">Không có phòng trống phù hợp</p>';
        return;
    }
    
    // Filter out current room
    const filteredRooms = rooms.filter(r => r.maphong !== currentBooking.currentRoomId);
    
    roomsGrid.innerHTML = '';
    
    filteredRooms.forEach(room => {
        const card = createRoomCard(room);
        roomsGrid.appendChild(card);
    });
}

function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.dataset.roomId = room.maphong;
    
    card.innerHTML = `
        <div class="room-card-header">
            <span class="room-number">Phòng ${room.sophong}</span>
            <span class="room-type-badge">${room.loaiPhong.tenloaiphong}</span>
        </div>
        <div class="room-card-body">
            <div class="room-features">
                <span class="feature-tag"><i class="fas fa-users"></i> ${room.loaiPhong.succhua} người</span>
                <span class="feature-tag"><i class="fas fa-bed"></i> ${room.loaiPhong.soluonggiuong || 1} giường</span>
            </div>
            <div class="room-price">
                <span class="price-amount">${formatCurrency(room.loaiPhong.giacoban)}</span>
                <button class="select-room-btn" onclick="selectNewRoom(${room.maphong})">
                    Chọn
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// ============================================
// SELECT NEW ROOM
// ============================================

window.selectNewRoom = async function(roomId) {
    // Remove previous selection
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Mark as selected
    const selectedCard = document.querySelector(`.room-card[data-room-id="${roomId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Find room details
    selectedNewRoom = availableRooms.find(r => r.maphong === roomId);
    
    if (selectedNewRoom) {
        calculatePriceAdjustment();
        document.getElementById('confirmChangeBtn').disabled = false;
    }
};

// ============================================
// CALCULATE PRICE ADJUSTMENT
// ============================================

function calculatePriceAdjustment() {
    if (!currentBooking || !selectedNewRoom) return;
    
    const oldPrice = currentBooking.currentRoomPrice;
    const newPrice = selectedNewRoom.loaiPhong.giacoban;
    const priceDiff = newPrice - oldPrice;
    
    // Calculate remaining nights
    const today = new Date();
    const checkOutDate = new Date(currentBooking.ngaytraphong);
    const remainingNights = Math.max(0, Math.ceil((checkOutDate - today) / (1000 * 60 * 60 * 24)));
    
    const totalAdjustment = priceDiff * remainingNights;
    
    // Update UI
    document.getElementById('oldRoomPrice').textContent = formatCurrency(oldPrice);
    document.getElementById('newRoomPrice').textContent = formatCurrency(newPrice);
    document.getElementById('priceDifference').textContent = formatCurrency(Math.abs(priceDiff));
    document.getElementById('remainingNights').textContent = `${remainingNights} đêm`;
    document.getElementById('totalAdjustment').textContent = formatCurrency(Math.abs(totalAdjustment));
    
    // Update price item classes
    const priceItem = document.querySelector('.price-item.highlight');
    priceItem.classList.remove('negative', 'positive');
    priceItem.classList.add(priceDiff < 0 ? 'negative' : 'positive');
    
    const totalItem = document.querySelector('.price-item.total');
    totalItem.classList.remove('negative', 'positive');
    totalItem.classList.add(totalAdjustment < 0 ? 'negative' : 'positive');
}

// ============================================
// FILTER ROOMS
// ============================================

function filterRooms() {
    const roomType = document.getElementById('filterRoomType').value;
    const priceRange = document.getElementById('filterPriceRange').value;
    
    let filtered = [...availableRooms];
    
    // Filter by room type
    if (roomType) {
        filtered = filtered.filter(r => r.loaiPhong.maloaiphong.toString() === roomType);
    }
    
    // Filter by price range
    if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        filtered = filtered.filter(r => {
            const price = r.loaiPhong.giacoban;
            return price >= min && price <= max;
        });
    }
    
    displayAvailableRooms(filtered);
}

// ============================================
// CONFIRM ROOM CHANGE
// ============================================

async function confirmRoomChange() {
    if (!currentBooking || !selectedNewRoom) {
        alert('Vui lòng chọn phòng mới');
        return;
    }
    
    const reason = document.getElementById('changeReason').value;
    if (!reason) {
        alert('Vui lòng chọn lý do đổi phòng');
        return;
    }
    
    const note = document.getElementById('changeNote').value;
    
    if (!confirm('Bạn có chắc chắn muốn đổi phòng?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Get current room detail ID
        const roomDetails = await getRoomDetailsByBookingId(currentBooking.madatphong);
        const currentRoomDetail = roomDetails[0];
        
        // Calculate new price
        const oldPrice = currentBooking.currentRoomPrice;
        const newPrice = selectedNewRoom.loaiPhong.giacoban;
        const today = new Date();
        const checkOutDate = new Date(currentBooking.ngaytraphong);
        const remainingNights = Math.max(0, Math.ceil((checkOutDate - today) / (1000 * 60 * 60 * 24)));
        const totalAdjustment = (newPrice - oldPrice) * remainingNights;
        
        // Update room detail
        const updateData = {
            machitiet: currentRoomDetail.machitiet,
            madatphong: currentBooking.madatphong,
            maphong: selectedNewRoom.maphong,
            tongcong: newPrice * remainingNights,
            ghichu: `Đổi phòng. Lý do: ${reason}. ${note ? 'Ghi chú: ' + note : ''}`
        };
        
        const response = await fetch(`${API_BASE_URL}/ChiTietDatPhong/${currentRoomDetail.machitiet}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) throw new Error('Không thể cập nhật thông tin đổi phòng');
        
        // Update booking total
        const newBookingTotal = currentBooking.tongcong + totalAdjustment;
        const bookingUpdateData = {
            madatphong: currentBooking.madatphong,
            makh: currentBooking.makh,
            ngaynhanphong: currentBooking.ngaynhanphong,
            ngaytraphong: currentBooking.ngaytraphong,
            tongcong: newBookingTotal,
            trangthai: currentBooking.trangthai,
            tenkhachhang: currentBooking.tenkhachhang
        };
        
        const bookingResponse = await fetch(`${API_BASE_URL}/DatPhong/${currentBooking.madatphong}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingUpdateData)
        });
        
        if (!bookingResponse.ok) throw new Error('Không thể cập nhật tổng tiền đặt phòng');
        
        // Show success modal
        showSuccessModal(totalAdjustment);
    } catch (error) {
        console.error('Lỗi đổi phòng:', error);
        alert('Có lỗi xảy ra khi đổi phòng: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ============================================
// SUCCESS MODAL
// ============================================

function showSuccessModal(adjustment) {
    const modal = document.getElementById('successModal');
    
    // Get current room number
    const oldRoomNum = document.querySelector('#currentRoomDetails .room-detail-item .value').textContent;
    
    document.getElementById('successBookingCode').textContent = currentBooking.madatphong;
    document.getElementById('successCustomerName').textContent = currentBooking.tenkhachhang;
    document.getElementById('successOldRoom').textContent = oldRoomNum;
    document.getElementById('successNewRoom').textContent = `Phòng ${selectedNewRoom.sophong}`;
    document.getElementById('successPriceAdjustment').textContent = formatCurrency(Math.abs(adjustment));
    
    modal.classList.add('show');
}

window.closeSuccessModal = function() {
    document.getElementById('successModal').classList.remove('show');
    resetForm();
    // Reload search results
    searchBookings();
};

window.printChangeReceipt = function() {
    window.print();
};

// ============================================
// RESET FORM
// ============================================

function resetForm() {
    currentBooking = null;
    selectedNewRoom = null;
    availableRooms = [];
    
    document.getElementById('currentBookingSection').style.display = 'none';
    document.getElementById('roomChangeFormSection').style.display = 'none';
    document.getElementById('confirmChangeBtn').disabled = true;
    
    document.getElementById('changeReason').value = '';
    document.getElementById('changeNote').value = '';
    
    document.querySelectorAll('.booking-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}
