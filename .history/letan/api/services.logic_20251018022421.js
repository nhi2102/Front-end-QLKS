// File này chứa các thao tác xử lý UI, logic và comment tiếng Việt
// Sử dụng các hàm API từ services.api.js

import {
    fetchCurrentGuests,
    fetchAvailableServices,
    bookServiceForGuest,
    fetchServiceHistory
} from './services.api.js';

// Biến toàn cục
let currentGuestsData = [];
let availableServices = [];
let selectedServices = [];
let currentBookingId = null;

// Khởi tạo trang
// ...existing code...

// Kiểm tra đăng nhập người dùng
// ...existing code...

// Thiết lập sự kiện
// ...existing code...

// Tải danh sách khách đang ở
async function loadCurrentGuests() {
    try {
        currentGuestsData = await fetchCurrentGuests();
        displayCurrentGuests(currentGuestsData);
    } catch (error) {
        console.error('Lỗi tải khách:', error);
        // ...existing code...
    }
}

// Hiển thị danh sách khách
function displayCurrentGuests(guests) {
    // ...existing code...
}

// Tải danh sách dịch vụ
async function loadAvailableServices() {
    try {
        availableServices = await fetchAvailableServices();
        // ...existing code...
    } catch (error) {
        console.error('Lỗi tải dịch vụ:', error);
        // ...existing code...
    }
}

// Đặt dịch vụ cho khách
async function confirmServices() {
    if (!currentBookingId) {
        alert('Lỗi: Không tìm thấy thông tin booking!');
        return;
    }
    if (selectedServices.length === 0) {
        alert('Vui lòng chọn ít nhất một dịch vụ!');
        return;
    }
    try {
        for (const service of selectedServices) {
            await bookServiceForGuest(currentBookingId, service.madv || service.id, service.quantity);
        }
        alert('✓ Đặt dịch vụ thành công!');
        closeServicesModal();
        window.location.reload();
    } catch (error) {
        console.error('Lỗi đặt dịch vụ:', error);
        alert('❌ Lỗi đặt dịch vụ: ' + error.message);
    }
}

// Lấy lịch sử dịch vụ
async function showServiceHistory(bookingId) {
    try {
        const history = await fetchServiceHistory(bookingId);
        // ...existing code...
    } catch (error) {
        console.error('Lỗi tải lịch sử dịch vụ:', error);
        // ...existing code...
    }
}

// ...Các hàm thao tác UI khác giữ nguyên, thêm comment tiếng Việt nếu cần...
