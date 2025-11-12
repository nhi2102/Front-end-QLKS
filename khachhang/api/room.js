//Hiển thị tiêu đề tìm kiếm và kết quả phòng trống

// Định nghĩa API_BASE ở global scope
const API_BASE = "https://localhost:7076/api";

document.addEventListener("DOMContentLoaded", function() {


    // Hiển thị cảnh báo kết nối chậm
    function showNetworkWarning() {
        // Tạo toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            font-size: 14px;
            line-height: 1.4;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: center;">
                <span style="margin-right: 10px;">⚠️</span>
                <div>
                    <strong>Kết nối chậm</strong><br>
                    Đang hiển thị dữ liệu mẫu. Vui lòng thử lại sau.
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 18px; margin-left: 10px; cursor: pointer;">×</button>
            </div>
        `;

        document.body.appendChild(toast);

        // Tự động ẩn sau 5 giây
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Render dịch vụ fallback
    function renderFallbackServices(services, container) {
        const servicesHTML = services.map(service => {
            const price = service.giatien || service.dongia || service.gia || 0;

            return `
            <div class="service-item-checkbox" data-service-id="${service.madv}">
                <div class="service-checkbox-wrapper">
                    <input type="checkbox" 
                           id="service-${service.madv}" 
                           class="service-checkbox" 
                           data-service-id="${service.madv}"
                           data-service-name="${service.tendichvu}"
                           data-service-price="${price}">
                    <label for="service-${service.madv}" class="service-label">
                        <div class="service-info">
                            <h4 class="service-name">${service.tendichvu}</h4>
                            <p class="service-description">${service.mota || 'Dịch vụ chất lượng cao'}</p>
                            <span class="service-price">${formatCurrency(price)}/lần</span>
                        </div>
                        <div class="service-quantity" style="display: none;">
                            <button type="button" class="qty-btn minus" data-service-id="${service.madv}">-</button>
                            <input type="number" 
                                   id="qty-${service.madv}" 
                                   class="qty-input" 
                                   value="1" 
                                   min="1" 
                                   max="10"
                                   data-service-id="${service.madv}">
                            <button type="button" class="qty-btn plus" data-service-id="${service.madv}">+</button>
                        </div>
                    </label>
                </div>
            </div>
            `;
        }).join('');

        // Thêm HTML vào container (sau warning nếu có)
        const existingWarning = container.querySelector('div[style*="background: #fff3cd"]');
        if (existingWarning) {
            existingWarning.insertAdjacentHTML('afterend', servicesHTML);
        } else {
            container.innerHTML += servicesHTML;
        }

        // Thêm event listeners cho fallback services
        addServiceEventListeners(container);
    }

    // Thêm event listeners cho service controls
    function addServiceEventListeners(container) {
        // Checkbox events
        const checkboxes = container.querySelectorAll('.service-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleServiceChange);
        });

        // Quantity control events
        const plusBtns = container.querySelectorAll('.qty-btn.plus');
        const minusBtns = container.querySelectorAll('.qty-btn.minus');
        const qtyInputs = container.querySelectorAll('.qty-input');

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
            input.addEventListener('input', (e) => {
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
    }

    // Khởi tạo tiêu đề mặc định
    const searchTitle = document.getElementById("search-title");
    if (searchTitle && !searchTitle.textContent) {
        searchTitle.textContent = "Tất cả các phòng";
    }

    // Hàm lấy thông tin hình ảnh cho loại phòng
    async function getRoomTypeImages(mahinhphong) {
        try {
            const hinhAnhRes = await fetch(`${API_BASE}/Hinhanhphongs/${mahinhphong}`);
            const hinhAnhData = hinhAnhRes.ok ? await hinhAnhRes.json() : null;

            // Chuyển đổi object hình ảnh thành mảng
            let hinhAnh = [];
            if (hinhAnhData) {
                if (hinhAnhData.hinhchinh) hinhAnh.push({ duongdan: `../../assets/img/${hinhAnhData.hinhchinh}` });
                if (hinhAnhData.hinhphu1) hinhAnh.push({ duongdan: `../../assets/img/${hinhAnhData.hinhphu1}` });
                if (hinhAnhData.hinhphu2) hinhAnh.push({ duongdan: `../../assets/img/${hinhAnhData.hinhphu2}` });
                if (hinhAnhData.hinhphu3) hinhAnh.push({ duongdan: `../../assets/img/${hinhAnhData.hinhphu3}` });
                if (hinhAnhData.hinhphu4) hinhAnh.push({ duongdan: `../../assets/img/${hinhAnhData.hinhphu4}` });
                if (hinhAnhData.hinhphu5) hinhAnh.push({ duongdan: `../../assets/img/${hinhAnhData.hinhphu5}` });
            }

            return hinhAnh;
        } catch (error) {
            // Return default image if error
            return [{ duongdan: '../assets/img/room-default.jpg' }];
        }
    }

    // Hàm render danh sách loại phòng với số lượng trống
    // function renderRoomTypes(roomTypes) {
    //     const roomsContainer = document.querySelector(".rooms-list");
    //     if (!roomsContainer) {
    //         return;
    //     }

    //     // Xóa danh sách cũ
    //     roomsContainer.innerHTML = "";

    //     if (!roomTypes || roomTypes.length === 0) {
    //         roomsContainer.innerHTML = '<p class="no-rooms" style="text-align: center; padding: 40px; font-size: 18px;">Không có phòng nào</p>';
    //         window.roomsData = [];
    //         return;
    //     }

    //     // Lưu dữ liệu vào biến global
    //     window.roomsData = roomTypes;

    //     // Render từng loại phòng
    //     roomTypes.forEach(roomType => {
    //         // Lấy danh sách hình ảnh (sử dụng hình mặc định nếu không có)
    //         const images = roomType.hinhAnh && roomType.hinhAnh.length > 0 ?
    //             roomType.hinhAnh : [{ duongdan: '../../assets/img/room-default.jpg' }];

    //         // Tạo HTML cho gallery images
    //         const imagesHTML = images.map((img, index) =>
    //             `<img src="${img.duongdan || img.duongDan}" alt="${roomType.tenloaiphong} - Hình ${index + 1}" class="room-image ${index === 0 ? 'active' : ''}">`
    //         ).join('');

    //         // Tạo HTML cho indicators
    //         const indicatorsHTML = images.map((_, index) =>
    //             `<span class="indicator ${index === 0 ? 'active' : ''}"></span>`
    //         ).join('');

    //         const roomItem = document.createElement("div");
    //         roomItem.className = "room-item";

    //         roomItem.innerHTML = `
    //             <div class="room-images" data-room="roomtype-${roomType.maloaiphong}">
    //                 <div class="image-gallery">
    //                     <div class="gallery-container">
    //                         ${imagesHTML}
    //                     </div>
    //                     <div class="room-nav">
    //                         <button class="nav-btn prev-btn"><i class="fas fa-chevron-left"></i></button>
    //                         <button class="nav-btn next-btn"><i class="fas fa-chevron-right"></i></button>
    //                     </div>
    //                     <div class="image-indicators">
    //                         ${indicatorsHTML}
    //                     </div>
    //                 </div>
    //             </div>
    //             <div class="room-details">
    //                 <h3 class="room-title">${roomType.tenloaiphong}</h3>
    //                 <div class="room-availability">
    //                     <div class="availability-badge">
    //                         <i class="fas fa-check-circle"></i>
    //                         <span>${roomType.soLuongPhongTrong} phòng trống</span>
    //                     </div>
    //                 </div>
    //                 <div class="room-info">
    //                     <div class="room-feature">
    //                         <i class="fas fa-bed"></i>
    //                         <span>${roomType.sogiuong || 1} giường</span>
    //                     </div>
    //                     <div class="room-feature">
    //                         <i class="fas fa-users"></i>
    //                         <span>${roomType.songuoitoida || 2} người</span>
    //                     </div>
    //                 </div>
    //                 <div class="room-description">
    //                     <p>${roomType.mota || 'Phòng với tiện nghi đầy đủ'}</p>
    //                 </div>
    //                 <div class="room-amenities">
    //                     <i class="fas fa-wifi" title="Wifi miễn phí"></i>
    //                     <i class="fas fa-tv" title="TV"></i>
    //                     <i class="fas fa-snowflake" title="Điều hòa"></i>
    //                     <i class="fas fa-ban-smoking" title="Không hút thuốc"></i>
    //                     <a href="#" class="view-amenities" data-room-type="roomtype-${roomType.maloaiphong}">Xem tất cả tiện nghi</a>
    //                     <a href="#" class="view-details" data-room-type="roomtype-${roomType.maloaiphong}">Xem chi tiết</a>
    //                 </div>
    //                 <div class="room-pricing">
    //                     <div class="price-section">
    //                         <div class="price">${(roomType.giacoban || 0).toLocaleString('vi-VN')} VNĐ <span class="price-unit">/ đêm</span></div>
    //                     </div>
    //                     <button class="choose-room-btn" 
    //                             data-room-type="roomtype-${roomType.maloaiphong}" 
    //                             data-room-type-id="${roomType.maloaiphong}" 
    //                             data-price="${roomType.giacoban || 0}"
    //                             data-available-rooms="${roomType.soLuongPhongTrong}">
    //                         Chọn Phòng (${roomType.soLuongPhongTrong} trống)
    //                     </button>
    //                 </div>
    //             </div>
    //         `;

    //         roomsContainer.appendChild(roomItem);
    //     });

    //     // Khởi tạo slider cho các phòng vừa render
    //     initializeRoomSliders();
    // }
    // Hàm render danh sách loại phòng với số lượng trống
    function renderRoomTypes(roomTypes) {
        const roomsContainer = document.querySelector(".rooms-list");
        if (!roomsContainer) {
            return;
        }

        // Xóa danh sách cũ
        roomsContainer.innerHTML = "";

        if (!roomTypes || roomTypes.length === 0) {
            roomsContainer.innerHTML = '<p class="no-rooms" style="text-align: center; padding: 40px; font-size: 18px;">Không có phòng nào</p>';
            window.roomsData = [];
            return;
        }

        // Lưu dữ liệu vào biến global
        window.roomsData = roomTypes;

        // Render từng loại phòng
        roomTypes.forEach(roomType => {
            // Lấy danh sách hình ảnh
            const images = roomType.hinhAnh && roomType.hinhAnh.length > 0 ?
                roomType.hinhAnh : [{ duongdan: '../../assets/img/room-default.jpg' }];

            // Tạo HTML cho gallery images
            const imagesHTML = images.map((img, index) =>
                `<img src="${img.duongdan || img.duongDan}" alt="${roomType.tenloaiphong} - Hình ${index + 1}" class="room-image ${index === 0 ? 'active' : ''}">`
            ).join('');

            // Tạo HTML cho indicators
            const indicatorsHTML = images.map((_, index) =>
                `<span class="indicator ${index === 0 ? 'active' : ''}"></span>`
            ).join('');

            // ==============================================================
            // === BẮT ĐẦU LOGIC SỬA ĐỔI GIÁ VÀ VOUCHER ===
            // ==============================================================

            let priceHtml = '';
            let voucherHtml = '';
            // Giá cuối cùng là giá KM nếu có, nếu không thì là giá gốc
            let finalPrice = roomType.giaKhuyenMai != null ? roomType.giaKhuyenMai : roomType.giacoban;

            if (roomType.giaKhuyenMai != null) {
                // TRƯỜNG HỢP 1: CÓ KHUYẾN MÃI
                // Hiển thị cả giá gốc (bị gạch) và giá mới
                priceHtml = `
                <div class="price-section">
                    <div class="price price-old">${(roomType.giacoban || 0).toLocaleString('vi-VN')} VNĐ</div>
                    <div class="price price-new">${(roomType.giaKhuyenMai).toLocaleString('vi-VN')} VNĐ <span class="price-unit">/ đêm</span></div>
                </div>
            `;

                // Hiển thị tag voucher (nếu có)
                if (roomType.tenVoucher) {
                    voucherHtml = `<span class="voucher-tag"><i class="fas fa-tag"></i> ${roomType.tenVoucher}</span>`;
                }

            } else {
                // TRƯỜNG HỢP 2: KHÔNG CÓ KHUYẾN MÃI
                // Chỉ hiển thị giá gốc
                priceHtml = `
                <div class="price-section">
                    <div class="price price-new">${(roomType.giacoban || 0).toLocaleString('vi-VN')} VNĐ <span class="price-unit">/ đêm</span></div>
                </div>
            `;
            }

            // ==============================================================
            // === KẾT THÚC LOGIC SỬA ĐỔI GIÁ ===
            // ==============================================================

            const roomItem = document.createElement("div");
            roomItem.className = "room-item";

            // Cập nhật innerHTML với biến HTML mới
            roomItem.innerHTML = `
            <div class="room-images" data-room="roomtype-${roomType.maloaiphong}">
                <div class="image-gallery">
                    ${voucherHtml} <div class="gallery-container">
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
                <h3 class="room-title">${roomType.tenloaiphong}</h3>
                <div class="room-availability">
                    <div class="availability-badge">
                        <i class="fas fa-check-circle"></i>
                        <span>${roomType.soLuongPhongTrong} phòng trống</span>
                    </div>
                </div>
                <div class="room-info">
                    <div class="room-feature">
                        <i class="fas fa-bed"></i>
                        <span>${roomType.sogiuong || 1} giường</span>
                    </div>
                    <div class="room-feature">
                        <i class="fas fa-users"></i>
                        <span>${roomType.songuoitoida || 2} người</span>
                    </div>
                </div>
                <div class="room-description">
                    <p>${roomType.mota || 'Phòng với tiện nghi đầy đủ'}</p>
                </div>
                <div class="room-amenities">
                    <i class="fas fa-wifi" title="Wifi miễn phí"></i>
                    <i class="fas fa-tv" title="TV"></i>
                    <i class="fas fa-snowflake" title="Điều hòa"></i>
                    <i class="fas fa-ban-smoking" title="Không hút thuốc"></i>
                    <a href="#" class="view-amenities" data-room-type="roomtype-${roomType.maloaiphong}">Xem tất cả tiện nghi</a>
                    <a href="#" class="view-details" data-room-type="roomtype-${roomType.maloaiphong}">Xem chi tiết</a>
                </div>
                <div class="room-pricing">
                    
                    ${priceHtml} <button class="choose-room-btn" 
                            data-room-type="roomtype-${roomType.maloaiphong}" 
                            data-room-type-id="${roomType.maloaiphong}" 
                            data-price="${finalPrice}" data-available-rooms="${roomType.soLuongPhongTrong}">
                        Chọn Phòng (${roomType.soLuongPhongTrong} trống)
                    </button>
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

    // Hàm tìm kiếm loại phòng trống
    async function searchRooms(checkIn, checkOut, guestCount = null, roomCount = null) {
        // Tính số đêm
        let nights = 1;
        try {
            const checkInDate = new Date(checkIn.split('/').reverse().join('-'));
            const checkOutDate = new Date(checkOut.split('/').reverse().join('-'));
            nights = Math.ceil(Math.abs(checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        } catch (error) {
            // Failed to calculate nights
        }

        // Chuyển đổi format: dd/MM/yyyy -> yyyy-MM-dd
        const formatDateForAPI = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };

        const apiUrl = `${API_BASE}/Phongs/timphongloaiphong/${formatDateForAPI(checkIn)}/${formatDateForAPI(checkOut)}`;

        try {
            // Hiển thị loading
            const title = document.getElementById("search-title");
            if (title) title.textContent = "Đang tìm kiếm...";

            // Bước 1: Gọi API tìm loại phòng trống với timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(apiUrl, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`API trả về status ${res.status}`);

            const roomTypesData = await res.json();
            const count = Array.isArray(roomTypesData) ? roomTypesData.length : 0;

            console.log('API Response:', roomTypesData); // Debug log

            // Bước 2: Tính tổng số phòng trống
            let totalRooms = 0;
            if (count > 0) {
                totalRooms = roomTypesData.reduce((sum, rt) => sum + (rt.soLuongPhongTrong || 0), 0);
            }

            // Bước 3: Cập nhật tiêu đề
            if (title) {
                if (totalRooms > 0) {
                    title.textContent = `Có ${totalRooms} phòng trống thuộc ${count} loại phòng (${nights} đêm)`;
                } else {
                    title.textContent = "Không có phòng nào phù hợp theo tìm kiếm";
                }
            }

            // Bước 4: Lấy hình ảnh cho từng loại phòng và lọc theo số người
            if (count > 0) {
                const roomTypesWithImages = await Promise.all(
                    roomTypesData.map(async roomType => {
                        // Lấy hình ảnh cho loại phòng
                        const images = await getRoomTypeImages(roomType.mahinhphong);

                        // Lấy thông tin chi tiết loại phòng từ API Loaiphongs để có đầy đủ thông tin
                        let detailedRoomType = roomType;
                        try {
                            const detailRes = await fetch(`${API_BASE}/Loaiphongs/${roomType.maloaiphong}`);
                            if (detailRes.ok) {
                                const detail = await detailRes.json();
                                detailedRoomType = {
                                    ...roomType, // Giữ lại soLuongPhongTrong từ stored procedure
                                    ...detail // Thêm thông tin chi tiết từ Loaiphongs
                                };
                            }
                        } catch (error) {
                            console.log('Không thể lấy chi tiết loại phòng:', roomType.maloaiphong);
                        }

                        return {
                            ...detailedRoomType,
                            hinhAnh: images
                        };
                    })
                );

                // Lọc theo số người nếu có
                let filteredRoomTypes = roomTypesWithImages;
                if (guestCount) {
                    const numGuests = parseInt(guestCount);
                    filteredRoomTypes = roomTypesWithImages.filter(roomType => {
                        const maxGuests = roomType.songuoitoida || 2;
                        return maxGuests >= numGuests;
                    });
                }

                // Cập nhật tiêu đề với kết quả sau khi lọc
                if (guestCount && filteredRoomTypes.length !== roomTypesWithImages.length) {
                    const filteredTotalRooms = filteredRoomTypes.reduce((sum, rt) => sum + (rt.soLuongPhongTrong || 0), 0);
                    if (title) {
                        if (filteredTotalRooms > 0) {
                            title.textContent = `Có ${filteredTotalRooms} phòng trống thuộc ${filteredRoomTypes.length} loại phòng cho ${guestCount} người (${nights} đêm)`;
                        } else {
                            title.textContent = `Không có phòng nào phù hợp cho ${guestCount} người`;
                        }
                    }
                }

                // Bước 5: Render danh sách loại phòng
                renderRoomTypes(filteredRoomTypes);
            } else {
                renderRoomTypes([]);
            }

        } catch (err) {
            console.error('API error:', err);
            const title = document.getElementById("search-title");

            // Kiểm tra nếu là lỗi timeout hoặc network
            if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
                console.warn('API timeout/network error, using fallback data');

                if (title) {
                    title.textContent = "Kết nối chậm, hiển thị dữ liệu mẫu";
                }

                // Sử dụng dữ liệu fallback
                const fallbackRoomTypes = getFallbackRoomTypes();
                renderRoomTypes(fallbackRoomTypes);

                // Hiển thị thông báo kết nối chậm
                showNetworkWarning();
            } else {
                if (title) {
                    title.textContent = "Lỗi khi tìm kiếm phòng";
                }
                renderRoomTypes([]);
            }
        }
    }

    // Expose searchRooms globally
    window.searchRooms = searchRooms;

    // Tự động tìm kiếm khi load trang nếu có dữ liệu từ home
    const searchData = JSON.parse(localStorage.getItem('hotelSearch') || '{}');
    if (searchData && searchData.dateRange) {
        const dateRange = searchData.dateRange;
        if (dateRange.includes(" - ")) {
            const [checkIn, checkOut] = dateRange.split(" - ");
            const guestCount = searchData.guestCount || null;
            const roomCount = searchData.roomCount || null;
            searchRooms(checkIn, checkOut, guestCount, roomCount);
        }
    } else {
        // Nếu không có dữ liệu tìm kiếm từ home, hiển thị thông báo mặc định
        const title = document.getElementById("search-title");
        if (title) {
            title.textContent = "Chọn ngày để tìm phòng trống";
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
    console.log('loadServices called, API_BASE:', API_BASE);

    const servicesList = document.getElementById('services-list');
    if (!servicesList) {
        console.error('Phần tử #services-list không tồn tại');
        return;
    }

    try {
        console.log('Fetching from:', `${API_BASE}/Dichvus`);
        const response = await fetch(`${API_BASE}/Dichvus`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        if (!response.ok) throw new Error(`Không thể tải danh sách dịch vụ, status: ${response.status}`);
        let services = await response.json();
        console.log('Dữ liệu từ API (chưa lọc):', services);

        // Lọc chỉ dịch vụ "Hiệu lực" với debug chi tiết
        services = services.filter(service => {
            if (!service.trangthai) { // Sử dụng "trangthai" thay vì "Trangthai"
                console.log(`Dịch vụ ${service.tendv} (madv: ${service.madv}) có trangthai null`);
                return false;
            }
            const originalTrangthai = service.trangthai; // Sử dụng "trangthai"
            const trimmedTrangthai = service.trangthai.trim(); // Sử dụng "trangthai"
            const normalizedTrangthai = trimmedTrangthai.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            console.log(`Dịch vụ ${service.tendv} (madv: ${service.madv}):`, {
                original: originalTrangthai,
                trimmed: trimmedTrangthai,
                normalized: normalizedTrangthai
            });
            return normalizedTrangthai === "HIEU LUC";
        });
        console.log('Dữ liệu sau khi lọc:', services);

        servicesList.innerHTML = '';
        if (!services || services.length === 0) {
            servicesList.innerHTML = '<p>Không có dịch vụ nào</p>';
        } else {
            const servicesHTML = services.map(service => {
                const price = service.giatien || 0;
                return `
                    <div class="service-item-checkbox">
                        <div class="service-checkbox">
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

            servicesList.innerHTML = servicesHTML;
        }
        // Thêm sự kiện cho checkbox và các nút (giữ nguyên)
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
        console.error('Lỗi khi load dịch vụ:', error);
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

    // Cập nhật tổng tiền (nếu đang ở trang rooms)
    if (typeof updateCartTotal === 'function') {
        updateCartTotal();
    }
}

// Hàm lưu dịch vụ đã chọn vào localStorage (DISABLED)
function saveSelectedServices() {
    // TẮT HOÀN TOÀN - Không lưu dịch vụ vào localStorage nữa
    return;
}

// Hàm restore dịch vụ đã chọn từ localStorage (DISABLED)
function restoreSelectedServices() {
    // TẮT HOÀN TOÀN - Không restore dịch vụ từ localStorage nữa
    return;
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
        // Error calculating services total
        return 0;
    }
}

// Export functions để sử dụng ở file khác
window.getServicesTotal = getServicesTotal;
window.loadServices = loadServices;