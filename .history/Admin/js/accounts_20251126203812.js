import { openModal, closeModal } from './main.js';
import * as api from '../api/accounts.api.js';
import { fetchBookingDetails } from '../api/booking.api.js';

// Biến toàn cục của module để lưu trữ dữ liệu
let allStaffData = [];
let allCustomerData = [];
let currentRowBeingEdited = null;
let currentTab = 'staff';
let chucVuMap = new Map();


// --- KHỞI TẠO TAB VÀ CÁC TRÌNH LẮNG NGHE ---
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra các element cốt lõi
    const staffTab = document.getElementById('tab-staff');
    const customerTab = document.getElementById('tab-customer');
    const staffTableBody = document.getElementById('staff-table-body');
    const customerTableBody = document.getElementById('customer-table-body');
    if (!staffTab || !customerTab || !staffTableBody || !customerTableBody) {
        console.error("Thiếu element cốt lõi (tab-staff, tab-customer, staff-table-body, hoặc customer-table-body). Dừng accounts.js.");
        return;
    }
    console.log("Accounts.js: Đã tìm thấy element cốt lõi.");

    // Gắn listener
    staffTab.addEventListener('click', () => switchTab('staff'));
    customerTab.addEventListener('click', () => switchTab('customer'));
    staffTableBody.addEventListener('click', (e) => handleAccountAction(e, 'staff'));
    customerTableBody.addEventListener('click', (e) => handleAccountAction(e, 'customer'));
    const addStaffBtn = document.getElementById('add-staff-btn');
    if (addStaffBtn) addStaffBtn.addEventListener('click', handleAddAccount);
    const searchStaffInput = document.getElementById('search-staff-input');
    if (searchStaffInput) searchStaffInput.addEventListener('input', handleSearch);
    const searchCustomerInput = document.getElementById('search-customer-input');
    if (searchCustomerInput) searchCustomerInput.addEventListener('input', handleSearch);
    const modalEl = document.getElementById('modal');
    if (modalEl) modalEl.addEventListener('submit', handleModalSubmit);

    console.log("Accounts.js: Đã gắn listener. Tải tab mặc định...");
    switchTab('staff');

    const userInfo = JSON.parse(localStorage.getItem('currentUserInfo')) || JSON.parse(localStorage.getItem('currentUser'));
    const userNameDisplay = document.getElementById('user-display-name');
    const userAvatar = document.getElementById('user-avatar');

    if (userInfo && userNameDisplay) {
        userNameDisplay.textContent = userInfo.name || userInfo.username || 'User';
    }
    if (userInfo && (userInfo.name || userInfo.username) && userAvatar) {
        const nameString = userInfo.name || userInfo.username;
        const firstLetter = nameString.charAt(0).toUpperCase();
        userAvatar.src = `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;
        userAvatar.alt = `Avatar for ${nameString}`;
    }
});

/** Chuyển tab */
function switchTab(tabName) {
    console.log(`Switching to tab: ${tabName}`);
    currentTab = tabName;
    currentRowBeingEdited = null;
    const staffTab = document.getElementById('tab-staff');
    const customerTab = document.getElementById('tab-customer');
    const staffContentEl = document.getElementById('panel-staff');
    const customerContentEl = document.getElementById('panel-customer');
    if (!staffTab || !customerTab || !staffContentEl || !customerContentEl) {
        console.error('Thiếu các phần tử tab hoặc panel cần thiết.');
        return;
    }
    staffTab.classList.toggle('active', tabName === 'staff');
    customerTab.classList.toggle('active', tabName === 'customer');
    staffContentEl.style.display = tabName === 'staff' ? 'block' : 'none';
    customerContentEl.style.display = tabName === 'customer' ? 'block' : 'none';
    loadTabData();
}

/** Tải dữ liệu cho tab */
async function loadTabData() {
    console.log("Loading data for tab:", currentTab);
    showLoading(currentTab, true);
    try {
        switch (currentTab) {
            case 'staff':
                await initializeStaffTab();
                break;
            case 'customer':
                await initializeCustomerTab();
                break;
        }
    } catch (error) {
        console.error(`Error loading data for tab ${currentTab}:`, error);
        renderTable(currentTab, null, false, `Không thể tải dữ liệu: ${error.message}`);
    } finally {
        showLoading(currentTab, false);
    }
}


/** Hiển thị/ẩn loading */
function showLoading(type, isLoading) {
    const tableBody = document.getElementById(`${type}-table-body`);
    let loadingRow = document.getElementById(`${type}-loading-row`);
    if (!tableBody) return;

    if (!loadingRow) {
        console.warn(`loadingRow (${type}-loading-row) not found, creating temporary one.`);
        loadingRow = document.createElement('tr');
        loadingRow.id = `${type}-loading-row`;
        loadingRow.innerHTML = `<td colspan="5" class="text-center">Đang tải dữ liệu ${type === 'staff' ? 'nhân viên' : 'khách hàng'}...</td>`;
        tableBody.appendChild(loadingRow);
    }

    loadingRow.style.display = isLoading ? 'table-row' : 'none';
    if (isLoading) {
        tableBody.innerHTML = '';
        tableBody.appendChild(loadingRow);
    }
}

// --- TAB NHÂN VIÊN ---
async function initializeStaffTab() {
    try {
        let staffAccounts;
        if (chucVuMap.size === 0) {
            const [staff, chucvu] = await Promise.all([api.getStaff(), api.getChucVuList()]);
            console.log('Staff:', staff, 'ChucVu:', chucvu);
            staffAccounts = staff;
            if (Array.isArray(chucvu)) {
                chucVuMap.clear();
                chucvu.forEach(cv => { chucVuMap.set(Number(cv.machucvu), cv.tenchucvu); });
            }
        } else {
            staffAccounts = await api.getStaff();
            console.log('Staff:', staffAccounts);
        }
        if (Array.isArray(staffAccounts)) {
            staffAccounts.forEach(account => {
                const tenchucvu = chucVuMap.get(Number(account.machucvu)) || 'N/A';
                account.machucvuNavigation = { tenchucvu: tenchucvu };
            });
        }
        allStaffData = Array.isArray(staffAccounts) ? staffAccounts : [];
        renderTable('staff', allStaffData, false);
    } catch (error) {
        console.error('Lỗi tải nhân viên:', error);
        renderTable('staff', null, false, error.message);
    }
}

// --- TAB KHÁCH HÀNG ---
async function initializeCustomerTab() {
    try {
        const customerAccounts = await api.getCustomers();
        console.log('Customers:', customerAccounts);
        allCustomerData = Array.isArray(customerAccounts) ? customerAccounts : [];
        renderTable('customer', allCustomerData, false);
    } catch (error) {
        console.error('Lỗi tải khách hàng:', error);
        renderTable('customer', null, false, error.message);
    }
}

/** Render Bảng Chung */
function renderTable(type, data, isLoading, error = null) {
    const tableBody = document.getElementById(`${type}-table-body`);
    let loadingRow = document.getElementById(`${type}-loading-row`);
    const colSpan = 5;

    if (!tableBody) {
        console.error(`Render Error: tableBody missing for type "${type}"`);
        return;
    }

    // Tạo loading row nếu chưa có
    if (!loadingRow) {
        loadingRow = document.createElement('tr');
        loadingRow.id = `${type}-loading-row`;
        loadingRow.innerHTML = `<td colspan="${colSpan}" class="text-center py-4">
            <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu ${type === 'staff' ? 'nhân viên' : 'khách hàng'}...
        </td>`;
        tableBody.appendChild(loadingRow);
    }

    // Loading state
    if (isLoading) {
        tableBody.innerHTML = '';
        loadingRow.style.display = 'table-row';
        tableBody.appendChild(loadingRow);
        return;
    } else {
        loadingRow.style.display = 'none';
    }

    // Error & Empty state
    if (error) {
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-danger py-5">Lỗi: ${error}</td></tr>`;
        return;
    }
    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted py-5">
            <i class="fas fa-inbox fa-3x mb-3 text-muted"></i><br>
            Không có dữ liệu ${type === 'staff' ? 'nhân viên' : 'khách hàng'}
        </td></tr>`;
        return;
    }

    // Render dữ liệu
    tableBody.innerHTML = '';
    data.forEach(account => {
        const row = document.createElement('tr');
        const idKey = type === 'staff' ? 'manv' : 'makh';
        const id = account[idKey];
        row.dataset.id = id;
        row.dataset.username = account.email || '';

        const status = account.trangthai || 'Hoạt động';
        const isLocked = status.toLowerCase() === 'đã khóa';
        const statusClass = isLocked ? 'status-locked' : 'status-active';
        const lockIcon = isLocked ? 'bi-unlock-fill' : 'bi-lock-fill';
        const lockTitle = isLocked ? 'Mở khóa' : 'Khóa';
        const editDisabled = isLocked ? 'disabled' : '';

        // Nút xem chi tiết: khác tooltip + icon cho nhân viên & khách hàng
        const viewButtonHTML = type === 'staff' ?
            `<button class="action-btn btn-view-details" data-action="view-details" title="Xem hoạt động nhân viên">
                 <i class="bi bi-eye-fill text-primary"></i>
               </button>` :
            `<button class="action-btn btn-view-details" data-action="view-details" title="Xem chi tiết khách hàng">
                 <i class="bi bi-eye-fill text-success"></i>
               </button>`;

        if (type === 'staff') {
            const roleName = (account.machucvuNavigation && account.machucvuNavigation.tenchucvu) || 'Chưa xác định';
            row.innerHTML = `
                <td class="email-cell">${account.email || '—'}</td>
                <td class="name-cell fw-600">${account.hoten || '—'}</td>
                <td><span class="badge bg-info">${roleName}</span></td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td class="text-center action-cell">
                    ${viewButtonHTML}
                    <button class="action-btn" data-action="edit" title="Sửa" ${editDisabled}>
                        <i class="bi bi-pencil-fill text-warning"></i>
                    </button>
                    <button class="action-btn action-btn-lock" data-action="lock" title="${lockTitle}">
                        <i class="bi ${lockIcon} text-danger"></i>
                    </button>
                </td>`;
        } else {
            row.innerHTML = `
                <td class="email-cell">${account.email || '—'}</td>
                <td class="name-cell fw-600">${account.hoten || '—'}</td>
                <td>${account.sdt || '—'}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td class="text-center action-cell">
                    ${viewButtonHTML}
                    <button class="action-btn" data-action="edit" title="Sửa" ${editDisabled}>
                        <i class="bi bi-pencil-fill text-warning"></i>
                    </button>
                    <button class="action-btn action-btn-lock" data-action="lock" title="${lockTitle}">
                        <i class="bi ${lockIcon} text-danger"></i>
                    </button>
                </td>`;
        }
        tableBody.appendChild(row);
    });
}

// --- XỬ LÝ HÀNH ĐỘNG TRONG BẢNG ---
async function handleAccountAction(event, type) {
    const targetButton = event.target.closest('.action-btn');
    if (!targetButton) return;
    const action = targetButton.dataset.action;
    const row = targetButton.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    const dataList = (type === 'staff') ? allStaffData : allCustomerData;
    const idKey = (type === 'staff') ? 'manv' : 'makh';
    const account = dataList.find(acc => String(acc[idKey]) === String(id));
    console.log(`Action: ${action}, Type: ${type}, ID: ${id}, Account:`, account);

    if (!account && action !== 'add') {
        alert("Lỗi: Không tìm thấy dữ liệu gốc.");
        return;
    }

    // --- Sửa ---
    if (action === 'edit') {
        currentRowBeingEdited = row;
        const title = (type === 'staff') ? `Sửa nhân viên: ${account.email}` : `Sửa khách hàng: ${account.email}`;
        let formContent = '';
        try {
            if (type === 'staff') {
                if (chucVuMap.size === 0) await initializeStaffTab();
                formContent = getStaffAccountFormContent(account);
            } else {
                formContent = getCustomerAccountFormContent(account);
            }
            openModal(title, formContent);
            attachSaveResetEmailHandler();
            // !!!!!!!!!! THÊM DÒNG NÀY !!!!!!!!!!
            if (type === 'customer') {
                attachResetPasswordHandler();

            }
            // !!!!!!!!!! KẾT THÚC DÒNG THÊM !!!!!!!!!!

        } catch (error) {
            console.error("Lỗi khi mở form sửa:", error);
            alert(`Lỗi: ${error.message}`);
        }
    }

    // --- Khóa/Mở khóa ---
    else if (action === 'lock') {
        const currentStatus = (account && account.trangthai) || 'Hoạt động';
        const newStatus = currentStatus.toLowerCase() === 'hoạt động' ? 'Đã khóa' : 'Hoạt động';
        console.log(`Toggling ${type} ID ${id} to status: ${newStatus}`);

        try {
            const payload = { status: newStatus };
            let updatedAccount;
            const originalAccount = {...account };

            if (type === 'staff') {
                updatedAccount = await api.updateStaffAccount(id, payload, originalAccount);
                if (!updatedAccount || updatedAccount.success) {
                    // Phản hồi rỗng hoặc 204, sử dụng originalAccount với trạng thái mới
                    updatedAccount = {...originalAccount, trangthai: newStatus };
                }
                const tenchucvu = chucVuMap.get(Number(updatedAccount.machucvu)) || 'N/A';
                updatedAccount.machucvuNavigation = { tenchucvu: tenchucvu };
                const index = allStaffData.findIndex(acc => String(acc.manv) === String(id));
                if (index !== -1) allStaffData[index] = updatedAccount;
                else allStaffData.push(updatedAccount);
                console.log('Dữ liệu nhân viên sau cập nhật:', allStaffData);
                renderTable('staff', allStaffData, false);
            } else {
                updatedAccount = await api.updateCustomerAccount(id, payload, originalAccount);
                if (!updatedAccount || updatedAccount.success) {
                    // Phản hồi rỗng hoặc 204, sử dụng originalAccount với trạng thái mới
                    updatedAccount = {...originalAccount, trangthai: newStatus };
                }
                const index = allCustomerData.findIndex(acc => String(acc.makh) === String(id));
                if (index !== -1) allCustomerData[index] = updatedAccount;
                else allCustomerData.push(updatedAccount);
                console.log('Dữ liệu khách hàng sau cập nhật:', allCustomerData);
                renderTable('customer', allCustomerData, false);
            }
            console.log("API cập nhật trạng thái thành công:", updatedAccount);

            // Cập nhật giao diện trực tiếp
            const statusCell = row.cells[type === 'staff' ? 3 : 3];
            const actionCell = row.cells[type === 'staff' ? 4 : 4];
            const statusClass = newStatus.toLowerCase() === 'hoạt động' ? 'status-active' : 'status-locked';
            const isLocked = newStatus.toLowerCase() === 'đã khóa';
            const lockIconClass = isLocked ? 'bi-unlock-fill' : 'bi-lock-fill';
            const lockTitle = isLocked ? 'Mở khóa' : 'Khóa';
            const editButton = actionCell.querySelector('[data-action="edit"]');
            const lockButtonIcon = actionCell.querySelector('[data-action="lock"] i');

            if (statusCell) {
                statusCell.innerHTML = `<span class="status-badge ${statusClass}">${newStatus}</span>`;
            }
            if (editButton) {
                editButton.disabled = isLocked;
            }
            if (lockButtonIcon) {
                lockButtonIcon.className = `bi ${lockIconClass}`;
                lockButtonIcon.parentElement.title = lockTitle;
            }
        } catch (error) {
            console.error(`Lỗi khi cập nhật trạng thái ID: ${id}`, error);
            alert(`Lỗi khi cập nhật trạng thái: ${error.message}`);
            renderTable(type, dataList, false); // Làm mới bảng với dữ liệu hiện tại
        }
    } else if (action === 'view-details') {
        if (type == 'staff') {
            const manv = account.manv;
            const hoten = account.hoten || 'Nhân viên';

            // Gọi API lấy dữ liệu hoạt động
            Promise.all([
                api.getDatphongByStaff(manv).catch(() => []),
                api.getThanhtoanByStaff(manv).catch(() => []),
                api.getDenbuByStaff(manv).catch(() => [])
            ]).then(([datphongs, thanhtoans, denbus]) => {
                showStaffActivityModal(hoten, datphongs, thanhtoans, denbus);
            }).catch(err => {
                console.error("Lỗi tải hoạt động nhân viên:", err);
                alert("Không thể tải chi tiết hoạt động: " + err.message);
            });
        } else {
            // KHÁCH HÀNG: Dùng dữ liệu đã có trong allCustomerData (nếu có bookings)
            showCustomerDetail(account);
        }
    }
}

// --- THÊM MỚI ---
function handleAddAccount() {
    currentRowBeingEdited = null;
    const title = (currentTab === 'staff') ? 'Thêm nhân viên mới' : 'Thêm khách hàng mới';
    console.log("Mở modal Thêm mới. chucVuMap:", chucVuMap);
    let formContent = '';
    if (currentTab === 'staff') {
        if (chucVuMap.size === 0) {
            alert("Đang tải danh sách chức vụ...");
            initializeStaffTab();
            return;
        }
        formContent = getStaffAccountFormContent(null);
    } else {
        formContent = getCustomerAccountFormContent(null);
    }
    openModal(title, formContent);
}

// --- TÌM KIẾM ---
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (currentTab === 'staff') {
        const filteredStaff = searchTerm ? allStaffData.filter(acc => (acc.hoten || '').toLowerCase().includes(searchTerm) || (acc.email || '').toLowerCase().includes(searchTerm)) : allStaffData;
        renderTable('staff', filteredStaff, false);
    } else {
        const filteredCustomer = searchTerm ? allCustomerData.filter(acc => (acc.hoten || '').toLowerCase().includes(searchTerm) || (acc.email || '').toLowerCase().includes(searchTerm)) : allCustomerData;
        renderTable('customer', filteredCustomer, false);
    }
}

// --- SUBMIT MODAL ---
async function handleModalSubmit(event) {
    if (event.target.id === 'account-form') {
        event.preventDefault();
        const form = event.target;
        if (!await validateForm()) {
            alert("Vui lòng sửa các lỗi trong form!");
            return;
        }
        const type = currentTab;

        let emailValue;
        const resetEmailInput = form.querySelector('#reset-email'); // Ô email mới ở dưới
        const usernameInput = form.querySelector('#username'); // Ô email cũ ở trên

        if (resetEmailInput) {
            // Chế độ Sửa Khách hàng: lấy email từ ô reset ở dưới
            emailValue = resetEmailInput.value;
        } else if (usernameInput) {
            // Các trường hợp khác: lấy email từ ô username ở trên
            emailValue = usernameInput.value;
        }

        // Lấy mật khẩu một cách an toàn
        const passwordInput = form.querySelector('#new_password');
        const passwordValue = passwordInput ? passwordInput.value || null : null;

        const payload = {
            username: emailValue, // Đã lấy đúng email
            fullName: form.fullname.value,
            password: passwordValue,
        };

        if (type === 'staff') {
            payload.role = form.role.value;
            payload.ngaysinh = form.ngaysinh.value;
            payload.sdt = form.sdt.value;
            payload.gioitinh = form.gioitinh.value;
            payload.diachi = form.diachi.value;
            payload.trangthai = form.status.value;
        } else {
            payload.phone = form.phone.value;
            payload.ngaysinh = form.birthDate.value;
            payload.diachi = form.address.value;
            payload.cccd = form.cccd.value;
            payload.trangthai = form.status.value;
        }
        console.log("Lưu modal. Payload:", payload);

        try {
            let successMessage = '';
            const idKey = (type === 'staff') ? 'manv' : 'makh';

            if (currentRowBeingEdited) {
                const id = currentRowBeingEdited.dataset.id;
                console.log(`Chế độ SỬA, ID: ${id}`);
                const dataList = (type === 'staff') ? allStaffData : allCustomerData;
                const originalAccount = dataList.find(acc => String(acc[idKey]) === String(id));
                if (!originalAccount) throw new Error("Không tìm thấy dữ liệu gốc.");
                console.log("Original Account:", originalAccount);

                let updatedAccount;
                if (type === 'staff') {
                    updatedAccount = await api.updateStaffAccount(id, payload, originalAccount);
                    if (!updatedAccount || updatedAccount.success) {
                        updatedAccount = {...originalAccount, ...payload, trangthai: payload.status };
                    }
                    const tenchucvu = chucVuMap.get(Number(updatedAccount.machucvu)) || 'N/A';
                    updatedAccount.machucvuNavigation = { tenchucvu: tenchucvu };
                    const index = allStaffData.findIndex(acc => String(acc.manv) === String(id));
                    if (index !== -1) allStaffData[index] = updatedAccount;
                    else allStaffData.push(updatedAccount);
                    renderTable('staff', allStaffData, false);
                } else {
                    updatedAccount = await api.updateCustomerAccount(id, payload, originalAccount);
                    if (!updatedAccount || updatedAccount.success) {
                        updatedAccount = {...originalAccount, ...payload, trangthai: payload.status };
                    }
                    const index = allCustomerData.findIndex(acc => String(acc.makh) === String(id));
                    if (index !== -1) allCustomerData[index] = updatedAccount;
                    else allCustomerData.push(updatedAccount);
                    renderTable('customer', allCustomerData, false);
                }
                successMessage = "Đã cập nhật thành công.";
            } else {
                console.log("Chế độ THÊM MỚI");
                if (!payload.password) {
                    alert('Vui lòng nhập mật khẩu.');
                    return;
                }

                let newAccount;
                if (type === 'staff') {
                    newAccount = await api.createStaffAccount(payload);
                    if (!newAccount || newAccount.success) {
                        newAccount = {...payload, manv: Date.now() }; // Giả lập ID tạm thời
                    }
                    const tenchucvu = chucVuMap.get(Number(newAccount.machucvu)) || 'N/A';
                    newAccount.machucvuNavigation = { tenchucvu: tenchucvu };
                    allStaffData.push(newAccount);
                    renderTable('staff', allStaffData, false);
                } else {
                    newAccount = await api.createCustomerAccount(payload);
                    if (!newAccount || newAccount.success) {
                        newAccount = {...payload, makh: Date.now() }; // Giả lập ID tạm thời
                    }
                    allCustomerData.push(newAccount);
                    renderTable('customer', allCustomerData, false);
                }
                successMessage = "Đã thêm thành công.";
            }
            closeModal();
            alert(successMessage);
        } catch (error) {
            console.error("Lỗi khi lưu modal:", error);
            alert(`Lỗi khi lưu: ${error.message}`);
        }
    }
}

// --- TẠO FORM HTML ---
function generateChucVuOptions(selectedMaChucVu) {
    let optionsHTML = '<option value="">-- Chọn vai trò --</option>';
    chucVuMap.forEach((tenchucvu, machucvu) => {
        const isSelected = (Number(machucvu) === Number(selectedMaChucVu));
        optionsHTML += `<option value="${machucvu}" ${isSelected ? 'selected' : ''}>${tenchucvu}</option>`;
    });
    return optionsHTML;
}

function getStaffAccountFormContent(account) {
    const isEditMode = !!account;
    const username = account ? account.email : '';
    const fullname = account ? account.hoten : '';
    const sdt = account ? account.sdt : '';
    const ngaysinh = account && account.ngaysinh ? account.ngaysinh.split('T')[0] : '';
    const gioitinh = account ? account.gioitinh || 'Nam' : 'Nam';
    const diachi = account ? account.diachi : '';
    const machucvu = account ? account.machucvu : null;
    const status = account ? account.trangthai : 'Hoạt động';
    const chucVuOptions = generateChucVuOptions(machucvu);

    let passwordSection = '';
    if (isEditMode) {
        passwordSection = `
        <div id="email-reset-container" class="form-grid-span-2">
            <hr>
            <label for="reset-email">Cập nhật Email đăng nhập</label>
            <p class="form-note">Nhập email mới → Lưu → Có thể gửi mật khẩu nếu cần</p>
            <div class="reset-controls">
                <input type="email" id="reset-email" value="${username}" placeholder="nhanvien@hotel.com">
                <button type="button" id="save-reset-email-btn" class="btn btn-secondary btn-sm">Lưu Email</button>
            </div>
            <small class="error-text" id="reset-email-error"></small>
            <div id="reset-msg-container">
                <div id="save-reset-email-msg" class="form-message"></div>
            </div>
        </div>`;
    }

    return `
        <form id="account-form" class="modal-form">
            <div class="form-grid">

                <div class="form-grid-span-2">
                    <label for="username">Email đăng nhập</label>
                    <input type="email" id="username" value="${username}" required ${isEditMode ? 'disabled' : ''} placeholder="nhanvien@hotel.com">
                    <small class="error-text" id="email-error"></small>
                </div>

                <div>
                    <label for="fullname">Họ và tên <span class="text-danger">*</span></label>
                    <input type="text" id="fullname" value="${fullname}" required>
                </div>

                <div>
                    <label for="sdt">Số điện thoại</label>
                    <input type="tel" id="sdt" value="${sdt}" placeholder="0901234567">
                    <small class="error-text" id="phone-error"></small>
                </div>

                <div>
                    <label for="ngaysinh">Ngày sinh</label>
                    <input type="date" id="ngaysinh" value="${ngaysinh}">
                </div>

                <div>
                    <label for="gioitinh">Giới tính</label>
                    <select id="gioitinh">
                        <option value="Nam" ${gioitinh === 'Nam' ? 'selected' : ''}>Nam</option>
                        <option value="Nữ" ${gioitinh === 'Nữ' ? 'selected' : ''}>Nữ</option>
                        <option value="Khác" ${gioitinh === 'Khác' ? 'selected' : ''}>Khác</option>
                    </select>
                </div>

                <div>
                    <label for="role">Vai trò <span class="text-danger">*</span></label>
                    <select id="role" required>${chucVuOptions}</select>
                </div>

                <div class="form-grid-span-2">
                    <label for="diachi">Địa chỉ</label>
                    <input type="text" id="diachi" value="${diachi}">
                </div>

                <div>
                    <label for="status">Trạng thái</label>
                    <select id="status" required>
                        <option value="Hoạt động" ${status === 'Hoạt động' ? 'selected' : ''}>Hoạt động</option>
                        <option value="Đã khóa" ${status === 'Đã khóa' ? 'selected' : ''}>Đã khóa</option>
                    </select>
                </div>

            </div>

            ${passwordSection}

            <div id="password-change-container">
                <p class="form-note">
                    ${isEditMode ? 'Để trống nếu không đổi mật khẩu.' : 'Mật khẩu bắt buộc.'}
                </p>
                <div>
                    <label for="new_password">Mật khẩu mới</label>
                    <input type="password" id="new_password" ${!isEditMode ? 'required' : ''}>
                </div>
            </div>

            <div class="modal-form-footer">
                <button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu</button>
            </div>
        </form>
    `;
}



// THAY THẾ TOÀN BỘ HÀM NÀY:
// TRONG FILE accounts.js
// THAY THẾ TOÀN BỘ HÀM NÀY:

function getCustomerAccountFormContent(account) {
    const isEditMode = !!account;
    const username = account && account.email ? account.email : '';
    const fullname = account && account.hoten ? account.hoten : '';
    const phone = account && account.sdt ? account.sdt : '';
    const ngaysinh = (account && account.ngaysinh) ? account.ngaysinh.split('T')[0] : '';
    const diachi = account && account.diachi ? account.diachi : '';
    const cccd = account && account.cccd ? account.cccd : '';
    const status = account && account.trangthai ? account.trangthai : 'Hoạt động';
    const memberPoints = (account && typeof account.diemthanhvien !== 'undefined') ? account.diemthanhvien : 0;

    let passwordSection = '';
    if (isEditMode) {
        passwordSection = `
        <div id="password-reset-container" class="form-grid-span-2">
            <hr>
            <label for="reset-email">Cập nhật Email & Gửi mật khẩu mới</label>
            <p class="form-note">Nhập email mới → Lưu → Gửi mật khẩu</p>
            <div class="reset-controls">
                <input type="email" id="reset-email" value="${username}" placeholder="khachhang@gmail.com">
                <button type="button" id="save-reset-email-btn" class="btn btn-secondary btn-sm">Lưu Email</button>
                <button type="button" id="send-reset-btn" class="btn btn-warning">Gửi mật khẩu mới</button>
            </div>
            <small class="error-text" id="reset-email-error"></small>
            <div id="reset-msg-container">
                <div id="save-reset-email-msg" class="form-message"></div>
                <div id="reset-success-msg" class="form-message" style="color:green"></div>
                <div id="reset-error-msg" class="form-message" style="color:red"></div>
            </div>
        </div>`;
    } else {
        passwordSection = `
        <div class="form-grid-span-2">
            <label for="new_password">Mật khẩu <span class="text-danger">*</span></label>
            <input type="password" id="new_password" required>
        </div>`;
    }

    return `<form id="account-form" class="modal-form">
        <div class="form-grid">

            <div class="form-grid-span-2">
                <label for="username">Email đăng nhập</label>
                <input type="email" id="username" value="${username}" required ${isEditMode ? 'disabled' : ''} placeholder="khach@gmail.com">
                <small class="error-text" id="email-error"></small>
            </div>

            <div>
                <label for="fullname">Họ tên <span class="text-danger">*</span></label>
                <input type="text" id="fullname" value="${fullname}" required>
            </div>

            <div>
                <label for="phone">SĐT</label>
                <input type="tel" id="phone" value="${phone}" placeholder="0901234567">
                <small class="error-text" id="phone-error"></small>
            </div>

            <div><label for="birthDate">Ngày sinh</label><input type="date" id="birthDate" value="${ngaysinh}"></div>
            <div><label for="cccd">CCCD</label><input type="text" id="cccd" value="${cccd}"></div>

            <div>
                <label for="status">Trạng thái</label>
                <select id="status"><option value="Hoạt động" ${status === 'Hoạt động' ? 'selected' : ''}>Hoạt động</option><option value="Đã khóa" ${status === 'Đã khóa' ? 'selected' : ''}>Đã khóa</option></select>
            </div>

            <div>
                <label>Điểm thành viên</label>
                <input type="number" value="${memberPoints}" disabled>
            </div>

            <div class="form-grid-span-2">
                <label for="address">Địa chỉ</label>
                <input type="text" id="address" value="${diachi}">
            </div>

        </div>

        ${passwordSection}

        <div class="modal-form-footer">
            <button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button>
            <button type="submit" class="btn btn-primary">Lưu</button>
        </div>
    </form>`;
}


function attachResetPasswordHandler() {
    const btn = document.getElementById("send-reset-btn");

    if (!btn) {
        return;
    }

    const successMsg = document.getElementById("reset-success-msg");
    const errorMsg = document.getElementById("reset-error-msg");

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", async function() {

        // Nó vẫn đọc từ ô reset-email
        const email = document.getElementById("reset-email").value.trim();
        const currentBtn = this;

        successMsg.style.display = "none";
        errorMsg.style.display = "none";

        // !!!!! DÒNG MỚI: Xóa thông báo của nút "Lưu Email" !!!!!
        document.getElementById("save-reset-email-msg").style.display = "none";

        if (!email) {
            showResetError("Không tìm thấy email của khách hàng.");
            return;
        }

        currentBtn.textContent = "Đang gửi...";
        currentBtn.disabled = true;

        try {
            const data = await api.sendPasswordReset(email);
            showResetSuccess(data.message || "Mật khẩu mới đã được gửi qua email của khách!");

        } catch (err) {
            console.error("Lỗi quên mật khẩu:", err);
            let errorMessage = err.message || "Lỗi kết nối tới server. Vui lòng thử lại!";

            if (errorMessage.includes('không tồn tại') || errorMessage.includes('not found')) {
                errorMessage = 'Email này không tồn tại trong hệ thống. (Bạn đã bấm "Lưu Email" chưa?)';
            } else if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
                errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối.';
            }

            showResetError(errorMessage);
        } finally {
            currentBtn.textContent = "Gửi mật khẩu mới";
            currentBtn.disabled = false;
        }
    });

    // Hàm nội bộ để hiển thị lỗi/thành công
    function showResetError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
        successMsg.style.display = "none";
    }

    function showResetSuccess(msg) {
        successMsg.textContent = msg;
        successMsg.style.display = "block";
        errorMsg.style.display = "none";
    }
}

// --- XỬ LÝ NÚT LƯU EMAIL MỚI ---
function attachSaveResetEmailHandler() {
    const btn = document.getElementById("save-reset-email-btn");
    if (!btn) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", async function() {
        const id = currentRowBeingEdited ? currentRowBeingEdited.dataset.id : null;
        if (!id) {
            showEmailMsg("Lỗi: Không tìm thấy ID tài khoản.", true);
            return;
        }

        const newEmailInput = document.getElementById("reset-email");
        const topEmailInput = document.getElementById("username");
        const newEmail = newEmailInput.value.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!newEmail || !emailRegex.test(newEmail)) {
            showEmailMsg("Email không hợp lệ!", true);
            return;
        }

        const isStaff = currentTab === 'staff';
        const dataList = isStaff ? allStaffData : allCustomerData;
        const idKey = isStaff ? 'manv' : 'makh';
        const originalAccount = dataList.find(acc => String(acc[idKey]) === String(id));
        if (!originalAccount) {
            showEmailMsg("Không tìm thấy dữ liệu gốc.", true);
            return;
        }

        if (newEmail === originalAccount.email) {
            showEmailMsg("Email không thay đổi.", false);
            return;
        }

        this.textContent = "Đang lưu...";
        this.disabled = true;

        try {
            const payload = { username: newEmail };
            let updatedAccount;

            if (isStaff) {
                updatedAccount = await api.updateStaffAccount(id, payload, originalAccount);
            } else {
                updatedAccount = await api.updateCustomerAccount(id, payload, originalAccount);
            }

            if (!updatedAccount) throw new Error("Server không trả dữ liệu");

            // Cập nhật mảng dữ liệu
            const index = dataList.findIndex(acc => String(acc[idKey]) === String(id));
            if (index !== -1) dataList[index] = updatedAccount;

            // Cập nhật giao diện
            if (topEmailInput) topEmailInput.value = newEmail;
            if (currentRowBeingEdited) {
                currentRowBeingEdited.dataset.username = newEmail;
                const emailCell = currentRowBeingEdited.cells[0];
                if (emailCell) emailCell.textContent = newEmail;
            }

            showEmailMsg("Cập nhật email thành công!", false);

        } catch (error) {
            console.error("Lỗi cập nhật email:", error);
            let msg = error.message || "Lỗi server";
            if (msg.includes('Duplicate') || msg.includes('trùng')) {
                msg = "Email này đã được sử dụng!";
            }
            showEmailMsg(msg, true);
        } finally {
            this.textContent = "Lưu Email";
            this.disabled = false;
        }
    });

    function showEmailMsg(msg, isError) {
        const msgEl = document.getElementById("save-reset-email-msg");
        if (msgEl) {
            msgEl.textContent = msg;
            msgEl.style.color = isError ? "red" : "green";
            msgEl.style.display = "block";
        }
    }
}

// Cần import allStaffData, allCustomerData và currentTab (đã có ở đầu file)

// === HÀM KIỂM TRA EMAIL & SỐ ĐIỆN THOẠI (ASYNC) ===
async function validateForm() {
    let isValid = true;
    const isStaff = currentTab === 'staff';
    const isEditMode = !!currentRowBeingEdited;
    const dataList = isStaff ? allStaffData : allCustomerData;
    const idKey = isStaff ? 'manv' : 'makh';

    // Lấy ID hiện tại (chỉ cần khi sửa)
    let currentId = null;
    if (currentRowBeingEdited && currentRowBeingEdited.dataset && currentRowBeingEdited.dataset.id) {
        currentId = String(currentRowBeingEdited.dataset.id);
    }

    // --- XỬ LÝ EMAIL (USERNAME) ---
    const usernameInput = document.getElementById('username');
    const emailError = document.getElementById('email-error');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (usernameInput) {
        const email = usernameInput.value.trim();

        // 1. Kiểm tra bắt buộc & định dạng (Giữ nguyên logic cũ)
        if (!email) {
            showError(usernameInput, emailError, "Email là bắt buộc!");
            isValid = false;
        } else if (!emailRegex.test(email)) {
            showError(usernameInput, emailError, "Email không hợp lệ!");
            isValid = false;
        } else {
            clearValidation(usernameInput, emailError);

            // 2. KIỂM TRA TÍNH DUY NHẤT CỦA EMAIL (CHỈ KHI THÊM MỚI)
            if (!isEditMode) {
                const isDuplicateEmail = dataList.some(
                    acc => (acc.email || '').toLowerCase() === email.toLowerCase()
                );
                if (isDuplicateEmail) {
                    showError(usernameInput, emailError, "Email này đã tồn tại!");
                    isValid = false;
                } else {
                    showValid(usernameInput, emailError, "Email hợp lệ");
                }
            }
        }
    }

    // --- XỬ LÝ HỌ VÀ TÊN (FULL NAME) ---
    const fullnameInput = document.getElementById('fullname');
    const fullname = fullnameInput ? fullnameInput.value.trim() : '';
    const fullnameError = fullnameInput ? fullnameInput.nextElementSibling : null;

    if (fullnameInput && fullnameError) {
        if (!fullname) {
            showError(fullnameInput, fullnameError, "Họ và tên là bắt buộc!");
            isValid = false;
        } else {
            clearValidation(fullnameInput, fullnameError);

            // KIỂM TRA TRÙNG LẶP HỌ TÊN (KHÔNG BẮT BUỘC DUY NHẤT, NHƯNG NÊN CÓ CẢNH BÁO/KHÔNG CÓ LỖI CHẶN)
            // Tuy nhiên, theo yêu cầu, ta sẽ kiểm tra xem nó có tồn tại hay không.
            // Vì họ tên không phải là khóa chính, ta chỉ cần kiểm tra xem có tài khoản nào khác có cùng tên hay không.
            const isDuplicateName = dataList.some(
                acc => (acc.hoten || '').toLowerCase() === fullname.toLowerCase() && String(acc[idKey]) !== currentId
            );

            if (isDuplicateName) {
                // Ta chỉ cảnh báo (hoặc không set isValid = false) vì tên có thể trùng
                // Nếu muốn chặn, hãy bỏ comment: isValid = false;
                // Để phù hợp với format hiện tại:
                showError(fullnameInput, fullnameError, "Tên này có thể đã tồn tại!");
            } else {
                showValid(fullnameInput, fullnameError, "Họ và tên hợp lệ");
            }
        }
    }

    // --- XỬ LÝ EMAIL RESET (Giữ nguyên logic cũ) ---
    const resetEmailInput = document.getElementById('reset-email');
    const resetEmailError = document.getElementById('reset-email-error');
    if (resetEmailInput) {
        const resetEmail = resetEmailInput.value.trim();
        if (!resetEmail || !emailRegex.test(resetEmail)) {
            showError(resetEmailInput, resetEmailError, "Email không hợp lệ!");
            isValid = false;
        } else {
            showValid(resetEmailInput, resetEmailError, "Email hợp lệ");
        }
    }

    // === SỐ ĐIỆN THOẠI (Giữ nguyên logic cũ) ===
    const phoneInput = document.getElementById('sdt') || document.getElementById('phone');
    const phoneError = document.getElementById('phone-error');
    if (!phoneInput) return isValid;

    let phone = phoneInput.value.replace(/\D/g, '');
    phoneInput.value = phone.slice(0, 10);

    if (phone.length === 0) {
        clearValidation(phoneInput, phoneError);
    } else if (phone.length !== 10) {
        showError(phoneInput, phoneError, "SĐT phải đúng 10 số!");
        isValid = false;
    } else if (!/^0[3|5|7|8|9]/.test(phone)) {
        showError(phoneInput, phoneError, "SĐT phải bắt đầu 03/05/07/08/09");
        isValid = false;
    } else {
        showValid(phoneInput, phoneError, "SĐT hợp lệ");
    }

    return isValid;
}

function showError(input, errorEl, msg) {
    input.classList.add('input-error');
    input.classList.remove('input-valid');
    errorEl.textContent = msg;
    errorEl.className = 'error-text';
}

function showValid(input, errorEl, msg) {
    input.classList.add('input-valid');
    input.classList.remove('input-error');
    errorEl.textContent = msg;
    errorEl.className = 'valid-text';
}

function clearValidation(input, errorEl) {
    input.classList.remove('input-error', 'input-valid');
    errorEl.textContent = '';
    errorEl.className = '';
}

async function showStaffActivityModal(hoten, datphongs, thanhtoans, denbus) {
    const formatDate = d => !d ? 'N/A' : new Date(d).toLocaleDateString('vi-VN');
    const formatMoney = m => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m || 0);

    const totalBooking = datphongs.reduce((s, i) => s + (i.tongtien || 0), 0);
    const totalPayment = thanhtoans.reduce((s, i) => s + (i.sotien || 0), 0);
    const totalCompensation = denbus.reduce((s, i) => s + (i.tongtien || 0), 0);
    const manv = (datphongs && datphongs[0] && datphongs[0].manv) ||
        (thanhtoans && thanhtoans[0] && thanhtoans[0].manv) ||
        (denbus && denbus[0] && denbus[0].manv) ||
        'N/A';
    const role = (datphongs && datphongs[0] && datphongs[0].machucvuNavigation && datphongs[0].machucvuNavigation.tenchucvu) || 'Nhân viên';

    const template = document.getElementById('staff-activity-template');
    const content = template.content.cloneNode(true);


    // Đặt phòng
    const bookingBody = content.querySelector('#booking-body');
    bookingBody.innerHTML = datphongs.length ? datphongs.map(dp => `
        <tr>
            <td><strong>#${dp.madatphong}</strong></td>
            <td>${dp.tenKhachHang || dp.email || 'Khách lẻ'}</td>
            <td>${formatDate(dp.ngaynhanphong)} </td>
            <td> ${formatDate(dp.ngaytraphong)}</td>
            <td><span class="badge ${dp.trangthai?.includes('Đã') ? 'bg-success' : 'bg-warning'}">${dp.trangthai}</span></td>
            <td class="text-end fw-bold">${formatMoney(dp.tongtien)}</td>
        </tr>
    `).join('') : '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có đặt phòng</td></tr>';
    content.querySelector('#total-booking').textContent = formatMoney(totalBooking);

    // Thanh toán
    const paymentBody = content.querySelector('#payment-body');
    paymentBody.innerHTML = thanhtoans.length ? thanhtoans.map(tt => `
        <tr>
            <td><strong>#${tt.matt}</strong></td>
            <td>${formatDate(tt.ngaytao)}</td>
            <td class="text-end fw-bold text-success">${formatMoney(tt.sotien)}</td>
            <td><span class="badge bg-success">ĐÃ THANH TOÁN</span></td>
        </tr>
    `).join('') : '<tr><td colspan="4" class="text-center text-muted py-4">Chưa xử lý thanh toán</td></tr>';
    content.querySelector('#total-payment').textContent = formatMoney(totalPayment);

    // Đền bù - SỬA CHỖ NÀY LÀ XONG!
    const compBody = content.querySelector('#compensation-body');

    // Tạo mảng HTML từ dữ liệu đền bù (có await → phải dùng Promise.all)
    const compensationRows = await Promise.all(
        denbus.map(async(db) => {
            const tenThietBi = await api.getTenThietBi(db.mathietbi);
            const info = await api.getThietBiInfo(db.mathietbi);

            return `
                <tr>
                    <td><strong>#${db.madenbu}</strong></td>
                    <td><strong><span class="badge bg-secondary">#${db.madatphong}</span></strong></td>
                    <td>${db.maphong}</td>
                    <td>${tenThietBi}</td>
                    <td class="text-center fw-bold">${db.soluong}</td>
                    <td class="text-end">
                        ${formatMoney(info.dongia)} x ${db.soluong} = <strong>${formatMoney(db.tongtien)}</strong>
                    </td>
                </tr>
            `;
        })
    );

    compBody.innerHTML = compensationRows.length > 0 ?
        compensationRows.join('') :
        '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có đền bù</td></tr>';

    content.querySelector('#total-compensation').textContent = formatMoney(totalCompensation);

    // Tab switching
    content.querySelectorAll('.tab-btn-active').forEach(btn => {
        btn.addEventListener('click', () => {
            content.querySelectorAll('.tab-btn-active').forEach(b => b.classList.remove('active'));
            content.querySelectorAll('.tab-pane-active').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            content.querySelector('#' + btn.dataset.tab).classList.add('active');
        });
    });

    const temp = document.createElement('div');
    temp.appendChild(content);
    openModal(`Hoạt động nhân viên - ${hoten}`, temp.innerHTML, true);

    // SAU KHI MODAL ĐÃ HIỆN TRÊN MÀN HÌNH → GẮN SỰ KIỆN TAB
    setTimeout(() => {
        document.querySelectorAll('.tab-btn-active').forEach(btn => {
            btn.onclick = function() {
                // Xóa active cũ
                document.querySelectorAll('.tab-btn-active').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane-active').forEach(p => p.classList.remove('active'));
                // Active tab mới
                this.classList.add('active');
                document.getElementById(this.dataset.tab).classList.add('active');
            };
        });
    }, 100);
}

// ==================== CHI TIẾT KHÁCH HÀNG (Sử dụng Booking API và CSS Inline) ====================

async function showCustomerDetail(customer) {
    const formatDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A';
    const formatMoney = m => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m || 0);

    const template = document.getElementById('customer-detail-template');
    const content = template.content.cloneNode(true);

    // Hiển thị thông tin cơ bản
    content.querySelector('#detail-makh').textContent = customer.makh;
    content.querySelector('#detail-hoten').textContent = customer.hoten || 'N/A';
    content.querySelector('#detail-cccd').textContent = customer.cccd || 'N/A';
    content.querySelector('#detail-sdt').textContent = customer.sdt || 'N/A';
    content.querySelector('#detail-email').textContent = customer.email || 'N/A';
    content.querySelector('#detail-ngaysinh').textContent = customer.ngaysinh ? formatDate(customer.ngaysinh) : 'N/A';
    content.querySelector('#detail-diachi').textContent = customer.diachi || 'N/A';
    content.querySelector('#detail-trangthai').textContent = customer.trangthai || 'Hoạt động';

    // === TẢI VÀ XỬ LÝ DỮ LIỆU ĐẶT PHÒNG ===
    let rawBookings = [];
    try {
        const response = await fetch('https://localhost:7076/api/Datphongs');
        if (response.ok) {
            const allBookings = await response.json();
            rawBookings = allBookings
                .filter(b => Number(b.makh) === Number(customer.makh))
                .sort((a, b) => new Date(b.ngaynhanphong) - new Date(a.ngaynhanphong));
        }
    } catch (e) {
        console.error("Lỗi tải danh sách đặt phòng:", e);
    }

    const detailedBookings = await Promise.all(
        rawBookings.map(b => fetchBookingDetails(b.madatphong).catch(err => {
            console.warn(`Không thể tải chi tiết DP #${b.madatphong}:`, err);
            return {
                ...b,
                rooms: [{ number: 'Lỗi tải phòng' }],
                isError: true
            };
        }))
    );

    // === HIỂN THỊ CHI TIẾT ĐẶT PHÒNG ===
    const bookingBody = content.querySelector('#detail-booking-body');
    const totalBookingElement = content.querySelector('#detail-total-booking');

    if (detailedBookings.length > 0) {
        let total = 0;
        bookingBody.innerHTML = detailedBookings.map(b => {
            if (b.isError) {
                return `
                    <tr style="background-color: #fcebeb;">
                        <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>#DP${b.madatphong}</strong></td>
                        <td colspan="5" style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #e53e3e;">Lỗi tải chi tiết phòng.</td>
                    </tr>
                 `;
            }

            total += (b.totalAmount || 0);
            let statusClass = 'warning';
            if (b.status && b.status.includes('Đã đặt')) {
                statusClass = 'success';
            } else if (b.status && b.status.includes('Đã hủy')) {
                statusClass = 'danger';
            }
            const roomNumbers = b.rooms.map(r => r.number).filter(Boolean);
            const roomList = roomNumbers.length > 0 ? roomNumbers.join(', ') : 'Chưa có phòng';
            const rowStyle = `style="border-bottom: 1px solid #eee; transition: background-color 0.3s;" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='transparent'"`;

            return `
                <tr ${rowStyle}>
                    <td style="padding: 12px;"><strong style="color: #3182ce;">#DP${b.id}</strong></td>
                    <td style="padding: 12px; text-align: left;">
                        <div><strong style="color: #4a5568;">Phòng:</strong> ${roomList}</div>
                    </td>
                    <td style="padding: 12px;">${formatDate(b.checkInDate)}</td>
                    <td style="padding: 12px;">${formatDate(b.checkOutDate)}</td>
                    <td style="padding: 12px;">
                        <span style="
                            padding: 4px 8px; 
                            border-radius: 4px; 
                            font-weight: 600; 
                            color: white; 
                            white-space: nowrap; 
                            background-color: ${statusClass === 'success' ? '#4caf50' : statusClass === 'danger' ? '#f44336' : '#ffc107'};
                        ">${b.status || 'Chờ'}</span>
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #e53e3e;">${formatMoney(b.totalAmount)}</td>
                </tr>
            `;
        }).join('');
        totalBookingElement.textContent = formatMoney(total);
    } else {
        bookingBody.innerHTML = '<tr><td colspan="6" style="padding: 50px 0; text-align: center; color: #a0aec0;">Chưa có lịch sử đặt phòng</td></tr>';
        totalBookingElement.textContent = formatMoney(0);
    }

    // --- LOGIC XỬ LÝ TAB (Sử dụng CSS Inline động) ---
    content.querySelectorAll('.tab-btn-active').forEach(btn => {
        btn.onclick = function() {
            // Reset style và ẩn tất cả panes
            document.querySelectorAll('.tab-btn-active').forEach(b => {
                b.style.borderBottom = '3px solid transparent';
                b.style.color = '#4a5568';
                b.classList.remove('active');
            });
            document.querySelectorAll('.tab-pane-active').forEach(p => p.style.display = 'none');

            // Áp dụng style active và hiển thị pane mới
            this.style.borderBottom = '3px solid #3182ce';
            this.style.color = '#3182ce';
            document.getElementById(this.dataset.tab).style.display = 'block';
        };
    });

    // Mở modal
    openModal(`Thông Tin Khách Hàng - ${customer.hoten || customer.email}`, content.firstElementChild.outerHTML, true);


    // SAU KHI MODAL ĐÃ HIỆN TRÊN MÀN HÌNH → GẮN SỰ KIỆN TAB
    setTimeout(() => {
        document.querySelectorAll('.tab-btn-active').forEach(btn => {
            btn.onclick = function() {
                // Xóa active cũ
                document.querySelectorAll('.tab-btn-active').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane-active').forEach(p => p.classList.remove('active'));
                // Active tab mới
                this.classList.add('active');
                document.getElementById(this.dataset.tab).classList.add('active');
            };
        });
    }, 100);
}
// Gắn kiểm tra real-time
const modalEl = document.getElementById('modal');
if (modalEl) {
    modalEl.addEventListener('input', function(e) {
        const target = e.target;
        if (!target) return;

        // Chỉ cho số + cắt 10 số
        if (target.matches('#sdt, #phone')) {
            target.value = target.value.replace(/\D/g, '').slice(0, 10);
        }

        // Kiểm tra real-time
        if (target.matches('#username, #sdt, #phone, #reset-email')) {
            // Không await để không block UI
            validateForm().catch(() => {});
        }
    });
}