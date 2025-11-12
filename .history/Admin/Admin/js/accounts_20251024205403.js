import { openModal, closeModal } from './main.js';
import * as api from '../api/accounts.api.js'; 

document.addEventListener('DOMContentLoaded', async function () {
    let allStaffData = [];
    let allCustomerData = [];
    let allRoles = [];
    let currentRowBeingEdited = null; 
    
    const modal = document.getElementById('modal'); 
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    const addStaffBtn = document.getElementById('add-staff-btn');
    const staffTableBody = document.getElementById('staff-table-body');
    const staffSearch = document.getElementById('staff-search');
    const staffLoadingRow = document.getElementById('staff-loading-row');

    const customerTableBody = document.getElementById('customer-table-body');
    const customerSearch = document.getElementById('customer-search');
    const customerLoadingRow = document.getElementById('customer-loading-row');

    async function initializeAccounts() {
        console.log('Bắt đầu khởi tạo tài khoản...');
        try {
            const [staffData, customerData, rolesData] = await Promise.all([
                api.getStaff(),
                api.getCustomers(),
                api.getRoles()
            ]);

            console.log('Danh sách nhân viên nhận được:', JSON.stringify(staffData));
            allStaffData = staffData || [];
            allCustomerData = customerData || [];
            allRoles = rolesData || [];
            console.log('Danh sách vai trò nhận được:', JSON.stringify(allRoles));
            console.log('Danh sách khách hàng nhận được:', JSON.stringify(allCustomerData));

            if (allRoles.length === 0) {
                allRoles = [
                    { machucvu: 1, tenchucvu: "Quản lý" },
                    { machucvu: 2, tenchucvu: "Nhân viên lễ tân" }
                ];
                console.warn('Sử dụng dữ liệu mẫu vì API không trả về vai trò.');
            }

            renderStaffTable(allStaffData);
            renderCustomerTable(allCustomerData);
        } catch (error) {
            console.error('Lỗi khi khởi tạo tài khoản:', error);
            staffLoadingRow.innerHTML = `<td colspan="5" class="text-center error-message">Không thể tải dữ liệu nhân viên. Vui lòng kiểm tra API.</td>`;
            customerLoadingRow.innerHTML = `<td colspan="6" class="text-center error-message">Không thể tải dữ liệu khách hàng. Vui lòng kiểm tra API.</td>`;
        }
    }

    function renderStaffTable(staffList) {
        staffTableBody.innerHTML = ''; 
        if (staffList.length === 0) {
            staffTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Không tìm thấy nhân viên nào.</td></tr>`;
            return;
        }

        staffList.forEach(account => {
            const isLocked = account.trangthai === 'Đã khóa';
            const statusClass = isLocked ? 'status-locked' : 'status-active';
            const lockIcon = isLocked ? 'lock' : 'unlock';
            const role = allRoles.find(r => r.machucvu === account.machucvu);
            const roleName = role ? role.tenchucvu : 'N/A';
            
            const row = document.createElement('tr');
            row.dataset.username = account.email; 
            row.dataset.id = account.manv;      
            
            row.innerHTML = `
                <td>${account.email || 'N/A'}</td>
                <td>${account.hoten || 'N/A'}</td>
                <td>${roleName}</td>
                <td><span class="status-badge ${statusClass}">${isLocked ? 'Đã khóa' : 'Hoạt động'}</span></td>
                <td class="text-center">
                    <button class="action-btn" data-action="edit" title="Sửa" ${isLocked ? 'disabled' : ''}>
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="action-btn" data-action="lock" title="Khóa/Mở khóa">
                        <i data-lucide="${lockIcon}"></i>
                    </button>
                </td>
            `;
            staffTableBody.appendChild(row);
        });

        if (typeof window.createLucideIcons === 'function' && window.lucideIcons) {
            window.createLucideIcons({ icons: window.lucideIcons });
        } else {
            console.warn('Lucide chưa sẵn sàng, thử lại sau 100ms...');
            setTimeout(() => {
                if (typeof window.createLucideIcons === 'function' && window.lucideIcons) {
                    window.createLucideIcons({ icons: window.lucideIcons });
                } else {
                    console.error('Lucide vẫn chưa sẵn sàng.');
                }
            }, 100);
        }
    }

    function renderCustomerTable(customerList) {
        customerTableBody.innerHTML = ''; 
        if (customerList.length === 0) {
            customerTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Không tìm thấy khách hàng nào.</td></tr>`;
            return;
        }

        customerList.forEach(account => {
            const isLocked = account.trangthai === 'Đã khóa' || !account.trangthai;
            const statusClass = isLocked ? 'status-locked' : 'status-active';
            const lockIcon = isLocked ? 'lock' : 'unlock';

            const row = document.createElement('tr');
            row.dataset.username = account.email; 
            row.dataset.id = account.makh;      

            row.innerHTML = `
                <td>${account.email || 'N/A'}</td>
                <td>${account.hoten || 'N/A'}</td>
                <td>${account.sdt || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${isLocked ? 'Đã khóa' : 'Hoạt động'}</span></td>
                <td class="text-center">
                    <button class="action-btn" data-action="edit" title="Sửa" ${isLocked ? 'disabled' : ''}>
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="action-btn" data-action="lock" title="Khóa/Mở khóa">
                        <i data-lucide="${lockIcon}"></i>
                    </button>
                </td>
            `;
            customerTableBody.appendChild(row);
        });

        if (typeof window.createLucideIcons === 'function' && window.lucideIcons) {
            window.createLucideIcons({ icons: window.lucideIcons });
        } else {
            console.warn('Lucide chưa sẵn sàng, thử lại sau 100ms...');
            setTimeout(() => {
                if (typeof window.createLucideIcons === 'function' && window.lucideIcons) {
                    window.createLucideIcons({ icons: window.lucideIcons });
                } else {
                    console.error('Lucide vẫn chưa sẵn sàng.');
                }
            }, 100);
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            const targetPanel = document.getElementById(button.dataset.target);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    const getAccountFormContent = (isEditMode = false, accountType = 'staff') => {
        console.log('Đang render form với vai trò:', JSON.stringify(allRoles));
        const isCustomer = accountType === 'customer';
        let formHTML = `
        <form id="account-form" class="modal-form form-grid" data-account-type="${accountType}">
            <div>
                <label for="username">Tên đăng nhập (Email)</label>
                <input type="email" id="username" required ${isEditMode ? 'disabled' : ''}>
            </div>
            <div>
                <label for="fullname">Họ và tên</label>
                <input type="text" id="fullname" required>
            </div>
            <div style="${isCustomer ? 'display: none;' : 'display: block;'}">
                <label for="role">Vai trò</label>
                <select id="role" ${isEditMode && isCustomer ? 'disabled' : ''}>
                    ${allRoles.map(role => `<option value="${role.machucvu}">${role.tenchucvu}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="birthDate">Ngày sinh</label>
                <input type="date" id="birthDate" required>
            </div>
            <div>
                <label for="phone">Số điện thoại</label>
                <input type="tel" id="phone" required>
            </div>
            <div>
                <label for="gender">Giới tính</label>
                <select id="gender" required>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                </select>
            </div>
            <div class="form-grid-span-2">
                <label for="address">Địa chỉ</label>
                <input type="text" id="address" required>
            </div>
            <div>
                <label for="status">Trạng thái</label>
                <select id="status" required>
                    <option value="Hoạt động" selected>Hoạt động</option>
                    <option value="Đã khóa">Đã khóa</option>
                </select>
            </div>
            ${isCustomer ? '<div><label for="memberPoints">Điểm thành viên</label><input type="text" id="memberPoints" disabled></div>' : ''}`;

        if (isEditMode) {
            formHTML += `
            <div>
                <label for="new_password">Mật khẩu mới</label>
                <input type="password" id="new_password" autocomplete="new-password">
                <p class="form-note">Để trống nếu không muốn thay đổi.</p>
            </div>`;
        } else {
            formHTML += `
            <div>
                <label for="new_password">Mật khẩu</label>
                <input type="password" id="new_password" autocomplete="new-password" required>
            </div>`;
        }

        formHTML += `
            <div class="modal-form-footer form-grid-span-2">
                <button type="button" id="cancel-btn" class="btn btn-secondary">Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu</button>
            </div>
        </form>`;
        return formHTML;
    };
    
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', () => {
            currentRowBeingEdited = null; 
            openModal('Thêm nhân viên mới', getAccountFormContent(false, 'staff')); 
        });
    }

    if (staffTableBody) {
        staffTableBody.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.action-btn');
            if (!targetButton || targetButton.disabled) return;
            const row = targetButton.closest('tr');
            if (!row) return;
            
            const id = row.dataset.id;
            const action = targetButton.dataset.action;
            handleAccountAction(action, row, 'staff', targetButton, id);
        });
    }

    if (customerTableBody) {
        customerTableBody.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.action-btn');
            if (!targetButton || targetButton.disabled) return;
            const row = targetButton.closest('tr');
            if (!row) return;

            const id = row.dataset.id;
            const action = targetButton.dataset.action;
            handleAccountAction(action, row, 'customer', targetButton, id);
        });
    }

    async function handleAccountAction(action, row, accountType, targetButton, id) {
        const username = row.dataset.username; 
        console.log(`Xử lý hành động ${action} cho ${accountType} với ID: ${id}, Username: ${username}`);

        if (action === 'delete') {
            if (accountType === 'staff') {
                openModal('Xác nhận xóa', `
                    <p>Bạn có chắc chắn muốn xóa tài khoản <strong>${username}</strong> không?</p>
                    <div class="modal-form-footer">
                        <button type="button" id="cancel-btn" class="btn btn-secondary">Không</button>
                        <button type="button" id="confirm-delete-btn" class="btn btn-danger">Có, Xóa</button>
                    </div>`);
                
                document.getElementById('confirm-delete-btn').onclick = async () => {
                    try {
                        await api.deleteStaffAccount(id);
                        row.remove(); 
                        allStaffData = allStaffData.filter(a => a.manv != id);
                        console.log(`Đã xóa nhân viên ${username}`);
                        closeModal();
                    } catch (error) {
                        console.error(`Lỗi khi xóa nhân viên ${username}:`, error);
                        openModal('Lỗi API', `<p>${error.message}</p><div class="modal-form-footer"><button type="button" id="cancel-btn" class="btn btn-secondary">OK</button></div>`);
                    }
                };
            }
        }
        
        if (action === 'edit') {
            currentRowBeingEdited = row; 
            const dataList = (accountType === 'staff') ? allStaffData : allCustomerData;
            const idKey = (accountType === 'staff') ? 'manv' : 'makh';
            const accountData = dataList.find(a => a[idKey] == id);

            openModal(`Sửa tài khoản: ${username}`, getAccountFormContent(true, accountType));
            
            document.getElementById('username').value = accountData.email || '';
            document.getElementById('fullname').value = accountData.hoten || '';
            if (accountType === 'staff') {
                document.getElementById('role').value = accountData.machucvu || '';
                document.getElementById('birthDate').value = accountData.ngaysinh || '';
                document.getElementById('phone').value = accountData.sdt || '';
                document.getElementById('gender').value = accountData.gioitinh || 'Khác';
                document.getElementById('address').value = accountData.diachi || '';
                document.getElementById('status').value = accountData.trangthai || 'Hoạt động';
            } else {
                document.getElementById('birthDate').value = accountData.ngaysinh || '';
                document.getElementById('phone').value = accountData.sdt || '';
                document.getElementById('gender').value = accountData.gioitinh || 'Khác';
                document.getElementById('address').value = accountData.diachi || '';
                document.getElementById('status').value = accountData.trangthai || 'Hoạt động';
                document.getElementById('memberPoints').value = accountData.diemthanhvien || '0';
            }
        }

        if (action === 'lock') {
            const statusBadge = row.querySelector('.status-badge');
            const editButton = row.querySelector('[data-action="edit"]');
            const lockIcon = targetButton.querySelector('i');
            
            const dataList = (accountType === 'staff') ? allStaffData : allCustomerData;
            const idKey = (accountType === 'staff') ? 'manv' : 'makh';
            const account = dataList.find(a => a[idKey] == id);
            const isCurrentlyActive = account.trangthai !== 'Đã khóa';
            const newStatus = isCurrentlyActive ? 'Đã khóa' : 'Hoạt động';
            const newLockIcon = isCurrentlyActive ? 'unlock' : 'lock';

            console.log(`Thay đổi trạng thái ${accountType} ${username} từ ${account.trangthai} sang ${newStatus}`);

            try {
                // Cập nhật trạng thái trong dữ liệu cục bộ trước
                account.trangthai = newStatus;
                console.log(`Đã cập nhật trạng thái cục bộ cho ${username}: ${newStatus}`);

                // Gọi API để cập nhật trạng thái
                if (accountType === 'staff') {
                    await api.updateStaffAccount(id, { status: newStatus }, account);
                } else {
                    await api.updateCustomerAccount(id, { status: newStatus }, account);
                }
                console.log(`API cập nhật trạng thái thành công cho ${username}`);

                // Cập nhật UI
                statusBadge.className = `status-badge ${isCurrentlyActive ? 'status-locked' : 'status-active'}`;
                statusBadge.textContent = newStatus;
                if (editButton) editButton.disabled = !isCurrentlyActive;
                if (lockIcon) lockIcon.setAttribute('data-lucide', newLockIcon);

                // Làm mới bảng để đảm bảo đồng bộ
                if (accountType === 'staff') {
                    renderStaffTable(allStaffData);
                } else {
                    renderCustomerTable(allCustomerData);
                }

                // Cập nhật icon Lucide
                if (typeof window.createLucideIcons === 'function' && window.lucideIcons) {
                    window.createLucideIcons({ icons: window.lucideIcons });
                    console.log(`Đã cập nhật icon Lucide cho ${username}`);
                }
            } catch (error) {
                console.error(`Lỗi khi cập nhật trạng thái ${username}:`, error);
                // Hoàn nguyên trạng thái cục bộ nếu API thất bại
                account.trangthai = isCurrentlyActive ? 'Hoạt động' : 'Đã khóa';
                openModal('Lỗi API', `<p>${error.message}</p><div class="modal-form-footer"><button type="button" id="cancel-btn" class="btn btn-secondary">OK</button></div>`);
            }
        }
    }

    if (modal) {
        modal.addEventListener('submit', async (event) => {
            if (event.target.id === 'account-form') {
                event.preventDefault();
                
                const form = event.target;
                const accountType = form.dataset.accountType || 'staff';
                
                const username = document.getElementById('username').value;
                const fullName = document.getElementById('fullname').value;
                const role = accountType === 'customer' ? 'Khách hàng' : document.getElementById('role').value;
                const newPassword = document.getElementById('new_password').value;
                const birthDate = document.getElementById('birthDate')?.value;
                const phone = document.getElementById('phone')?.value;
                const gender = document.getElementById('gender')?.value;
                const address = document.getElementById('address')?.value;
                const status = document.getElementById('status')?.value;

                let payload = {
                    username,
                    fullName,
                    role,
                    birthDate,
                    phone,
                    gender,
                    address,
                    status
                };
                if (newPassword) payload.password = newPassword;
                
                try {
                    if (currentRowBeingEdited) {
                        const id = currentRowBeingEdited.dataset.id;
                        let updatedAccount;

                        const dataList = (accountType === 'staff') ? allStaffData : allCustomerData;
                        const idKey = (accountType === 'staff') ? 'manv' : 'makh';
                        const originalAccount = dataList.find(a => a[idKey] == id);
                        
                        if (accountType === 'staff') {
                            updatedAccount = await api.updateStaffAccount(id, payload, originalAccount);
                        } else {
                            updatedAccount = await api.updateCustomerAccount(id, payload, originalAccount);
                        }
                        
                        const accountIndex = dataList.findIndex(a => a[idKey] == id);
                        if (accountIndex > -1) {
                            dataList[accountIndex] = updatedAccount;
                        }
                        
                        if (accountType === 'staff') renderStaffTable(allStaffData);
                        else renderCustomerTable(allCustomerData);
                    } else {
                        const newAccount = await api.createStaffAccount(payload);
                        allStaffData.push(newAccount);
                        renderStaffTable(allStaffData);
                    }
                    closeModal();
                } catch (error) {
                    console.error(`Lỗi khi lưu tài khoản ${username}:`, error);
                    openModal('Lỗi API', `<p>${error.message}</p><div class="modal-form-footer"><button type="button" id="cancel-btn" class="btn btn-secondary">OK</button></div>`);
                }
            }
        });

        modal.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'cancel-btn') {
                closeModal();
            }
        });
    }

    function filterTable(searchInput, dataList, renderFunction) {
        const filter = searchInput.value.toLowerCase();
        
        if (!filter) {
            renderFunction(dataList); 
            return;
        }

        const filteredList = dataList.filter(account => {
            const username = (account.email || '').toLowerCase(); 
            const fullname = (account.hoten || '').toLowerCase(); 
            return username.includes(filter) || fullname.includes(filter);
        });
        
        renderFunction(filteredList);
    }

    if (staffSearch) {
        staffSearch.addEventListener('keyup', () => filterTable(staffSearch, allStaffData, renderStaffTable));
    }
    if (customerSearch) {
        customerSearch.addEventListener('keyup', () => filterTable(customerSearch, allCustomerData, renderCustomerTable));
    }

    if (staffTableBody || customerTableBody) {
        await initializeAccounts();
    }
});