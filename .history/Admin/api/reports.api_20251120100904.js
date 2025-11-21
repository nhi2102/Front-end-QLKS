// api/reports.api.js
const API_BASE = 'https://localhost:7076/api/Datphongs'; // ĐÚNG CONTROLLER

export const ReportAPI = {
    // DOANH THU THEO NGÀY – CHUẨN 100%
    getRevenue: async (from, to) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const res = await fetch(`${API_BASE}/revenue?${params}`, {
            credentials: 'omit'
        });

        if (!res.ok) {
            throw new Error(`Lỗi tải doanh thu: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        // API trả về: { data: [{ date: "...", tongDoanhThu: 123 }], summary: { ... } }
        return {
            data: (json.data || []).map(item => ({
                date: item.date,           // giữ nguyên để Chart.js hiểu
                tongDoanhThu: item.tongDoanhThu
            })),
            summary: json.summary
        };
    },

    // TOP DỊCH VỤ – DỰ PHÒNG (nếu bạn có API này)
    getTopServices: async (top = 5, from, to) => {
        const params = new URLSearchParams({ top: top.toString() });
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        try {
            const res = await fetch(`https://localhost:7076/api/Sudungdvs/top-services?${params}`, {
                credentials: 'omit'
            });

            if (!res.ok) throw new Error(`Lỗi ${res.status}`);

            const data = await res.json();
            return data.map(s => ({
                TenDichVu: s.tenDichVu || s.TenDichVu,
                DoanhThu: s.doanhThu || s.DoanhThu
            }));
        } catch (err) {
            console.warn('Top dịch vụ chưa có API:', err.message);
            return [
                { TenDichVu: 'Chưa có dữ liệu', DoanhThu: 0 }
            ];
        }
    },

    getTopRoomTypes: async (from, to) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        try {
            const res = await fetch(`${API_BASE}/top-room-types?${params}`, {
                credentials: 'omit'
            });

            if (!res.ok) {
                throw new Error(`Lỗi tải top loại phòng: ${res.status}`);
            }

            const data = await res.json();
            // API trả về: [{ name: "Suite VIP", value: 85000000 }, ...]
            return data.map(item => ({
                TenLoaiPhong: item.name,
                DoanhThu: item.value
            }));
        } catch (err) {
            console.warn('Lỗi top loại phòng:', err.message);
            return [
                { TenLoaiPhong: 'Chưa có dữ liệu', DoanhThu: 0 }
            ];
        }
    },

getReviews: async () => {
    try {
        const [reviewsRes, khachhangsRes, phongsRes, loaiphongsRes] = await Promise.all([
            fetch(`https://localhost:7076/api/Reviews`),
            fetch(`https://localhost:7076/api/Khachhangs`),
            fetch(`https://localhost:7076/api/Phongs`),
            fetch(`https://localhost:7076/api/Loaiphongs`)
        ]);

        if (!reviewsRes.ok || !khachhangsRes.ok || !phongsRes.ok || !loaiphongsRes.ok) {
            throw new Error('Lỗi tải dữ liệu đánh giá');
        }

        const reviews = await reviewsRes.json();
        const khachhangs = await khachhangsRes.json();
        const phongs = await phongsRes.json();
        const loaiphongs = await loaiphongsRes.json();

        // Tạo map tra cứu nhanh
        const khMap = Object.fromEntries(khachhangs.map(k => [k.makh, k.hoten]));
        const phongMap = Object.fromEntries(phongs.map(p => [p.maphong, { sophong: p.sophong, maloaiphong: p.maloaiphong }]));
        const loaiMap = Object.fromEntries(loaiphongs.map(l => [l.maloaiphong, l.tenloaiphong]));

        // Join tất cả dữ liệu
        const fullReviews = reviews.map(r => {
            const phongInfo = phongMap[r.maphong] || {};
            const tenLoaiPhong = loaiMap[phongInfo.maloaiphong] || 'Không xác định';

            return {
                tenKhach: khMap[r.makh] || 'Khách ẩn danh',
                soPhong: phongInfo.sophong || '???',
                tenLoaiPhong: tenLoaiPhong,
                sosao: r.sosao || 0,
                danhgia: r.danhgia || '(Không có nội dung)',
                ngay: r.ngay ? new Date(r.ngay).toLocaleDateString('vi-VN') : 'Chưa ghi nhận',
                maDatPhong: r.madatphong || 'N/A'
            };
        });

        // Sắp xếp mới nhất trước
        return fullReviews.sort((a, b) => b.ngay.localeCompare(a.ngay));
    } catch (err) {
        console.warn('Lỗi tải đánh giá:', err);
        return [];
    }
}



};