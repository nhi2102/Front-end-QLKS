// File này chỉ dùng để gọi API liên quan đến dịch vụ khách sạn

const API_BASE = 'https://localhost:7076/api';

// Lấy danh sách khách đang ở
export async function fetchCurrentGuests() {
    const response = await fetch(`${API_BASE}/Datphongs/checked-in`, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

// Lấy danh sách dịch vụ
export async function fetchAvailableServices() {
    const response = await fetch(`${API_BASE}/Dichvus`, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

// Đặt dịch vụ cho khách
export async function bookServiceForGuest(maDatPhong, serviceId, quantity) {
    // Gọi stored procedure TAO_SUDUNGDV
    const body = {
        maDatPhong,
        maDv: serviceId,
        soLuong: quantity
    };
    const response = await fetch(`${API_BASE}/Sudungdvs/execute-procedure`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

// Lấy lịch sử dịch vụ của khách
export async function fetchServiceHistory(maDatPhong) {
    const response = await fetch(`${API_BASE}/Sudungdvs/history/${maDatPhong}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}
