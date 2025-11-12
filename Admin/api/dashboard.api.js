// js/dashboard.api.js
const API_BASE = "https://localhost:7076/api";

// === 1. LỄ TÂN: Tổng quan + chi tiết ===
export async function apiGetDashboardData() {
    try {
        const [summaryRes, detailsRes] = await Promise.all([
            fetch(`${API_BASE}/Dashboard/letan`),
            fetch(`${API_BASE}/Dashboard/letan/chitiet`)
        ]);

        if (!summaryRes.ok || !detailsRes.ok) {
            throw new Error(`Lỗi API Dashboard: ${summaryRes.status} / ${detailsRes.status}`);
        }

        const summaryText = await summaryRes.text();
        const detailsText = await detailsRes.text();

        let summary = {};
        let details = { checkInHomNay: [], checkOutHomNay: [] };

        try {
            summary = JSON.parse(summaryText);
        } catch (e) {
            console.warn("Parse summary thất bại, thử thủ công...");
            const match = summaryText.match(/\{[^}]*\}/);
            if (match) summary = JSON.parse(match[0]);
        }

        try {
            const detailsJson = JSON.parse(detailsText);
            details.checkInHomNay = detailsJson.checkInHomNay || [];
            details.checkOutHomNay = detailsJson.checkOutHomNay || [];
        } catch (e) {
            console.warn("Parse details thất bại, dùng mặc định.");
        }

        return { summary, details };
    } catch (error) {
        console.error("Lỗi khi gọi API Dashboard:", error);
        throw error;
    }
}

// === 2. ĐẶT PHÒNG: Lấy danh sách đặt phòng ===
export async function apiGetDatPhongs() {
    try {
        const res = await fetch(`${API_BASE}/Datphongs`);
        if (!res.ok) throw new Error(`Lỗi tải đặt phòng (${res.status})`);
        return await res.json();
    } catch (error) {
        console.error("Lỗi khi gọi API Datphongs:", error);
        throw error;
    }
}

export async function apiGetRevenueLast7Days() {
    try {
        // Tính 7 ngày gần nhất
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 6);

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];

        console.log("Lấy doanh thu 7 ngày:", fromStr, "→", toStr);

        const params = new URLSearchParams({ from: fromStr, to: toStr });
        const res = await fetch(`${API_BASE}/Datphongs/revenue?${params}`, {
            credentials: 'omit'
        });

        if (!res.ok) throw new Error(`Lỗi API revenue: ${res.status}`);

        const json = await res.json();
        const data = json.data || [];

        // Chuẩn hóa dữ liệu: chỉ lấy ngày + tổng doanh thu
        const result = data.map(item => ({
            date: item.date.split('T')[0],           // YYYY-MM-DD
            doanhThu: item.tongDoanhThu || 0         // ĐÚNG TRƯỜNG TRONG API
        }));

        console.log("Doanh thu 7 ngày (đã chuẩn hóa):", result);
        return result;

    } catch (error) {
        console.error("Lỗi lấy doanh thu 7 ngày:", error);
        return []; // Trả mảng rỗng để biểu đồ vẫn vẽ
    }
}