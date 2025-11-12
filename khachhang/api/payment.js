const API_BASE = 'https://localhost:7076/api';

// Khai báo hàm ở global scope
window.createVNPayPayment = async function(paymentInfo) {
    try {
        const { orderId, amount, orderInfo, returnUrl } = paymentInfo;

        const vnpayPayload = {
            OrderId: orderId,
            Amount: amount,
            OrderInfo: orderInfo || `Thanh toan dat phong ${orderId}`,
            ReturnUrl: returnUrl || `${window.location.origin}/payment-result.html`
        };

        console.log(' Tạo thanh toán VNPay:', vnpayPayload);

        const response = await fetch(`${API_BASE}/Payment/CreateVNPayUrl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vnpayPayload)
        });

        console.log(' Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(' API Error:', errorText);
            throw new Error(`Lỗi tạo thanh toán VNPay: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log(' API Response:', result);

        const paymentUrl = result.url;
        console.log(' Payment URL:', paymentUrl);

        return paymentUrl;

    } catch (error) {
        console.error(' Lỗi tạo thanh toán VNPay:', error);
        throw error;
    }
};

// Log để xác nhận file đã load
console.log(' payment.js đã được load, hàm createVNPayPayment:', typeof window.createVNPayPayment);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createVNPayPayment: window.createVNPayPayment };
}