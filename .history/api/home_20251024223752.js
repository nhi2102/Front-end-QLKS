//API Phong trong trang Home 3 phòng nổi bật
document.addEventListener("DOMContentLoaded", async function() {
    try {
        const res = await fetch("https://localhost:7076/api/LoaiPhongs/getTop3Loaiphong");
        if (!res.ok) throw new Error("Không thể tải dữ liệu loại phòng!");
        const topRooms = await res.json();

        const container = document.getElementById("rooms-container");
        container.innerHTML = "";

        topRooms.forEach(room => {
            const card = document.createElement("div");
            card.classList.add("room-card");

            card.innerHTML = `
                <div class="room-image">
                    <img src="/assets/img/${room.hinhAnhUrl || 'no-image.jpg'}" alt="${room.tenloaiphong}">
                    <div class="room-price">Từ ${room.giacoban.toLocaleString()} VNĐ/đêm</div>
                </div>
                <div class="room-content">
                    <h3 class="room-title" data-id="${room.maloaiphong}">${room.tenloaiphong}</h3>
                    <p class="room-description">${room.mota || 'Không có mô tả'}</p>
                    <div class="room-features">
                        <span><i class="fa-solid fa-users"></i> ${room.songuoitoida} người</span>
                        <span><i class="fa-solid fa-bed"></i> ${room.sogiuong} giường</span>
                    </div>
                    <div class="room-gallery hidden"></div>
                    <a href="rooms.html" class="button-secondary">Đặt phòng ngay</a>
                </div>
            `;

            container.appendChild(card);
        });

        // 🎯 Bắt sự kiện click vào tên phòng
        container.addEventListener("click", async(e) => {
            if (e.target.classList.contains("room-title")) {
                const title = e.target;
                const roomId = title.dataset.id;
                const gallery = title.parentElement.querySelector(".room-gallery");

                // Nếu gallery đang mở thì ẩn đi
                if (!gallery.classList.contains("hidden")) {
                    gallery.classList.add("hidden");
                    gallery.innerHTML = "";
                    return;
                }

                // Gọi API lấy danh sách ảnh
                try {
                    const resImg = await fetch(`https://localhost:7076/api/Hinhanhphongs/${roomId}`);
                    if (!resImg.ok) throw new Error("Không tải được ảnh phụ!");

                    const images = await resImg.json();
                    if (images.length === 0) {
                        gallery.innerHTML = "<p style='color:gray;'>Chưa có hình ảnh bổ sung</p>";
                    } else {
                        gallery.innerHTML = images.map(img =>
                            `<img src="/assets/img/${img.duongdan}" alt="Ảnh phụ" class="sub-image">`
                        ).join("");
                    }
                    gallery.classList.remove("hidden");
                } catch (err) {
                    console.error(err);
                    gallery.innerHTML = "<p style='color:red;'>Lỗi tải ảnh!</p>";
                    gallery.classList.remove("hidden");
                }
            }
        });

    } catch (err) {
        console.error("LỖI: ", err);
        const container = document.getElementById("rooms-container");
        container.innerHTML = `<p style="color:red; text-align:center;">Không thể tải dữ liệu phòng. Vui lòng thử lại sau.</p>`;
    }
});







//API Voucher trong trang Home - Hiển thị tất cả voucher dạng carousel
document.addEventListener("DOMContentLoaded", function() {
    const imageList = [
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop"
    ];

    fetch("https://localhost:7076/api/Vouchers")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("offers-container");
            const vouchers = data; // Hiển thị tất cả voucher

            vouchers.forEach((voucher, index) => {
                const card = document.createElement("div");
                card.classList.add("offer-card");

                const imgSrc = imageList[index % imageList.length];

                card.innerHTML = `
                    <img src="${imgSrc}" alt="${voucher.tenvoucher}">
                    <div class="offer-overlay">
                        <span class="offer-tag">${voucher.tenvoucher}</span>
                        <h3>Giảm ${voucher.giamgia}%</h3>
                        <p>${voucher.mota}</p>
                        <a href="#" class="button-secondary offer-detail-btn" 
                           data-name="${voucher.tenvoucher}" 
                           data-discount="${voucher.giamgia}" 
                           data-description="${voucher.mota}"
                           data-image="${imgSrc}"
                           data-start="${voucher.ngaybatdau || 'Đang cập nhật'}"
                           data-end="${voucher.ngayketthuc || 'Đang cập nhật'}">
                           Xem chi tiết
                        </a>
                    </div>
                `;

                container.appendChild(card);
            });

            // Initialize modal after vouchers are loaded
            initOfferModal();

            // Initialize carousel navigation
            initCarouselNavigation();
        })
        .catch(error => console.error("Lỗi khi gọi API:", error));
});

// Carousel Navigation Function
function initCarouselNavigation() {
    const container = document.getElementById('offers-container');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (!container || !prevBtn || !nextBtn) return;

    const scrollAmount = 380; // width of card + gap
    let autoPlayInterval = null;
    let isPaused = false;

    // Update button states
    function updateButtonStates() {
        const scrollLeft = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;

        prevBtn.classList.toggle('disabled', scrollLeft <= 0);
        nextBtn.classList.toggle('disabled', scrollLeft >= maxScroll - 1);
    }

    // Auto scroll function
    function autoScroll() {
        const scrollLeft = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;

        // Nếu đã đến cuối, quay về đầu
        if (scrollLeft >= maxScroll - 1) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }

        setTimeout(updateButtonStates, 300);
    }

    // Start auto play
    function startAutoPlay() {
        if (!isPaused) {
            autoPlayInterval = setInterval(autoScroll, 3000); // Mỗi 3 giây (3000ms)
        }
    }

    // Stop auto play
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // Scroll to previous
    prevBtn.addEventListener('click', () => {
        stopAutoPlay();
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        setTimeout(updateButtonStates, 300);
        setTimeout(startAutoPlay, 5000); // Tiếp tục auto play sau 5 giây
    });

    // Scroll to next
    nextBtn.addEventListener('click', () => {
        stopAutoPlay();
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        setTimeout(updateButtonStates, 300);
        setTimeout(startAutoPlay, 5000); // Tiếp tục auto play sau 5 giây
    });

    // Pause on hover
    container.addEventListener('mouseenter', () => {
        isPaused = true;
        stopAutoPlay();
    });

    // Resume on mouse leave
    container.addEventListener('mouseleave', () => {
        isPaused = false;
        startAutoPlay();
    });

    // Update on scroll
    container.addEventListener('scroll', updateButtonStates);

    // Initial update
    updateButtonStates();

    // Start auto play
    startAutoPlay();
}

// Function to handle offer modal
function initOfferModal() {
    const modal = document.getElementById('offerModal');
    const closeBtn = document.querySelector('.offer-modal-close');

    // Add click event to all detail buttons
    document.querySelectorAll('.offer-detail-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();

            // Get data from button attributes
            const name = this.getAttribute('data-name');
            const discount = this.getAttribute('data-discount');
            const description = this.getAttribute('data-description');
            const image = this.getAttribute('data-image');
            const startDate = this.getAttribute('data-start');
            const endDate = this.getAttribute('data-end');

            // Update modal content
            document.getElementById('offer-modal-title').textContent = 'Chi tiết ưu đãi';
            document.getElementById('offer-modal-name').textContent = name;
            document.getElementById('offer-modal-discount').textContent = `Giảm ${discount}%`;
            document.getElementById('offer-modal-description').textContent = description;
            document.getElementById('offer-modal-img').src = image;

            // Format dates
            const formatDate = (dateStr) => {
                if (!dateStr || dateStr === 'Đang cập nhật') return 'Đang cập nhật';
                try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } catch {
                    return dateStr;
                }
            };

            document.getElementById('offer-date-range').textContent =
                `${formatDate(startDate)} - ${formatDate(endDate)}`;

            // Show modal
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        });
    }

    // Close when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Close with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
}
//API Dịch vụ trong trang Home 4 dịch vụ
document.addEventListener("DOMContentLoaded", function() {
    fetch("https://localhost:7076/api/Dichvus") // đổi đúng URL API bạn
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("services-container");

            // Lấy 4 dịch vụ đầu tiên (hoặc đổi tuỳ ý)
            const services = data.slice(0, 4);

            services.forEach(service => {
                const div = document.createElement("div");
                div.classList.add("service-item");

                // Chọn icon theo từng loại dv hoặc mặc định
                const icon = getServiceIcon(service.tendv);

                div.innerHTML = `
                    <i class="${icon}"></i>
                    <h3>${service.tendv}</h3>
                    <p>${service.mota}</p>
                `;

                container.appendChild(div);
            });
        })
        .catch(error => console.error("Lỗi gọi API dịch vụ:", error));
});

function getServiceIcon(name) {
    name = name.toLowerCase();

    if (name.includes("buffet") || name.includes("nhà hàng")) return "fa-solid fa-utensils";
    if (name.includes("massage") || name.includes("spa")) return "fa-solid fa-spa";
    if (name.includes("xe") || name.includes("đưa đón")) return "fa-solid fa-car";
    if (name.includes("gym") || name.includes("thể hình")) return "fa-solid fa-dumbbell";
    if (name.includes("tour")) return "fa-solid fa-route";
    if (name.includes("bar") || name.includes("cocktail")) return "fa-solid fa-martini-glass";
    if (name.includes("giặt")) return "fa-solid fa-shirt";

    // Icon mặc định
    return "fa-solid fa-star";
}