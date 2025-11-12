import { openModal, closeModal } from './main.js';
import * as api from '../api/accounts.api.js';

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
    document.getElementById('add-staff-btn')?.addEventListener('click', handleAddAccount);
    document.getElementById('search-staff-input')?.addEventListener('input', handleSearch);
    document.getElementById('search-customer-input')?.addEventListener('input', handleSearch);
    document.getElementById('modal')?.addEventListener('submit', handleModalSubmit);

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
            case 'staff': await initializeStaffTab(); break;
            case 'customer': await initializeCustomerTab(); break;
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
    console.log(`Rendering table for type: ${type}`);
    console.log(`tableBody (${type}-table-body):`, tableBody);
    console.log(`loadingRow (${type}-loading-row):`, loadingRow);
    const colSpan = (type === 'staff') ? 5 : 5;

    if (!tableBody) {
        console.error(`Render Error: tableBody missing for type "${type}"`);
        return;
    }

    if (!loadingRow) {
        console.warn(`loadingRow (${type}-loading-row) not found, creating temporary one.`);
        loadingRow = document.createElement('tr');
        loadingRow.id = `${type}-loading-row`;
        loadingRow.innerHTML = `<td colspan="${colSpan}" class="text-center">Đang tải dữ liệu ${type === 'staff' ? 'nhân viên' : 'khách hàng'}...</td>`;
        tableBody.appendChild(loadingRow);
    }

    if (isLoading) {
        tableBody.innerHTML = '';
        loadingRow.style.display = 'table-row';
        tableBody.appendChild(loadingRow);
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
    data.forEach(account => {
        const row = document.createElement('tr');
        const idKey = (type === 'staff') ? 'manv' : 'makh';
        const statusField = 'trangthai';
        const id = account[idKey];
        row.dataset.id = id;
        row.dataset.username = account.email;

        const status = account[statusField] || 'Hoạt động';
        const isLocked = status.toLowerCase() === 'đã khóa';
        const statusClass = isLocked ? 'status-locked' : 'status-active';

        const lockIconClass = isLocked ? 'bi-unlock-fill' : 'bi-lock-fill';
        const lockTitle = isLocked ? 'Mở khóa' : 'Khóa';
        const editDisabled = isLocked ? 'disabled' : '';
        const editIconClass = 'bi-pencil-fill';

        if (type === 'staff') {
            const roleName = account.machucvuNavigation?.tenchucvu || 'N/A';
            row.innerHTML = `
                <td>${account.email || 'N/A'}</td>
                <td>${account.hoten || 'N/A'}</td>
                <td>${roleName}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td class="text-center">
                    <button class="action-btn" data-action="edit" title="Sửa" ${editDisabled}><i class="bi ${editIconClass}"></i></button>
                    <button class="action-btn action-btn-lock" data-action="lock" title="${lockTitle}"><i class="bi ${lockIconClass}"></i></button>
                </td>`;
        } else {
            row.innerHTML = `
                <td>${account.email || 'N/A'}</td>
                <td>${account.hoten || 'N/A'}</td>
                <td>${account.sdt || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td class="text-center">
                    <button class="action-btn" data-action="edit" title="Sửa" ${editDisabled}><i class="bi ${editIconClass}"></i></button>
                    <button class="action-btn action-btn-lock" data-action="lock" title="${lockTitle}"><i class="bi ${lockIconClass}"></i></button>
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
        const currentStatus = account?.trangthai || 'Hoạt động';
        const newStatus = currentStatus.toLowerCase() === 'hoạt động' ? 'Đã khóa' : 'Hoạt động';
        console.log(`Toggling ${type} ID ${id} to status: ${newStatus}`);

        try {
            const payload = { status: newStatus };
            let updatedAccount;
            const originalAccount = { ...account };

            if (type === 'staff') {
                updatedAccount = await api.updateStaffAccount(id, payload, originalAccount);
                if (!updatedAccount || updatedAccount.success) {
                    // Phản hồi rỗng hoặc 204, sử dụng originalAccount với trạng thái mới
                    updatedAccount = { ...originalAccount, trangthai: newStatus };
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
                    updatedAccount = { ...originalAccount, trangthai: newStatus };
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
    }

    // --- Xóa: Bỏ logic xóa ---
    else if (action === 'delete') {
        console.log(`Hành động xóa bị vô hiệu hóa cho ID: ${id}, Loại: ${type}`);
        alert('Chức năng xóa đã bị vô hiệu hóa.');
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
        if (!validateForm()) {
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
                        updatedAccount = { ...originalAccount, ...payload, trangthai: payload.status };
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
                        updatedAccount = { ...originalAccount, ...payload, trangthai: payload.status };
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
                        newAccount = { ...payload, manv: Date.now() }; // Giả lập ID tạm thời
                    }
                    const tenchucvu = chucVuMap.get(Number(newAccount.machucvu)) || 'N/A';
                    newAccount.machucvuNavigation = { tenchucvu: tenchucvu };
                    allStaffData.push(newAccount);
                    renderTable('staff', allStaffData, false);
                } else {
                    newAccount = await api.createCustomerAccount(payload);
                    if (!newAccount || newAccount.success) {
                        newAccount = { ...payload, makh: Date.now() }; // Giả lập ID tạm thời
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
    const username = account?.email || '';
    const fullname = account?.hoten || '';
    const sdt = account?.sdt || '';
    const ngaysinh = account?.ngaysinh ? account.ngaysinh.split('T')[0] : '';
    const gioitinh = account?.gioitinh || 'Nam';
    const diachi = account?.diachi || '';
    const machucvu = account?.machucvu || null;
    const status = account?.trangthai || 'Hoạt động';
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
    } else {
        passwordSection = `
        <div class="form-grid-span-2">
            <label for="new_password">Mật khẩu <span class="text-danger">*</span></label>
            <input type="password" id="new_password" required>
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
    const username = account?.email || '';
    const fullname = account?.hoten || '';
    const phone = account?.sdt || '';
    const ngaysinh = account?.ngaysinh ? account.ngaysinh.split('T')[0] : '';
    const diachi = account?.diachi || '';
    const cccd = account?.cccd || '';
    const status = account?.trangthai || 'Hoạt động';
    const memberPoints = account?.diemthanhvien || 0;

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
        const id = currentRowBeingEdited?.dataset.id;
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

// === HÀM KIỂM TRA EMAIL & SỐ ĐIỆN THOẠI ===
function validateForm() {
    let isValid = true;

    // === EMAIL ===
    const emailInput = document.getElementById('username');
    const emailError = document.getElementById('email-error');
    const email = emailInput?.value.trim() || '';

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailInput, emailError, "Email không hợp lệ!");
        isValid = false;
    } else if (email) {
        showValid(emailInput, emailError, "Email hợp lệ");
    } else {
        clearValidation(emailInput, emailError);
    }

    // === SỐ ĐIỆN THOẠI ===
    const phoneInput = document.getElementById('sdt') || document.getElementById('phone');
    const phoneError = document.getElementById('phone-error');
    if (!phoneInput) return isValid;

    let phone = phoneInput.value.replace(/\D/g, ''); // Chỉ giữ số
    phoneInput.value = phone.slice(0, 10); // TỰ CẮT DƯ THỪA

    if (phone.length === 0) {
        clearValidation(phoneInput, phoneError);
    }
    else if (phone.length !== 10) {
        showError(phoneInput, phoneError, "SĐT phải đúng 10 số!");
        isValid = false;
    }
    else if (!/^0[3|5|7|8|9]/.test(phone)) {
        showError(phoneInput, phoneError, "SĐT phải bắt đầu 03/05/07/08/09");
        isValid = false;
    }
    else {
        // ĐỦ 10 SỐ + ĐÚNG ĐẦU → XANH NGAY!
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

// Gắn kiểm tra real-time
document.getElementById('modal')?.addEventListener('input', function(e) {
    const target = e.target;

    // Chỉ cho số + cắt 10 số
    if (target.matches('#sdt, #phone')) {
        target.value = target.value.replace(/\D/g, '').slice(0, 10);
    }

    // Kiểm tra real-time
    if (target.matches('#username, #sdt, #phone, #reset-email')) {
        validateForm();
    }
});