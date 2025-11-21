// ==========================================
// Booking List API (Dữ liệu thật từ backend ASP.NET)
// ==========================================

const API_BASE_URL = 'https://localhost:7076/api';

// Tạo đối tượng toàn cục (gắn vào window)
window.BookingAPI = {
    // Lấy danh sách đặt phòng (cho lễ tân)
    async fetchBookings() {
        const res = await fetch(`${API_BASE_URL}/Datphongs/letan-list`, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
            throw new Error("Không thể tải danh sách đặt phòng từ API");
        }

        const data = await res.json();

        // Chuẩn hóa dữ liệu trả về
        return data.map(item => ({
            id: item.maDatPhong || item.MaDatPhong,
            bookingDate: item.ngayDat || item.NgayDat,
            customerName: item.tenKhachHang || item.TenKhachHang,
            customerPhone: item.soDienThoai || item.SoDienThoai,
            customerEmail: item.email || item.Email,
            customerID: item.cccd || item.Cccd,
            roomNumber: item.phong || item.Phong,
            roomType: item.loaiPhong || item.LoaiPhong,
            checkinDate: item.ngayNhanPhong || item.NgayNhanPhong,
            checkoutDate: item.ngayTraPhong || item.NgayTraPhong,
            status: normalizeStatus(item.trangThai || item.TrangThai),
            totalAmount: item.tongTien || item.TongTien,
            tienPhong: item.tienPhong || item.TienPhong || 0,
            tienDichVu: item.tienDichVu || item.TienDichVu || 0,
            notes: item.ghiChu || item.GhiChu || "",
            paymentStatus: item.trangThaiThanhToan || item.TrangThaiThanhToan,
            source: "Trực tiếp"
        }));
    },

    // Check-in booking
    async checkinBooking(id) {
        const res = await fetch(`${API_BASE_URL}/Datphongs/checkin/${id}`, { method: "PUT" });
        if (!res.ok) throw new Error("Không thể check-in booking");
        return await res.json();
    },

    // Check-out booking
    async checkoutBooking(id) {
        const res = await fetch(`${API_BASE_URL}/Datphongs/Checkout/${id}`, { method: "GET" });
        if (!res.ok) throw new Error("Không thể check-out booking");
        return await res.json();
    },

    // Hủy booking
    async cancelBooking(id) {
        const res = await fetch(`${API_BASE_URL}/Datphongs/huy/${id}`, { method: "PUT" });
        if (!res.ok) throw new Error("Không thể hủy booking");
        return await res.json();
    },

    // Lấy tiền đền bù thiệt hại theo mã đặt phòng
    async getDamageCompensation(madatphong) {
        try {
            const res = await fetch(`${API_BASE_URL}/Denbuthiethais`);
            if (!res.ok) return 0;
            
            const allCompensations = await res.json();
            const compensation = allCompensations.filter(c => 
                (c.madatphong || c.Madatphong) === madatphong
            );
            
            // Tính tổng tiền đền bù
            const total = compensation.reduce((sum, item) => {
                const sotien = item.sotien || item.Sotien || item.SoTien || 0;
                return sum + sotien;
            }, 0);
            
            return total;
        } catch (error) {
            console.error('Lỗi lấy tiền đền bù:', error);
            return 0;
        }
    }
};

// ==========================
// Helper Functions
// ==========================
function normalizeStatus(status) {
    const s = (status || "").trim().toLowerCase();
    if (s.includes("đang ở")) return "Đang ở";
    if (s.includes("đã đặt")) return "Đã đặt";
    if (s.includes("đã hủy")) return "Đã hủy";
    if (s.includes("đã trả")) return "Đã trả";
    return "Đã đặt";
}