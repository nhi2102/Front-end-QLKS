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
        const res = await fetch(`${API_BASE_URL}/Sudungdvs/history/${maDatPhong}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
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
    },
    async createDamageCompensation(data) {
        const res = await fetch(`${API_BASE_URL}/Datphongs/taodenbu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tạo đền bù thiệt hại');
        }

        return await res.json();
    },

};

window.CheckoutAPI = CheckoutAPI;