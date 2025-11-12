const API_BASE = 'https://localhost:7076/api';

/**
 * Format ngày sang dạng yyyy-MM-dd (DateOnly cho C#)
 */
function formatDateOnlyForAPI(dateString) {
    if (!dateString) return null;

    try {
        let date;

        if (dateString.includes('/')) {
            // Format: dd/MM/yyyy -> Date object
            const parts = dateString.split('/');
            if (parts.length === 3) {
                // month - 1 vì JavaScript Date month bắt đầu từ 0
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            }
        } else if (dateString.includes('-')) {
            date = new Date(dateString);
        } else {
            date = new Date(dateString);
        }

        // Format: yyyy-MM-dd (không có giờ)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return null;
    }
}

// /**
//  * Format ngày sang dạng yyyy-MM-ddTHH:mm:ss (DateTime cho C#)
//  */
// function formatDateTimeForAPI(dateString) {
//     if (!dateString) return null;

//     try {
//         let date;

//         if (dateString.includes('/')) {
//             // Format: dd/MM/yyyy -> Date object
//             const parts = dateString.split('/');
//             if (parts.length === 3) {
//                 // month - 1 vì JavaScript Date month bắt đầu từ 0
//                 date = new Date(parts[2], parts[1] - 1, parts[0]);
//             }
//         } else if (dateString.includes('-')) {
//             date = new Date(dateString);
//         } else {
//             date = new Date(dateString);
//         }

//         // Format: yyyy-MM-ddTHH:mm:ss
//         return date.toISOString().slice(0, 19);
//     } catch (error) {
//         console.error('Error formatting date:', error);
//         return null;
//     }
// }

/**
 * Lưu thông tin đặt phòng vào database
 * @param {Object} bookingData - Dữ liệu đặt phòng từ form
 * @returns {Promise<Object>} - Kết quả lưu đặt phòng
 */
async function saveBooking(bookingData) {
    try {
        console.log('=== BẮT ĐẦU LƯU ĐẶT PHÒNG ===');
        console.log('Booking data:', bookingData);

        // 1. Lấy thông tin khách hàng đang đăng nhập
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        console.log('Current user from localStorage:', currentUser);

        // Hỗ trợ nhiều định dạng khác nhau từ login/register
        let makhachhang = currentUser.customerId ||
            currentUser.makhachhang ||
            currentUser.makh ||
            currentUser.MaKh ||
            currentUser.id;

        // Nếu không có mã khách hàng, thử tìm bằng email
        if (!makhachhang && currentUser.email) {
            console.log(' Không có mã khách hàng, tìm bằng email:', currentUser.email);
            try {
                const response = await fetch(`${API_BASE_URL}/Khachhangs`);
                if (response.ok) {
                    const allCustomers = await response.json();
                    const customer = allCustomers.find(c =>
                        (c.email || c.Email) === currentUser.email
                    );

                    if (customer) {
                        makhachhang = customer.makh || customer.maKh || customer.id;
                        console.log(' Tìm thấy mã khách hàng bằng email:', makhachhang);

                        // Cập nhật lại currentUser trong localStorage để lần sau không cần tìm lại
                        currentUser.id = makhachhang;
                        currentUser.makh = makhachhang;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                }
            } catch (error) {
                console.error(' Lỗi khi tìm khách hàng bằng email:', error);
            }
        }

        if (!makhachhang) {
            console.error('Không tìm thấy mã khách hàng trong currentUser:', currentUser);
            throw new Error('Không tìm thấy thông tin khách hàng. Vui lòng đăng nhập lại!');
        }

        console.log(' Mã khách hàng đã xác định:', makhachhang);
        console.log(' Thông tin currentUser hiện tại:', currentUser);

        // 2. Tính toán thông tin đặt phòng
        const searchInfo = bookingData.searchInfo || {};
        const dateRange = searchInfo.dateRange || '';
        const [checkInDate, checkOutDate] = dateRange.split(' - ');
        const nights = searchInfo.nights || 1;

        // Tính tổng tiền
        let tongTienPhong = 0;
        let tongTienDichVu = 0;

        bookingData.rooms.forEach(room => {
            tongTienPhong += room.price * nights * (room.quantity || 1);

            if (room.services && room.services.length > 0) {
                room.services.forEach(service => {
                    tongTienDichVu += service.dongia * (service.soluong || 1);
                });
            }
        });

        const tongTien = tongTienPhong + tongTienDichVu;
        // Thanh toán 100% (không đặt cọc)
        const tienThanhToan = tongTien;
        const tienCoc = 0;
        const conLai = 0;

        console.log('Tổng tiền phòng:', tongTienPhong);
        console.log('Tổng tiền dịch vụ:', tongTienDichVu);
        console.log('Tổng tiền:', tongTien);
        console.log('Tiền thanh toán (100%):', tienThanhToan);

        // Đếm tổng số phòng để kiểm tra đặt đoàn (>5 phòng)
        let totalRoomCount = 0;
        bookingData.rooms.forEach(room => {
            totalRoomCount += (room.quantity || 1);
        });

        // 3. Tạo đối tượng Đặt phòng theo schema backend
        // Lưu ý: Trigger TRG_UPDATE_TONGTIEN_DATPHONG sẽ tự động tính DONGIA, GIAMGIA, TONGTIEN
        // sau khi CHITIETDATPHONG được insert, nên không cần gửi Tongtien từ frontend
        const datPhongPayload = {
            Ngaydat: formatDateOnlyForAPI(new Date().toISOString()), // yyyy-MM-dd
            Ngaynhanphong: formatDateOnlyForAPI(checkInDate), // yyyy-MM-dd
            Ngaytraphong: formatDateOnlyForAPI(checkOutDate), // yyyy-MM-dd
            Trangthai: "Đã đặt",
            // Tongtien, Dongia, Giamgia sẽ được trigger tự động cập nhật
            Trangthaithanhtoan: "Đã thanh toán",
            // Backend sẽ tự động tính chinhsachhuy, không cần gửi từ frontend
            // Chinhsachhuy: "Hủy trước 48h",
            Ghichu: (bookingData.customer && bookingData.customer.request) ?
                String(bookingData.customer.request).substring(0, 500) : // Giới hạn 500 ký tự
                "Không có ghi chú",
            Makh: parseInt(makhachhang)
        };

        // Thông báo đặt đoàn nếu > 5 phòng
        if (totalRoomCount > 5) {
            console.log(`ĐẶT THEO ĐOÀN: ${totalRoomCount} phòng - Giảm giá sẽ được áp dụng tự động!`);
            if (totalRoomCount > 10) {
                console.log('   → Giảm giá 10%');
            } else if (totalRoomCount > 7) {
                console.log('   → Giảm giá 5%');
            } else {
                console.log('   → Giảm giá 3%');
            }
        }

        console.log('=== PAYLOAD ĐẶT PHÒNG ===');
        console.log(JSON.stringify(datPhongPayload, null, 2));

        // 4. Lưu Đặt phòng vào database (bảng datphongs)
        const datPhongResponse = await fetch(`${API_BASE}/Datphongs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datPhongPayload)
        });

        if (!datPhongResponse.ok) {
            const errorText = await datPhongResponse.text();
            console.error(' Error saving booking:', errorText);
            throw new Error(`Lỗi khi lưu đặt phòng: ${datPhongResponse.status} - ${errorText}`);
        }

        const savedDatPhong = await datPhongResponse.json();
        console.log(' Đã lưu Đặt phòng:', savedDatPhong);

        // Lấy mã đặt phòng từ response (backend tự tạo)
        const maDatPhong = savedDatPhong.madatphong || savedDatPhong.Madatphong || savedDatPhong.id;

        if (!maDatPhong) {
            console.error(' Không tìm thấy madatphong trong response:', savedDatPhong);
            throw new Error('Không lấy được mã đặt phòng từ server! Response structure có thể đã thay đổi.');
        }

        console.log(' Mã đặt phòng từ server:', maDatPhong);

        // 5. Lưu Chi tiết đặt phòng (gộp các phòng cùng loại)
        const chiTietResults = [];

        console.log('=== DEBUG: DANH SÁCH PHÒNG ===');
        console.log('Số lượng phòng:', bookingData.rooms.length);
        bookingData.rooms.forEach((room, idx) => {
            console.log(`Phòng ${idx + 1}:`, {
                name: room.name,
                roomType: room.roomType,
                roomId: room.roomId,
                price: room.price,
                quantity: room.quantity
            });
        });

        // Gộp các phòng cùng loại thành 1 record (vì composite key MADATPHONG+MAPHONG)
        const roomsGrouped = {};

        for (let i = 0; i < bookingData.rooms.length; i++) {
            const room = bookingData.rooms[i];

            // Lấy mã phòng từ roomType hoặc data-room-id
            let maPhong = null;
            if (room.roomType && room.roomType.includes('room-')) {
                maPhong = parseInt(room.roomType.split('-')[1]);
            } else if (room.roomId) {
                maPhong = parseInt(room.roomId);
            }

            if (!maPhong) {
                console.error(`Không tìm thấy mã phòng cho phòng ${i + 1}!`);
                console.error('Room data:', room);
                throw new Error(`Không tìm thấy mã phòng cho phòng ${i + 1}: ${room.name || 'Unknown'}`);
            }

            // Gộp phòng cùng loại
            if (!roomsGrouped[maPhong]) {
                roomsGrouped[maPhong] = {
                    maPhong: maPhong,
                    quantity: 0,
                    pricePerNight: room.price,
                    totalPrice: 0
                };
            }

            const quantity = room.quantity || 1;
            roomsGrouped[maPhong].quantity += quantity;
            roomsGrouped[maPhong].totalPrice += room.price * nights * quantity;
        }

        console.log('=== PHÒNG SAU KHI GỘP ===');
        console.log(roomsGrouped);

        // Lưu từng loại phòng (đã gộp)
        for (const maPhong in roomsGrouped) {
            const roomGroup = roomsGrouped[maPhong];

            // Kiểm tra thông tin phòng có tồn tại không (optional)
            let phongInfo = null;
            try {
                const phongResponse = await fetch(`${API_BASE}/Phongs/${maPhong}`);
                if (phongResponse.ok) {
                    phongInfo = await phongResponse.json();
                    console.log(` Phòng ${maPhong} tồn tại:`, {
                        maphong: phongInfo.maphong,
                        sophong: phongInfo.sophong,
                        succhua: phongInfo.succhua,
                        trangthai: phongInfo.trangthai
                    });
                } else {
                    console.warn(` Phòng ${maPhong} không tồn tại trong database`);
                }
            } catch (error) {
                console.warn(` Không thể kiểm tra phòng ${maPhong}:`, error.message);
            }

            const chiTietPayload = {
                Madatphong: parseInt(maDatPhong),
                Maphong: parseInt(maPhong),
                Tongcong: parseFloat(roomGroup.totalPrice),
                Trangthai: 'Đã đặt',
                // Navigation objects required by backend
                maphongNavigation: phongInfo ? {
                    Maphong: phongInfo.maphong,
                    Sophong: phongInfo.sophong,
                    Succhua: phongInfo.succhua,
                    Trangthai: phongInfo.trangthai,
                    Maloaiphong: phongInfo.maloaiphong,
                    Mahinhphong: phongInfo.mahinhphong,
                    Mavoucher: phongInfo.mavoucher,
                    chitietdatphongs: [],
                    denbuthiethais: [],
                    mahinhphongNavigation: null,
                    maloaiphongNavigation: null,
                    mavoucherNavigation: null,
                    reviews: []
                } : {
                    Maphong: parseInt(maPhong),
                    Sophong: `${100 + parseInt(maPhong)}`, // 101, 102, etc.
                    Succhua: 2,
                    Trangthai: 'Hoạt động',
                    Maloaiphong: parseInt(maPhong),
                    Mahinhphong: parseInt(maPhong),
                    Mavoucher: `V${maPhong.toString().padStart(3, '0')}`.padEnd(30),
                    chitietdatphongs: [],
                    denbuthiethais: [],
                    mahinhphongNavigation: null,
                    maloaiphongNavigation: null,
                    mavoucherNavigation: null,
                    reviews: []
                },
                madatphongNavigation: {
                    Madatphong: parseInt(maDatPhong),
                    Ngaydat: formatDateOnlyForAPI(new Date().toISOString()),
                    Ngaynhanphong: formatDateOnlyForAPI(checkInDate),
                    Ngaytraphong: formatDateOnlyForAPI(checkOutDate),
                    Trangthai: "Đã đặt",
                    Tongtien: parseFloat(tongTien),
                    Trangthaithanhtoan: "Đã thanh toán",
                    Chinhsachhuy: "Không hoàn tiền do đặt gấp (<24h trước khi nhận phòng)",
                    Ngayhuy: null,
                    Ghichu: (bookingData.customer && bookingData.customer.request) ?
                        String(bookingData.customer.request).substring(0, 500) : "Không có ghi chú",
                    Makh: parseInt(makhachhang),
                    chitietdatphongs: [],
                    chitiethoadons: [],
                    denbuthiethais: [],
                    hoadons: [],
                    makhNavigation: null,
                    sudungdvs: []
                }
            };

            console.log(`=== PAYLOAD CHI TIẾT ĐẶT PHÒNG - Mã phòng ${maPhong} ===`);
            console.log(JSON.stringify(chiTietPayload, null, 2));

            const chiTietResponse = await fetch(`${API_BASE}/Chitietdatphongs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chiTietPayload)
            });

            if (!chiTietResponse.ok) {
                const errorText = await chiTietResponse.text();
                console.error(` Lỗi lưu Chi tiết đặt phòng - Mã phòng ${maPhong}:`, errorText);
                throw new Error(`Lỗi khi lưu chi tiết đặt phòng - Mã phòng ${maPhong}: ${chiTietResponse.status} - ${errorText}`);
            }

            const savedChiTiet = await chiTietResponse.json();
            chiTietResults.push(savedChiTiet);
            console.log(` Đã lưu Chi tiết đặt phòng - Mã phòng ${maPhong}:`, savedChiTiet);

            // 5.1. Lưu dịch vụ của phòng này (nếu có)
            console.log(`=== KIỂM TRA DỊCH VỤ CHO PHÒNG ${maPhong} ===`);

            const roomsWithServices = bookingData.rooms.filter(r => {
                let roomMaPhong = null;
                if (r.roomType && r.roomType.includes('room-')) {
                    roomMaPhong = parseInt(r.roomType.split('-')[1]);
                } else if (r.roomId) {
                    roomMaPhong = parseInt(r.roomId);
                }

                const hasServices = r.services && r.services.length > 0;
                const isMatchingRoom = roomMaPhong === parseInt(maPhong);

                console.log(`Phòng: ${r.name}, MaPhong: ${roomMaPhong}, Match: ${isMatchingRoom}, Services: ${hasServices ? r.services.length : 0}`);

                return isMatchingRoom && hasServices;
            });

            console.log(`Tìm thấy ${roomsWithServices.length} phòng có dịch vụ`);

            for (const roomWithService of roomsWithServices) {
                if (roomWithService.services && roomWithService.services.length > 0) {
                    console.log(`=== LƯU ${roomWithService.services.length} DỊCH VỤ CHO ĐẶT PHÒNG ${maDatPhong} ===`);

                    for (const service of roomWithService.services) {
                        const soLuong = service.soluong || service.quantity || 1;
                        const donGia = service.dongia || service.price || 0;
                        const tongTien = soLuong * donGia;

                        const sudungdvPayload = {
                            Madatphong: parseInt(maDatPhong),
                            Madv: parseInt(service.madichvu || service.serviceId || service.madv || 0),
                            Soluong: parseInt(soLuong),
                            Dongia: parseFloat(donGia),
                            Tongtien: parseFloat(tongTien)
                                // Backend sẽ tự động tạo masudungdv và xử lý navigation
                        };

                        console.log('Payload dịch vụ:', JSON.stringify(sudungdvPayload));

                        const sudungdvResponse = await fetch(`${API_BASE}/Sudungdvs`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(sudungdvPayload)
                        });

                        if (sudungdvResponse.ok) {
                            const savedSuDungDV = await sudungdvResponse.json();
                            console.log(` Đã lưu dịch vụ: ${service.tendichvu || service.name} - SL: ${soLuong} - Tổng: ${tongTien.toLocaleString('vi-VN')} VNĐ`);
                        } else {
                            const errorText = await sudungdvResponse.text();
                            console.error(` Lỗi lưu dịch vụ (${sudungdvResponse.status}):`, errorText);
                            console.error('Payload:', sudungdvPayload);
                        }
                    }
                }
            }
        }

        console.log(` ĐÃ LƯU ${chiTietResults.length} LOẠI PHÒNG`);

        // 5.2. Fetch lại DATPHONG để lấy giá trị TONGTIEN, DONGIA, GIAMGIA đã được trigger tính
        console.log('=== LẤY THÔNG TIN ĐẶT PHÒNG SAU KHI TRIGGER TÍNH TOÁN ===');
        let updatedDatPhong = savedDatPhong;
        let finalTongTien = tongTien; // Giá trị tạm
        let finalDonGia = tongTienPhong;
        let finalGiamGia = 0;

        try {
            const updatedResponse = await fetch(`${API_BASE}/Datphongs/${maDatPhong}`);
            if (updatedResponse.ok) {
                updatedDatPhong = await updatedResponse.json();
                finalDonGia = updatedDatPhong.dongia || updatedDatPhong.Dongia || tongTienPhong;
                finalGiamGia = updatedDatPhong.giamgia || updatedDatPhong.Giamgia || 0;

                // Xử lý trường hợp trigger không tính tongtien (khi giamgia = null)
                // Nếu tongtien = null → dùng dongia (không giảm giá)
                const rawTongTien = updatedDatPhong.tongtien || updatedDatPhong.Tongtien;
                if (rawTongTien !== null && rawTongTien !== undefined) {
                    finalTongTien = rawTongTien;
                } else {
                    // Trigger không tính được (do giamgia = null) → tính thủ công
                    finalTongTien = finalDonGia - finalGiamGia;
                    console.warn(' Trigger không tính TONGTIEN (có thể do GIAMGIA = NULL), dùng công thức: DONGIA - GIAMGIA');
                }

                console.log(' Giá trị sau khi trigger tính:');
                console.log('   - Đơn giá (trước giảm):', finalDonGia);
                console.log('   - Giảm giá:', finalGiamGia);
                console.log('   - Tổng tiền phòng (sau giảm):', finalTongTien);
                console.log('   - Tiền dịch vụ:', tongTienDichVu);
            } else {
                console.warn(' Không thể fetch lại DATPHONG, dùng giá trị tạm');
                // Tính tạm: tongTienPhong - giamGia (KHÔNG cộng dịch vụ vì DATPHONG.TONGTIEN chỉ là tiền phòng)
                finalTongTien = tongTienPhong - finalGiamGia;
            }
        } catch (error) {
            console.warn(' Lỗi khi fetch DATPHONG:', error.message);
        }

        // 6. Tạo Hóa đơn (theo schema backend)
        const paymentMethod = bookingData.paymentMethod || 'Momo';

        // HOADON.TONGTIEN = tiền phòng (đã giảm) + tiền dịch vụ
        const tongTienHoaDon = (finalDonGia - finalGiamGia) + tongTienDichVu;

        const hoaDonPayload = {
            Ngaylap: formatDateOnlyForAPI(new Date().toISOString()), // DateOnly: yyyy-MM-dd
            Tongtien: parseFloat(tongTienHoaDon), // Tổng hóa đơn = phòng + dịch vụ
            Makh: parseInt(makhachhang),
            Madatphong: parseInt(maDatPhong)
        };

        console.log('=== PAYLOAD HÓA ĐƠN ===');
        console.log('   - Tiền phòng (sau giảm):', finalDonGia - finalGiamGia);
        console.log('   - Tiền dịch vụ:', tongTienDichVu);
        console.log('   - TỔNG HÓA ĐƠN:', tongTienHoaDon);
        console.log(JSON.stringify(hoaDonPayload, null, 2));

        const hoaDonResponse = await fetch(`${API_BASE}/hoadons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(hoaDonPayload)
        });

        let savedHoaDon = null;
        let maHoaDon = null;

        if (hoaDonResponse.ok) {
            savedHoaDon = await hoaDonResponse.json();
            console.log(' Đã lưu Hóa đơn:', savedHoaDon);

            // Lấy mã hóa đơn từ response
            maHoaDon = savedHoaDon.mahoadon || savedHoaDon.Mahoadon || savedHoaDon.id;
            console.log(' Mã hóa đơn từ server:', maHoaDon);

            if (!maHoaDon) {
                console.error(' Không tìm thấy mahoadon trong response:', savedHoaDon);
            }
        } else {
            const errorText = await hoaDonResponse.text();
            console.error(' Lỗi lưu Hóa đơn:', errorText);
            // Không throw error, tiếp tục xử lý
        }

        // 7. Lưu Chi tiết hóa đơn (theo schema backend: mahoadon, madatphong, loaiphi, dongia)
        // Lưu ý: Trigger TRG_UPDATE_TONGTIEN_DATPHONG sẽ tự động cập nhật DONGIA của 'Tiền phòng'
        // trong CHITIETHOADON sau khi CHITIETDATPHONG được insert (tính cả giảm giá đoàn)
        const chiTietHoaDonResults = [];

        if (maHoaDon) {
            // 7.1. Chi tiết hóa đơn cho TẤT CẢ phòng (1 record cho tổng tiền phòng)
            // Gửi giá trị tạm thời - trigger sẽ cập nhật lại với giá chính xác (đã trừ giảm giá)
            const chiTietHDPhong = {
                Mahoadon: parseInt(maHoaDon),
                Madatphong: parseInt(maDatPhong),
                Loaiphi: 'Tiền phòng',
                Dongia: parseFloat(tongTienPhong) // Trigger sẽ cập nhật lại sau khi tính giảm giá
                    // Backend sẽ tự động tạo macthd và xử lý navigation
            };

            console.log('=== CHI TIẾT HÓA ĐƠN PHÒNG (Trigger sẽ cập nhật giá sau) ===');
            console.log(JSON.stringify(chiTietHDPhong, null, 2));

            const chiTietHDPhongResponse = await fetch(`${API_BASE}/Chitiethoadons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chiTietHDPhong)
            });

            if (chiTietHDPhongResponse.ok) {
                const savedChiTietHD = await chiTietHDPhongResponse.json();
                chiTietHoaDonResults.push(savedChiTietHD);
                console.log(' Đã lưu Chi tiết hóa đơn phòng (trigger sẽ cập nhật giá chính xác)');
            } else {
                const errorText = await chiTietHDPhongResponse.text();
                console.error(' Lỗi Chi tiết hóa đơn phòng:', errorText);
            }

            // 7.2. Chi tiết hóa đơn cho dịch vụ (nếu có)
            if (tongTienDichVu > 0) {
                const chiTietHDDichVu = {
                    Mahoadon: parseInt(maHoaDon),
                    Madatphong: parseInt(maDatPhong),
                    Loaiphi: 'Dịch vụ',
                    Dongia: parseFloat(tongTienDichVu)
                        // Backend sẽ tự động tạo macthd và xử lý navigation
                };

                console.log('=== CHI TIẾT HÓA ĐƠN DỊCH VỤ ===');
                console.log(JSON.stringify(chiTietHDDichVu, null, 2));

                const chiTietHDDVResponse = await fetch(`${API_BASE}/Chitiethoadons`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(chiTietHDDichVu)
                });

                if (chiTietHDDVResponse.ok) {
                    const savedChiTietDV = await chiTietHDDVResponse.json();
                    chiTietHoaDonResults.push(savedChiTietDV);
                    console.log(' Đã lưu Chi tiết hóa đơn dịch vụ');
                } else {
                    const errorText = await chiTietHDDVResponse.text();
                    console.error(' Lỗi Chi tiết hóa đơn dịch vụ:', errorText);
                }
            }
        }

        // 8. Trả về kết quả
        // Lưu ý: 
        // - DATPHONG.TONGTIEN = tiền phòng (đã giảm giá)
        // - HOADON.TONGTIEN = tiền phòng + tiền dịch vụ (tổng thanh toán)
        const tongTienThanhToan = (finalDonGia - finalGiamGia) + tongTienDichVu;

        const successMessage = totalRoomCount > 5 ?
            `Đặt phòng và thanh toán thành công! Đặt ${totalRoomCount} phòng - Được giảm giá đoàn tự động.` :
            'Đặt phòng và thanh toán thành công!';

        return {
            success: true,
            message: successMessage,
            isGroupBooking: totalRoomCount > 5,
            totalRooms: totalRoomCount,
            data: {
                datPhong: updatedDatPhong, // Dùng dữ liệu đã fetch lại (có tongtien từ trigger)
                chiTietDatPhong: chiTietResults,
                hoaDon: savedHoaDon,
                chiTietHoaDon: chiTietHoaDonResults,
                maDatPhong: maDatPhong,
                maHoaDon: maHoaDon,
                maDatPhongDisplay: `DP${maDatPhong}`, // Format hiển thị
                maHoaDonDisplay: `HD${maHoaDon}`, // Format hiển thị
                donGia: finalDonGia, // Đơn giá trước giảm (từ trigger)
                giamGia: finalGiamGia, // Giảm giá đoàn (từ trigger)
                tongTienPhong: finalDonGia - finalGiamGia, // Tiền phòng sau giảm (= DATPHONG.TONGTIEN)
                tongTienDichVu: tongTienDichVu, // Tiền dịch vụ
                tongTien: tongTienThanhToan, // Tổng thanh toán = phòng + dịch vụ (= HOADON.TONGTIEN)
                tienThanhToan: tongTienThanhToan, // Thanh toán 100%
                tienCoc: 0,
                conLai: 0
            }
        };

    } catch (error) {
        console.error(' Lỗi khi lưu đặt phòng:', error);
        return {
            success: false,
            message: error.message || 'Đã có lỗi xảy ra khi đặt phòng. Vui lòng thử lại!',
            error: error
        };
    }
}

/**
 * Utility function để debug booking data
 */
function debugBookingData(bookingData) {
    console.log(' === DEBUG BOOKING DATA ===');
    console.log('Search Info:', bookingData.searchInfo);
    console.log('Rooms count:', bookingData.rooms ? bookingData.rooms.length : 0);

    if (bookingData.rooms) {
        bookingData.rooms.forEach((room, index) => {
            console.log(`Room ${index + 1}:`, {
                name: room.name,
                roomType: room.roomType,
                roomId: room.roomId,
                price: room.price,
                quantity: room.quantity,
                services: room.services ? room.services.length : 0
            });
        });
    }

    console.log('Customer:', bookingData.customer);
    console.log('Payment method:', bookingData.paymentMethod);
    console.log(' === END DEBUG ===');
}

/**
 * Validate booking data trước khi gửi API
 */
function validateBookingData(bookingData) {
    const errors = [];

    console.log('Validating booking data...');

    // Kiểm tra currentUser
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const makhachhang = currentUser.customerId || currentUser.makhachhang || currentUser.makh || currentUser.MaKh || currentUser.id;

    if (!makhachhang || isNaN(makhachhang)) {
        errors.push('Không tìm thấy mã khách hàng hợp lệ trong currentUser');
    } else {
        console.log(' Mã khách hàng:', makhachhang);
    }

    // Kiểm tra searchInfo
    if (!bookingData.searchInfo) {
        errors.push('Thiếu thông tin tìm kiếm (searchInfo)');
    } else {
        if (!bookingData.searchInfo.dateRange) {
            errors.push('Thiếu thông tin ngày (dateRange)');
        } else {
            console.log(' Khoảng thời gian:', bookingData.searchInfo.dateRange);
        }

        if (!bookingData.searchInfo.nights || bookingData.searchInfo.nights < 1) {
            errors.push('Số đêm không hợp lệ');
        }
    }

    // Kiểm tra rooms
    if (!bookingData.rooms || !Array.isArray(bookingData.rooms) || bookingData.rooms.length === 0) {
        errors.push('Không có phòng nào được chọn');
    } else {
        console.log(` Số phòng được chọn: ${bookingData.rooms.length}`);

        bookingData.rooms.forEach((room, index) => {
            // Kiểm tra giá phòng
            if (!room.price || isNaN(room.price) || room.price <= 0) {
                errors.push(`Phòng ${index + 1}: Giá không hợp lệ (${room.price})`);
            }

            // Kiểm tra mã phòng
            const roomId = room.roomId || (room.roomType && room.roomType.includes('room-') ?
                parseInt(room.roomType.split('-')[1]) : null);

            if (!roomId || isNaN(roomId) || roomId <= 0) {
                errors.push(`Phòng ${index + 1}: Mã phòng không hợp lệ (roomId: ${room.roomId}, roomType: ${room.roomType})`);
            }

            // Kiểm tra số lượng
            const quantity = room.quantity || 1;
            if (quantity < 1 || quantity > 10) {
                errors.push(`Phòng ${index + 1}: Số lượng không hợp lệ (${quantity})`);
            }

            // Kiểm tra dịch vụ (nếu có)
            if (room.services && Array.isArray(room.services)) {
                room.services.forEach((service, serviceIndex) => {
                    if (!service.madichvu && !service.serviceId && !service.madv) {
                        errors.push(`Phòng ${index + 1}, Dịch vụ ${serviceIndex + 1}: Thiếu mã dịch vụ`);
                    }
                    if (!service.dongia || isNaN(service.dongia) || service.dongia < 0) {
                        errors.push(`Phòng ${index + 1}, Dịch vụ ${serviceIndex + 1}: Giá không hợp lệ`);
                    }
                    if (!service.soluong || isNaN(service.soluong) || service.soluong < 1) {
                        errors.push(`Phòng ${index + 1}, Dịch vụ ${serviceIndex + 1}: Số lượng không hợp lệ`);
                    }
                });
            }
        });
    }

    // Kiểm tra customer
    if (!bookingData.customer) {
        errors.push('Thiếu thông tin khách hàng');
    } else {
        if (!bookingData.customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.customer.email)) {
            errors.push('Email khách hàng không hợp lệ');
        }
        if (!bookingData.customer.firstName || !bookingData.customer.firstName.trim() ||
            !bookingData.customer.lastName || !bookingData.customer.lastName.trim()) {
            errors.push('Thiếu tên hoặc họ khách hàng');
        }
        if (!bookingData.customer.phone || !bookingData.customer.phone.trim()) {
            errors.push('Thiếu số điện thoại khách hàng');
        }
        console.log(' Thông tin khách hàng hợp lệ');
    }

    // Log kết quả validation
    if (errors.length > 0) {
        console.error(' Validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
    } else {
        console.log(' Validation passed!');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveBooking,
        generateBookingCode,
        formatDateTimeForAPI,
        formatDateOnlyForAPI,
        debugBookingData,
        validateBookingData
    };
}