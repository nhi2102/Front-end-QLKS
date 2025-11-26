// --- CẤU HÌNH API ---
const API_BASE_URL = 'https://localhost:7076';
const API_ENDPOINTS = {
    staff: `${API_BASE_URL}/api/Nhanviens`,
    staffById: (id) => `${API_BASE_URL}/api/Nhanviens/${id}`,
    customer: `${API_BASE_URL}/api/Khachhangs`,
    customerById: (id) => `${API_BASE_URL}/api/Khachhangs/${id}`,
    roles: `${API_BASE_URL}/api/Chucvus`
};

/**
 * Hàm fetch API chung
 * @param {string} url URL để fetch
 * @param {object} options Các tùy chọn của Fetch (method, headers, body)
 */
async function apiRequest(url, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, {...options, headers });

        if (!response.ok) {
            const errorData = await response.text().catch(() => response.statusText);
            throw new Error(`Lỗi ${response.status}: ${errorData || 'Không có phản hồi từ API'}`);
        }

        if (response.status === 204) {
            return { success: true }; // Xử lý 204 No Content
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else {
            const text = await response.text();
            if (text === '') {
                return { success: true }; // Xử lý phản hồi rỗng
            }
            throw new Error(`Phản hồi không phải JSON: ${text}`);
        }
    } catch (error) {
        console.error('Lỗi API Request:', error);
        throw error;
    }
}

// --- API NHÂN VIÊN ---
export async function getStaff() {
    return apiRequest(API_ENDPOINTS.staff);
}

export async function getChucVuList() {
    return apiRequest(API_ENDPOINTS.roles);
}

export async function createStaffAccount(payload) {
    const apiPayload = {
        email: payload.username,
        hoten: payload.fullName,
        matkhau: payload.password,
        machucvu: parseInt(payload.role),
        ngaysinh: payload.ngaysinh || "2000-01-01",
        sdt: payload.sdt || "000000000",
        gioitinh: payload.gioitinh || "Khác",
        diachi: payload.diachi || "N/A",
        trangthai: payload.trangthai || "Hoạt động"
    };

    return apiRequest(API_ENDPOINTS.staff, {
        method: 'POST',
        body: JSON.stringify(apiPayload)
    });
}

export async function updateStaffAccount(id, payload, originalAccount) {
    const changes = {};
    if (payload.username) changes.email = payload.username; // GỬI email
    if (payload.fullName) changes.hoten = payload.fullName;
    // CHỈ gửi mật khẩu khi có thay đổi (không phải rỗng)
    if (payload.password && payload.password.trim() !== '') {
        changes.matkhau = payload.password;
    }
    if (payload.status) changes.trangthai = payload.status;
    if (payload.role) changes.machucvu = parseInt(payload.role);
    if (payload.ngaysinh) changes.ngaysinh = payload.ngaysinh;
    if (payload.sdt) changes.sdt = payload.sdt;
    if (payload.gioitinh) changes.gioitinh = payload.gioitinh;
    if (payload.diachi) changes.diachi = payload.diachi;

    const apiPayload = {
        manv: Number(id),
        ...originalAccount,
        ...changes
    };

    delete apiPayload.machucvuNavigation;
    delete apiPayload.blogs;
    delete apiPayload.vouchers;

    return apiRequest(API_ENDPOINTS.staffById(id), {
        method: 'PUT',
        body: JSON.stringify(apiPayload)
    });
}

export async function deleteStaffAccount(id) {
    return apiRequest(API_ENDPOINTS.staffById(id), {
        method: 'DELETE'
    });
}

// --- API KHÁCH HÀNG ---
export async function getCustomers() {
    return apiRequest(API_ENDPOINTS.customer);
}

export async function updateCustomerAccount(id, payload, originalAccount) {
    const changes = {};
    if (payload.username) changes.email = payload.username;
    if (payload.fullName) changes.hoten = payload.fullName;
    if (payload.password) changes.matkhau = payload.password;
    if (payload.status) changes.trangthai = payload.status;
    if (payload.phone) changes.sdt = payload.phone;
    if (payload.ngaysinh) changes.ngaysinh = payload.ngaysinh;
    if (payload.diachi) changes.diachi = payload.diachi;
    if (payload.cccd) changes.cccd = payload.cccd;

    const apiPayload = {
        makh: Number(id),
        ...originalAccount,
        ...changes
    };

    delete apiPayload.datphongs;
    delete apiPayload.hoadons;
    delete apiPayload.reviews;

    return apiRequest(API_ENDPOINTS.customerById(id), {
        method: 'PUT',
        body: JSON.stringify(apiPayload)
    });
}

export async function deleteCustomerAccount(id) {
    return apiRequest(API_ENDPOINTS.customerById(id), {
        method: 'DELETE'
    });
}

export async function sendPasswordReset(email) {
    const url = `${API_BASE_URL}/api/Taikhoans/QuenMatKhau?email=${encodeURIComponent(email)}`;

    try {
        const res = await fetch(url, {
            method: "POST"
        });

        // Xử lý response dựa trên Content-Type
        let data;
        const contentType = res.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            // Nếu không phải JSON, lấy text
            const textResult = await res.text();
            console.log("Response text:", textResult);

            // Cố gắng parse JSON, nếu không được thì tạo object lỗi
            try {
                data = JSON.parse(textResult);
            } catch {
                if (textResult.includes("Microsoft.") || textResult.includes("Exception")) {
                    const errorLines = textResult.split('\n');
                    const mainError = errorLines[0] || textResult;
                    data = {
                        success: false,
                        message: `Lỗi hệ thống: ${mainError}\n\nVui lòng liên hệ admin.`
                    };
                } else {
                    // Nếu response là text (ví dụ: "Gửi thành công") và res.ok = true
                    // thì đây là trường hợp thành công
                    if (res.ok) {
                        data = {
                            success: true,
                            message: textResult || "Mật khẩu mới đã được gửi."
                        };
                    } else {
                        data = {
                            success: false,
                            message: textResult || "Lỗi server không xác định"
                        };
                    }
                }
            }
        }

        console.log("Kết quả API quên mật khẩu:", data);

        if (!res.ok) {
            throw new Error(data.message || "Không thể gửi mật khẩu mới!");
        }

        // Trả về dữ liệu thành công (thường là { success: true, message: "..." })
        return data;

    } catch (err) {
        console.error("Lỗi gọi API quên mật khẩu:", err);
        // Ném lỗi ra ngoài để hàm gọi (trong accounts.js) có thể bắt được
        throw err;
    }
}

// ✅ CHÍNH XÁC - Lấy đặt phòng do nhân viên thực hiện
export async function getDatphongByStaff(manv) {
    // Backend hiện tại KHÔNG có endpoint /staff/{id}
    // Nhưng khi gọi GET /api/Datphongs → nó trả toàn bộ + có trường "manv"
    // → Ta gọi toàn bộ rồi filter ở client (cách nhanh nhất & ổn định)
    const response = await fetch(`${API_BASE_URL}/api/Datphongs`);
    if (!response.ok) throw new Error("Không tải được danh sách đặt phòng");
    const all = await response.json();
    return all.filter(dp => Number(dp.manv) === Number(manv));
}

// ✅ CHÍNH XÁC - Lấy thanh toán do nhân viên thực hiện
export async function getThanhtoanByStaff(manv) {
    // Endpoint này đã đúng rồi, nhưng để đồng bộ và an toàn hơn:
    const response = await fetch(`${API_BASE_URL}/api/Payment`);
    if (!response.ok) throw new Error("Không tải được danh sách thanh toán");
    const all = await response.json();
    return all.filter(tt => Number(tt.manv) === Number(manv));
}

// ✅ CHÍNH XÁC - Lấy đền bù do nhân viên xử lý
export async function getDenbuByStaff(manv) {
    const response = await fetch(`${API_BASE_URL}/api/Denbuthiethais`);
    if (!response.ok) throw new Error("Không tải được danh sách đền bù");
    const all = await response.json();
    return all.filter(db => Number(db.manv) === Number(manv));
}

let thietBiCache = null;

export async function getDanhSachThietBi() {
    if (thietBiCache) return thietBiCache;

    try {
        const data = await apiRequest(`${API_BASE_URL}/api/Thietbikhachsans`);
        thietBiCache = data;
        console.log('Đã tải danh sách thiết bị:', data);
        return data;
    } catch (error) {
        console.error('Lỗi tải thiết bị:', error);
        return [];
    }
}

export async function getTenThietBi(mathietbi) {
    if (!mathietbi) return 'Thiết bị hỏng';
    const ds = await getDanhSachThietBi();
    const tb = ds.find(item => item.mathietbi === mathietbi);
    return tb ? tb.tenthietbi : 'Thiết bị hỏng';
}

export async function getThietBiInfo(mathietbi) {
    if (!mathietbi) return null;
    const ds = await getDanhSachThietBi();
    return ds.find(item => item.mathietbi === mathietbi) || null;
}

// Tự động tải trước
getDanhSachThietBi();