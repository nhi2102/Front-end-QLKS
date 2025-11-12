
    // Export các hàm modal để các module khác có thể import
    export { openModal, closeModal };

    // --- KIỂM TRA ĐĂNG NHẬP (Giữ nguyên logic kiểm tra currentUser) ---
    const currentUserInfo = JSON.parse(localStorage.getItem('currentUser'));
    const currentPath = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1);
    const loginPageUrl = '../khachhang/login.html';
    const isAdminOrReceptionist = currentUserInfo && (currentUserInfo.role === 'admin' || currentUserInfo.role === 'receptionist');

    if (!isAdminOrReceptionist && currentPath !== 'login.html') {
        console.warn("Chưa đăng nhập đúng quyền! Chuyển hướng...");
        window.location.href = loginPageUrl;
        throw new Error("Redirecting to login...");
    } else if (isAdminOrReceptionist && currentPath === 'login.html') {
        console.log("Đã đăng nhập, chuyển hướng vào admin...");
        window.location.href = 'index.html';
        throw new Error("Redirecting to dashboard...");
    } else {
        console.log(`Trạng thái đăng nhập: ${isAdminOrReceptionist ? 'OK' : 'Chưa đăng nhập/Ở trang login'}.`);
    }

    // --- Modal Handling ---
    const openModal = (title, content) => {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.add('show');

    };

    const closeModal = () => {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal) return;
        modal.classList.remove('show');
        if (modalBody) modalBody.innerHTML = '';
    };


    // --- Sidebar Loading ---
    async function loadSidebar() {
        if (!isAdminOrReceptionist) return;
        console.log("Bắt đầu loadSidebar...");
        const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
        if (!sidebarPlaceholder) { console.error("Lỗi: Không tìm thấy #sidebar-placeholder."); return; }

        try {
            const response = await fetch('sidebar.html'); // Đã cập nhật icon trong file này
            if (!response.ok) throw new Error(`HTTP ${response.status} khi tải sidebar.html`);
            const sidebarHTML = await response.text();

            const currentPlaceholder = document.getElementById('sidebar-placeholder');
            if (currentPlaceholder) {
                currentPlaceholder.innerHTML = sidebarHTML;
                console.log("Đã chèn HTML sidebar (Bootstrap Icons).");
                // **KHÔNG CẦN GỌI LUCIDE NỮA**
                initializeSidebar(); // Gắn listener
            } else { console.error("Lỗi: #sidebar-placeholder biến mất?"); }

        } catch (error) {
            console.error('Lỗi khi tải sidebar:', error);
            const currentPlaceholder = document.getElementById('sidebar-placeholder');
            if (currentPlaceholder) currentPlaceholder.innerHTML = '<p class="sidebar-error">Lỗi tải menu.</p>';
        }
    }

    // --- Initialize Sidebar Listeners & Active Link ---
    function initializeSidebar() {
        console.log("Bắt đầu initializeSidebar...");
        const logoutBtn = document.querySelector('#sidebar-placeholder #logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // 1. MỞ MODAL
        openModal('Xác nhận đăng xuất', `
            <div style="padding:1.5rem;text-align:center;">
                <p style="margin:0 0 1rem;font-size:0.95rem;color:#4a5568;">
                    Bạn có chắc muốn đăng xuất?
                </p>
                <div style="display:flex;gap:1rem;justify-content:center;">
                    <button id="cancelBtn" class="btn btn-secondary">
                        Hủy
                    </button>
                    <button id="confirmBtn" class="btn btn-danger">
                        Đăng xuất
                    </button>
                </div>
            </div>
        `);

        // 2. GẮN SỰ KIỆN SAU KHI DOM ĐÃ CÓ NÚT
        setTimeout(() => {
            // NÚT HỦY → TẮT MODAL
            document.getElementById('cancelBtn')?.addEventListener('click', () => {
                closeModal();
            });

            // NÚT ĐĂNG XUẤT → XÓA + CHUYỂN TRANG
            document.getElementById('confirmBtn')?.addEventListener('click', () => {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('currentUserInfo');
                window.location.href = '../khachhang/login.html';
            });

            // BONUS: ENTER = HỦY
            document.getElementById('cancelBtn')?.focus();
        }, 50);
    });

    console.log("Đăng xuất đã fix – HỦY CHẠY 100%");
} else { console.warn("Không tìm thấy #logout-btn."); }

        const currentFileName = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1) || 'index.html';
        const sidebarLinks = document.querySelectorAll('#sidebar-placeholder .sidebar-link');
        console.log(`(InitSidebar) Trang: ${currentFileName}. Links: ${sidebarLinks.length}.`);

        sidebarLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref && linkHref !== '#') {
                const linkFileName = linkHref.substring(linkHref.lastIndexOf('/') + 1);
                link.classList.remove('active');
                if (linkFileName === currentFileName) {
                    link.classList.add('active');
                    console.log(`(InitSidebar) Active: ${linkFileName}`);
                }
            }
        });
    }


    // --- Main Listeners ---
    document.addEventListener('DOMContentLoaded', function () {
        console.log("Sự kiện DOMContentLoaded.");

        // Tải sidebar nếu cần
        if (isAdminOrReceptionist && currentPath !== 'login.html') {
            loadSidebar();
        } else { console.log("Không tải sidebar."); }

        // Gắn listener cho Modal (chỉ khi không phải trang login)
        if (currentPath !== 'login.html') {
            const modal = document.getElementById('modal');
            const modalCloseBtn = document.getElementById('modal-close-btn');
            // Icon X trong modal đã được đổi thành Bootstrap trong HTML
            if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
            if (modal) {
                modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
                modal.addEventListener('click', (event) => { if (event.target?.id === 'cancel-btn') closeModal(); });
            }
        }

        // **KHÔNG CẦN GỌI LUCIDE LẦN CUỐI NỮA**
    });

