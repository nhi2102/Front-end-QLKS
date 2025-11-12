/**
 * 🌐 CẤU HÌNH GLOBAL CHO ỨNG DỤNG
 * 
 * HƯỚNG DẪN SỬ DỤNG NGROK:
 * 1. Chạy ngrok: ngrok http 5500 (hoặc cổng của bạn)
 * 2. Copy URL từ ngrok (VD: https://abc123.ngrok-free.app)
 * 3. Thay thế RETURN_BASE_URL bên dưới bằng ngrok URL
 * 4. Reload lại trang
 * 
 * LƯU Ý: File này phải được load TRƯỚC các file khác (cus_info.js, payment.js)
 */

// 🔧 CẤU HÌNH RETURN URL CHO VNPAY
// Uncomment và thay đổi URL khi dùng ngrok:
// window.RETURN_BASE_URL = 'https://your-ngrok-url.ngrok-free.app';

// Mặc định dùng localhost
window.RETURN_BASE_URL = window.RETURN_BASE_URL || window.location.origin;

console.log('🌐 Return Base URL:', window.RETURN_BASE_URL);
