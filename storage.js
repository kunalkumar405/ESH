const DEFAULT_WISHLIST = [];


const WELCOME_COUPON = {
    code: "WELCOME100",
    description: "Flat ₹100 OFF above ₹499 • First Booking Offer",
    discount: 100,
    minOrder: 499,
    type: "welcome"
};

const EE_STORAGE = {
    getProfile: () => ({
        uid: localStorage.getItem('ee_user_uid') || '',
        name: localStorage.getItem('ee_user_name') || '',
        phone: localStorage.getItem('ee_user_phone') || '',
        email: localStorage.getItem('ee_user_email') || '',
        address: localStorage.getItem('ee_user_address') || '',
        district: localStorage.getItem('ee_user_district') || '',
        points: parseInt(localStorage.getItem('ee_user_points') || '0', 10),
        lastSync: parseInt(localStorage.getItem('ee_last_sync') || '0', 10)
    }),
    saveProfile: (key, value) => {
        if (value !== undefined && value !== null) {
            localStorage.setItem(key, value);
        }
    },
    clearProfile: () => {
        ['ee_user_uid', 'ee_user_name', 'ee_user_phone', 'ee_user_email', 'ee_user_address', 'ee_user_district', 'ee_user_points', 'ee_addresses', 'ee_coupons', 'ee_used_coupons', 'ee_user_bookings', 'ee_last_sync', 'ee_wishlist'].forEach(k => localStorage.removeItem(k));
    },
    getUserBookings: () => {
        try {
            const saved = localStorage.getItem('ee_user_bookings');
            return saved !== null ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    },
    setUserBookings: (list) => {
        localStorage.setItem('ee_user_bookings', JSON.stringify(list || []));
    },
    getAddresses: () => {
        try {
            const saved = localStorage.getItem('ee_addresses');
            if (saved !== null) return JSON.parse(saved);
            return [];
        } catch {
            return [];
        }
    },
    setAddresses: (list) => {
        localStorage.setItem('ee_addresses', JSON.stringify(list || []));
    },

    getUsedCoupons: () => {
        try {
            return JSON.parse(localStorage.getItem('ee_used_coupons')) || [];
        } catch {
            return [];
        }
    },
    setUsedCoupons: (list) => {
        localStorage.setItem('ee_used_coupons', JSON.stringify(list || []));
    },
    getCoupons: () => {
        try {
            const used = EE_STORAGE.getUsedCoupons().map(c => c.toUpperCase());
            const saved = localStorage.getItem('ee_coupons');
            let list = saved !== null ? JSON.parse(saved) : [WELCOME_COUPON];
            return list.filter(c => c && c.code && !used.includes(c.code.toUpperCase()));
        } catch {
            return [WELCOME_COUPON];
        }
    },
    setCoupons: (list) => {
        localStorage.setItem('ee_coupons', JSON.stringify(list || []));
    },

    getWishlist: () => {
        try {
            const saved = localStorage.getItem('ee_wishlist');
            if (saved !== null) return JSON.parse(saved);
            localStorage.setItem('ee_wishlist', JSON.stringify(DEFAULT_WISHLIST));
            return DEFAULT_WISHLIST;
        } catch {
            return DEFAULT_WISHLIST;
        }
    },
    setWishlist: (list) => {
        localStorage.setItem('ee_wishlist', JSON.stringify(list));
    },

    getCart: () => {
        try { return JSON.parse(localStorage.getItem('ee_cart')) || []; }
        catch { return []; }
    },
    setCart: (cartData) => localStorage.setItem('ee_cart', JSON.stringify(cartData)),
    clearCart: () => localStorage.removeItem('ee_cart'),
    
        getBooking: () => {
        try { return JSON.parse(localStorage.getItem('ee_booking')); }
        catch { return null; }
    },
    setBooking: (bookingData) => localStorage.setItem('ee_booking', JSON.stringify(bookingData)),

      // Database Registry for Booked Slots (Synced with Firestore)
    getBookedSlots: () => {
        try {
            const saved = JSON.parse(localStorage.getItem('ee_booked_slots'));
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    },
    addBookedSlots: (newSlotsArray) => {
        const current = EE_STORAGE.getBookedSlots();
        const seen = new Set(current.map(s => `${s.bookingId || ''}|${s.date}|${s.time}|${(s.mode || 'Home').toLowerCase()}`));
        const toAdd = [];
        (newSlotsArray || []).forEach(s => {
            if (!s || !s.date || !s.time) return;
            const key = `${s.bookingId || ''}|${s.date}|${s.time}|${(s.mode || 'Home').toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                toAdd.push(s);
            }
        });
        const updated = [...current, ...toAdd];
        localStorage.setItem('ee_booked_slots', JSON.stringify(updated));
    }
};

// Selected Services Helper (Replaces cart.js)
const EE_CART = {
    items: new Set(EE_STORAGE.getCart()),
    add: (id) => { EE_CART.items.add(String(id)); EE_CART.save(); },
    remove: (id) => { EE_CART.items.delete(String(id)); EE_CART.save(); },
    toggle: (id) => { if (EE_CART.has(id)) EE_CART.remove(id); else EE_CART.add(id); },
    has: (id) => EE_CART.items.has(String(id)) || EE_CART.items.has(id),
    save: () => EE_STORAGE.setCart(Array.from(EE_CART.items)),
    clear: () => { EE_CART.items.clear(); EE_STORAGE.clearCart(); },
    getCount: () => EE_CART.items.size,
    getTotal: () => {
        let total = 0;
        if (typeof SERVICES !== 'undefined') {
            EE_CART.items.forEach(id => {
                const s = SERVICES.find(x => String(x.id) === String(id));
                if (s) total += (Number(s.price) || 0);
            });
        }
        return total;
    }
};
window.EE_CART = EE_CART;
