# HƯỚNG DẪN LƯU ĐIỂM TÍCH LŨY VÀO CHI TIẾT HÓA ĐƠN

## 📋 Tổng quan

Khi khách hàng sử dụng điểm tích lũy để giảm giá khi đặt phòng, hệ thống sẽ lưu thông tin này vào bảng **`chitiethoadons`** với loại phí đặc biệt để theo dõi và hiển thị.

---

## 🎯 Cách thức hoạt động

### 1. **Cấu trúc dữ liệu**

Frontend gửi request đặt phòng với thông tin:
```json
{
  "Makh": 1,
  "CheckIn": "2025-12-01",
  "CheckOut": "2025-12-03",
  "MaLoaiPhongs": [1, 2],
  "GiaPhongs": [300000, 500000],
  "SoLuongPhongs": [1, 1],
  "DiemSuDung": 50000,         // ← Số điểm khách sử dụng
  "LuuChiTietDiem": true       // ← Flag yêu cầu lưu vào chitiethoadons
}
```

### 2. **Loại phí trong bảng `chitiethoadons`**

Hệ thống sử dụng 3 loại phí chính:

| Loại phí | Mô tả | Giá trị |
|----------|-------|---------|
| **"Phòng"** | Tiền phòng | Dương |
| **"Dịch vụ"** | Tiền dịch vụ | Dương |
| **"Giảm giá - Điểm tích lũy"** | Giảm giá từ điểm | **Âm** (-) |

---

## 💻 Code Backend (ASP.NET Core)

### **File: DatPhongController.cs**

```csharp
[HttpPost("datphong")]
public async Task<IActionResult> DatPhong([FromBody] DatPhongRequest request)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    
    try
    {
        // 1. TẠO ĐẶT PHÒNG
        var datPhong = new Datphong
        {
            Makh = request.Makh,
            Checkin = request.CheckIn,
            Checkout = request.CheckOut,
            // ... các trường khác
        };
        await _context.Datphongs.AddAsync(datPhong);
        await _context.SaveChangesAsync();
        
        // 2. TẠO HÓA ĐƠN
        var hoaDon = new Hoadon
        {
            Madatphong = datPhong.Madatphong,
            Ngaylap = DateTime.Now,
            Tongtien = 0 // Sẽ tính sau
        };
        await _context.Hoadons.AddAsync(hoaDon);
        await _context.SaveChangesAsync();
        
        // 3. THÊM CHI TIẾT TIỀN PHÒNG
        decimal tongTienPhong = 0;
        for (int i = 0; i < request.MaLoaiPhongs.Count; i++)
        {
            decimal tienPhong = request.GiaPhongs[i] * request.SoLuongPhongs[i] * soNgay;
            tongTienPhong += tienPhong;
            
            var chiTietPhong = new Chitiethoadon
            {
                Mahoadon = hoaDon.Mahoadon,
                Madatphong = datPhong.Madatphong,
                Loaiphi = "Phòng",
                Dongia = tienPhong,
                Mota = $"Tiền phòng {request.MaLoaiPhongs[i]}"
            };
            await _context.Chitiethoadons.AddAsync(chiTietPhong);
        }
        
        // 4. THÊM CHI TIẾT DỊCH VỤ (nếu có)
        decimal tongTienDichVu = 0;
        // ... code thêm dịch vụ ...
        
        // 5. ✨ THÊM CHI TIẾT ĐIỂM TÍCH LŨY ✨
        if (request.DiemSuDung > 0 && request.LuuChiTietDiem)
        {
            var chiTietDiem = new Chitiethoadon
            {
                Mahoadon = hoaDon.Mahoadon,
                Madatphong = datPhong.Madatphong,
                Loaiphi = "Giảm giá - Điểm tích lũy",  // ← Loại phí đặc biệt
                Dongia = -request.DiemSuDung,          // ← Giá trị ÂM
                Mota = $"Sử dụng {request.DiemSuDung:N0} điểm tích lũy (1 điểm = 1 VNĐ)"
            };
            await _context.Chitiethoadons.AddAsync(chiTietDiem);
            
            // Trừ điểm khách hàng
            var khachHang = await _context.Khachhangs.FindAsync(request.Makh);
            if (khachHang != null)
            {
                khachHang.Diemthanhvien -= request.DiemSuDung;
            }
        }
        
        // 6. TÍNH TỔNG TIỀN = SUM(Dongia) từ chitiethoadons
        await _context.SaveChangesAsync();
        
        var tongTien = await _context.Chitiethoadons
            .Where(ct => ct.Mahoadon == hoaDon.Mahoadon)
            .SumAsync(ct => ct.Dongia);
        
        hoaDon.Tongtien = tongTien;
        datPhong.Tongtien = tongTien;
        
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        
        return Ok(new
        {
            success = true,
            maDatPhong = datPhong.Madatphong,
            hoaDonId = hoaDon.Mahoadon,
            tongTien = tongTien,
            diemDaSuDung = request.DiemSuDung,
            message = "Đặt phòng thành công!"
        });
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        return BadRequest(new { success = false, message = ex.Message });
    }
}
```

### **Model: DatPhongRequest**

```csharp
public class DatPhongRequest
{
    public int Makh { get; set; }
    public DateTime CheckIn { get; set; }
    public DateTime CheckOut { get; set; }
    public List<int> MaLoaiPhongs { get; set; }
    public List<decimal> GiaPhongs { get; set; }
    public List<int> SoLuongPhongs { get; set; }
    public string? Ghichu { get; set; }
    public int DiemSuDung { get; set; }        // ← Điểm sử dụng
    public bool LuuChiTietDiem { get; set; }   // ← Flag lưu chi tiết
}
```

---

## 📊 Ví dụ dữ liệu trong Database

### Bảng `chitiethoadons`

| machitiet | mahoadon | madatphong | loaiphi | dongia | mota |
|-----------|----------|------------|---------|--------|------|
| 1 | HD001 | DP001 | Phòng | 300000 | Tiền phòng Deluxe x1 |
| 2 | HD001 | DP001 | Phòng | 500000 | Tiền phòng Suite x1 |
| 3 | HD001 | DP001 | Dịch vụ | 199000 | Dịch vụ Spa |
| 4 | HD001 | DP001 | **Giảm giá - Điểm tích lũy** | **-50000** | Sử dụng 50,000 điểm |

### Bảng `hoadons`

| mahoadon | madatphong | tongtien | ngaylap |
|----------|------------|----------|---------|
| HD001 | DP001 | **949000** | 2025-11-29 |

**Cách tính:** 300000 + 500000 + 199000 - 50000 = **949,000 VNĐ**

---

## 🎨 Frontend hiển thị

Khi khách hàng xem chi tiết đặt phòng, giao diện sẽ hiển thị:

```
┌─────────────────────────────────────┐
│  CHI TIẾT GIÁ                       │
├─────────────────────────────────────┤
│ 🛏️  Tiền phòng:      800,000 VNĐ   │
│ 🔔  Tiền dịch vụ:    199,000 VNĐ   │
│ ⭐  Giảm giá điểm:   -50,000 VNĐ   │
│     (50,000 điểm)                   │
├─────────────────────────────────────┤
│ 💰  TỔNG TIỀN:       949,000 VNĐ   │
└─────────────────────────────────────┘
```

---

## ✅ Checklist triển khai

- [ ] Thêm field `DiemSuDung` và `LuuChiTietDiem` vào model request
- [ ] Thêm logic insert record với `loaiphi = "Giảm giá - Điểm tích lũy"`
- [ ] Đảm bảo `dongia` là **số âm** (-) cho điểm tích lũy
- [ ] Trừ điểm khách hàng trong bảng `khachhangs`
- [ ] Tính tổng tiền = SUM(dongia) từ `chitiethoadons`
- [ ] Test case: đặt phòng với điểm, kiểm tra DB
- [ ] Test case: đặt phòng không dùng điểm
- [ ] Test case: xem lại booking history hiển thị đúng

---

## 🔍 Debug & Kiểm tra

### SQL Query để kiểm tra

```sql
-- Xem chi tiết hóa đơn của 1 booking
SELECT 
    ct.loaiphi,
    ct.dongia,
    ct.mota
FROM chitiethoadons ct
WHERE ct.madatphong = 'DP001'

-- Tính tổng tiền từ chi tiết
SELECT 
    SUM(dongia) as TongTien
FROM chitiethoadons
WHERE mahoadon = 'HD001'

-- Kiểm tra điểm khách hàng
SELECT 
    makh,
    hoten,
    diemthanhvien
FROM khachhangs
WHERE makh = 1
```

---

## ❓ Câu hỏi thường gặp

### Q: Tại sao dùng giá trị âm thay vì field riêng?
**A:** Để tính tổng tiền dễ dàng bằng `SUM(dongia)`, không cần logic phức tạp.

### Q: Có nên tạo bảng riêng lưu lịch sử điểm?
**A:** Có thể, nhưng lưu trong `chitiethoadons` đơn giản và đủ dùng cho hóa đơn.

### Q: Làm sao phân biệt các loại phí?
**A:** Dựa vào field `loaiphi`:
- `LIKE '%phòng%'` → Tiền phòng
- `LIKE '%dịch vụ%'` → Tiền dịch vụ  
- `LIKE '%điểm%'` hoặc `LIKE '%giảm giá%'` → Giảm giá từ điểm

---

## 📝 Ghi chú

- 1 điểm = 1 VNĐ
- Điểm tích lũy chỉ được dùng khi >= 1000 điểm
- Điểm được cộng sau khi check-out (0.1% tổng tiền)
- Giá trị âm trong `dongia` đại diện cho khoản giảm trừ

---

**Tác giả:** GitHub Copilot  
**Ngày cập nhật:** 29/11/2025
