# HƯỚNG DẪN THÊM PROFILE MODAL VÀO CÁC TRANG LỄ TÂN

## Bước 1: Thêm CSS vào file CSS của từng trang

Thêm đoạn CSS này vào cuối file CSS của mỗi trang (nếu chưa có):

```css
/* ============================================
   PROFILE MODAL STYLES
   ============================================ */

.profile-info-container {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
}

.profile-info-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 15px;
}

.profile-info-row:last-child {
    margin-bottom: 0;
}

.profile-info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.profile-info-item label {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
}

.profile-info-item label i {
    font-size: 14px;
    color: #3b82f6;
}

.profile-info-item span {
    font-size: 14px;
    color: #1e293b;
    font-weight: 500;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
}

/* Password Change Form Styles */
#changePasswordForm {
    margin-top: 20px;
}

#changePasswordForm .form-group {
    margin-bottom: 16px;
}

#changePasswordForm .form-group label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 6px;
}

#changePasswordForm .form-control {
    width: 100%;
    padding: 10px 14px;
    font-size: 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s ease;
    background: white;
    color: #1e293b;
}

#changePasswordForm .form-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

#changePasswordForm .form-control:hover {
    border-color: #cbd5e1;
}

.form-text {
    font-size: 12px;
    color: #64748b;
    margin-top: 6px;
    display: block;
    line-height: 1.4;
}

#changePasswordForm .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

#changePasswordForm .btn-primary:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

#changePasswordForm .btn-primary:active {
    transform: translateY(0);
}

#changePasswordForm .btn-primary i {
    margin-right: 6px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .profile-info-row {
        grid-template-columns: 1fr;
        gap: 12px;
    }
}
```

## Bước 2: Thêm vào HTML

### 2.1. Thêm nút profile trong header (nếu chưa có)

Tìm phần header với id="userProfileBtn" hoặc thêm:

```html
<div class="user-profile" id="userProfileBtn" style="cursor: pointer;">
    <i class="fas fa-user-circle"></i>
    <span id="userName">Lễ Tân</span>
</div>
```

### 2.2. Thêm modal profile trước thẻ đóng </body>

Copy toàn bộ nội dung file `profile-modal.html` vào trước thẻ `</body>`

### 2.3. Thêm script profile-modal.js

Thêm script này TRƯỚC thẻ đóng `</body>`, sau các script khác:

```html
<script src="js/profile-modal.js"></script>
</body>
```

## Bước 3: Đảm bảo trang có hàm showNotification

Nếu trang chưa có hàm `showNotification`, thêm vào file JS của trang:

```javascript
function showNotification(message, type = 'info') {
    // Tạo notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
```

Và CSS cho notification:

```css
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    transform: translateX(400px);
    transition: transform 0.3s ease;
}

.notification.show {
    transform: translateX(0);
}

.notification-success {
    background: #10b981;
    color: white;
}

.notification-error {
    background: #ef4444;
    color: white;
}
```

## Danh sách các trang cần thêm:

- [ ] checkin.html
- [ ] checkout.html  
- [ ] services.html
- [ ] room_change.html
- [ ] rooms_management.html
- [ ] letan_dashboard.html
- [ ] customers.html
- [ ] booking.html
- [x] booking_list.html (đã có)

## Lưu ý:

- File `profile-modal.js` đã được tạo sẵn, chỉ cần include vào
- Modal HTML đã có sẵn trong `profile-modal.html`
- CSS đã được tối ưu cho tất cả các trang
- Chức năng đổi mật khẩu hoạt động giống bên khách hàng
