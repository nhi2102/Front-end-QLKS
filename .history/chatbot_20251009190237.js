// Chatbot AI - Khách sạn Thanh Trà
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = "https://localhost:7076/api";

    // Tạo HTML cho chatbot
    const chatbotHTML = `
        <div class="chatbot-container">
            <button class="chatbot-toggle" id="chatbot-toggle">
                <i class="fas fa-comments"></i>
            </button>
            <div class="chatbot-window" id="chatbot-window">
                <div class="chatbot-header">
                    <h3>
                        <span class="chatbot-status"></span>
                        Trợ lý ảo Thanh Trà
                    </h3>
                    <button class="chatbot-close" id="chatbot-close">&times;</button>
                </div>
                <div class="chatbot-messages" id="chatbot-messages"></div>
                <div class="chatbot-input-area">
                    <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Nhập câu hỏi của bạn...">
                    <button class="chatbot-send" id="chatbot-send">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Thêm chatbot vào body
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // Lấy các elements
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotLink = document.getElementById('chatbot-link');

    // Toggle chatbot
    function toggleChatbot() {
        chatbotWindow.classList.toggle('active');
        if (chatbotWindow.classList.contains('active')) {
            chatbotInput.focus();
        }
    }

    chatbotToggle.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', toggleChatbot);

    // Xử lý click vào link CHATBOT trong header
    if (chatbotLink) {
        chatbotLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (!chatbotWindow.classList.contains('active')) {
                toggleChatbot();
            }
        });
    }

    // Knowledge Base - Kiến thức về khách sạn
    const knowledgeBase = {
        greetings: ['xin chào', 'chào', 'hello', 'hi', 'hey'],
        roomTypes: {
            keywords: ['phòng', 'loại phòng', 'room', 'giá phòng', 'bao nhiêu'],
            response: `🏨 Khách sạn Thanh Trà có các loại phòng sau:
            
📍 **Phòng Standard** - 500,000 VNĐ/đêm
   • 2 người • 1 giường đơn
   
📍 **Phòng Deluxe** - 800,000 VNĐ/đêm
   • 2 người • 1 giường đơn • View đẹp
   
📍 **Phòng Suite** - 1,200,000 VNĐ/đêm
   • 4 người • 2 giường • Diện tích rộng
   
📍 **Phòng VIP** - 2,000,000 VNĐ/đêm
   • 2 người • Tiện nghi cao cấp

Bạn muốn tìm hiểu thêm về loại phòng nào?`
        },
        booking: {
            keywords: ['đặt phòng', 'book', 'booking', 'đặt', 'thuê phòng'],
            response: `📅 **Cách đặt phòng tại Thanh Trà:**

1️⃣ Vào trang **Trang chủ**
2️⃣ Chọn ngày nhận - trả phòng
3️⃣ Chọn số phòng và số người
4️⃣ Click **"Tìm kiếm"**
5️⃣ Chọn phòng phù hợp
6️⃣ Điền thông tin và thanh toán

Hoặc gọi hotline: **1900 9999** để được hỗ trợ!`
        },
        services: {
            keywords: ['dịch vụ', 'tiện ích', 'service', 'tiện nghi'],
            response: `✨ **Dịch vụ tại Thanh Trà:**

🍽️ Nhà hàng & Bar cao cấp
🏊 Hồ bơi ngoài trời
💆 Spa & Massage
🏋️ Phòng gym hiện đại
🚗 Đưa đón sân bay
🧺 Giặt ủi
📶 WiFi miễn phí
🅿️ Bãi đỗ xe miễn phí

Bạn muốn biết thêm về dịch vụ nào?`
        },
        location: {
            keywords: ['địa chỉ', 'vị trí', 'ở đâu', 'location', 'địa điểm'],
            response: `📍 **Địa chỉ:** Số 123, Đường ABC, Quận XYZ, TP. Hồ Chí Minh

🚗 **Cách di chuyển:**
• Từ sân bay: 20 phút
• Từ trung tâm: 10 phút
• Gần bến xe, ga tàu

🗺️ [Xem bản đồ](#)`
        },
        contact: {
            keywords: ['liên hệ', 'contact', 'số điện thoại', 'email', 'hotline'],
            response: `📞 **Liên hệ với chúng tôi:**

☎️ Hotline: **1900 9999**
📧 Email: **info@thanhtra.com**
🌐 Website: **www.thanhtra.com**
⏰ Hoạt động: **24/7**

Chúng tôi luôn sẵn sàng hỗ trợ bạn!`
        },
        checkin: {
            keywords: ['check in', 'nhận phòng', 'checkin', 'giờ nhận'],
            response: `🕐 **Thời gian nhận/trả phòng:**

✅ Check-in: **14:00**
✅ Check-out: **12:00**

💡 **Lưu ý:**
• Nhận phòng sớm: Tùy tình trạng phòng
• Trả phòng muộn: Phụ phí áp dụng
• Liên hệ trước để được hỗ trợ tốt nhất!`
        },
        payment: {
            keywords: ['thanh toán', 'payment', 'phương thức', 'trả tiền'],
            response: `💳 **Phương thức thanh toán:**

✅ Tiền mặt
✅ Thẻ ATM/Credit Card
✅ Chuyển khoản ngân hàng
✅ VNPay, Momo
✅ ZaloPay, ShopeePay

🔒 Đảm bảo an toàn & bảo mật!`
        },
        cancel: {
            keywords: ['hủy', 'cancel', 'hoàn tiền', 'refund'],
            response: `❌ **Chính sách hủy phòng:**

✅ Hủy trước 7 ngày: Hoàn 100%
✅ Hủy trước 3 ngày: Hoàn 50%
✅ Hủy trong 3 ngày: Không hoàn tiền

📞 Liên hệ: **1900 9999** để được tư vấn!`
        }
    };

    // Thêm tin nhắn
    function addMessage(text, isBot = true, showQuickReplies = false) {
        const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const messageHTML = `
            <div class="message ${isBot ? 'bot' : 'user'}">
                <div class="message-avatar">
                    <i class="fas ${isBot ? 'fa-robot' : 'fa-user'}"></i>
                </div>
                <div class="message-content">
                    ${text}
                    ${showQuickReplies ? createQuickReplies() : ''}
                </div>
            </div>
        `;
        chatbotMessages.insertAdjacentHTML('beforeend', messageHTML);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Tạo quick replies
    function createQuickReplies() {
        return `
            <div class="quick-replies">
                <button class="quick-reply-btn" data-reply="Các loại phòng">📋 Xem phòng</button>
                <button class="quick-reply-btn" data-reply="Đặt phòng">📅 Đặt phòng</button>
                <button class="quick-reply-btn" data-reply="Dịch vụ">✨ Dịch vụ</button>
                <button class="quick-reply-btn" data-reply="Liên hệ">📞 Liên hệ</button>
            </div>
        `;
    }

    // Hiển thị typing indicator
    function showTyping() {
        const typingHTML = `
            <div class="message bot typing-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        chatbotMessages.insertAdjacentHTML('beforeend', typingHTML);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function removeTyping() {
        const typing = chatbotMessages.querySelector('.typing-message');
        if (typing) typing.remove();
    }

    // Xử lý tin nhắn
    function processMessage(userMessage) {
        const message = userMessage.toLowerCase().trim();

        // Kiểm tra lời chào
        if (knowledgeBase.greetings.some(greeting => message.includes(greeting))) {
            return `Xin chào! 👋 Tôi là trợ lý ảo của Khách sạn Thanh Trà. 
            
Tôi có thể giúp bạn về:
• Thông tin phòng và giá cả
• Đặt phòng
• Dịch vụ khách sạn
• Địa chỉ và liên hệ

Bạn cần hỗ trợ gì?`;
        }

        // Tìm trong knowledge base
        for (const [key, value] of Object.entries(knowledgeBase)) {
            if (key !== 'greetings' && value.keywords) {
                if (value.keywords.some(keyword => message.includes(keyword))) {
                    return value.response;
                }
            }
        }

        // Không tìm thấy câu trả lời
        return `Xin lỗi, tôi chưa hiểu câu hỏi của bạn. 😊

Bạn có thể hỏi về:
• Loại phòng và giá
• Cách đặt phòng
• Dịch vụ khách sạn
• Địa chỉ và liên hệ

Hoặc gọi hotline: **1900 9999** để được hỗ trợ trực tiếp!`;
    }

    // Gửi tin nhắn
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;

        // Hiển thị tin nhắn user
        addMessage(message, false);
        chatbotInput.value = '';

        // Hiển thị typing
        showTyping();

        // Simulate delay
        setTimeout(() => {
            removeTyping();
            const response = processMessage(message);
            addMessage(response, true, true);
        }, 1000);
    }

    // Events
    chatbotSend.addEventListener('click', sendMessage);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Quick replies
    chatbotMessages.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            const reply = e.target.getAttribute('data-reply');
            chatbotInput.value = reply;
            sendMessage();
        }
    });

    // Tin nhắn chào mừng
    setTimeout(() => {
        addMessage('Xin chào! 👋 Chào mừng bạn đến với Khách sạn Thanh Trà. Tôi có thể giúp gì cho bạn?', true, true);
    }, 500);
});