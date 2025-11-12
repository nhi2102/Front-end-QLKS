//Hiển thị tiêu đề tìm kiếm và kết quả phòng trống
document.addEventListener("DOMContentLoaded", function() {
    const API_BASE = "https://localhost:7076/api";

    // Khởi tạo tiêu đề mặc định
    const searchTitle = document.getElementById("search-title");
    if (searchTitle && !searchTitle.textContent) {
        searchTitle.textContent = "Tất cả các phòng";
    }

    // Hàm lấy thông tin chi tiết phòng
    async function getRoomDetails(maPhong) {
        try {
            // Bước 1: Lấy thông tin phòng
            const phongRes = await fetch(`${API_BASE}/Phongs/${maPhong}`);
            if (!phongRes.ok) throw new Error(`Không thể lấy thông tin phòng ${maPhong}`);
            const phong = await phongRes.json();

            // Bước 2: Lấy thông tin loại phòng (dựa vào maloaiphong từ phong)
            const loaiPhongRes = await fetch(`${API_BASE}/Loaiphongs/${phong.maloaiphong}`);
            const loaiPhong = loaiPhongRes.ok ? await loaiPhongRes.json() : null;

            // Bước 3: Lấy thông tin hình ảnh phòng (dựa vào mahinhphong)
            const hinhAnhRes = await fetch(`${API_BASE}/Hinhanhphongs/${phong.mahinhphong}`);
            const hinhAnhData = hinhAnhRes.ok ? await hinhAnhRes.json() : null;

            // Chuyển đổi object hình ảnh thành mảng
            let hinhAnh = [];
            if (hinhAnhData) {
                if (hinhAnhData.hinhchinh) hinhAnh.push({ duongdan: `assets/img/${hinhAnhData.hinhchinh}` });
                if (hinhAnhData.hinhphu1) hinhAnh.push({ duongdan: `assets/img/${hinhAnhData.hinhphu1}` });
                if (hinhAnhData.hinhphu2) hinhAnh.push({ duongdan: `assets/img/${hinhAnhData.hinhphu2}` });
                if (hinhAnhData.hinhphu3) hinhAnh.push({ duongdan: `assets/img/${hinhAnhData.hinhphu3}` });
                if (hinhAnhData.hinhphu4) hinhAnh.push({ duongdan: `assets/img/${hinhAnhData.hinhphu4}` });
                if (hinhAnhData.hinhphu5) hinhAnh.push({ duongdan: `assets/img/${hinhAnhData.hinhphu5}` });
            }

            return {
                ...phong,
                loaiPhong: loaiPhong,
                hinhAnh: hinhAnh
            };
        } catch (error) {
            console.error(`Lỗi khi lấy chi tiết phòng ${maPhong}:`, error);
            return null;
        }
    }

    // Hàm render danh sách phòng
    function renderRooms(rooms) {
        const roomsContainer = document.querySelector(".rooms-list");
        if (!roomsContainer) {
            console.error("Không tìm thấy .rooms-list");
            return;
        }

        // Xóa danh sách cũ
        roomsContainer.innerHTML = "";

        if (!rooms || rooms.length === 0) {
            roomsContainer.innerHTML = '<p class="no-rooms" style="text-align: center; padding: 40px; font-size: 18px;">Không có phòng nào</p>';
            // Xóa dữ liệu global
            window.roomsData = [];
            return;
        }

        // Lưu dữ liệu phòng vào biến global để modal có thể truy cập
        window.roomsData = rooms;

        // Render từng phòng
        rooms.forEach(room => {
            // Lấy danh sách hình ảnh
            const images = room.hinhAnh && room.hinhAnh.length > 0 ?
                room.hinhAnh : [{ duongDan: 'assets/img/room-default.jpg' }];

            // Tạo HTML cho gallery images
            const imagesHTML = images.map((img, index) =>
                `<img src="${img.duongdan || img.duongDan}" alt="${room.sophong} - Hình ${index + 1}" class="room-image ${index === 0 ? 'active' : ''}">`
            ).join('');

            // Tạo HTML cho indicators
            const indicatorsHTML = images.map((_, index) =>
                `<span class="indicator ${index === 0 ? 'active' : ''}"></span>`
            ).join('');

            const roomItem = document.createElement("div");
            roomItem.className = "room-item";

            roomItem.innerHTML = `
                <div class="room-images" data-room="room-${room.maphong}">
                    <div class="image-gallery">
                        <div class="gallery-container">
                            ${imagesHTML}
                        </div>
                        <div class="room-nav">
                            <button class="nav-btn prev-btn"><i class="fas fa-chevron-left"></i></button>
                            <button class="nav-btn next-btn"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="image-indicators">
                            ${indicatorsHTML}
                        </div>
                    </div>
                </div>
                <div class="room-details">
                    <h3 class="room-title">${room.loaiPhong?.tenloaiphong || 'Phòng ' + room.sophong}</h3>
                    <div class="room-info">
                        <div class="room-feature">
                            <i class="fas fa-bed"></i>
                            <span>${room.loaiPhong?.sogiuong || 1} giường</span>
                        </div>
                        <div class="room-feature">
                            <i class="fas fa-users"></i>
                            <span>${room.loaiPhong?.songuoitoida || room.succhua || 2} người</span>
                        </div>
                    </div>
                    <div class="room-amenities">
                        <i class="fas fa-wifi" title="Wifi miễn phí"></i>
                        <i class="fas fa-tv" title="TV"></i>
                        <i class="fas fa-ban-smoking" title="Không hút thuốc"></i>
                        <a href="#" class="view-amenities" data-room-type="room-${room.maphong}">Xem tất cả tiện nghi</a>
                        <a href="#" class="view-details" data-room-type="room-${room.maphong}">Xem chi tiết</a>
                    </div>
                    <div class="room-pricing">
                        <div class="price-section">
                            <div class="price">${(room.loaiPhong?.giacoban || 0).toLocaleString('vi-VN')} VNĐ <span class="price-unit">/ đêm</span></div>
                        </div>
                        <button class="choose-room-btn" data-room-type="room-${room.maphong}" data-room-id="${room.maphong}" data-price="${room.loaiPhong?.giacoban || 0}">Chọn Phòng</button>
                    </div>
                </div>
            `;

            roomsContainer.appendChild(roomItem);
        });

        // Khởi tạo slider cho các phòng vừa render
        initializeRoomSliders();
    }

    // Hàm khởi tạo slider cho hình ảnh phòng
    function initializeRoomSliders() {
        const roomImages = document.querySelectorAll('.room-images');

        roomImages.forEach(container => {
            const images = container.querySelectorAll('.room-image');
            const indicators = container.querySelectorAll('.indicator');
            const prevBtn = container.querySelector('.prev-btn');
            const nextBtn = container.querySelector('.next-btn');
            let currentIndex = 0;

            function showImage(index) {
                images.forEach(img => img.classList.remove('active'));
                indicators.forEach(ind => ind.classList.remove('active'));

                if (images[index]) images[index].classList.add('active');
                if (indicators[index]) indicators[index].classList.add('active');
                currentIndex = index;
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const newIndex = (currentIndex - 1 + images.length) % images.length;
                    showImage(newIndex);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const newIndex = (currentIndex + 1) % images.length;
                    showImage(newIndex);
                });
            }

            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    showImage(index);
                });
            });
        });
    }

    // Hàm tìm kiếm phòng
    async function searchRooms(checkIn, checkOut, guestCount = null, roomCount = null) {
        // Tính số đêm
        let nights = 1;
        try {
            const checkInDate = new Date(checkIn.split('/').reverse().join('-'));
            const checkOutDate = new Date(checkOut.split('/').reverse().join('-'));
            nights = Math.ceil(Math.abs(checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        } catch (error) {
            console.error("Lỗi khi tính số đêm:", error);
        }

        // Chuyển đổi format: dd/MM/yyyy -> yyyy-MM-dd
        const formatDateForAPI = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };

        const apiUrl = `${API_BASE}/Phongs/timphong/${formatDateForAPI(checkIn)}/${formatDateForAPI(checkOut)}`;

        try {
            // Hiển thị loading
            const title = document.getElementById("search-title");
            if (title) title.textContent = "Đang tìm kiếm...";

            // Bước 1: Gọi API tìm phòng trống
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`API trả về status ${res.status}`);

            const roomsData = await res.json();
            const count = Array.isArray(roomsData) ? roomsData.length : 0;

            // Bước 2: Cập nhật tiêu đề
            if (title) {
                title.textContent = count > 0 ?
                    `Có ${count} phòng trống (${nights} đêm)` :
                    "Không có phòng nào phù hợp theo tìm kiếm";
            }

            // Bước 3: Lấy chi tiết từng phòng (song song)
            if (count > 0) {
                const roomsWithDetails = await Promise.all(
                    roomsData.map(room => {
                        // API trả về thuộc tính viết thường
                        const roomId = room.maphong;
                        return getRoomDetails(roomId);
                    })
                );

                // Lọc bỏ các phòng lỗi (null)
                let validRooms = roomsWithDetails.filter(room => room !== null);

                // Lọc theo số người nếu có
                if (guestCount) {
                    const numGuests = parseInt(guestCount);
                    validRooms = validRooms.filter(room => {
                        const maxGuests = room.loaiPhong && room.loaiPhong.songuoitoida;
                        return maxGuests && maxGuests >= numGuests;
                    });
                }

                // Cập nhật tiêu đề với số phòng sau khi lọc
                const filteredCount = validRooms.length;
                if (title) {
                    let titleText = `Có ${filteredCount} phòng trống (${nights} đêm)`;
                    if (guestCount) {
                        titleText += ` cho ${guestCount}`;
                    }
                    title.textContent = filteredCount > 0 ? titleText : "Không có phòng nào phù hợp theo tìm kiếm";
                }

                // Bước 4: Render danh sách phòng
                renderRooms(validRooms);
            } else {
                renderRooms([]);
            }

        } catch (err) {
            console.error("Lỗi API:", err);
            const title = document.getElementById("search-title");
            if (title) {
                title.textContent = "Lỗi khi tìm kiếm phòng";
            }
            renderRooms([]);
        }
    }

    // Expose searchRooms globally
    window.searchRooms = searchRooms;

    // Tự động tìm kiếm khi load trang nếu có dữ liệu từ home
    const searchData = JSON.parse(localStorage.getItem('hotelSearch'));
    if (searchData && searchData.dateRange) {
        const dateRange = searchData.dateRange;
        if (dateRange.includes(" - ")) {
            const [checkIn, checkOut] = dateRange.split(" - ");
            const guestCount = searchData.guestCount || null;
            const roomCount = searchData.roomCount || null;
            searchRooms(checkIn, checkOut, guestCount, roomCount);
        }
    }

    // Xử lý nút tìm kiếm
    const btnSearch = document.getElementById("btn-search");
    if (!btnSearch) return;

    btnSearch.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();

        const dateRangePicker = document.getElementById("date-range-picker");
        const dateRange = dateRangePicker ? dateRangePicker.value.trim() : "";

        if (!dateRange.includes(" - ")) {
            alert("Vui lòng chọn ngày nhận - trả phòng!");
            return;
        }

        const [checkIn, checkOut] = dateRange.split(" - ");

        // Lấy số người và số phòng từ widget
        const guestDisplayEl = document.getElementById('guest-display');
        const roomDisplayEl = document.getElementById('room-display');
        const guestCount = guestDisplayEl ? guestDisplayEl.textContent.trim() : null;
        const roomCount = roomDisplayEl ? roomDisplayEl.textContent.trim() : null;

        searchRooms(checkIn, checkOut, guestCount, roomCount);
    });

    // Load dịch vụ khi trang load
    loadServices();
});

// Hàm format tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hàm load dịch vụ từ API
async function loadServices() {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;

    try {
        const response = await fetch('https://localhost:7076/api/Dichvus');
        if (!response.ok) throw new Error('Không thể tải dịch vụ');

        const services = await response.json();

        // Debug: Kiểm tra dữ liệu trả về
        console.log('Services data:', services);
        if (services && services.length > 0) {
            console.log('First service:', services[0]);
            console.log('All keys of first service:', Object.keys(services[0]));
        }

        if (!services || services.length === 0) {
            servicesList.innerHTML = '<p class="no-services">Không có dịch vụ nào</p>';
            return;
        }

        // Render danh sách dịch vụ
        servicesList.innerHTML = services.map(service => {
            const price = service.giatien || service.dongia || service.gia || 0;

            return `
            <div class="service-item-checkbox" data-service-id="${service.madv}">
                <div class="service-checkbox-wrapper">
                    <input type="checkbox" 
                           id="service-${service.madv}" 
                           data-service-id="${service.madv}"
                           data-service-price="${price}"
                           data-service-name="${service.tendv}">
                    <label for="service-${service.madv}" class="service-info">
                        <div class="service-name">${service.tendv}</div>
                        <div class="service-description">${service.mota || 'Dịch vụ chất lượng cao'}</div>
                    </label>
                </div>
                <div class="service-price-wrapper">
                    <div class="service-price">${formatCurrency(price)}</div>
                    <div class="service-quantity" style="display: none;">
                        <button class="qty-btn minus" data-service-id="${service.madv}">-</button>
                        <input type="number" 
                               class="qty-input" 
                               id="qty-${service.madv}"
                               value="1" 
                               min="1" 
                               max="10"
                               data-service-id="${service.madv}">
                        <button class="qty-btn plus" data-service-id="${service.madv}">+</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        // Thêm sự kiện cho checkbox
        const checkboxes = servicesList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleServiceChange);
        });

        // Thêm sự kiện cho nút + và -
        const plusBtns = servicesList.querySelectorAll('.qty-btn.plus');
        const minusBtns = servicesList.querySelectorAll('.qty-btn.minus');
        const qtyInputs = servicesList.querySelectorAll('.qty-input');

        plusBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const serviceId = btn.dataset.serviceId;
                const input = document.getElementById(`qty-${serviceId}`);
                const max = parseInt(input.max);
                const current = parseInt(input.value);
                if (current < max) {
                    input.value = current + 1;
                    saveSelectedServices();
                    if (typeof window.updateCartTotal === 'function') {
                        window.updateCartTotal();
                    }
                }
            });
        });

        minusBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const serviceId = btn.dataset.serviceId;
                const input = document.getElementById(`qty-${serviceId}`);
                const min = parseInt(input.min);
                const current = parseInt(input.value);
                if (current > min) {
                    input.value = current - 1;
                    saveSelectedServices();
                    if (typeof window.updateCartTotal === 'function') {
                        window.updateCartTotal();
                    }
                }
            });
        });

        qtyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                let value = parseInt(e.target.value);
                const min = parseInt(e.target.min);
                const max = parseInt(e.target.max);

                if (isNaN(value) || value < min) value = min;
                if (value > max) value = max;

                e.target.value = value;
                saveSelectedServices();
                if (typeof window.updateCartTotal === 'function') {
                    window.updateCartTotal();
                }
            });
        });

        // Restore từ localStorage nếu có
        restoreSelectedServices();

    } catch (error) {
        console.error('Lỗi khi tải dịch vụ:', error);
        servicesList.innerHTML = '<p class="no-services">Không thể tải dịch vụ. Vui lòng thử lại sau.</p>';
    }
}

// Hàm xử lý khi chọn/bỏ chọn dịch vụ
function handleServiceChange(e) {
    const checkbox = e.target;
    const serviceItem = checkbox.closest('.service-item-checkbox');
    const serviceId = checkbox.dataset.serviceId;
    const quantityDiv = serviceItem.querySelector('.service-quantity');

    // Toggle class selected và hiển thị/ẩn số lượng
    if (checkbox.checked) {
        serviceItem.classList.add('selected');
        if (quantityDiv) {
            quantityDiv.style.display = 'flex';
        }
    } else {
        serviceItem.classList.remove('selected');
        if (quantityDiv) {
            quantityDiv.style.display = 'none';
        }
    }

    // KHÔNG lưu vào localStorage nữa vì mỗi phòng có dịch vụ riêng
    // saveSelectedServices();

    // Cập nhật tổng tiền (nếu đang ở trang rooms)
    if (typeof updateCartTotal === 'function') {
        updateCartTotal();
    }
}

// Hàm lưu dịch vụ đã chọn vào localStorage (DEPRECATED - không dùng nữa)
function saveSelectedServices() {
    // KHÔNG dùng nữa - mỗi phòng có dịch vụ riêng trong cart
    console.log('saveSelectedServices is deprecated');
}

// Hàm restore dịch vụ đã chọn từ localStorage
function restoreSelectedServices() {
    const savedServices = localStorage.getItem('selectedServices');
    if (!savedServices) return;

    try {
        const services = JSON.parse(savedServices);
        services.forEach(service => {
            const checkbox = document.querySelector(`#service-${service.madv}`);
            if (checkbox) {
                checkbox.checked = true;
                const serviceItem = checkbox.closest('.service-item-checkbox');
                serviceItem.classList.add('selected');

                // Hiển thị và set số lượng
                const quantityDiv = serviceItem.querySelector('.service-quantity');
                if (quantityDiv) {
                    quantityDiv.style.display = 'flex';
                }

                const qtyInput = document.getElementById(`qty-${service.madv}`);
                if (qtyInput && service.soluong) {
                    qtyInput.value = service.soluong;
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi restore dịch vụ:', error);
    }
}

// Hàm lấy tổng tiền dịch vụ
function getServicesTotal() {
    const savedServices = localStorage.getItem('selectedServices');
    if (!savedServices) return 0;

    try {
        const services = JSON.parse(savedServices);
        return services.reduce((total, service) => {
            const quantity = service.soluong || 1;
            const price = service.dongia || 0;
            return total + (price * quantity);
        }, 0);
    } catch (error) {
        console.error('Lỗi khi tính tổng dịch vụ:', error);
        return 0;
    }
}

// Export functions để sử dụng ở file khác
window.getServicesTotal = getServicesTotal;
window.loadServices = loadServices;

//Hiển thị danh sách phòng trống và chi tiết phòng đó