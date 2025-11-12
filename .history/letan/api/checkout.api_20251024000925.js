// ===============================
// checkout.api.js
// ===============================
const API_BASE_URL = "https://localhost:7076/api";

const CheckoutAPI = {
    async getPendingCheckouts() {
        const res = await fetch(`${API_BASE_URL}/Datphongs/pending-checkouts`);
        if (!res.ok) throw new Error(`Lỗi tải danh sách checkout (${res.status})`);
        return await res.json();
    },

    async getServiceHistory(maDatPhong) {
        // Thử endpoint riêng trước
        let data = [];
        try {
            const res = await fetch(`${API_BASE_URL}/Sudungdvs/history/${maDatPhong}`);
            if (res.ok) {
                data = await res.json();
                if (data.length > 0) return data;
            }
        } catch (e) {
            console.warn('Không có endpoint /history/:', e.message);
        }

        // Fallback lấy toàn bộ Sudungdvs
        const res = await fetch(`${API_BASE_URL}/Sudungdvs`);
        if (!res.ok) throw new Error('Không thể tải Sudungdvs');
        const all = await res.json();
        return all.filter(s => (s.maDatPhong || s.madatphong) == maDatPhong);
    },

    async getHotelEquipments() {
        const res = await fetch(`${API_BASE_URL}/Thietbikhachsans`);
        if (!res.ok) throw new Error('Không thể tải danh sách thiết bị');
        return await res.json();
    },

    async getDamageCompensations(maDatPhong) {
        const res = await fetch(`${API_BASE_URL}/Denbuthiethais`);
        if (!res.ok) throw new Error('Không thể tải danh sách đền bù');
        const all = await res.json();
        return all.filter(d => (d.maDatPhong || d.madatphong) == maDatPhong);
    },

    async recordDamage(data) {
        const res = await fetch(`${API_BASE_URL}/Denbuthiethais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok;
    },

    async getRemainingAmount(maDatPhong) {
        const res = await fetch(`${API_BASE_URL}/Datphongs/Sotienthieu/${maDatPhong}`);
        if (!res.ok) throw new Error('Không thể tính số tiền còn thiếu');
        return await res.json();
    },

    async executeCheckout(maDatPhong) {
        const res = await fetch(`${API_BASE_URL}/Datphongs/Checkout/${maDatPhong}`);
        if (!res.ok) throw new Error('Checkout thất bại');
        return await res.json();
    }
};

window.CheckoutAPI = CheckoutAPI;