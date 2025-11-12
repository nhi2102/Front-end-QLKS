// rooms.js - JavaScript cho trang danh sách phòng với chức năng giỏ hàng

// Biến global để lưu cart
let cart = [];
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    // Nếu chưa đăng nhập, không load giỏ hàng
    localStorage.removeItem('cartItems');
    cart = [];
} else {
    cart = JSON.parse(localStorage.getItem('cartItems')) || [];
}
// Hàm loadSearchData - có thể gọi từ bất kỳ đâu
// updateDatePicker: true = cập nhật date picker (khi load trang), false = không cập nhật (khi search)
function loadSearchData(updateDatePicker = false) {
    const searchData = JSON.parse(localStorage.getItem('hotelSearch'));

    if (searchData) {
        // Cập nhật header thông tin tìm kiếm
        const searchTitle = document.getElementById('search-title');
        const searchDates = document.getElementById('search-dates');
        const searchDuration = document.getElementById('search-duration');
        const searchGuests = document.getElementById('search-guests');

        // Cập nhật sidebar
        const sidebarDates = document.getElementById('sidebar-dates');
        const sidebarDuration = document.getElementById('sidebar-duration');
        const sidebarMaxRooms = document.getElementById('sidebar-max-rooms');
        const sidebarGuests = document.getElementById('sidebar-guests');
        const nightsTotal = document.getElementById('nights-total');
        const sidebarCheckin = document.getElementById('sidebar-checkin');

        const nights = searchData.nights || 1;
        const durationText = `${nights} ngày ${nights > 1 ? nights - 1 : 1} đêm`;

        // Lấy ngày nhận phòng (ngày đầu tiên trong dateRange)
        let checkinDate = '';
        if (searchData.dateRange && searchData.dateRange.includes(' - ')) {
            checkinDate = searchData.dateRange.split(' - ')[0];
        } else {
            checkinDate = searchData.dateRange;
        }

        if (searchDates) searchDates.textContent = searchData.dateRange;
        if (searchDuration) searchDuration.textContent = durationText;
        if (searchGuests) searchGuests.textContent = searchData.guestCount;

        if (sidebarDates) sidebarDates.textContent = searchData.dateRange;
        if (sidebarDuration) sidebarDuration.textContent = `(${durationText})`;
        if (sidebarMaxRooms) sidebarMaxRooms.textContent = searchData.roomCount;
        if (sidebarGuests) sidebarGuests.textContent = searchData.guestCount;
        if (nightsTotal) nightsTotal.textContent = `${nights > 1 ? nights - 1 : 1} đêm`;
        if (sidebarCheckin) sidebarCheckin.textContent = checkinDate;

        // Cập nhật booking widget
        const datePickerInput = document.getElementById('date-range-picker');
        const roomDisplay = document.getElementById('room-display');
        const guestDisplay = document.getElementById('guest-display');

        // CHỈ cập nhật date picker khi load trang lần đầu (updateDatePicker = true)
        // Không cập nhật khi user click nút search để tránh nhảy lung tung
        if (updateDatePicker && datePickerInput && searchData.dateRange) {
            // Date picker đã được khởi tạo với giá trị đúng trong initializeDatePicker()
            // Không cần set lại ở đây
        }

        if (roomDisplay && searchData.roomCount) {
            roomDisplay.textContent = searchData.roomCount;
        }

        if (guestDisplay && searchData.guestCount) {
            guestDisplay.textContent = searchData.guestCount;
        }

        // Lưu số đêm để tính tổng giá
        window.searchNights = nights > 1 ? nights - 1 : 1;
    } else {
        // Nếu không có data, set default
        window.searchNights = 1;
    }
}

// Hàm khởi tạo Litepicker
function initializeDatePicker() {
    const datePickerElement = document.getElementById('date-range-picker');
    if (!datePickerElement) {
        console.error('Date picker element not found');
        return;
    }

    // Kiểm tra xem Litepicker có sẵn không
    if (typeof Litepicker === 'undefined') {
        console.error('Litepicker library not loaded');
        return;
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Nếu hiện tại >= 14h thì khóa hôm nay
    const minDate = now.getHours() >= 14 ? tomorrow : today;

    try {
        // Khởi tạo Litepicker - KHÔNG thêm event listener phức tạp
        window.picker = new Litepicker({
            element: datePickerElement,
            singleMode: false,
            numberOfMonths: 2,
            numberOfColumns: 2,
            format: 'DD/MM/YYYY',
            lang: 'vi-VN',
            minDate: minDate,
            startDate: today,
            endDate: tomorrow
        });
        console.log('Litepicker initialized successfully');

    } catch (error) {
        console.error('Error initializing Litepicker:', error);
        return;
    }

    // Set giá trị mặc định
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Kiểm tra localStorage, nếu có thì dùng, không thì dùng mặc định
    const searchData = JSON.parse(localStorage.getItem('hotelSearch'));

    // CHỈ set giá trị và date range KHI TRANG MỚI LOAD (không có picker chưa được tương tác)
    if (searchData && searchData.dateRange && searchData.dateRange.includes(' - ')) {
        const [startStr, endStr] = searchData.dateRange.split(' - ');
        const [startDay, startMonth, startYear] = startStr.split('/');
        const [endDay, endMonth, endYear] = endStr.split('/');

        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);

        // Set date range cho picker (KHÔNG set input.value, để picker tự động set)
        window.picker.setDateRange(startDate, endDate);
        console.log('Đã load ngày từ localStorage:', searchData.dateRange);
    } else {
        // Không có localStorage, dùng giá trị mặc định (today - tomorrow)
        datePickerElement.value = `${formatDate(today)} - ${formatDate(tomorrow)}`;
        console.log('Không có localStorage, dùng ngày mặc định');
    }

    // QUAN TRỌNG: Thêm event listener để cập nhật localStorage khi user chọn ngày mới
    window.picker.on('selected', function(date1, date2) {
        console.log('✅ User selected new dates:', date1, date2);

        // Đợi Litepicker cập nhật xong input value
        setTimeout(function() {
            // Cập nhật localStorage từ giá trị mới trong input
            updateSearchDataFromWidget();
            console.log('✅ localStorage updated with new dates');
        }, 100);
    });
}

document.addEventListener("DOMContentLoaded", function() {

            // QUAN TRỌNG: Khởi tạo giỏ hàng từ localStorage. Nếu không có, đặt là mảng rỗng.
            // Đồng thời xóa dữ liệu đặt phòng cũ nếu người dùng quay lại từ trang cus_info_booking để chỉnh sửa.
            localStorage.removeItem('currentBooking');
            cart = JSON.parse(localStorage.getItem('cartItems')) || [];

            // HÀM LƯU GIỎ HÀNG - Expose globally
            window.saveCart = function saveCart() {
                localStorage.setItem('cartItems', JSON.stringify(cart));
                console.log('Saved cart to localStorage');
            };

            // Đợi một chút để đảm bảo Litepicker đã load xong
            setTimeout(function() {
                // Khởi tạo date picker (event listener đã được thêm bên trong)
                initializeDatePicker();
            }, 200);

            // Load search data từ localStorage (CHỈ cập nhật header/sidebar, KHÔNG cập nhật date picker)
            loadSearchData(false);

            // Initialize cart functionality
            initializeCartFunctionality();

            // Xử lý nút tìm kiếm trong widget
            initSearchButton();

            function initializeCartFunctionality() {
                // Xử lý collapse/expand giỏ hàng
                const collapseBtn = document.getElementById('cart-collapse');
                const cartItems = document.getElementById('cart-items');

                if (collapseBtn && cartItems) {
                    collapseBtn.addEventListener('click', function() {
                        cartItems.classList.toggle('collapsed');
                        collapseBtn.classList.toggle('collapsed');
                    });
                }

                // Lắng nghe sự kiện cập nhật giỏ hàng khi thay đổi dịch vụ
                document.addEventListener('cartUpdated', function() {
                    updateCartDisplay();
                });

                // Lắng nghe sự kiện thêm phòng vào giỏ
                document.addEventListener('click', function(e) {
                    if (e.target.classList.contains('choose-room-btn')) {
                        e.preventDefault();
                        handleAddToCart(e.target);
                    }
                });

                // Xử lý đặt phòng
                const bookNowBtn = document.getElementById('book-now-btn');
                if (bookNowBtn) {
                    bookNowBtn.addEventListener('click', handleBooking);
                }

                // Khởi tạo giỏ hàng trống
                updateCartDisplay();
            }

            function handleAddToCart(button) {
                const roomItem = button.closest('.room-item');
                const roomTitle = roomItem.querySelector('.room-title').textContent;
                const priceText = roomItem.querySelector('.price').textContent;
                const price = parseInt(priceText.replace(/[^\d]/g, ''));
                const roomType = button.dataset.roomType;
                const roomId = button.dataset.roomId; // Lấy mã phòng từ data-room-id

                // Kiểm tra xem phòng đã có trong giỏ chưa
                const existingItemIndex = cart.findIndex(item => item.roomType === roomType);

                // Nếu phòng đã có trong giỏ, thông báo và không làm gì
                if (existingItemIndex > -1) {
                    button.textContent = 'Đã có trong giỏ';
                    setTimeout(() => {
                        button.textContent = 'Chọn Phòng';
                    }, 1500);
                    return;
                }

                // Animation thêm vào giỏ
                button.classList.add('adding');
                button.textContent = 'Đang thêm...';

                setTimeout(() => {
                    // Thêm phòng mới vào giỏ (quantity luôn là 1) với mảng services rỗng
                    cart.push({
                        roomType: roomType,
                        roomId: roomId, // Lưu mã phòng để gửi lên API
                        title: roomTitle,
                        price: price,
                        quantity: 1,
                        services: [] // Dịch vụ riêng cho phòng này
                    });

                    // Đánh dấu phòng đã có trong giỏ
                    roomItem.classList.add('in-cart');

                    // Reset button
                    button.classList.remove('adding');
                    button.classList.add('added');
                    button.textContent = 'Đã Chọn';

                    // Cập nhật hiển thị giỏ hàng
                    updateCartDisplay();

                    // LƯU LẠI GIỎ HÀNG
                    saveCart();

                    // Reset button sau 2 giây
                    setTimeout(() => {
                        button.classList.remove('added');
                        button.textContent = 'Chọn Phòng';
                    }, 2000);

                }, 500);
            }

            // Expose updateCartDisplay globally
            window.updateCartDisplay = updateCartDisplay;

            function updateCartDisplay() {
                const cartItemsContainer = document.getElementById('cart-items');
                const emptyCart = document.getElementById('empty-cart');
                const roomCountTotal = document.getElementById('room-count-total');
                const totalAmountElement = document.getElementById('total-amount');
                const bookNowBtn = document.getElementById('book-now-btn');

                if (cart.length === 0) {
                    // Giỏ hàng trống
                    if (emptyCart) emptyCart.style.display = 'block';
                    if (roomCountTotal) roomCountTotal.textContent = '0 phòng';
                    if (totalAmountElement) totalAmountElement.textContent = '0 VNĐ';
                    if (bookNowBtn) bookNowBtn.disabled = true;

                    // Xóa tất cả cart items
                    const existingItems = cartItemsContainer.querySelectorAll('.cart-item');
                    existingItems.forEach(item => item.remove());

                } else {
                    // Có phòng trong giỏ
                    if (emptyCart) emptyCart.style.display = 'none';

                    // Tính tổng tiền phòng
                    const totalRooms = cart.reduce((sum, item) => sum + item.quantity, 0);
                    const roomTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity * window.searchNights), 0);

                    // Tính tổng tiền dịch vụ từ tất cả các phòng
                    const servicesTotal = cart.reduce((sum, item) => {
                        if (item.services && item.services.length > 0) {
                            const roomServicesTotal = item.services.reduce((serviceSum, service) => {
                                return serviceSum + (service.dongia * service.soluong);
                            }, 0);
                            return sum + roomServicesTotal;
                        }
                        return sum;
                    }, 0);

                    const totalPrice = roomTotal + servicesTotal;

                    if (roomCountTotal) roomCountTotal.textContent = `${totalRooms} phòng`;
                    if (totalAmountElement) {
                        if (servicesTotal > 0) {
                            totalAmountElement.innerHTML = `
                        ${formatPrice(roomTotal)} VNĐ
                        <small style="display: block; font-size: 12px; font-weight: 400; color: #666; margin-top: 4px;">
                            + Dịch vụ: ${formatPrice(servicesTotal)} VNĐ
                        </small>
                        <div style="border-top: 1px solid #eee; margin-top: 8px; padding-top: 8px;">
                            ${formatPrice(totalPrice)} VNĐ
                        </div>
                    `;
                        } else {
                            totalAmountElement.textContent = formatPrice(totalPrice) + ' VNĐ';
                        }
                    }
                    if (bookNowBtn) bookNowBtn.disabled = false;

                    // Render cart items
                    renderCartItems();
                }
            }

            function renderCartItems() {
                const cartItemsContainer = document.getElementById('cart-items');
                const emptyCart = document.getElementById('empty-cart');

                // Xóa tất cả cart items hiện tại (trừ empty-cart)
                const existingItems = cartItemsContainer.querySelectorAll('.cart-item');
                existingItems.forEach(item => item.remove());

                // Tạo cart items mới
                cart.forEach((item, index) => {
                            // Tính tổng tiền dịch vụ cho phòng này
                            let servicesHTML = '';
                            let servicesTotalForRoom = 0;

                            if (item.services && item.services.length > 0) {
                                servicesTotalForRoom = item.services.reduce((sum, service) => {
                                    return sum + (service.dongia * service.soluong);
                                }, 0);

                                servicesHTML = `
                    <div class="cart-item-services">
                        <small style="color: #666; font-size: 12px;">Dịch vụ đã chọn:</small>
                        ${item.services.map(service => `
                            <small style="color: #667eea; font-size: 11px; display: block;">
                                • ${service.tendv} x${service.soluong}: ${formatPrice(service.dongia * service.soluong)} VNĐ
                            </small>
                        `).join('')}
                    </div>
                `;
            }
            
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item adding';
            cartItemDiv.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${formatPrice(item.price * window.searchNights)} VNĐ / phòng</div>
                    ${servicesHTML}
                    <button class="add-service-btn" onclick="openServicesForRoom(${index})" 
                            style="margin-top: 8px; padding: 5px 12px; font-size: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-plus"></i> ${item.services && item.services.length > 0 ? 'Thêm dịch vụ' : 'Thêm dịch vụ'}
                    </button>
                </div>
                <div class="cart-item-actions">
                    <button class="remove-item-btn" onclick="removeFromCart(${index})" title="Xóa khỏi giỏ">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            cartItemsContainer.appendChild(cartItemDiv);

            // Xóa animation class sau khi thêm
            setTimeout(() => {
                cartItemDiv.classList.remove('adding');
            }, 300);
        });
    }

    // Global functions để gọi từ HTML
    window.updateQuantity = function(index, change) {
        if (cart[index]) {
            cart[index].quantity += change;

            if (cart[index].quantity <= 0) {
                removeFromCart(index);
            } else {
                updateCartDisplay();
                saveCart(); //
            }
        }
    };

    window.removeFromCart = function(index) {
        if (cart[index]) {
            const removedItem = cart.splice(index, 1)[0];

            // Xóa đánh dấu phòng trong danh sách
            const roomItems = document.querySelectorAll('.room-item');
            roomItems.forEach(roomItem => {
                const button = roomItem.querySelector('.choose-room-btn');
                if (button && button.dataset.roomType === removedItem.roomType) {
                    roomItem.classList.remove('in-cart');
                }
            });

            updateCartDisplay();
            saveCart(); //
        }
    };

    function handleBooking() {
        if (cart.length === 0) return;

        // 1. Kiểm tra đăng nhập (Logic được giữ lại từ code gốc của bạn)
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            // Chuyển hướng im lặng đến trang đăng nhập
            window.location.href = 'login.html';
            return;
        }

        // 2. Tính toán tổng giá và số phòng
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity * window.searchNights), 0);
        const totalRooms = cart.reduce((sum, item) => sum + item.quantity, 0);

        // 3. Lấy thông tin tìm kiếm và tạo đối tượng bookingData
        const searchData = JSON.parse(localStorage.getItem('hotelSearch')) || {};
        const bookingData = {
            rooms: cart,
            searchInfo: searchData,
            totalRooms: totalRooms,
            totalPrice: totalPrice,
            bookingTime: new Date().toISOString()
        };

        // 4. Lưu thông tin booking vào localStorage để trang cus_info_booking sử dụng
        localStorage.setItem('currentBooking', JSON.stringify(bookingData));

        // 5. Chuyển hướng sang trang đặt phòng để nhập thông tin khách hàng
        window.location.href = 'cus_info_booking.html';
    }

    // Utility function để format giá
    function formatPrice(price) {
        return new Intl.NumberFormat('vi-VN').format(price);
    }

    // === IMAGE GALLERY FUNCTIONALITY ===
    initializeImageGalleries();

    // === AMENITIES MODAL FUNCTIONALITY ===
    initializeAmenitiesModal();

    // === POLICY MODAL FUNCTIONALITY ===
    initializePolicyModal();

    function initializeImageGalleries() {
        // Initialize each room's image gallery
        document.querySelectorAll('.room-images').forEach(roomImages => {
            const images = roomImages.querySelectorAll('.room-image');
            const indicators = roomImages.querySelectorAll('.indicator');
            const prevBtn = roomImages.querySelector('.prev-btn');
            const nextBtn = roomImages.querySelector('.next-btn');

            let currentImageIndex = 0;

            // Next image function
            function showNextImage() {
                images[currentImageIndex].classList.remove('active');
                indicators[currentImageIndex].classList.remove('active');

                currentImageIndex = (currentImageIndex + 1) % images.length;

                images[currentImageIndex].classList.add('active');
                indicators[currentImageIndex].classList.add('active');
            }

            // Previous image function
            function showPrevImage() {
                images[currentImageIndex].classList.remove('active');
                indicators[currentImageIndex].classList.remove('active');

                currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;

                images[currentImageIndex].classList.add('active');
                indicators[currentImageIndex].classList.add('active');
            }

            // Go to specific image
            function goToImage(index) {
                images[currentImageIndex].classList.remove('active');
                indicators[currentImageIndex].classList.remove('active');

                currentImageIndex = index;

                images[currentImageIndex].classList.add('active');
                indicators[currentImageIndex].classList.add('active');
            }

            // Event listeners
            if (nextBtn) {
                nextBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showNextImage();
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showPrevImage();
                });
            }

            // Indicator click events
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    goToImage(index);
                });
            });

            // Auto-slide (optional - can be enabled)
            // setInterval(showNextImage, 5000);
        });
    }

    function initializeAmenitiesModal() {
        const modal = document.getElementById('amenitiesModal');
        const modalClose = document.getElementById('modalClose');
        const modalMainImage = document.getElementById('modalMainImage');
        const modalPrevBtn = document.getElementById('modalPrevBtn');
        const modalNextBtn = document.getElementById('modalNextBtn');

        let currentModalImages = [];
        let currentModalImageIndex = 0;

        // Event listener cho tất cả link "Xem tất cả tiện nghi"
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('view-amenities')) {
                e.preventDefault();
                const roomType = e.target.dataset.roomType;
                openAmenitiesModal(roomType);
            }
        });

        // Đóng modal
        function closeModal() {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '1';
                modal.classList.remove('show');
            }, 200);
        }

        // Mở modal với thông tin phòng
        async function openAmenitiesModal(roomType) {
            // Lấy room ID từ roomType (format: room-{maphong})
            const roomId = roomType.replace('room-', '');

            try {
                // Lấy thông tin phòng từ global variable (đã được set bởi api/room.js)
                const roomsData = window.roomsData || [];
                const room = roomsData.find(r => r.maphong == roomId);

                if (room) {
                    // Cập nhật thông tin modal
                    document.getElementById('modalRoomTitle').textContent = (room.loaiPhong && room.loaiPhong.tenloaiphong) || 'Phòng';
                    document.getElementById('modalRoomSize').textContent = (room.loaiPhong && room.loaiPhong.songuoitoida) ?
                        `${room.loaiPhong.songuoitoida} người` :
                        'N/A';
                    document.getElementById('modalRoomDescription').textContent = (room.loaiPhong && room.loaiPhong.mota) || 'Phòng sang trọng với đầy đủ tiện nghi hiện đại';

                    // Set images
                    currentModalImages = room.hinhAnh && room.hinhAnh.length > 0 ?
                        room.hinhAnh.map(img => img.duongdan) : ['assets/img/room-default.jpg'];
                    currentModalImageIndex = 0;
                    updateModalImage();
                }
            } catch (error) {
                console.error('Lỗi khi lấy thông tin phòng:', error);
            }

            // Hiển thị modal
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }

        // Cập nhật hình ảnh trong modal
        function updateModalImage() {
            if (currentModalImages.length > 0) {
                modalMainImage.src = currentModalImages[currentModalImageIndex];
                modalMainImage.alt = `Room Image ${currentModalImageIndex + 1}`;
            }
        }

        // Navigation cho hình ảnh trong modal
        function showNextModalImage() {
            currentModalImageIndex = (currentModalImageIndex + 1) % currentModalImages.length;
            updateModalImage();
        }

        function showPrevModalImage() {
            currentModalImageIndex = (currentModalImageIndex - 1 + currentModalImages.length) % currentModalImages.length;
            updateModalImage();
        }

        // Event listeners
        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }

        if (modalNextBtn) {
            modalNextBtn.addEventListener('click', showNextModalImage);
        }

        if (modalPrevBtn) {
            modalPrevBtn.addEventListener('click', showPrevModalImage);
        }

        // Đóng modal khi click outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Đóng modal bằng ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });
    }

    function initializePolicyModal() {
        const policyModal = document.getElementById('policyModal');
        const policyModalClose = document.getElementById('policyModalClose');
        const policyModalTitle = document.getElementById('policyModalTitle');

        // Event listener cho tất cả link "Xem chi tiết"
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('view-details')) {
                e.preventDefault();
                const roomType = e.target.dataset.roomType;
                openPolicyModal(roomType);
            }
        });

        // Mở modal chính sách
        function openPolicyModal(roomType) {
            // TODO: Lấy tên phòng từ API thay vì dữ liệu giả
            // const roomInfo = await window.RoomAPI.layLoaiPhong(roomType);

            // Cập nhật tiêu đề từ dữ liệu có sẵn hoặc mặc định
            if (policyModalTitle) {
                policyModalTitle.textContent = policyModalTitle.textContent || 'CHI TIẾT PHÒNG';
            }

            // Hiển thị modal
            policyModal.style.display = 'flex';
            setTimeout(() => {
                policyModal.classList.add('show');
            }, 10);
        }

        // Đóng modal chính sách
        function closePolicyModal() {
            policyModal.style.opacity = '0';
            setTimeout(() => {
                policyModal.style.display = 'none';
                policyModal.style.opacity = '1';
                policyModal.classList.remove('show');
            }, 200);
        }

        // Event listeners cho đóng modal
        if (policyModalClose) {
            policyModalClose.addEventListener('click', closePolicyModal);
        }

        // Đóng modal khi click outside
        policyModal.addEventListener('click', function(e) {
            if (e.target === policyModal) {
                closePolicyModal();
            }
        });

        // Đóng modal bằng ESC key (chỉ khi policy modal đang mở)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && policyModal.classList.contains('show')) {
                closePolicyModal();
            }
        });
    }
});

// Expose functions globally
window.formatPrice = function(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
};

window.updateCartTotal = function() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        // Trigger cập nhật display
        const event = new Event('cartUpdated');
        document.dispatchEvent(event);
    }
};

// Hàm xử lý nút tìm kiếm
function initSearchButton() {
    const searchButton = document.querySelector('.search-button');
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleSearchInRoomsPage();
        });
    }
}

// Hàm xử lý thay đổi date picker - KHÔNG CẦN DÙNG NỮA vì Litepicker tự động cập nhật input
function initDatePickerListener() {
    // Để trống - không cần event listener phức tạp
    // Litepicker sẽ tự động cập nhật input value khi user chọn ngày
    console.log('Date picker listener function called (not needed anymore)');
}

// Hàm xử lý search khi ở trang rooms
function handleSearchInRoomsPage() {
    console.log('=== HANDLE SEARCH IN ROOMS PAGE ===');
    
    // Cập nhật localStorage từ widget
    updateSearchDataFromWidget();
    
    // Log để kiểm tra
    const updatedData = JSON.parse(localStorage.getItem('hotelSearch'));
    console.log('Dữ liệu sau khi update:', updatedData);

    // Gọi lại loadSearchData để cập nhật header/sidebar (KHÔNG cập nhật date picker)
    loadSearchData(false);

    // Lấy dữ liệu search và gọi API
    const searchData = JSON.parse(localStorage.getItem('hotelSearch'));
    if (searchData && searchData.dateRange) {
        const dateRange = searchData.dateRange;
        console.log('Đang search với dateRange:', dateRange);
        
        if (dateRange.includes(' - ')) {
            const [checkIn, checkOut] = dateRange.split(' - ');
            const guestCount = searchData.guestCount || null;
            const roomCount = searchData.roomCount || null;

            console.log('Gọi API search với:', { checkIn, checkOut, guestCount, roomCount });
            
            // Gọi hàm searchRooms từ api/room.js (cần expose globally)
            if (typeof window.searchRooms === 'function') {
                window.searchRooms(checkIn, checkOut, guestCount, roomCount);
            } else {
                console.error('window.searchRooms function not found!');
            }
        }
    } else {
        console.error('Không có dữ liệu search trong localStorage!');
    }
}

// Hàm cập nhật localStorage từ widget
function updateSearchDataFromWidget() {
    const datePickerEl = document.getElementById('date-range-picker');
    const roomDisplayEl = document.getElementById('room-display');
    const guestDisplayEl = document.getElementById('guest-display');

    let dateRange = datePickerEl ? datePickerEl.value : '';
    console.log('updateSearchDataFromWidget - dateRange:', dateRange);
    const roomCount = roomDisplayEl ? roomDisplayEl.textContent : '1 phòng';
    const guestCount = guestDisplayEl ? guestDisplayEl.textContent : '2 người';

    // Nếu không có ngày được chọn, sử dụng ngày mặc định
    if (!dateRange || dateRange.trim() === '') {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        dateRange = `${formatDate(today)} - ${formatDate(tomorrow)}`;
    }

    // Tính toán số đêm
    let nights = 1;
    let formattedDates = dateRange;
    if (dateRange.includes(' - ')) {
        const dates = dateRange.split(' - ');
        if (dates.length === 2) {
            const startDate = new Date(dates[0].split('/').reverse().join('-'));
            const endDate = new Date(dates[1].split('/').reverse().join('-'));
            const timeDiff = endDate.getTime() - startDate.getTime();
            nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
            formattedDates = `${dates[0]} - ${dates[1]}`;
        }
    }

    // Lưu dữ liệu search vào localStorage
    const searchData = {
        dateRange: formattedDates,
        roomCount: roomCount,
        guestCount: guestCount,
        nights: nights,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('hotelSearch', JSON.stringify(searchData));
    console.log('Search data saved to localStorage:', searchData);
}

// Expose hàm loadSearchData globally để có thể gọi từ bên ngoài
window.loadSearchData = loadSearchData;

// Biến lưu index phòng hiện tại đang chọn dịch vụ
let currentRoomIndex = null;

// Hàm mở modal dịch vụ cho phòng cụ thể
window.openServicesForRoom = function(roomIndex) {
    currentRoomIndex = roomIndex;
    const room = cart[roomIndex];
    
    if (!room) {
        console.error('Không tìm thấy phòng với index:', roomIndex);
        return;
    }
    
    console.log('Mở dịch vụ cho phòng:', room.title, 'Index:', roomIndex);
    
    // Mở modal trước
    const policyModal = document.getElementById('policyModal');
    if (policyModal) {
        policyModal.style.display = 'flex';
        setTimeout(() => {
            policyModal.classList.add('show');
            
            // Đợi modal hiển thị xong mới load dịch vụ
            setTimeout(() => {
                restoreServicesForRoom(roomIndex);
            }, 100);
        }, 10);
    }
};

// Hàm restore dịch vụ cho phòng cụ thể
function restoreServicesForRoom(roomIndex) {
    const room = cart[roomIndex];
    if (!room) return;
    
    // Reset tất cả checkbox trước
    const allCheckboxes = document.querySelectorAll('#services-list input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        const serviceItem = checkbox.closest('.service-item-checkbox');
        if (serviceItem) {
            serviceItem.classList.remove('selected');
            const quantityDiv = serviceItem.querySelector('.service-quantity');
            if (quantityDiv) {
                quantityDiv.style.display = 'none';
            }
        }
    });
    
    // Load dịch vụ đã chọn của phòng này
    if (room.services && room.services.length > 0) {
        room.services.forEach(service => {
            const checkbox = document.querySelector(`#service-${service.madv}`);
            if (checkbox) {
                checkbox.checked = true;
                const serviceItem = checkbox.closest('.service-item-checkbox');
                if (serviceItem) {
                    serviceItem.classList.add('selected');
                    
                    const quantityDiv = serviceItem.querySelector('.service-quantity');
                    if (quantityDiv) {
                        quantityDiv.style.display = 'flex';
                    }
                    
                    const qtyInput = document.getElementById(`qty-${service.madv}`);
                    if (qtyInput) {
                        qtyInput.value = service.soluong;
                    }
                }
            }
        });
    }
}

// Hàm lưu dịch vụ cho phòng hiện tại
window.saveServicesForCurrentRoom = function() {
    console.log('saveServicesForCurrentRoom called, currentRoomIndex:', currentRoomIndex);
    
    if (currentRoomIndex === null || currentRoomIndex === undefined) {
        alert('Lỗi: Không có phòng nào đang được chọn');
        console.error('Không có phòng nào đang được chọn');
        return;
    }
    
    if (!cart || cart.length === 0) {
        alert('Lỗi: Giỏ hàng trống');
        console.error('Giỏ hàng trống');
        return;
    }
    
    const room = cart[currentRoomIndex];
    if (!room) {
        alert('Lỗi: Không tìm thấy phòng với index: ' + currentRoomIndex);
        console.error('Không tìm thấy phòng với index:', currentRoomIndex, 'Cart:', cart);
        return;
    }
    
    // console.log('Đang lưu dịch vụ cho phòng:', room.title);
    
    // Lấy dịch vụ đã chọn
    const selectedServices = [];
    const checkboxes = document.querySelectorAll('#services-list input[type="checkbox"]:checked');
    
    // console.log('Số checkbox được chọn:', checkboxes.length);
    
    checkboxes.forEach(checkbox => {
        const serviceId = checkbox.dataset.serviceId;
        const serviceName = checkbox.dataset.serviceName;
        const servicePrice = checkbox.dataset.servicePrice;
        const qtyInput = document.getElementById(`qty-${serviceId}`);
        const quantity = qtyInput ? parseInt(qtyInput.value) : 1;
        
        console.log('Dịch vụ:', serviceName, 'Số lượng:', quantity);
        
        selectedServices.push({
            madv: serviceId,
            tendv: serviceName,
            dongia: parseFloat(servicePrice) || 0,
            soluong: quantity
        });
    });
    
    // console.log('Tổng dịch vụ đã chọn:', selectedServices);
    
    // Lưu vào phòng
    room.services = selectedServices;
    
    // Lưu cart vào localStorage
    try {
        localStorage.setItem('cartItems', JSON.stringify(cart));
        // console.log('Đã lưu cart vào localStorage:', cart);
    } catch (error) {
        // console.error('Lỗi khi lưu cart:', error);
        alert('Lỗi khi lưu: ' + error.message);
        return;
    }
    
    // Cập nhật hiển thị
    updateCartDisplay();
    
    // console.log('Đã lưu dịch vụ cho phòng:', room.title, selectedServices);
    // alert('Đã lưu dịch vụ thành công!');
    
    // Đóng modal
    const policyModal = document.getElementById('policyModal');
    if (policyModal) {
        policyModal.style.opacity = '0';
        setTimeout(() => {
            policyModal.style.display = 'none';
            policyModal.style.opacity = '1';
            policyModal.classList.remove('show');
        }, 200);
    }
    
    currentRoomIndex = null;
};