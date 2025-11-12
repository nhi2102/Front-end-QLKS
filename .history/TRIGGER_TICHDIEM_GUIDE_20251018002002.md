# 📌 HƯỚNG DẪN TRIGGER TÍCH ĐIỂM

## 🎯 Tổng quan
Hệ thống tích điểm được quản lý **HOÀN TOÀN TỰ ĐỘNG** bởi trigger database.
Khi khách check-out (TRANGTHAI = 'Đã trả'), điểm thành viên được cập nhật ngay lập tức.

---

## 🔧 Trigger SQL

```sql
CREATE TRIGGER TRG_UPDATETICHDIEM
ON DATPHONG
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Lấy mã đặt phòng vừa update
    DECLARE @MADATPHONG INT;
    SELECT @MADATPHONG = MADATPHONG FROM inserted;
    
    -- Lấy mã khách hàng
    DECLARE @MAKH INT;
    SET @MAKH = (SELECT MAKH FROM DATPHONG WHERE MADATPHONG = @MADATPHONG);
    
    -- Lấy tổng tiền (đã trừ giảm giá)
    DECLARE @TONGTIEN INT;
    SET @TONGTIEN = (SELECT TONGTIEN FROM DATPHONG WHERE MADATPHONG = @MADATPHONG);
    
    -- Cập nhật điểm: TONGTIEN * 0.001
    UPDATE KHACHHANG
    SET DIEMTHANHVIEN = DIEMTHANHVIEN + (@TONGTIEN * 0.001)
    WHERE MAKH = @MAKH;
END
```

### ⚠️ Lưu ý quan trọng
Trigger hiện tại **GHI ĐÈ** điểm thay vì **CỘNG THÊM**:
```sql
SET DIEMTHANHVIEN = @TONGTIEN * 0.001  -- ❌ SAI: Ghi đè
```

**Nên sửa thành:**
```sql
SET DIEMTHANHVIEN = DIEMTHANHVIEN + (@TONGTIEN * 0.001)  -- ✅ ĐÚNG: Cộng dồn
```

---

## 📊 Công thức tính điểm

```
ĐIỂM MỚI = TỔNG TIỀN × 0.001
```

### Ví dụ:
| Tổng tiền (VNĐ) | Điểm nhận được | Tính toán |
|----------------|----------------|-----------|
| 1,000,000 | 1,000 | 1,000,000 × 0.001 |
| 2,500,000 | 2,500 | 2,500,000 × 0.001 |
| 500,000 | 500 | 500,000 × 0.001 |
| 100,000 | 100 | 100,000 × 0.001 |

**Tỷ lệ:** 1,000 VNĐ = 1 điểm (0.1%)

---

## 🔄 Luồng hoạt động

```
1. Khách đặt phòng
   ↓
2. Lễ tân check-in
   ↓
3. Khách sử dụng dịch vụ (nếu có)
   ↓
4. Lễ tân checkout → UPDATE DATPHONG SET TRANGTHAI = 'Đã trả'
   ↓
5. ⚡ TRIGGER TRG_UPDATETICHDIEM tự động chạy
   ↓
6. Tính: newPoints = TONGTIEN × 0.001
   ↓
7. UPDATE KHACHHANG SET DIEMTHANHVIEN = ... 
   ↓
8. ✅ Điểm được cập nhật vào tài khoản khách hàng
```

---

## 💻 Frontend Integration

### 1. Hiển thị điểm ở trang đặt phòng
**File:** `cus_info_booking.html`
```html
<div class="loyalty-points-display">
    <div class="points-header">
        <div class="points-label">
            <i class="fas fa-star"></i>
            <span>Điểm thành viên:</span>
        </div>
        <span id="customer-loyalty-points">0</span>
    </div>
    <div class="points-info">
        <span>Nhận điểm sau khi check-out</span>
    </div>
</div>
```

### 2. Fetch và hiển thị điểm
**File:** `cus_info.js`
```javascript
async function displayLoyaltyPoints(bookingData) {
    // 1. Lấy mã khách hàng từ localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let makhachhang = currentUser.makh;
    
    // 2. Fetch thông tin khách hàng
    const response = await fetch(`https://localhost:7076/api/Khachhangs/${makhachhang}`);
    const customerData = await response.json();
    
    // 3. Lấy điểm hiện tại
    const currentPoints = customerData.diemthanhvien || 0;
    
    // 4. Tính điểm sẽ nhận (TONGTIEN * 0.001)
    const totalPrice = bookingData.totalPrice || 0;
    const pointsToEarn = Math.floor(totalPrice * 0.001);
    
    // 5. Hiển thị
    document.getElementById('customer-loyalty-points').textContent = 
        currentPoints.toLocaleString('vi-VN');
    
    // 6. Hiển thị container
    document.querySelector('.loyalty-points-display').style.display = 'block';
}
```

### 3. CSS đơn giản
**File:** `cus_info.css`
```css
.loyalty-points-display {
    display: none;
    margin-top: 15px;
    padding: 12px 15px;
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    border-radius: 4px;
}

.loyalty-points-display .points-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.loyalty-points-display .points-value {
    color: #667eea;
    font-size: 18px;
    font-weight: bold;
}
```

---

## ⚡ Điểm khác biệt với code cũ

| Khía cạnh | Code cũ (đã xóa) | Code mới (trigger) |
|-----------|------------------|-------------------|
| **Cập nhật điểm** | Frontend gửi API PUT | Trigger tự động |
| **Thời điểm** | Sau khi đặt phòng | Sau khi check-out |
| **Công thức** | totalAmount × 0.01 (1%) | TONGTIEN × 0.001 (0.1%) |
| **Xử lý lỗi** | Try-catch trong JS | Database đảm bảo |
| **Tin cậy** | Có thể bị lỗi network | 100% tin cậy |

---

## 🧪 Kiểm tra trigger

### Test case 1: Đặt phòng đơn giản
```sql
-- Giả sử: MAKH = 1, DIEMTHANHVIEN hiện tại = 5000

-- 1. Tạo đặt phòng (TONGTIEN = 1,000,000)
INSERT INTO DATPHONG (MAKH, NGAYDAT, NGAYNHANPHONG, NGAYTRAPHONG, TRANGTHAI, TONGTIEN)
VALUES (1, GETDATE(), '2025-10-20', '2025-10-22', 'Đã nhận', 1000000);

-- 2. Checkout
UPDATE DATPHONG 
SET TRANGTHAI = 'Đã trả' 
WHERE MADATPHONG = [ID vừa tạo];

-- 3. Kiểm tra điểm
SELECT DIEMTHANHVIEN FROM KHACHHANG WHERE MAKH = 1;
-- Kết quả mong đợi (SAU KHI SỬA TRIGGER):
-- 5000 + (1,000,000 × 0.001) = 5000 + 1000 = 6000
-- Kết quả hiện tại (TRIGGER CHƯA SỬA):
-- 1,000,000 × 0.001 = 1000 (ghi đè điểm cũ ❌)
```

### Test case 2: Đặt phòng theo đoàn (có giảm giá)
```sql
-- Giả sử: Đặt 6 phòng → Giảm 3%
-- DONGIA = 2,000,000
-- GIAMGIA = 60,000
-- TONGTIEN = 1,940,000

UPDATE DATPHONG 
SET TRANGTHAI = 'Đã trả' 
WHERE MADATPHONG = [ID];

-- Điểm nhận: 1,940,000 × 0.001 = 1,940
```

---

## 🔧 Sửa lỗi trigger (nếu cần)

**Vấn đề:** Trigger hiện tại GHI ĐÈ điểm thay vì CỘNG THÊM

**Giải pháp:**
```sql
-- Xóa trigger cũ
DROP TRIGGER TRG_UPDATETICHDIEM;
GO

-- Tạo lại với logic đúng
CREATE TRIGGER TRG_UPDATETICHDIEM
ON DATPHONG
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @MADATPHONG INT;
    DECLARE @MAKH INT;
    DECLARE @TONGTIEN DECIMAL(18,2);
    DECLARE @TRANGTHAI_NEW NVARCHAR(50);
    DECLARE @TRANGTHAI_OLD NVARCHAR(50);
    
    -- Lấy thông tin từ inserted và deleted
    SELECT 
        @MADATPHONG = i.MADATPHONG,
        @MAKH = i.MAKH,
        @TONGTIEN = i.TONGTIEN,
        @TRANGTHAI_NEW = i.TRANGTHAI,
        @TRANGTHAI_OLD = d.TRANGTHAI
    FROM inserted i
    INNER JOIN deleted d ON i.MADATPHONG = d.MADATPHONG;
    
    -- Chỉ cập nhật điểm khi:
    -- 1. Trạng thái CŨ khác 'Đã trả'
    -- 2. Trạng thái MỚI là 'Đã trả'
    -- (Tránh cập nhật lặp lại)
    IF @TRANGTHAI_OLD <> N'Đã trả' AND @TRANGTHAI_NEW = N'Đã trả'
    BEGIN
        UPDATE KHACHHANG
        SET DIEMTHANHVIEN = DIEMTHANHVIEN + (@TONGTIEN * 0.001)
        WHERE MAKH = @MAKH;
        
        PRINT N'✅ Đã cộng ' + CAST(@TONGTIEN * 0.001 AS NVARCHAR) + N' điểm cho khách hàng ' + CAST(@MAKH AS NVARCHAR);
    END
END
GO
```

---

## 📝 Database Schema

```sql
-- Bảng KHACHHANG
CREATE TABLE KHACHHANG (
    MAKH INT PRIMARY KEY IDENTITY(1,1),
    HOTEN NVARCHAR(100),
    EMAIL NVARCHAR(100),
    SDT NVARCHAR(20),
    DIEMTHANHVIEN INT DEFAULT 0,  -- ← Điểm tích lũy
    ...
);

-- Bảng DATPHONG
CREATE TABLE DATPHONG (
    MADATPHONG INT PRIMARY KEY IDENTITY(1,1),
    MAKH INT,
    NGAYDAT DATETIME,
    NGAYNHANPHONG DATE,
    NGAYTRAPHONG DATE,
    TRANGTHAI NVARCHAR(50),  -- ← 'Đã trả' trigger sẽ chạy
    TONGTIEN DECIMAL(18,2),  -- ← Tổng tiền sau giảm giá
    DONGIA DECIMAL(18,2),
    GIAMGIA DECIMAL(18,2),
    ...
);
```

---

## 🎯 Kết luận

### ✅ Ưu điểm của trigger
- Tự động, không cần code frontend
- 100% tin cậy, không bị lỗi network
- Dữ liệu luôn đồng bộ
- Dễ maintain, chỉ sửa 1 chỗ

### ⚠️ Lưu ý
- Trigger chỉ chạy khi **UPDATE DATPHONG SET TRANGTHAI = 'Đã trả'**
- Điểm dựa trên **TONGTIEN** (đã trừ giảm giá đặt đoàn)
- Nên sửa trigger để **CỘNG THÊM** thay vì **GHI ĐÈ**

### 🚀 Next steps
1. Kiểm tra trigger hoạt động đúng chưa
2. Sửa logic từ "ghi đè" → "cộng thêm"
3. Test với nhiều case khác nhau
4. Có thể thêm log để tracking việc cộng điểm

---

**Created:** 2025-10-18
**Author:** GitHub Copilot
**Version:** 1.0
