// file: script.js
document.addEventListener("DOMContentLoaded", function() {

    // --- Phần tải Header và Footer ---
    const loadComponent = (url, placeholderId, callback) => {
        console.log(`Attempting to load ${url} into ${placeholderId}`);

        fetch(url)
            .then(response => {
                console.log(`Fetch response for ${url}:`, response.ok, response.status);
                return response.ok ? response.text() : Promise.reject(`Error loading ${url}: ${response.status}`);
            })
            .then(data => {
                console.log(`Got data for ${url}, length:`, data.length);
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    console.log(`Placeholder found for ${placeholderId}, inserting content`);
                    placeholder.innerHTML = data;
                    if (typeof callback === 'function') callback(); // Gọi callback sau khi load
                } else {
                    console.error(`Placeholder not found: ${placeholderId}`);
                }
            })
            .catch(error => {
                console.error(`Error loading component ${url}:`, error);
                // Fallback: try without extension
                if (url.includes('.html')) {
                    console.log(`Trying to load ${url} with different path...`);
                }
            });
    };


    // ===== BẮT ĐẦU CODE MỚI CHO WIDGET VỚI CUSTOM DROPDOWN =====
    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0); // reset về 00:00:00

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Nếu hiện tại >= 14h thì khóa hôm nay, ngược lại cho chọn hôm nay
    const minDate = now.getHours() >= 14 ? tomorrow : today;


    // 1. Kích hoạt Lịch chọn ngày
    const datePickerElement = document.getElementById('date-range-picker');
    if (datePickerElement) {
        // Tạo ngày mặc định: hôm nay và ngày mai
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const picker = new Litepicker({
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

        // Set giá trị mặc định hiển thị
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };
        datePickerElement.value = `${formatDate(today)} - ${formatDate(tomorrow)}`;
    }


    // 2. Hàm xử lý cho Dropdown tùy chỉnh
    const setupCustomDropdown = (triggerId, menuId, displayId) => {
        const trigger = document.getElementById(triggerId);
        const menu = document.getElementById(menuId);
        const display = document.getElementById(displayId);

        if (!trigger || !menu || !display) return;

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            // Đóng các menu khác
            document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
                if (m.id !== menuId) m.classList.add('hidden');
            });
            document.querySelectorAll('.dropdown-trigger').forEach(t => {
                if (t.id !== triggerId) t.classList.remove('active');
            });

            menu.classList.toggle('hidden');
            trigger.classList.toggle('active');
        });

        menu.addEventListener('click', (event) => {
            if (event.target.classList.contains('dropdown-item')) {
                display.textContent = event.target.textContent;
                menu.classList.add('hidden');
                trigger.classList.remove('active');
            }
        });
    };

    // Khởi tạo cho Số phòng và Số người
    setupCustomDropdown('room-trigger', 'room-menu', 'room-display');
    setupCustomDropdown('guest-trigger', 'guest-menu', 'guest-display');

    // Đóng tất cả menu khi click ra ngoài
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.add('hidden'));
        document.querySelectorAll('.dropdown-trigger').forEach(t => t.classList.remove('active'));
    });

    const backToTopButton = document.getElementById('backToTopBtn');

    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            // Nếu người dùng cuộn xuống quá 300px
            if (window.scrollY > 300) {
                // Thêm lớp 'show' để hiện nút ra
                backToTopButton.classList.add('show');
            } else {
                // Ngược lại, xóa lớp 'show' để ẩn nút đi
                backToTopButton.classList.remove('show');
            }
        });
    }

    // Mobile Menu Toggle
    function setupMobileMenuToggle() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.getElementById('mobile-nav');

        if (mobileToggle && nav) {
            mobileToggle.addEventListener('click', function() {
                nav.classList.toggle('active');

                // Update aria-expanded
                const isExpanded = nav.classList.contains('active');
                mobileToggle.setAttribute('aria-expanded', isExpanded);
                mobileToggle.innerHTML = isExpanded ? '&#10005;' : '&#9776;';
            });

            // Close menu on link click
            const navLinks = nav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    nav.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.innerHTML = '&#9776;';
                });
            });

            // Close menu on outside click
            document.addEventListener('click', function(e) {
                if (!nav.contains(e.target) && !mobileToggle.contains(e.target)) {
                    nav.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.innerHTML = '&#9776;';
                }
            });
        }
    }


    // Hàm thiết lập sự kiện cho menu thả xuống của User
    function setupUserDropdown() {
        const dropdownToggle = document.querySelector('.dropdown-toggle');
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        const logoutBtnDropdown = document.getElementById('logout-btn-dropdown');

        if (dropdownToggle && dropdownMenu) {
            // 1. Xử lý click để bật/tắt menu thả xuống
            dropdownToggle.addEventListener('click', function(event) {
                event.stopPropagation(); // Ngăn sự kiện click lan ra body
                dropdownMenu.classList.toggle('show');
            });

            // 2. Đóng menu khi click bên ngoài
            document.addEventListener('click', function(event) {
                // Kiểm tra xem click có nằm ngoài toggle và menu không
                if (!dropdownToggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }

        // 3. Xử lý logic Đăng Xuất từ dropdown
        // (Kết nối với hàm logout đã có sẵn)
        if (logoutBtnDropdown) {
            logoutBtnDropdown.addEventListener('click', function() {
                // Đảm bảo menu đóng trước khi gọi logout
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                }
                logout();
            });
        }
    }

    console.log('Starting to load components...');

    // Kiểm tra các placeholder có tồn tại không
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    console.log('Header placeholder found:', !!headerPlaceholder);
    console.log('Footer placeholder found:', !!footerPlaceholder);

    // Test direct fetch để debug
    fetch('header.html')
        .then(response => {
            console.log('Direct header.html fetch test:', response.ok, response.status);
            return response.text();
        })
        .then(text => {
            console.log('Header content preview:', text.substring(0, 100));
        })
        .catch(err => console.error('Direct header fetch error:', err));

    loadComponent('../khachhang/header.html', 'header-placeholder', function() {
        console.log('Header loaded successfully');
        setupMobileMenuToggle();
        checkLoginStatus(); // Kiểm tra trạng thái đăng nhập sau khi load header
    });

    loadComponent('../khachhang/footer.html', 'footer-placeholder', function() {
        console.log('Footer loaded successfully');
    });

    // === QUẢN LÝ TRẠNG THÁI ĐĂNG NHẬP ===

    // Function kiểm tra và cập nhật trạng thái đăng nhập
    function checkLoginStatus() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const notLoggedInSection = document.getElementById('not-logged-in');
        const loggedInSection = document.getElementById('logged-in');
        const usernameDisplay = document.getElementById('username-display');
        const logoutBtn = document.getElementById('logout-btn');

        if (currentUser && notLoggedInSection && loggedInSection && usernameDisplay) {
            // User đã đăng nhập
            notLoggedInSection.style.display = 'none';
            loggedInSection.style.display = 'flex';
            usernameDisplay.textContent = currentUser.hoten || currentUser.Hoten || currentUser.name || currentUser.username || currentUser.email || 'Khách';

            // Thiết lập user dropdown menu
            setupUserDropdown();

            // Thêm event listener cho nút logout (nếu có)
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
        } else if (notLoggedInSection && loggedInSection) {
            // User chưa đăng nhập
            notLoggedInSection.style.display = 'flex';
            loggedInSection.style.display = 'none';
        }
    }

    // Function logout
    function logout() {
        // Xóa thông tin user khỏi localStorage
        localStorage.removeItem('currentUser');

        // Xóa tất cả thông tin đặt phòng
        localStorage.removeItem('currentBooking');
        localStorage.removeItem('hotelSearch');
        localStorage.removeItem('bookingCart');
        localStorage.removeItem('selectedServices');
        localStorage.removeItem('lastBookingResult');
        localStorage.removeItem('completeBooking');
        localStorage.removeItem('cartItems');
        localStorage.removeItem('cart');
        sessionStorage.clear(); // Nếu bạn có session lưu tạm

        // Cập nhật giao diện
        const notLoggedInSection = document.getElementById('not-logged-in');
        const loggedInSection = document.getElementById('logged-in');

        if (notLoggedInSection && loggedInSection) {
            notLoggedInSection.style.display = 'flex';
            loggedInSection.style.display = 'none';
        }

        // Hiển thị thông báo
        alert('Đã đăng xuất thành công!');

        // Redirect về trang chủ nếu cần
        if (window.location.pathname !== '../khachhang/home.html' && !window.location.pathname.endsWith('../khachhang/home.html')) {
            window.location.href = '../khachhang/home.html';
        }
    }

    // === SEARCH FUNCTIONALITY ===

    // Xử lý sự kiện click nút tìm kiếm
    function initSearchButton() {
        const searchButton = document.querySelector('.search-button');
        if (searchButton) {
            console.log('Search button found, adding event listener');
            searchButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Search button clicked');
                handleSearch();
            });
        } else {
            console.log('Search button not found');
        }
    }

    function handleSearch() {
        console.log('handleSearch function called');

        // Lấy dữ liệu từ form - sử dụng cách an toàn
        const datePickerEl = document.getElementById('date-range-picker');
        const roomDisplayEl = document.getElementById('room-display');
        const guestDisplayEl = document.getElementById('guest-display');

        let dateRange = datePickerEl ? datePickerEl.value : '';
        const roomCount = roomDisplayEl ? roomDisplayEl.textContent : '1 phòng';
        const guestCount = guestDisplayEl ? guestDisplayEl.textContent : '2 người';

        console.log('Search data:', { dateRange, roomCount, guestCount });

        // Nếu không có ngày được chọn, sử dụng ngày mặc định (hôm nay - ngày mai)
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

        // Kiểm tra xem đang ở trang nào
        const currentPage = window.location.pathname;

        if (currentPage.includes('../khachhang/rooms.html')) {
            // Nếu đang ở trang rooms, gọi hàm tìm kiếm trực tiếp
            console.log('Already on rooms page, searching directly...');
            if (typeof window.searchAvailableRooms === 'function') {
                window.searchAvailableRooms();
            } else {
                // Reload trang để trigger search
                window.location.reload();
            }
        } else {
            // Nếu ở trang khác, chuyển đến trang rooms
            window.location.href = '../khachhang/rooms.html';
        }
    }

    // Initialize search button sau khi DOM loaded
    setTimeout(function() {
        // Chỉ init search button nếu KHÔNG ở trang rooms.html
        // Vì trang rooms.html có api/room.js xử lý riêng
        const currentPage = window.location.pathname;
        if (!currentPage.includes('../khachhang/rooms.html')) {
            initSearchButton();
        } else {
            console.log('Đang ở trang rooms.html, bỏ qua initSearchButton từ script.js');
        }
    }, 100); // Delay nhỏ để đảm bảo elements đã render

    // Thêm event delegation để đảm bảo nút tìm kiếm hoạt động
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('search-button')) {
            e.preventDefault();
            console.log('Search button clicked via delegation');
            handleSearch();
        }
    });

    // === TERMS MODAL FUNCTIONALITY ===
    function initTermsModal() {
        const modal = document.getElementById('termsModal');
        const closeBtn = document.querySelector('.terms-modal-close');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        const linkMap = {
            'terms-link': 1,
            'regulations-link': 2,
            'payment-link': 3,
            'confirmation-link': 4
        };

        for (const linkId in linkMap) {
            const link = document.getElementById(linkId);
            if (link) {
                link.addEventListener('click', async function(e) {
                    e.preventDefault();
                    const maloaiblog = linkMap[linkId];

                    try {
                        const res = await fetch(`https://localhost:7076/api/Blogs/${maloaiblog}`);
                        const data = await res.json();

                        modalTitle.textContent = data.tieude;
                        modalBody.innerHTML = data.noidung;
                        modal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    } catch (err) {
                        console.error('Lỗi khi lấy nội dung Terms:', err);
                    }
                });
            }
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            });
        }

        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = 'auto';
                }
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Initialize terms modal with a small delay to ensure footer is loaded
    setTimeout(initTermsModal, 500);

    // Expose functions globally
    window.checkLoginStatus = checkLoginStatus;
    window.logout = logout;
    window.handleSearch = handleSearch;
});