import { openModal, closeModal } from './main.js';
import * as api from '../api/rooms.api.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Biến toàn cục ---
    let currentTabData = { roomType: [], room: [], hotelService: [], voucher: [], serviceTypes: [] };
    let currentItemBeingEdited = null;
    let currentTab = 'roomType';
    let roomTypeMap = new Map();

    // --- Lấy Element ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const modal = document.getElementById('modal');
    const addRoomTypeBtn = document.getElementById('add-room-type-btn');
    const roomTypeTableBody = document.getElementById('room-types-table-body');
    const searchRoomTypeInput = document.getElementById('search-room-type-input');
    const roomTypeLoadingRow = document.getElementById('room-type-loading-row');
    const addRoomBtn = document.getElementById('add-room-btn');
    const roomTableBody = document.getElementById('rooms-table-body');
    const searchRoomInput = document.getElementById('search-room-input');
    const roomLoadingRow = document.getElementById('room-loading-row');
    const addHotelServiceBtn = document.getElementById('add-hotel-service-btn');
    const hotelServiceTableBody = document.getElementById('hotel-services-table-body');
    const searchHotelServiceInput = document.getElementById('search-hotel-service-input');
    const hotelServiceLoadingRow = document.getElementById('hotel-service-loading-row');
    const addVoucherBtn = document.getElementById('add-voucher-btn');
    const voucherTableBody = document.getElementById('voucher-table-body');
    const searchVoucherInput = document.getElementById('search-voucher-input');
    const voucherLoadingRow = document.getElementById('voucher-loading-row');


             const userInfo = JSON.parse(localStorage.getItem('currentUserInfo')) || JSON.parse(localStorage.getItem('currentUser'));
             const userNameDisplay = document.getElementById('user-display-name');
              const userAvatar = document.getElementById('user-avatar');
             if (userInfo && userNameDisplay) {
                 userNameDisplay.textContent = userInfo.name || userInfo.username || 'User';
             }
              if(userInfo && (userInfo.name || userInfo.username) && userAvatar){
                 const nameString = userInfo.name || userInfo.username;
                 const firstLetter = nameString.charAt(0).toUpperCase();
                 userAvatar.src = `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;
                 userAvatar.alt = `Avatar for ${nameString}`;
             }



    if (!tabButtons || tabButtons.length === 0) {
        console.warn("Rooms.js: Thiếu nút tab.");
        return;
    }

    // --- Chuyển Tab ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            if (!targetId) return;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(targetId)?.classList.add('active');

            currentTab = targetId.startsWith('hotel-') ? 'hotelService'
                : targetId === 'room-price-content' ? 'voucher'
                : targetId.replace('-content', '');
            currentItemBeingEdited = null;
            loadTabData();
        });
    });

    // --- Tải dữ liệu ---
    async function loadTabData() {
        showLoading(currentTab, true);
        try {
            switch (currentTab) {
                case 'roomType': await initializeRoomTypeTab(); break;
                case 'room': await initializeRoomTab(); break;
                case 'voucher': await initializeVoucherTab(); break;
                case 'hotelService': await initializeHotelServiceTab(); break;
            }
        } catch (error) {
            console.error(`Error loading ${currentTab}:`, error);
            renderTable(currentTab, null, false, `Lỗi: ${error.message}`);
        } finally {
            showLoading(currentTab, false);
        }
    }

    function showLoading(type, show) {
        const loadingRow = { roomType: roomTypeLoadingRow, room: roomLoadingRow, voucher: voucherLoadingRow, hotelService: hotelServiceLoadingRow }[type];
        const tableBody = { roomType: roomTypeTableBody, room: roomTableBody, voucher: voucherTableBody, hotelService: hotelServiceTableBody }[type];
        if (!loadingRow || !tableBody) return;
        loadingRow.style.display = show ? 'table-row' : 'none';
        tableBody.style.display = show ? 'none' : 'table-row-group';
    }

    // --- Khởi tạo ---
    async function initializeRoomTypeTab() {
        const data = await api.getRoomTypes();
        currentTabData.roomType = data || [];
        roomTypeMap.clear();
        currentTabData.roomType.forEach(rt => roomTypeMap.set(rt.maloaiphong, rt.tenloaiphong));
        renderTable('roomType', currentTabData.roomType, false);
    }

    async function initializeRoomTab() {
        if (roomTypeMap.size === 0) {
            const d = await api.getRoomTypes();
            roomTypeMap.clear();
            (d || []).forEach(rt => roomTypeMap.set(rt.maloaiphong, rt.tenloaiphong));
        }
        const rooms = await api.getRooms();
        (rooms || []).forEach(r => r.tenLoaiPhong = roomTypeMap.get(r.maloaiphong) || 'N/A');
        currentTabData.room = rooms || [];
        renderTable('room', currentTabData.room, false);
    }

    async function initializeHotelServiceTab() {
        const [services, serviceTypes] = await Promise.all([api.getHotelServices(), api.getServiceTypes()]);
        currentTabData.hotelService = services || [];
        currentTabData.serviceTypes = (serviceTypes || []).map(st => ({ maloaidv: st.maloaidv, tenloaidv: st.tenloai }));
        renderTable('hotelService', currentTabData.hotelService, false);
    }

    async function initializeVoucherTab() {
        showLoading('voucher', true);
        const [vouchers, roomTypes] = await Promise.all([api.getVouchers(), api.getRoomTypes()]);
        const roomTypeMap = new Map();
        roomTypes.forEach(rt => roomTypeMap.set(rt.maloaiphong, rt.tenloaiphong));
        currentTabData.voucher = (vouchers || []).map(v => ({
            ...v,
            tenLoaiPhong: roomTypeMap.get(v.maloaiphong) || 'Không xác định',
            mavoucher: v.mavoucher?.trim()
        }));
        renderTable('voucher', currentTabData.voucher, false);
    }

    // --- Gắn sự kiện ---
    addRoomTypeBtn?.addEventListener('click', () => handleAddItem('roomType'));
    roomTypeTableBody?.addEventListener('click', (e) => handleTableAction(e, 'roomType'));
    searchRoomTypeInput?.addEventListener('input', () => handleSearch('roomType'));
    addRoomBtn?.addEventListener('click', () => handleAddItem('room'));
    roomTableBody?.addEventListener('click', (e) => handleTableAction(e, 'room'));
    searchRoomInput?.addEventListener('input', () => handleSearch('room'));
    addHotelServiceBtn?.addEventListener('click', () => handleAddItem('hotelService'));
    hotelServiceTableBody?.addEventListener('click', (e) => handleTableAction(e, 'hotelService'));
    searchHotelServiceInput?.addEventListener('input', () => handleSearch('hotelService'));
    addVoucherBtn?.addEventListener('click', () => handleAddItem('voucher'));
    voucherTableBody?.addEventListener('click', (e) => handleTableAction(e, 'voucher'));
    searchVoucherInput?.addEventListener('input', () => handleSearch('voucher'));
    modal?.addEventListener('submit', handleModalSubmit);

    // --- CHỐNG TRÙNG ---
    function isRoomTypeNameExists(name, excludeId = null) {
        return currentTabData.roomType.some(rt =>
            rt.tenloaiphong?.trim().toLowerCase() === name.trim().toLowerCase() &&
            (!excludeId || rt.maloaiphong != excludeId)
        );
    }
    function isRoomNumberExists(number, excludeId = null) {
        return currentTabData.room.some(r =>
            r.sophong?.trim() === number.trim() &&
            (!excludeId || r.maphong != excludeId)
        );
    }
    function isServiceNameExists(name, excludeId = null) {
        return currentTabData.hotelService.some(s =>
            s.tendv?.trim().toLowerCase() === name.trim().toLowerCase() &&
            (!excludeId || s.madv != excludeId)
        );
    }
    function isVoucherNameExists(name, excludeId = null) {
        return currentTabData.voucher.some(v =>
            v.tenvoucher?.trim().toLowerCase() === name.trim().toLowerCase() &&
            (!excludeId || v.mavoucher !== excludeId)
        );
    }

    // --- SUBMIT (ĐÃ CẬP NHẬT KIỂM TRA CHÉO) ---
    async function handleModalSubmit(event) {
        const form = event.target.closest('form');
        if (!form) return;
        event.preventDefault();

        const formId = form.id;
        let type = '';
        if (formId === 'room-type-form') type = 'roomType';
        else if (formId === 'room-form') type = 'room';
        else if (formId === 'voucher-form') type = 'voucher';
        else if (formId === 'hotel-service-form') type = 'hotelService';
        else return;

        const idKey = type === 'roomType' ? 'maloaiphong'
            : type === 'room' ? 'maphong'
            : type === 'hotelService' ? 'madv'
            : type === 'voucher' ? 'mavoucher' : null;

        const idToUpdate = currentItemBeingEdited ? currentItemBeingEdited[idKey] : null;
        let payload = {};

        try {
            // LOẠI PHÒNG
            if (type === 'roomType') {
                const tenloai = form.roomTypeName.value.trim();
                if (!tenloai) return Swal.fire('Lỗi!', 'Nhập tên loại phòng!', 'error');
                if ((!currentItemBeingEdited && isRoomTypeNameExists(tenloai)) ||
                    (currentItemBeingEdited && isRoomTypeNameExists(tenloai, idToUpdate))) {
                    return Swal.fire('Trùng!', 'Tên loại phòng đã tồn tại!', 'warning');
                }

                payload = {
                    tenloaiphong: tenloai,
                    giacoban: parseFloat(form.roomPrice.value) || 0,
                    songuoitoida: parseInt(form.maxOccupancy.value, 10) || 1,
                    sogiuong: parseInt(form.numBeds.value, 10) || 1,
                    mota: form.roomTypeDescription.value.trim(),
                    trangthai: form.roomTypeStatus.value
                };

                currentItemBeingEdited
                    ? await api.updateRoomType(idToUpdate, payload)
                    : await api.createRoomType(payload);

            // PHÒNG
            } else if (type === 'room') {
                const sophong = form.roomNumber.value.trim();
                if (!sophong) return Swal.fire('Lỗi!', 'Nhập số phòng!', 'error');
                if ((!currentItemBeingEdited && isRoomNumberExists(sophong)) ||
                    (currentItemBeingEdited && isRoomNumberExists(sophong, idToUpdate))) {
                    return Swal.fire('Trùng!', `Phòng "${sophong}" đã tồn tại!`, 'warning');
                }

                const newStatus = form.roomStatusSelect.value;
                const maloaiphong = parseInt(form.roomTypeSelect.value, 10);
                
                // XÓA DÒNG NÀY:
                // const succhua = parseInt(form.roomCapacity.value, 10) || 1;
                
                // XÓA DÒNG NÀY:
                // const mahinhphong = parseInt(form.roomImage.value) || 1;

                // THÊM LOGIC MỚI ĐỂ LẤY SỨC CHỨA VÀ MÃ HÌNH
                // 1. Kiểm tra xem loại phòng đã được chọn chưa
                if (!maloaiphong) {
                    return Swal.fire('Lỗi!', 'Vui lòng chọn loại phòng!', 'error');
                }
                const roomType = currentTabData.roomType.find(rt => rt.maloaiphong === maloaiphong);
                if (!roomType) {
                    return Swal.fire('Lỗi!', 'Loại phòng đã chọn không hợp lệ!', 'error');
                }
                // 2. Tự động gán sức chứa từ loại phòng
                const succhua = roomType.songuoitoida;
                // 3. Tự động gán mã hình phòng = (mã loại phòng - 1) % 10 + 1
                const mahinhphong = ((maloaiphong - 1) % 10) + 1;


                // === PHẦN KIỂM TRA MỚI (KIỂM TRA CHÉO VỚI BẢNG ĐẶT PHÒNG) ===
                let finalStatus = newStatus;

                // Chỉ kiểm tra khi SỬA và trạng thái MỚI khác trạng thái CŨ
                if (currentItemBeingEdited && newStatus !== currentItemBeingEdited.trangthai) {
                    
                    // *** GỌI HÀM TỪ rooms.api.js ***
                    const occupied = await api.isRoomOccupied(idToUpdate); // idToUpdate là maphong

                    if (occupied) {
                        // Nếu phòng đang CÓ KHÁCH (Đang ở)
                        Swal.fire({
                            icon: 'error',
                            title: 'Không thể thay đổi!',
                            // ✅ BẠN HÃY SỬA DÒNG "text:" Ở NGAY DƯỚI ĐÂY
                            text: `Phòng ${sophong} hiện đang có khách. Không thể thay đổi trạng thái khi phòng đang "Đang ở".`
                        });
                        
                        currentItemBeingEdited.trangthai = 'Đang ở'; 
                        await loadTabData();
                        closeModal();
                        return; // Dừng, không cho lưu
                    }
                } else if (currentItemBeingEdited && currentItemBeingEdited.trangthai === 'Đang ở' && newStatus === 'Đang ở') {
                    // Trường hợp form bị disable (do hàm getRoomFormContent)
                    // và người dùng nhấn lưu, ta giữ nguyên trạng thái
                    finalStatus = 'Đang ở';
                }
                // === KẾT THÚC PHẦN KIỂM TRA ===

                payload = {
                    sophong,
                    maloaiphong,
                    succhua,
                    trangthai: finalStatus, // Dùng trạng thái cuối cùng
                    mahinhphong
                };

                currentItemBeingEdited
                    ? await api.updateRoom(idToUpdate, payload)
                    : await api.createRoom(payload);

            // KHUYẾN MÃI (VOUCHER)
            } else if (type === 'voucher') {
                let mavoucher = form.mavoucher?.value?.trim() || '';

                if (!currentItemBeingEdited) {
                    const vouchers = currentTabData.voucher || [];
                    const maxCode = vouchers
                        .map(v => v.mavoucher)
                        .filter(code => /^V\d+$/.test(code))
                        .map(code => parseInt(code.slice(1), 10))
                        .reduce((max, num) => Math.max(max, num), 0);
                    mavoucher = 'V' + String(maxCode + 1).padStart(3, '0');
                }

                const tenvoucher = form.tenvoucher.value.trim();
                const giagiam = parseFloat(form.giagiam.value);
                const maloaiphong = parseInt(form.maloaiphong.value, 10);
                const ngaybatdau = form.ngaybatdau.value;
                const ngayketthuc = form.ngayketthuc.value;
                const mota = form.mota.value.trim();
                
                if (!tenvoucher) return Swal.fire('Lỗi!', 'Nhập tên voucher!', 'error');
                
                if ((!currentItemBeingEdited && isVoucherNameExists(tenvoucher)) ||
                    (currentItemBeingEdited && isVoucherNameExists(tenvoucher, idToUpdate))) {
                    return Swal.fire({
                        icon: 'warning',
                        title: 'Trùng tên voucher!',
                        html: `<strong>"${tenvoucher}"</strong> đã được sử dụng!<br>
                                Vui lòng chọn tên khác.`,
                        confirmButtonText: 'OK'
                    });
                }

                if (!maloaiphong) return Swal.fire('Lỗi!', 'Chọn loại phòng!', 'error');
                if (!giagiam || giagiam <= 0) return Swal.fire('Lỗi!', 'Giá giảm phải > 0!', 'error');
                if (!ngaybatdau || !ngayketthuc) return Swal.fire('Lỗi!', 'Chọn đầy đủ ngày!', 'error');
                if (new Date(ngayketthuc) <= new Date(ngaybatdau)) {
                    return Swal.fire('Lỗi!', 'Ngày kết thúc phải sau ngày bắt đầu!', 'error');
                }

                const roomType = currentTabData.roomType.find(rt => rt.maloaiphong === maloaiphong);
                if (!roomType || giagiam >= roomType.giacoban) {
                    return Swal.fire({
                        icon: 'error',
                        title: 'Giá giảm không hợp lệ!',
                        html: `Giá giảm <strong>${giagiam.toLocaleString()} VND</strong><br>
                                phải nhỏ hơn giá phòng: <strong>${roomType?.giacoban.toLocaleString()} VND</strong>`,
                        confirmButtonText: 'Đã hiểu'
                    });
                }

                payload = {
                    mavoucher,
                    tenvoucher,
                    giagiam,
                    maloaiphong,
                    ngaybatdau,
                    ngayketthuc,
                    mota
                };

                currentItemBeingEdited
                    ? await api.updateVoucher(idToUpdate, payload)
                    : await api.createVoucher(payload);


            // DỊCH VỤ
            } else if (type === 'hotelService') {
                const tendv = form.serviceName.value.trim();
                if (!tendv) return Swal.fire('Lỗi!', 'Nhập tên dịch vụ!', 'error');
                if ((!currentItemBeingEdited && isServiceNameExists(tendv)) ||
                    (currentItemBeingEdited && isServiceNameExists(tendv, idToUpdate))) {
                    return Swal.fire('Trùng!', 'Tên dịch vụ đã tồn tại!', 'warning');
                }

                payload = {
                    tendv,
                    giatien: parseFloat(form.servicePrice.value) || 0,
                    maloaidv: parseInt(form.serviceType.value),
                    mota: form.serviceDescription.value.trim(),
                    trangthai: currentItemBeingEdited?.trangthai || 'Hiệu lực'
                };

                currentItemBeingEdited
                    ? await api.updateHotelService(idToUpdate, payload)
                    : await api.createHotelService(payload);
            }

            // THÀNH CÔNG
            closeModal();
            await loadTabData();
            Swal.fire('Thành công!', 'Đã lưu thành công!', 'success');

        } catch (error) {
            console.error('Lỗi lưu:', error);
            Swal.fire('Lỗi!', error.message || 'Không thể lưu dữ liệu!', 'error');
        }
    }

    function formatCurrency(amount) {
        if (amount == null || amount === '') return '—';
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    }

    /** Render Bảng Chung */
    function renderTable(type, data, isLoading, error = null) {
        let tableBody, loadingRow, colSpan;

        switch (type) {
            case 'roomType':
                tableBody = roomTypeTableBody;
                loadingRow = roomTypeLoadingRow;
                colSpan = 5;
                break;
            case 'room':
                tableBody = roomTableBody;
                loadingRow = roomLoadingRow;
                colSpan = 5;
                break;
            case 'voucher':
                tableBody = voucherTableBody;
                loadingRow = voucherLoadingRow;
                colSpan = 6;
                break;
            case 'hotelService':
                tableBody = hotelServiceTableBody;
                loadingRow = hotelServiceLoadingRow;
                colSpan = 4;
                break;
            default:
                console.error(`Invalid type: ${type}`);
                return;
        }

        if (!tableBody || !loadingRow) {
            console.error(`Render Error: Elements missing for type "${type}"`);
            return;
        }

        if (isLoading) {
            tableBody.innerHTML = '';
            loadingRow.style.display = 'table-row';
            return;
        } else {
            loadingRow.style.display = 'none';
        }

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-danger">Lỗi: ${error}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">Không có dữ liệu.</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');

            const idKey = type === 'roomType' ? 'maloaiphong'
                : type === 'room' ? 'maphong'
                : type === 'hotelService' ? 'madv'
                : type === 'voucher' ? 'mavoucher'
                : null;
            if (idKey && item[idKey]) row.dataset.id = item[idKey];

            if (type === 'roomType') {
                const isActive = item.trangthai === 'Hoạt động';
                const statusClass = isActive ? 'status-active' : 'status-inactive';
                const toggleIcon = isActive ? 'bi-lock-fill' : 'bi-unlock-fill';
                const toggleTitle = isActive ? 'Ngừng hoạt động' : 'Kích hoạt lại';
                const toggleBtnClass = isActive ? '' : 'action-btn-activate';

                row.innerHTML = `
                    <td>${item.tenloaiphong || ''}</td>
                    <td>${item.giacoban?.toLocaleString('vi-VN') || ''}</td>
                    <td>${item.songuoitoida || ''}</td>
                    <td><span class="status-badge ${statusClass}">${item.trangthai || ''}</span></td>
                    <td class="text-center">
                        <button class="action-btn" data-action="edit" title="Sửa"><i class="bi bi-pencil-fill"></i></button>
                        <button class="action-btn action-btn-toggle ${toggleBtnClass}" data-action="toggle" title="${toggleTitle}"><i class="bi ${toggleIcon}"></i></button>
                    </td>`;
            }
            else if (type === 'room') {
                // === SỬA LOGIC STATUS ĐỂ BAO GỒM "ĐANG Ở" ===
                const statusText = item.trangthai || 'N/A';
                let statusClass = '';
                if (statusText === 'Hoạt động') statusClass = 'status-available'; // Xanh lá
                else if (statusText === 'Đang ở') statusClass = 'status-staying'; // Vàng/Cam (Bạn cần thêm class CSS này)
                else if (statusText === 'Bảo trì') statusClass = 'status-cleaning'; // Xám/Đỏ
                else statusClass = 'status-inactive'; // Mặc định
                // === KẾT THÚC SỬA ===

                row.innerHTML = `
                    <td>${item.sophong || ''}</td>
                    <td>${item.tenLoaiPhong || 'N/A'}</td>
                    <td>${item.succhua || ''}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="text-center">
                        <button class="action-btn" data-action="edit" title="Sửa"><i class="bi bi-pencil-fill"></i></button>
                    </td>`;
            }
            else if (type === 'voucher') {
                row.innerHTML = `
                    <td>${item.tenvoucher}</td>
                    <td>${item.tenLoaiPhong}</td>
                    <td><span class="badge bg-primary">${formatCurrency(item.giagiam)}</span></td>
                    <td>${format2(item.ngaybatdau)}</td>
                    <td>${format2(item.ngayketthuc)}</td>
                    <td class="text-center">
                        <button class="action-btn" data-action="edit" title="Sửa"><i class="bi bi-pencil-fill"></i></button>
                        <button class="action-btn action-btn-delete" data-action="delete" title="Xóa"><i class="bi bi-trash3-fill"></i></button>
                    </td>`;
            }
            else if (type === 'hotelService') {
                const isActive = item.trangthai === 'Hiệu lực';
                const statusClass = isActive ? 'status-active' : 'status-inactive';
                const toggleIcon = isActive ? 'bi-lock-fill' : 'bi-unlock-fill';
                const toggleTitle = isActive ? 'Tạm ngừng' : 'Kích hoạt lại';
                const toggleBtnClass = isActive ? '' : 'action-btn-activate';

                row.innerHTML = `
                    <td>${item.tendv || ''}</td>
                    <td>${item.giatien?.toLocaleString('vi-VN') || ''}</td>
                    <td><span class="status-badge ${statusClass}">${item.trangthai || ''}</span></td>
                    <td class="text-center">
                        <button class="action-btn" data-action="edit" title="Sửa"><i class="bi bi-pencil-fill"></i></button>
                        <button class="action-btn action-btn-toggle ${toggleBtnClass}" data-action="toggle" title="${toggleTitle}"><i class="bi ${toggleIcon}"></i></button>
                    </td>`;
            }

            tableBody.appendChild(row);
        });
    }


    /** Xử lý Action */
    async function handleTableAction(e, type) {
        const targetButton = e.target.closest('button[data-action]');
        if (!targetButton) return;

        const action = targetButton.dataset.action;
        const row = targetButton.closest('tr');
        const id = row?.dataset.id;
        if (!id) { console.warn(`No ID found for ${type} row.`); return; }

        const idKey = type === 'roomType' ? 'maloaiphong'
            : type === 'room' ? 'maphong'
            : type === 'hotelService' ? 'madv'
            : type === 'voucher' ? 'mavoucher'
            : null;

        if (!idKey) return;

        const item = currentTabData[type]?.find(i => String(i[idKey]) === id);
        if (!item) { console.warn('Không tìm thấy dữ liệu để xử lý.'); return; }

        // === EDIT ===
        if (action === 'edit') {
            currentItemBeingEdited = item;
            let title = '', formContent = '';

            switch (type) {
                case 'roomType':
                    title = 'Sửa loại phòng';
                    formContent = getRoomTypeFormContent(item);
                    break;
                case 'room':
                    title = 'Sửa phòng';
                    formContent = getRoomFormContent(item, Array.from(roomTypeMap.entries()).map(([id, name]) => ({ maloaiphong: id, tenloaiphong: name })));
                    break;
                case 'hotelService':
                    title = 'Sửa dịch vụ KS';
                    formContent = getHotelServiceFormContent(item, currentTabData.serviceTypes);
                    break;
                case 'voucher':
                    title = 'Sửa Voucher';
                    if (currentTabData.roomType.length === 0) await initializeRoomTypeTab();
                    formContent = getVoucherFormContent(item);
                    break;
            }
            openModal(title, formContent);

            // === THÊM LOGIC GỌI TỰ ĐỘNG CẬP NHẬT SỨC CHỨA ===
            if (type === 'room') {
                document.getElementById('roomTypeSelect')?.addEventListener('change', autoUpdateRoomCapacity);
                autoUpdateRoomCapacity(); // Cập nhật giá trị ban đầu khi sửa
            }
            // === KẾT THÚC THÊM ===

        // === TOGGLE (chỉ cho roomType & hotelService) ===
        } else if (action === 'toggle' && (type === 'roomType' || type === 'hotelService')) {
            const statusCell = row.cells[type === 'roomType' ? 3 : 2];
            let newStatus, apiFunction, updatePayload;

            try {
                if (type === 'roomType') {
                    newStatus = item.trangthai === 'Hoạt động' ? 'Ngừng' : 'Hoạt động';
                    apiFunction = api.updateRoomType;
                    updatePayload = { ...item, trangthai: newStatus };

                    // Kiểm tra phòng liên quan
                    if (newStatus === 'Ngừng') {
                        // Tải lại dữ liệu phòng mới nhất
                        await initializeRoomTab(); 
                        const relatedRooms = currentTabData.room.filter(r => r.maloaiphong === item.maloaiphong && r.trangthai !== 'Bảo trì');
                        
                        if (relatedRooms.length > 0) {
                            const roomNumbers = relatedRooms.map(r => r.sophong).join(', ');
                            Swal.fire('Không thể ngừng!',`Loại phòng đang được sử dụng bởi các phòng: ${roomNumbers}.`, 'error');
                            return;
                        }
                    }
                } else if (type === 'hotelService') {
                    newStatus = item.trangthai === 'Hiệu lực' ? 'Hết hiệu lực' : 'Hiệu lực';
                    apiFunction = api.updateHotelService;
                    updatePayload = { ...item, trangthai: newStatus };
                }

                const originalRowHTML = row.innerHTML;
                const statusClass = newStatus.includes('Hoạt động') || newStatus === 'Hiệu lực' ? 'status-active' : 'status-inactive';
                const isActive = statusClass === 'status-active';

                statusCell.innerHTML = `<span class="status-badge ${statusClass}">${newStatus}</span>`;

                const toggleBtn = row.querySelector('[data-action="toggle"]');
                if (toggleBtn) {
                    const icon = isActive ? 'bi-lock-fill' : 'bi-unlock-fill';
                    const title = isActive
                        ? (type === 'roomType' ? 'Ngừng hoạt động' : 'Tạm ngừng')
                        : 'Kích hoạt lại';
                    toggleBtn.querySelector('i').className = `bi ${icon}`;
                    toggleBtn.title = title;
                    toggleBtn.classList.toggle('action-btn-activate', !isActive);
                }

                const editBtn = row.querySelector('[data-action="edit"]');
                if (editBtn) editBtn.disabled = !isActive;

                await apiFunction(id, updatePayload);
                item.trangthai = newStatus;

                if (type === 'roomType') {
                    roomTypeMap.set(item.maloaiphong, item.tenloaiphong);
                    currentTabData.room.forEach(r => {
                        if (r.maloaiphong === item.maloaiphong) r.tenLoaiPhong = item.tenloaiphong;
                    });
                }
            } catch (error) {
                console.error(`Lỗi toggle ${type}:`, error);
                row.innerHTML = originalRowHTML;
                Swal.fire('Lỗi!', error.message || 'Không thể cập nhật', 'error');
            }

        // === DELETE (chỉ cho voucher) ===
        } else if (action === 'delete' && type === 'voucher') {
            const result = await Swal.fire({
                title: 'Xác nhận xóa',
                text: `Xóa voucher "${item.tenvoucher}" (Mã: ${item.mavoucher})?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Xác nhận xóa',
                cancelButtonText: 'Hủy'
            });
            
            if (!result.isConfirmed) return;

            try {
                showLoading('voucher', true);
                await api.deleteVoucher(id);
                await loadTabData(); // Tải lại tab voucher
                Swal.fire('Đã xóa!', 'Đã xóa voucher thành công.', 'success');
            } catch (error) {
                console.error("Lỗi xóa voucher:", error);
                Swal.fire("Lỗi!", "Không thể xóa voucher: " + error.message, 'error');
            } finally {
                showLoading('voucher', false);
            }
        }
    }

    /** Mở Modal Thêm */
    async function handleAddItem(type) {
        currentItemBeingEdited = null; let title = ''; let formContent = '';
        try {
            switch (type) {
                case 'roomType':
                    title = 'Thêm loại phòng mới';
                    formContent = getRoomTypeFormContent(null);
                    break;
                case 'room':
                    title = 'Thêm phòng mới';
                    if (currentTabData.roomType.length === 0 || roomTypeMap.size === 0) {
                        await initializeRoomTypeTab();
                    }
                    formContent = getRoomFormContent(null, currentTabData.roomType);
                    break;
                case 'voucher':
                    title = 'Thêm Voucher mới';
                    if (currentTabData.roomType.length === 0) await initializeRoomTypeTab();
                    formContent = getVoucherFormContent(null);
                    break;
                case 'hotelService':
                    title = 'Thêm dịch vụ KS mới';
                    if (currentTabData.serviceTypes.length === 0) {
                        await initializeHotelServiceTab();
                    }
                    formContent = getHotelServiceFormContent(null, currentTabData.serviceTypes);
                    break;
                default: return;
            }
            openModal(title, formContent);
            // === THÊM LOGIC GỌI TỰ ĐỘNG CẬP NHẬT SỨC CHỨA ===
            if (type === 'room') {
                document.getElementById('roomTypeSelect')?.addEventListener('change', autoUpdateRoomCapacity);
            }
            // === KẾT THÚC THÊM ===
        } catch (error) { console.error(`Lỗi mở form thêm ${type}:`, error); }
    }


    /** Tìm kiếm */
    function handleSearch(type) {
        let inputElement;
        let dataList;
        if (type === 'roomType') {
            inputElement = searchRoomTypeInput;
            dataList = currentTabData.roomType;
        } else if (type === 'room') {
            inputElement = searchRoomInput;
            dataList = currentTabData.room;
        } else if (type === 'voucher') {
            inputElement = searchVoucherInput;
            dataList = currentTabData.voucher;
        } else if (type === 'hotelService') {
            inputElement = searchHotelServiceInput;
            dataList = currentTabData.hotelService;
        } else {
            return;
        }

        const searchTerm = inputElement.value.toLowerCase().trim();
        if (!searchTerm) {
            renderTable(type, dataList, false);
            return;
        }

        const filteredData = dataList.filter(item => {
            let fields = [];
            if (type === 'roomType') {
                fields = [
                    item.tenloaiphong?.toString().toLowerCase() || '',
                    item.giacoban?.toLocaleString('vi-VN').toLowerCase() || '',
                    item.songuoitoida?.toString().toLowerCase() || '',
                    item.trangthai?.toLowerCase() || ''
                ];
            } else if (type === 'room') {
                fields = [
                    item.sophong?.toString().toLowerCase() || '',
                    item.tenLoaiPhong?.toLowerCase() || '',
                    item.succhua?.toString().toLowerCase() || '',
                    item.trangthai?.toLowerCase() || ''
                ];
            } else if (type === 'voucher') {
                fields = [
                    item.mavoucher?.toLowerCase() || '',
                    item.tenvoucher?.toLowerCase() || '',
                    item.tenLoaiPhong?.toLowerCase() || ''
                ];
            } else if (type === 'hotelService') {
                fields = [
                    item.tendv?.toString().toLowerCase() || '',
                    item.giatien?.toLocaleString('vi-VN').toLowerCase() || '',
                    item.trangthai?.toLowerCase() || ''
                ];
            }

            return fields.some(field => field.includes(searchTerm));
        });

        renderTable(type, filteredData, false);
    }

    /** Tạo Form HTML */
    function getRoomTypeFormContent(item) {
        const isEdit = !!item;
        const currentStatus = item?.trangthai || 'Hoạt động';

        return `<form id="room-type-form" class="modal-form form-grid">
            <div><label for="roomTypeName">Tên loại phòng</label><input type="text" id="roomTypeName" required value="${item?.tenloaiphong || ''}"></div>
            <div><label for="roomPrice">Giá cơ bản (VND/đêm)</label><input type="number" id="roomPrice" required min="0" value="${item?.giacoban || ''}"></div>
            <div><label for="maxOccupancy">Số người tối đa</label><input type="number" id="maxOccupancy" required min="1" value="${item?.songuoitoida || ''}"></div>
            <div><label for="numBeds">Số giường</label><input type="number" id="numBeds" required min="1" value="${item?.sogiuong || 1}"></div>
            <div><label for="roomTypeStatus">Trạng thái</label><select id="roomTypeStatus" required ${isEdit ? '' : 'disabled'}>
                <option value="Hoạt động" ${currentStatus === 'Hoạt động' ? 'selected' : ''}>Hoạt động</option>
                <option value="Ngừng" ${currentStatus === 'Ngừng' ? 'selected' : ''}>Ngừng</option>
            </select></div>
            <div class="form-grid-span-2"><label for="roomTypeDescription">Mô tả</label><textarea id="roomTypeDescription" rows="3">${item?.mota || ''}</textarea></div>
            <div class="modal-form-footer form-grid-span-2"><button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button><button type="submit" class="btn btn-primary">Lưu</button></div>
        </form>`;
    }

    /** Tự động cập nhật ô sức chứa khi chọn loại phòng */
    function autoUpdateRoomCapacity() {
        const selectEl = document.getElementById('roomTypeSelect');
        const capacityEl = document.getElementById('roomCapacity');
        
        if (!selectEl || !capacityEl) return;

        const selectedRoomTypeId = parseInt(selectEl.value, 10);
        if (!selectedRoomTypeId) {
            capacityEl.value = '';
            return;
        }

        const roomType = currentTabData.roomType.find(rt => rt.maloaiphong === selectedRoomTypeId);
        capacityEl.value = roomType ? roomType.songuoitoida : '';
    }

    function getRoomFormContent(item, roomTypes = []) {
        const activeRoomTypes = currentTabData.roomType
            .filter(rt => rt.trangthai === 'Hoạt động' || rt.maloaiphong === item?.maloaiphong) // Cho phép hiển thị loại phòng hiện tại ngay cả khi nó "Ngừng"
            .map(rt => ({ maloaiphong: rt.maloaiphong, tenloaiphong: rt.tenloaiphong }));
        
        const roomTypeOptions = activeRoomTypes.map(rt => 
            `<option value="${rt.maloaiphong}" ${item?.maloaiphong == rt.maloaiphong ? 'selected' : ''}>${rt.tenloaiphong}</option>`
        ).join('');
        
        // === SỬA ĐỔI LOGIC TRẠNG THÁI ===
        const currentStatus = item?.trangthai || 'Hoạt động';
        let statusOptions = '';
        let isStatusDisabled = false;

        if (item && currentStatus === 'Đang ở') {
            // Nếu "Đang ở", khóa trạng thái
            statusOptions = `<option value="Đang ở" selected>Đang ở</option>`;
            isStatusDisabled = true;
        } else {
            // Ngược lại, cho phép chọn "Hoạt động" hoặc "Bảo trì"
            const availableStatuses = ['Hoạt động', 'Bảo trì'];
            statusOptions = availableStatuses.map(status => 
                `<option value="${status}" ${currentStatus === status ? 'selected' : ''}>${status}</option>`
            ).join('');
        }
        // === KẾT THÚC SỬA ĐỔI ===
        
        return `<form id="room-form" class="modal-form form-grid">
            <div><label for="roomNumber">Số phòng</label><input type="text" id="roomNumber" required value="${item?.sophong || ''}"></div>
            <div><label for="roomTypeSelect">Loại phòng</label><select id="roomTypeSelect" required>
                <option value="">-- Chọn loại phòng --</option>${roomTypeOptions}</select></div>
            
            <!-- SỬA ĐỔI Ô SỨC CHỨA -->
            <div>
                <label for="roomCapacity">Sức chứa</label>
                <input type="number" id="roomCapacity" value="${item?.succhua || ''}" readonly style="background-color: #eee; cursor: not-allowed;">
            </div>
            <!-- KẾT THÚC SỬA ĐỔI -->

            <div>
                <label for="roomStatusSelect">Trạng thái</label>
                <select id="roomStatusSelect" required ${isStatusDisabled ? 'disabled' : ''}>
                    ${statusOptions}
                </select>
            </div>
            
            <!-- XÓA DÒNG NÀY ĐỂ ẨN TRƯỜNG NHẬP MÃ HÌNH ẢNH -->
            <!-- <div><label for="roomImage">Mã hình ảnh</label><input type="number" id="roomImage" min="1" value="${item?.mahinhphong || 1}"></div> -->
            
            <div class="modal-form-footer form-grid-span-2">
                <button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu</button>
            </div>
        </form>`;
    }

    function getHotelServiceFormContent(item, serviceTypes = []) {
        const isEdit = !!item;
        const serviceTypeOptions = serviceTypes.map(st => `<option value="${st.maloaidv}" ${item?.maloaidv == st.maloaidv ? 'selected' : ''}>${st.tenloaidv}</option>`).join('');
        return `<form id="hotel-service-form" class="modal-form form-grid">
            <div><label for="serviceName">Tên dịch vụ</label><input type="text" id="serviceName" required value="${item?.tendv || ''}"></div>
            <div><label for="servicePrice">Đơn giá (VND)</label><input type="number" id="servicePrice" required min="0" value="${item?.giatien || ''}"></div>
            <div><label for="serviceType">Loại dịch vụ</label><select id="serviceType" required><option value="">-- Chọn loại dịch vụ --</option>${serviceTypeOptions}</select></div>
            <div class="form-grid-span-2"><label for="serviceDescription">Mô tả</label><textarea id="serviceDescription" rows="3">${item?.mota || ''}</textarea></div>
            <div class="modal-form-footer form-grid-span-2"><button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button><button type="submit" class="btn btn-primary">Lưu</button></div>
        </form>`;
    }

    function format2(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    }


    function getVoucherFormContent(item) {
        const isEdit = !!item;
        const today = new Date().toISOString().split('T')[0];

        const roomTypes = currentTabData.roomType.filter(rt => rt.trangthai === 'Hoạt động' || rt.maloaiphong === item?.maloaiphong);
        const options = roomTypes.map(rt =>
            `<option value="${rt.maloaiphong}" ${item?.maloaiphong == rt.maloaiphong ? 'selected' : ''}>${rt.tenloaiphong}</option>`
        ).join('');

        return `<form id="voucher-form" class="modal-form form-grid">
        <input type="hidden" id="mavoucher" value="${isEdit ? item.mavoucher : ''}">
            <div><label>Tên Voucher <span class="text-danger">*</span></label>
                <input type="text" id="tenvoucher" required value="${item?.tenvoucher || ''}" ${!isEdit ? 'autofocus' : ''}>
            </div>
            <div><label>Giảm (VND) <span class="text-danger">* Phải thấp hơn giá loại phòng</span></label>
                <input type="number" id="giagiam" required min="0" value="${item?.giagiam || ''}">
            </div>
            <div><label>Loại phòng <span class="text-danger">*</span></label>
                <select id="maloaiphong" required>
                    <option value="">-- Chọn loại phòng --</option>${options}
                </select>
            </div>
            <div><label>Ngày bắt đầu <span class="text-danger">*</span></label>
                <input type="date" id="ngaybatdau" required value="${item?.ngaybatdau?.split('T')[0] || today}">
            </div>
            <div><label>Ngày kết thúc <span class="text-danger">*</span></label>
                <input type="date" id="ngayketthuc" required value="${item?.ngayketthuc?.split('T')[0] || ''}">
            </div>
            <div class="form-grid-span-2"><label>Mô tả</label>
                <textarea id="mota" rows="2">${item?.mota || ''}</textarea>
            </div>
            <div class="modal-form-footer form-grid-span-2">
                <button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu</button>
            </div>
        </form>`;
    }

    // --- Khởi tạo ---
    loadTabData();

});