// api/reports.api.js
const API_BASE = 'https://localhost:7076/api'; // ĐÚNG CONTROLLER

export const ReportAPI = {
    // DOANH THU THEO NGÀY – CHUẨN 100%
    getRevenue: async(from, to) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const res = await fetch(`${API_BASE}/Datphongs/revenue?${params}`, {
            credentials: 'omit'
        });

        if (!res.ok) {
            throw new Error(`Lỗi tải doanh thu: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        // API trả về: { data: [{ date: "...", tongDoanhThu: 123 }], summary: { ... } }
        return {
            data: (json.data || []).map(item => ({
                date: item.date, // giữ nguyên để Chart.js hiểu
                tongDoanhThu: item.tongDoanhThu
            })),
            summary: json.summary
        };
    },

    // TOP DỊCH VỤ – DỰ PHÒNG (nếu bạn có API này)
    getTopServices: async(top = 5, from, to) => {
        const params = new URLSearchParams({ top: top.toString() });
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        try {
            const res = await fetch(`${API_BASE}/Sudungdvs/top-services?${params}`, {
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

    getTopRoomTypes: async(from, to) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        try {
            const res = await fetch(`${API_BASE}/Datphongs/top-room-types?${params}`, {
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

    getReviews: async() => {
        try {
            const [reviewsRes, khachhangsRes, phongsRes, loaiphongsRes] = await Promise.all([
                fetch(`${API_BASE}/Reviews`),
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
    },

// Thống kê thiệt hại thiết bị
// getDamageSummary: async (from, to) => {
//     const params = new URLSearchParams();
//     if (from) params.append('from', from);
//     if (to) params.append('to', to);

//     try {
//         const [denbuRes, thietbiRes] = await Promise.all([
//             fetch(`${API_BASE}/Denbuthiethais?${params}`, { credentials: 'omit' }),
//             fetch(`${API_BASE}/Thietbikhachsans`, { credentials: 'omit' })
//         ]);

//         if (!denbuRes.ok || !thietbiRes.ok) {
//             throw new Error('Lỗi tải dữ liệu đền bù hoặc thiết bị');
//         }

//         const denbuList = await denbuRes.json();
//         const thietbiList = await thietbiRes.json();

//         // Tạo map tên thiết bị
//         const thietbiMap = Object.fromEntries(
//             thietbiList.map(t => [t.mathietbi, t.tenthietbi])
//         );

//         // Gom nhóm theo thiết bị
//         const summary = {};
//         let totalDamage = 0;

//         denbuList.forEach(item => {
//             const ten = thietbiMap[item.mathietbi] || `Thiết bị #${item.mathietbi}`;
//             if (!summary[ten]) {
//                 summary[ten] = 0;
//             }
//             summary[ten] += item.tongtien;
//             totalDamage += item.tongtien;
//         });

//         // Chuyển thành mảng và sắp xếp giảm dần
//         const chartData = Object.entries(summary)
//             .map(([name, value]) => ({ tenThietBi: name, tongTien: value }))
//             .sort((a, b) => b.tongTien - a.tongTien);

//         return { chartData, totalDamage };
//     } catch (err) {
//         console.error('Lỗi tải dữ liệu thiệt hại:', err);
//         return { chartData: [], totalDamage: 0 };
//     }
// },


getDamageSummary: async (from, to) => {
    try {
        const [denbuRes, thietbiRes, datphongRes] = await Promise.all([
            fetch(`${API_BASE}/Denbuthiethais`, { credentials: 'omit' }),
            fetch(`${API_BASE}/Thietbikhachsans`, { credentials: 'omit' }),
            fetch(`${API_BASE}/Datphongs`, { credentials: 'omit' })
        ]);

        if (!denbuRes.ok || !thietbiRes.ok || !datphongRes.ok) {
            console.error('Lỗi API:', denbuRes.status, thietbiRes.status, datphongRes.status);
            return { chartData: [], totalDamage: 0 };
        }

        const denbuList = await denbuRes.json();
        const thietbiList = await thietbiRes.json();
        const datphongList = await datphongRes.json();

        // === TỰ ĐỘNG TÌM TRƯỜNG NGÀY TRẢ PHÒNG ===
        let checkoutField = null;
        const possibleFields = ['ngaytra', 'NgayTra', 'ngaytraphong', 'NgayTraPhong', 'checkoutdate', 'CheckoutDate', 'ngaytraphong'];
        if (datphongList.length > 0) {
            const sample = datphongList[0];
            checkoutField = possibleFields.find(f => sample[f] !== undefined && sample[f] !== null);
        }

        if (!checkoutField) {
            console.warn('Không tìm thấy trường ngày trả phòng trong Datphongs');
            return { chartData: [], totalDamage: 0 };
        }
        console.log('Tìm thấy trường ngày trả phòng:', checkoutField); // để bạn kiểm tra lần đầu

        // Map madatphong → ngày trả phòng
        const datphongMap = {};
        datphongList.forEach(dp => {
            const dateValue = dp[checkoutField];
            if (dateValue) {
                datphongMap[dp.madatphong] = new Date(dateValue);
            }
        });

        // Map tên thiết bị
        const thietbiMap = Object.fromEntries(
            thietbiList.map(t => [t.mathietbi, t.tenthietbi || `Thiết bị #${t.mathietbi}`])
        );

        // Khoảng thời gian lọc
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (toDate) toDate.setHours(23, 59, 59, 999);

        // Lọc theo ngày trả phòng
        const filtered = denbuList.filter(item => {
            const ngayTra = datphongMap[item.madatphong];
            if (!ngayTra) return false;
            if (fromDate && ngayTra < fromDate) return false;
            if (toDate && ngayTra > toDate) return false;
            return true;
        });

        // Gom nhóm
        const summary = {};
        let totalDamage = 0;

        filtered.forEach(item => {
            const ten = thietbiMap[item.mathietbi] || 'Không rõ thiết bị';
            summary[ten] = (summary[ten] || 0) + (item.tongtien || 0);
            totalDamage += item.tongtien || 0;
        });

        const chartData = Object.entries(summary)
            .map(([tenThietBi, tongTien]) => ({ tenThietBi, tongTien }))
            .sort((a, b) => b.tongTien - a.tongTien);

        console.log('Thiệt hại đã lọc:', chartData, 'Tổng:', totalDamage);
        return { chartData, totalDamage };

    } catch (err) {
        console.error('Lỗi getDamageSummary:', err);
        return { chartData: [], totalDamage: 0 };
    }
},

};