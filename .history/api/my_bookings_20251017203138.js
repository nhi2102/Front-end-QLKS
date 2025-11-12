// API Base URL
const API_BASE = 'https://localhost:7076/api';

/**
 * Format ngày từ ISO/DateOnly sang dd/MM/yyyy
 */
function formatDateDisplay(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

/**
 * Format tiền tệ
 */
function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Lấy danh sách đặt phòng của khách hàng hiện tại
 */
async function getMyBookings() {
    try {
        console.log('=== LẤY DANH SÁCH ĐẶT PHÒNG ===');

        // Lấy thông tin khách hàng từ localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const makhachhang = currentUser.customerId ||
            currentUser.makhachhang ||
            currentUser.makh ||
            currentUser.MaKh ||
            currentUser.id;

        if (!makhachhang) {
            throw new Error('Vui lòng đăng nhập để xem đặt phòng!');
        }

        console.log('Mã khách hàng:', makhachhang);

        // 1. Lấy tất cả đặt phòng
        const dpResponse = await fetch(`${API_BASE}/Datphongs`);
        if (!dpResponse.ok) {
            throw new Error(`Lỗi khi tải đặt phòng: ${dpResponse.status}`);
        }

        const allDatPhongs = await dpResponse.json();
        console.log('Tất cả đặt phòng:', allDatPhongs);

        // Lọc theo mã khách hàng
        const myDatPhongs = allDatPhongs.filter(dp =>
            (dp.makh === makhachhang || dp.Makh === makhachhang)
        );

        console.log(`Tìm thấy ${myDatPhongs.length} đặt phòng`);

        // 2. Load chi tiết cho từng đặt phòng
        for (let dp of myDatPhongs) {
            const madatphong = dp.madatphong || dp.Madatphong;

            // Lấy chi tiết đặt phòng
            const chiTiet = await getBookingDetails(madatphong);
            dp.chiTiet = chiTiet;

            // Lấy tiền phòng và tiền dịch vụ từ Chitiethoadons
            const chiTietHoaDon = await getChiTietHoaDon(madatphong);
            dp.tienPhong = chiTietHoaDon.tienPhong || 0;
            dp.tienDichVu = chiTietHoaDon.tienDichVu || 0;

            // Kiểm tra xem đã đánh giá chưa (cho các đơn đã hoàn tất)
            const trangthai = (dp.trangthai || dp.Trangthai || '').toLowerCase();
            if (trangthai === 'đã trả') {
                dp.dadanhgia = await checkReviewStatus(madatphong);
            }
        }

        console.log(' Đã tải xong danh sách đặt phòng:', myDatPhongs);

        return {
            success: true,
            data: myDatPhongs
        };

    } catch (error) {
        console.error(' Lỗi khi lấy danh sách đặt phòng:', error);
        return {
            success: false,
            message: error.message,
            data: []
        };
    }
}

/**
 * Lấy chi tiết đặt phòng (danh sách phòng đã đặt)
 */
async function getBookingDetails(madatphong) {
    try {
        console.log(`Đang tải chi tiết đặt phòng ${madatphong}...`);

        const response = await fetch(`${API_BASE}/Chitietdatphongs`);

        if (!response.ok) {
            throw new Error(`Lỗi khi tải chi tiết: ${response.status}`);
        }

        const allDetails = await response.json();

        // Lọc theo mã đặt phòng
        const bookingDetails = allDetails.filter(detail =>
            (detail.madatphong === madatphong || detail.Madatphong === madatphong)
        );

        console.log(`Tìm thấy ${bookingDetails.length} phòng trong đặt phòng ${madatphong}`);

        // Load dịch vụ một lần cho toàn bộ đặt phòng (vì API không có maphong)
        let allServicesForBooking = [];
        try {
            allServicesForBooking = await getServicesByBooking(madatphong);
        } catch (error) {
            console.error(`Lỗi load dịch vụ cho đặt phòng ${madatphong}:`, error);
        }

        // Load thông tin phòng cho từng chi tiết
        for (let detail of bookingDetails) {
            const maphong = detail.maphong || detail.Maphong;

            // Load thông tin phòng
            try {
                const roomInfo = await getRoomInfo(maphong);
                detail.phongInfo = roomInfo;
            } catch (error) {
                console.error(`Lỗi load thông tin phòng ${maphong}:`, error);
                detail.phongInfo = null;
            }

            // Gán dịch vụ cho chi tiết này
            detail.dichvu = allServicesForBooking;
        }

        return bookingDetails;

    } catch (error) {
        console.error(' Lỗi khi lấy chi tiết đặt phòng:', error);
        return [];
    }
}

/**
 * Lấy danh sách dịch vụ sử dụng theo mã đặt phòng
 * (API không có maphong, nên lấy tất cả dịch vụ của đặt phòng)
 */
async function getServicesByBooking(madatphong) {
    try {
        const response = await fetch(`${API_BASE}/Sudungdvs`);

        if (!response.ok) {
            throw new Error(`Lỗi khi tải dịch vụ: ${response.status}`);
        }

        const allServices = await response.json();

        // Lọc chỉ theo mã đặt phòng
        const bookingServices = allServices.filter(service =>
            (service.madatphong === madatphong || service.Madatphong === madatphong)
        );

        console.log(`Tìm thấy ${bookingServices.length} dịch vụ cho đặt phòng ${madatphong}`);

        // Load thông tin chi tiết dịch vụ
        for (let service of bookingServices) {
            const madv = service.madv || service.Madv || service.điên; // Hỗ trợ cả typo "điên"
            try {
                const serviceInfo = await getServiceInfo(madv);
                service.dichvuInfo = serviceInfo;
            } catch (error) {
                console.error(`Lỗi load thông tin dịch vụ ${madv}:`, error);
                service.dichvuInfo = null;
            }
        }

        return bookingServices;

    } catch (error) {
        console.error(' Lỗi khi lấy dịch vụ:', error);
        return [];
    }
}

/**
 * Lấy tiền phòng và tiền dịch vụ từ Chi tiết hóa đơn
 */
async function getChiTietHoaDon(madatphong) {
    try {
        console.log(`Đang tải chi tiết hóa đơn cho đặt phòng ${madatphong}...`);

        const response = await fetch(`${API_BASE}/Chitiethoadons`);

        if (!response.ok) {
            throw new Error(`Lỗi khi tải chi tiết hóa đơn: ${response.status}`);
        }

        const allChiTietHD = await response.json();

        // Lọc theo mã đặt phòng
        const chiTietHD = allChiTietHD.filter(ct =>
            (ct.madatphong === madatphong || ct.Madatphong === madatphong)
        );

        console.log(`Tìm thấy ${chiTietHD.length} chi tiết hóa đơn`);

        let tienPhong = 0;
        let tienDichVu = 0;

        chiTietHD.forEach(ct => {
            const loaiphi = (ct.loaiphi || ct.Loaiphi || '').toLowerCase();
            const dongia = ct.dongia || ct.Dongia || 0;

            if (loaiphi.includes('phòng')) {
                tienPhong += dongia;
            } else if (loaiphi.includes('dịch vụ')) {
                tienDichVu += dongia;
            }
        });

        console.log(`Tiền phòng: ${tienPhong}, Tiền dịch vụ: ${tienDichVu}`);

        return { tienPhong, tienDichVu };

    } catch (error) {
        console.error('❌ Lỗi khi lấy chi tiết hóa đơn:', error);
        return { tienPhong: 0, tienDichVu: 0 };
    }
}

/**
 * Lấy thông tin dịch vụ
 */
async function getServiceInfo(madichvu) {
    try {
        const response = await fetch(`${API_BASE}/Dichvus/${madichvu}`);

        if (!response.ok) {
            throw new Error(`Lỗi khi tải thông tin dịch vụ: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error(' Lỗi khi lấy thông tin dịch vụ:', error);
        return null;
    }
}

/**
 * Lấy thông tin phòng (bao gồm cả thông tin loại phòng)
 */
async function getRoomInfo(maphong) {
    try {
        const response = await fetch(`${API_BASE}/Phongs/${maphong}`);

        if (!response.ok) {
            throw new Error(`Lỗi khi tải thông tin phòng: ${response.status}`);
        }

        const phongData = await response.json();

        // Load thông tin loại phòng để lấy giá
        if (phongData && (phongData.maloaiphong || phongData.Maloaiphong)) {
            const maloaiphong = phongData.maloaiphong || phongData.Maloaiphong;
            try {
                const loaiphongResponse = await fetch(`${API_BASE}/Loaiphongs/${maloaiphong}`);
                if (loaiphongResponse.ok) {
                    const loaiphongData = await loaiphongResponse.json();
                    // Gắn thông tin loại phòng vào phongData
                    phongData.loaiphongInfo = loaiphongData;
                    // Gắn giá phòng trực tiếp cho dễ truy cập (field name: giacoban)
                    phongData.giaphong = loaiphongData.giacoban || loaiphongData.Giacoban || 0;
                    phongData.tenphong = loaiphongData.tenloaiphong || loaiphongData.Tenloaiphong || phongData.sophong;
                    phongData.loaiphong = loaiphongData.tenloaiphong || loaiphongData.Tenloaiphong || 'Standard';
                }
            } catch (error) {
                console.error('Lỗi load loại phòng:', error);
            }
        }

        return phongData;

    } catch (error) {
        console.error(' Lỗi khi lấy thông tin phòng:', error);
        return null;
    }
}

/**
 * Hủy đặt phòng
 */
async function cancelBooking(madatphong) {
    try {
        console.log('=== HỦY ĐẶT PHÒNG ===');
        console.log('Mã đặt phòng:', madatphong);

        // Gọi API hủy phòng (PUT /Datphongs/huy/{id})
        const cancelResponse = await fetch(`${API_BASE}/Datphongs/huy/${madatphong}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!cancelResponse.ok) {
            const errorData = await cancelResponse.json().catch(() => null);
            const errorMessage = (errorData && errorData.message) ? errorData.message : `Lỗi ${cancelResponse.status}`;
            throw new Error(errorMessage);
        }

        const result = await cancelResponse.json();
        console.log(' Kết quả từ API:', result);

        return {
            success: true,
            message: result.message || 'Đã hủy đặt phòng thành công!',
            data: result
        };

    } catch (error) {
        console.error(' Lỗi khi hủy đặt phòng:', error);
        return {
            success: false,
            message: error.message || 'Không thể hủy đặt phòng. Vui lòng thử lại!'
        };
    }
}

// Export functions để sử dụng trong file khác
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMyBookings,
        getBookingDetails,
        getRoomInfo,
        getServicesByBookingAndRoom,
        getServiceInfo,
        cancelBooking,
        submitReview,
        getRoomReviews,
        formatDateDisplay,
        formatCurrency
    };
}

/**
 * Lấy danh sách đánh giá của các phòng
 */
async function getRoomReviews(maphongList) {
    try {
        console.log('Lấy danh sách đánh giá cho các phòng:', maphongList);

        const response = await fetch(`${API_BASE}/Reviews`);

        if (!response.ok) {
            console.warn('Không thể lấy danh sách đánh giá:', response.status);
            return [];
        }

        const allReviews = await response.json();

        // Lọc chỉ lấy đánh giá của các phòng trong danh sách
        const relevantReviews = allReviews.filter(review =>
            maphongList.includes(review.maphong)
        );

        console.log(' Đã lấy đánh giá:', relevantReviews);
        return relevantReviews;

    } catch (error) {
        console.error('Lỗi khi lấy danh sách đánh giá:', error);
        return [];
    }
}

/**
 * Kiểm tra xem khách hàng đã đánh giá phòng chưa
 */
async function checkReviewStatus(madatphong) {
    try {
        console.log(`Kiểm tra trạng thái đánh giá cho DP${madatphong}...`);

        // Lấy thông tin khách hàng từ localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const makhachhang = currentUser.customerId ||
            currentUser.makhachhang ||
            currentUser.makh ||
            currentUser.MaKh ||
            currentUser.id;

        // Lấy tất cả đánh giá của khách hàng này
        const response = await fetch(`${API_BASE}/Reviews`);

        if (!response.ok) {
            console.warn('Không thể kiểm tra trạng thái đánh giá:', response.status);
            return false;
        }

        const allReviews = await response.json();

        // Kiểm tra xem khách hàng đã đánh giá cho đặt phòng này chưa
        // (Tạm thời check theo makh, sau này có thể thêm field madatphong vào Reviews)
        const hasReviewed = allReviews.some(review => review.makh === makhachhang);

        if (hasReviewed) {
            console.log(` Khách hàng ${makhachhang} đã có đánh giá`);
            return true;
        }

        return false;

    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái đánh giá:', error);
        return false; // Mặc định là chưa đánh giá nếu có lỗi
    }
}

/**
 * Gửi đánh giá phòng theo API Reviews hiện có
 */
async function submitReview(reviewData) {
    try {
        console.log('=== GỬI ĐÁNH GIÁ ===');
        console.log('Dữ liệu đánh giá:', reviewData);

        // Lấy thông tin khách hàng từ localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const makhachhang = currentUser.customerId ||
            currentUser.makhachhang ||
            currentUser.makh ||
            currentUser.MaKh ||
            currentUser.id;

        if (!makhachhang) {
            throw new Error('Vui lòng đăng nhập để đánh giá!');
        }

        // Lấy dữ liệu đánh giá đơn giản
        const sosao = reviewData.sosao;
        const danhgia = reviewData.danhgia; // Lấy mã phòng từ booking details (lấy phòng đầu tiên nếu có nhiều phòng)
        console.log(' Lấy chi tiết đặt phòng cho mã:', reviewData.madatphong);
        console.log(' Kiểm tra hàm getBookingDetails:', typeof getBookingDetails);

        const bookingDetails = await getBookingDetails(reviewData.madatphong);
        console.log(' Chi tiết đặt phòng:', bookingDetails);

        if (!bookingDetails || bookingDetails.length === 0) {
            throw new Error('Không tìm thấy thông tin phòng để đánh giá');
        }

        // Gửi đánh giá cho từng phòng trong đặt phòng
        const reviewPromises = bookingDetails.map(async(chiTiet) => {
            const phongInfo = chiTiet.phongInfo || {};
            const maphong = phongInfo.maphong || phongInfo.Maphong;

            if (!maphong) {
                console.warn('Không tìm thấy mã phòng trong chi tiết:', chiTiet);
                return null;
            }

            // Chuẩn bị dữ liệu theo cấu trúc API Reviews - thử với empty objects
            const reviewApiData = {
                makh: makhachhang,
                maphong: maphong,
                sosao: sosao,
                danhgia: danhgia,
                // Thử gửi với empty objects thay vì null
                makhNavigation: {},
                maphongNavigation: {}
            };

            console.log('📤 Gửi đánh giá cho phòng', maphong, ':', reviewApiData);

            // Gửi request tới API Reviews
            const response = await fetch(`${API_BASE}/Reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewApiData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);

                // Thử parse JSON để lấy thông tin lỗi chi tiết
                let errorDetails = errorText;
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.errors) {
                        const errorMessages = Object.entries(errorJson.errors)
                            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                            .join('; ');
                        errorDetails = errorMessages;
                    }
                } catch (e) {
                    // Nếu không parse được JSON, dùng text gốc
                }

                throw new Error(`Lỗi gửi đánh giá phòng ${maphong}: ${errorDetails}`);
            }

            return await response.json();
        });

        // Chờ tất cả đánh giá được gửi
        const results = await Promise.all(reviewPromises.filter(p => p !== null));

        console.log(' Tất cả đánh giá đã được gửi:', results);

        return {
            success: true,
            message: `Cảm ơn bạn đã đánh giá ${results.length} phòng! Đánh giá của bạn sẽ giúp khách hàng khác có lựa chọn tốt hơn.`,
            data: results
        };

    } catch (error) {
        console.error(' Lỗi khi gửi đánh giá:', error);
        return {
            success: false,
            message: error.message || 'Không thể gửi đánh giá. Vui lòng thử lại!'
        };
    }
}

// Đảm bảo các hàm được export vào global scope
window.getMyBookings = getMyBookings;
window.getBookingDetails = getBookingDetails;
window.getChiTietHoaDon = getChiTietHoaDon;
window.getServiceInfo = getServiceInfo;
window.cancelBooking = cancelBooking;
window.submitReview = submitReview;
window.getRoomReviews = getRoomReviews;
window.checkReviewStatus = checkReviewStatus;
window.formatDateDisplay = formatDateDisplay;
window.formatCurrency = formatCurrency;

console.log(' API functions đã được load thành công');