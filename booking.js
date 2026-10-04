import {
    auth,
    rtdb,
    ref,
    get,
    set,
    update,
    onAuthStateChanged
} from "./firebase-client.js";


const WHATSAPP_ADMIN_PHONE = "917780910928";

const initBookingApp = async () => {
    if (!document.getElementById('booking-page')) return;

    const dom = {
        flowContainer:       document.getElementById('bookingFlowContainer'),
        step1Container:      document.getElementById('bookingStep1'),
        step2Container:      document.getElementById('bookingStep2'),
        backBtn:             document.getElementById('bookingBackBtn'),
        headerTitle:         document.getElementById('bookingHeaderTitle'),
        headerSub:           document.getElementById('bookingHeaderSub'),
        headerAddBtn:        document.getElementById('headerAddServiceBtn'),
        step2SummaryText:    document.getElementById('step2ServicesSummary'),
        ctaLabelText:        document.getElementById('ctaLabelText'),
        nextStepBtn:         document.getElementById('nextStepBtn'),
        confirmContainer:    document.getElementById('bookingConfirmation'),
        emptyState:          document.getElementById('emptyBookingState'),
        stickyCta:           document.getElementById('stickyConfirmContainer'),
        servicesList:        document.getElementById('bookingServicesList'),
        custName:            document.getElementById('customerName'),
        custPhone:           document.getElementById('customerPhone'),
        custAddr:            document.getElementById('customerAddress'),
        custDistrictBadge:   document.getElementById('customerDistrictBadge'),
        addrSelectorBox:     document.getElementById('savedAddressSelectorBox'),
        addrSelect:          document.getElementById('bookingAddressSelect'),
        homeVenueRow:        document.getElementById('homeVenueRow'),
        salonVenueRow:       document.getElementById('salonVenueRow'),
        bookingSubtotal:     document.getElementById('bookingSubtotal'),
        discountRow:         document.getElementById('discountRow'),
        discountLabelText:   document.getElementById('discountLabelText'),
        bookingDiscount:     document.getElementById('bookingDiscount'),
        pointsDiscountRow:   document.getElementById('pointsDiscountRow'),
        bookingPointsDiscount: document.getElementById('bookingPointsDiscount'),
        
        // NEW FEE UI ELEMENTS
        travelFeeRow:        document.getElementById('travelFeeRow'),
        bookingTravelFee:    document.getElementById('bookingTravelFee'),
        bookingConvenienceFee: document.getElementById('bookingConvenienceFee'),
        bookingHygieneFee:   document.getElementById('bookingHygieneFee'),
        
        bookingFinalTotal:   document.getElementById('bookingFinalTotal'),
        ctaFinalTotal:       document.getElementById('ctaFinalTotal'),
        confirmBtn:          document.getElementById('confirmBookingBtn'),
        confirmId:           document.getElementById('confirm-id'),
        confirmDatetime:     document.getElementById('confirm-datetime'),
        confirmTotal:        document.getElementById('confirm-total'),
        confirmWhatsappBtn:  document.getElementById('confirmWhatsappBtn'),
        confirmInvoiceBtn:   document.getElementById('confirmInvoiceBtn'),
        serviceAreaSelect:   document.getElementById('serviceAreaSelect'),
        areaErrorMsg:        document.getElementById('areaErrorMsg'),

        promoInput:          document.getElementById('promoInput'),
        applyPromoBtn:       document.getElementById('applyPromoBtn'),
        promoFeedback:       document.getElementById('promoFeedback'),
        couponsStrip:        document.getElementById('availableCouponsStrip'),
        walletPointsCard:    document.getElementById('walletPointsCard'),
        walletPointsSubtext: document.getElementById('walletPointsSubtext'),
        usePointsCheckbox:   document.getElementById('usePointsCheckbox'),

        slotModalScrim:      document.getElementById('slotModalScrim'),
        slotPickerModal:     document.getElementById('slotPickerModal'),
        closeSlotModalBtn:   document.getElementById('closeSlotModalBtn'),
        modalServiceTitle:   document.getElementById('modalServiceTitle'),
        modeBtnHome:         document.getElementById('modeBtnHome'),
        modeBtnSalon:        document.getElementById('modeBtnSalon'),
        dateContainer:       document.getElementById('dateContainer'),
        timeContainer:       document.getElementById('timeContainer'),
        modalSelectedPreview: document.getElementById('modalSelectedPreview'),
        saveSlotBtn:         document.getElementById('saveSlotBtn')
    };

    const TIME_GROUPS = [
        { name: 'Morning',   icon: 'wb_twilight', slots: ['09:30 AM', '10:30 AM', '11:00 AM', '11:30 AM'] },
        { name: 'Afternoon', icon: 'light_mode',  slots: ['12:30 PM', '01:30 PM', '02:00 PM', '03:00 PM', '04:00 PM'] },
        { name: 'Evening',   icon: 'dark_mode',   slots: ['05:00 PM', '06:00 PM', '07:00 PM'] }
    ];

    const ALL_SLOTS = TIME_GROUPS.flatMap(g => g.slots);

    const serviceSchedules = (() => {
        try {
            return JSON.parse(localStorage.getItem('ee_booking_schedules')) || {};
        } catch (e) { return {}; }
    })();

    function saveSchedulesToLocal() {
        try {
            localStorage.setItem('ee_booking_schedules', JSON.stringify(serviceSchedules));
        } catch (e) {}
    }

    let activeEditingServiceId = null;
    let tempModalState = { mode: 'Home', date: '', time: '' };

    let firestoreBookedSlots = (() => {
        try {
            const cached = JSON.parse(localStorage.getItem('ee_booked_slots'));
            return Array.isArray(cached) ? cached : [];
        } catch (e) { return []; }
    })();

    function ensureLocalServicesLoaded() {
        if (typeof window.SERVICES === 'undefined') window.SERVICES = [];
        if (window.SERVICES.length === 0) {
            try {
                const cachedSrvs = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
                if (Array.isArray(cachedSrvs) && cachedSrvs.length > 0) {
                    cachedSrvs.forEach(s => window.SERVICES.push(s));
                }
            } catch (e) {}
        }
    }
    ensureLocalServicesLoaded();

    let appliedCouponObj = null;
    let appliedDiscount = 0;
    let redeemedPoints = 0;
    
    // Areas List & Global Fees
    let serviceAreasList = [];
    let globalFees = { convenience: { amount: 0, mode: 'Both' }, hygiene: { amount: 0, mode: 'Both' } };
    
    try {
        serviceAreasList = JSON.parse(localStorage.getItem('ee_service_areas')) || [];
        globalFees = JSON.parse(localStorage.getItem('ee_global_fees')) || globalFees;
    } catch(e) {}

    function getLocalDateString(d = new Date()) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDuration(mins) {
        const m = parseInt(mins, 10) || 0;
        const hrs = Math.floor(m / 60);
        const rem = m % 60;
        if (hrs > 0 && rem > 0) return `${hrs} hr ${rem} mins`;
        if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
        return `${rem} mins`;
    }

    function formatDateDisplay(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    // ==================== 1. FIRESTORE GLOBAL SLOT LOCKING ====================

    async function fetchBookedSlotsFromFirestore() {
        try {
            const snap = await get(ref(rtdb, "bookings"));
            const locked = [];

            if (snap.exists()) {
                const bookingsObj = snap.val() || {};
                Object.values(bookingsObj).forEach(b => {
                    if (!b) return;
                    const status = String(b.status || 'pending').toLowerCase();
                    if (status === 'cancelled' || status === 'rejected') return;

                    if (Array.isArray(b.items) && b.items.length > 0) {
                        b.items.forEach(item => {
                            if (item.date && item.time) {
                                locked.push({ date: item.date, time: item.time, mode: item.mode || 'Home' });
                            }
                        });
                    } else if (b.date && b.time) {
                        locked.push({ date: b.date, time: b.time, mode: b.mode || 'Home' });
                    }
                });
            }

            firestoreBookedSlots = locked;
            localStorage.setItem('ee_booked_slots', JSON.stringify(locked));
        } catch (err) {
            try {
                const cached = JSON.parse(localStorage.getItem('ee_booked_slots'));
                if (Array.isArray(cached)) firestoreBookedSlots = cached;
            } catch {
                firestoreBookedSlots = [];
            }
        }
    }

    function isSlotBookedInDB(dateStr, timeSlot, mode = 'Home') {
        if (timeSlot === 'Anytime') return false; 
        return firestoreBookedSlots.some(b => {
            const bMode = b.mode || 'Home';
            return b.date === dateStr && b.time === timeSlot && bMode.toLowerCase() === mode.toLowerCase();
        });
    }

        // नया फंक्शन: चेक करने के लिए कि स्लॉट का टाइम बीत तो नहीं गया (30 मिनट के बफर के साथ)
    function isSlotExpired(dateStr, timeSlot) {
        if (timeSlot === 'Anytime') {
            const todayStr = getLocalDateString(new Date());
            if (dateStr !== todayStr) return false;
            const now = new Date();
            now.setMinutes(now.getMinutes() + 30);
            const lastSlotTime = new Date();
            lastSlotTime.setHours(19, 0, 0, 0); // 07:00 PM (Last slot of the day)
            return lastSlotTime < now;
        }

        const today = new Date();
        const slotDate = new Date(dateStr + 'T00:00:00');
        
        // अगर चुनी गई तारीख भविष्य की है, तो एक्सपायर नहीं है
        if (slotDate.setHours(0,0,0,0) > today.setHours(0,0,0,0)) return false;
        // अगर पुरानी तारीख है, तो एक्सपायर है
        if (slotDate.setHours(0,0,0,0) < today.setHours(0,0,0,0)) return true;

        // आज की तारीख है, तो टाइम कैलकुलेट करें
        const [time, modifier] = timeSlot.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        if (hours === 12 && modifier === 'AM') hours = 0;
        if (hours < 12 && modifier === 'PM') hours += 12;

        const slotTime = new Date();
        slotTime.setHours(hours, parseInt(minutes, 10), 0, 0);

        const now = new Date();
        now.setMinutes(now.getMinutes() + 30); // 30 मिनट का बुकिंग बफर

        return slotTime < now;
    }

    function isSlotUsedByOtherCartItem(dateStr, timeSlot, currentServiceId, mode = 'Home') {
        if (timeSlot === 'Anytime') return false; 
        return Object.entries(serviceSchedules).some(([sId, sched]) => {
            const sMode = sched.mode || 'Home';
            return String(sId) !== String(currentServiceId) &&
                   sched.date === dateStr &&
                   sched.time === timeSlot &&
                   sMode.toLowerCase() === mode.toLowerCase();
        });
    }

    function findFirstAvailableSlot(dateStr, serviceId, mode = 'Home') {
        for (const slot of ALL_SLOTS) {
            if (!isSlotExpired(dateStr, slot) && !isSlotBookedInDB(dateStr, slot, mode) && !isSlotUsedByOtherCartItem(dateStr, slot, serviceId, mode)) {
                return slot;
            }
        }
        return null;
    }


    function findAvailableDateAndSlot(serviceId, mode = 'Home') {
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = getLocalDateString(d);
            const freeSlot = findFirstAvailableSlot(dateStr, serviceId, mode);
            if (freeSlot) {
                return { date: dateStr, time: freeSlot };
            }
        }
        return { date: getLocalDateString(today), time: ALL_SLOTS[0] };
    }

    function initDefaultSchedules() {
        if (typeof EE_CART === 'undefined') return;
        EE_CART.items.forEach(id => {
            const existing = serviceSchedules[id];
            const currentMode = existing?.mode || 'Home';
            if (!existing || isSlotBookedInDB(existing.date, existing.time, currentMode) || isSlotUsedByOtherCartItem(existing.date, existing.time, id, currentMode)) {
                const best = findAvailableDateAndSlot(id, currentMode);
                serviceSchedules[id] = {
                    mode: currentMode,
                    date: best.date,
                    time: best.time
                };
            }
        });
    }

    // ==================== 2. ACCOUNT DATA SYNC ====================

    async function syncUserAccountForBooking() {
        const cachedProfile = EE_STORAGE.getProfile();
        const uid = auth.currentUser?.uid || cachedProfile.uid;
        if (!uid) return;

        try {
            const userSnap = await get(ref(rtdb, `users/${uid}`));
            if (userSnap.exists()) {
                const u = userSnap.val() || {};
                const pts = parseInt(u.points || 0, 10) || 0;

                EE_STORAGE.saveProfile('ee_user_uid', uid);
                if (u.name) EE_STORAGE.saveProfile('ee_user_name', u.name);
                if (u.phone) EE_STORAGE.saveProfile('ee_user_phone', u.phone);
                if (u.email) EE_STORAGE.saveProfile('ee_user_email', u.email);
                if (u.address !== undefined) EE_STORAGE.saveProfile('ee_user_address', u.address || '');
                if (u.district !== undefined) EE_STORAGE.saveProfile('ee_user_district', u.district || '');
                EE_STORAGE.saveProfile('ee_user_points', pts.toString());

                if (Array.isArray(u.addresses)) {
                    EE_STORAGE.setAddresses(u.addresses);
                }
                if (Array.isArray(u.usedCoupons)) {
                    EE_STORAGE.setUsedCoupons(u.usedCoupons);
                }
            }
        } catch (err) {}
    }

    function populateCustomerDetails() {
        if (typeof EE_STORAGE === 'undefined') return;
        const p = EE_STORAGE.getProfile();
        const addresses = EE_STORAGE.getAddresses ? EE_STORAGE.getAddresses() : [];
        const activeAddrObj = addresses.find(a => a.isDefault) || addresses[0] || null;

        if (dom.custName) dom.custName.innerText = p.name || 'Guest Customer (Login in Account)';
        if (dom.custPhone) dom.custPhone.innerText = p.phone ? `+91 ${p.phone.replace(/\D/g, '').slice(-10)}` : 'Add mobile number in Account';

        const displayAddress = activeAddrObj?.fullText || p.address || '';
        const displayDistrict = activeAddrObj?.district || p.district || '';

        if (dom.custAddr) dom.custAddr.innerText = displayAddress || 'No doorstep address saved. Please add in Account.';
        if (dom.custDistrictBadge) {
            if (displayDistrict) {
                dom.custDistrictBadge.innerText = displayDistrict;
                dom.custDistrictBadge.classList.remove('hidden');
            } else {
                dom.custDistrictBadge.classList.add('hidden');
            }
        }

        if (dom.addrSelectorBox && dom.addrSelect) {
            if (addresses.length > 1) {
                dom.addrSelectorBox.classList.remove('hidden');
                dom.addrSelect.innerHTML = addresses.map((a, idx) =>
                    `<option value="${idx}" ${a.isDefault ? 'selected' : ''}>${a.district ? a.district + ': ' : ''}${a.fullText}</option>`
                ).join('');

                dom.addrSelect.onchange = (e) => {
                    const selIdx = parseInt(e.target.value, 10);
                    addresses.forEach((a, i) => { a.isDefault = (i === selIdx); });
                    EE_STORAGE.setAddresses(addresses);
                    populateCustomerDetails();
                };
            } else {
                dom.addrSelectorBox.classList.add('hidden');
            }
        }

        if (dom.serviceAreaSelect) {
            const hasHomeMode = Object.values(serviceSchedules).map(s => s.mode).includes('Home');
            if (hasHomeMode) {
                let optionsHtml = '<option value="" disabled selected>Choose your delivery area...</option>';
                serviceAreasList.forEach(area => {
                    optionsHtml += `<option value="${area.name}" data-fee="${area.fee}">${area.name} (Travel: ₹${area.fee})</option>`;
                });
                dom.serviceAreaSelect.innerHTML = optionsHtml;

                const currentAreaVal = dom.serviceAreaSelect.getAttribute('data-selected-area');
                if (currentAreaVal) {
                    dom.serviceAreaSelect.value = currentAreaVal;
                }

                dom.serviceAreaSelect.onchange = (e) => {
                    dom.serviceAreaSelect.setAttribute('data-selected-area', e.target.value);
                    if (dom.areaErrorMsg) dom.areaErrorMsg.classList.add('hidden');
                    updateTotals();
                };
            }
        }

        const availPts = p.points || 0;
        if (dom.walletPointsSubtext) dom.walletPointsSubtext.innerText = `Available: ${availPts} Pts (₹${availPts})`;
        if (dom.usePointsCheckbox) {
            dom.usePointsCheckbox.disabled = availPts <= 0;
            if (availPts <= 0) dom.usePointsCheckbox.checked = false;
        }
    }

    function renderAvailableCouponsStrip() {
        if (!dom.couponsStrip || typeof EE_STORAGE === 'undefined' || !EE_STORAGE.getCoupons) return;
        const coupons = EE_STORAGE.getCoupons();

        if (!coupons || coupons.length === 0) {
            dom.couponsStrip.innerHTML = '';
            return;
        }

        dom.couponsStrip.innerHTML = coupons.map(c => {
            const code = (c.code || '').toUpperCase();
            const val = c.value !== undefined ? c.value : (c.discount || 0);
            const isPct = (c.discountType || c.type) === 'percent';
            const minOrd = c.minOrder !== undefined ? c.minOrder : (c.minCart || 0);
            const label = val > 0
                ? `${isPct ? val + '% OFF' : '₹' + val + ' OFF'}${minOrd > 0 ? ' above ₹' + minOrd : ''}`
                : 'Tap to Apply';

            return `
                <button type="button" onclick="applyQuickCoupon('${code}')"
                    class="px-3 py-1.5 rounded-xl bg-ivory hover:bg-champagne-gold/30 border border-muted-beige/80 flex items-center gap-2 flex-shrink-0 transition-all">
                    <span class="font-mono text-[11px] font-bold text-warm-brown">${code}</span>
                    <span class="text-[10px] text-neutral-gray font-medium">${label}</span>
                </button>
            `;
        }).join('');
    }

    window.applyQuickCoupon = function(code) {
        if (dom.promoInput) {
            dom.promoInput.value = code;
            validateAndApplyPromo(code);
        }
    };

    // ==================== 3. 2-STEP FLOW & CART SERVICES UI ====================

    let currentBookingStep = 1;

        window.goToBookingStep = function(step) {
        currentBookingStep = step === 2 ? 2 : 1;
        const step2Btns = document.getElementById('step2ActionBtns');

        if (currentBookingStep === 1) {
            if (dom.step1Container) { dom.step1Container.classList.remove('hidden'); dom.step1Container.classList.add('flex'); }
            if (dom.step2Container) { dom.step2Container.classList.add('hidden'); dom.step2Container.classList.remove('flex'); }
            if (dom.nextStepBtn) { dom.nextStepBtn.classList.remove('hidden'); dom.nextStepBtn.classList.add('flex'); }
            
            if (step2Btns) { step2Btns.classList.add('hidden'); step2Btns.classList.remove('flex'); }
            else if (dom.confirmBtn) { dom.confirmBtn.classList.add('hidden'); dom.confirmBtn.classList.remove('flex'); }
            
            if (dom.headerTitle) dom.headerTitle.innerText = 'Selected Services';
            if (dom.headerSub) dom.headerSub.innerText = 'Step 1 of 2 • Choose Date & Time';
            if (dom.ctaLabelText) dom.ctaLabelText.innerText = 'Selected Total';
        } else {
            if (dom.step1Container) { dom.step1Container.classList.add('hidden'); dom.step1Container.classList.remove('flex'); }
            if (dom.step2Container) { dom.step2Container.classList.remove('hidden'); dom.step2Container.classList.add('flex'); }
            if (dom.nextStepBtn) { dom.nextStepBtn.classList.add('hidden'); dom.nextStepBtn.classList.remove('flex'); }
            
            if (step2Btns) { step2Btns.classList.remove('hidden'); step2Btns.classList.add('flex'); }
            else if (dom.confirmBtn) { dom.confirmBtn.classList.remove('hidden'); dom.confirmBtn.classList.add('flex'); }

                    if (dom.headerTitle) dom.headerTitle.innerText = 'Address & Payment';
            if (dom.headerSub) dom.headerSub.innerText = 'Step 2 of 2 • Confirm Details';
            if (dom.ctaLabelText) dom.ctaLabelText.innerText = 'Total Payable';

            // Text update logic has been moved inside updateVenueVisibility() for real-time sync
            updateVenueVisibility();
            populateCustomerDetails();
            updateTotals();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // नया फंक्शन: बैक पेज पर जाने की बजाय डायरेक्ट स्लॉट पॉपअप ओपन करने के लिए
    window.quickEditSlot = function() {
        if (typeof EE_CART !== 'undefined' && EE_CART.getCount() > 0) {
            const firstServiceId = Array.from(EE_CART.items)[0];
            openSlotModal(firstServiceId);
        }
    };

    if (dom.nextStepBtn) dom.nextStepBtn.addEventListener('click', () => window.goToBookingStep(2));

    if (dom.backBtn) {
        dom.backBtn.addEventListener('click', () => {
            if (currentBookingStep === 2 && dom.confirmContainer?.classList.contains('hidden')) {
                window.goToBookingStep(1);
            } else {
                window.history.back();
            }
        });
    }

    function checkCartAndToggleState() {
        const hasItems = typeof EE_CART !== 'undefined' && EE_CART.getCount() > 0;
        if (!hasItems) {
            if (dom.emptyState) { dom.emptyState.classList.remove('hidden'); dom.emptyState.classList.add('flex'); }
            if (dom.flowContainer) dom.flowContainer.classList.add('hidden');
            if (dom.stickyCta) dom.stickyCta.style.transform = 'translateY(150%)';
        } else {
            if (dom.emptyState) { dom.emptyState.classList.add('hidden'); dom.emptyState.classList.remove('flex'); }
            if (dom.flowContainer) dom.flowContainer.classList.remove('hidden');
            if (dom.stickyCta) dom.stickyCta.style.transform = '';
        }
    }

                    function updateVenueVisibility() {
        const modes = Object.values(serviceSchedules).map(s => s.mode);
        const hasHome = modes.includes('Home');
        const hasSalon = modes.includes('Salon');

        // CSS style.display override to guarantee hiding regardless of Tailwind conflicting classes
        if (dom.homeVenueRow) {
            dom.homeVenueRow.style.display = hasHome ? 'flex' : 'none';
        }
        if (dom.salonVenueRow) {
            dom.salonVenueRow.style.display = hasSalon ? 'flex' : 'none';
        }

        // डायनामिक टेक्स्ट अपडेट (At Home / At Salon Slot Locked)
        if (dom.step2SummaryText) {
            let homeCount = modes.filter(m => m === 'Home').length;
            let salonCount = modes.filter(m => m === 'Salon').length;
            
            if (homeCount > 0 && salonCount === 0) {
                dom.step2SummaryText.innerText = `${homeCount} At Home Slot${homeCount > 1 ? 's' : ''} Locked`;
            } else if (salonCount > 0 && homeCount === 0) {
                dom.step2SummaryText.innerText = `${salonCount} At Salon Slot${salonCount > 1 ? 's' : ''} Locked`;
            } else if (homeCount > 0 && salonCount > 0) {
                dom.step2SummaryText.innerText = `${homeCount} Home, ${salonCount} Salon Slots Locked`;
            } else {
                const count = typeof EE_CART !== 'undefined' ? EE_CART.getCount() : 0;
                dom.step2SummaryText.innerText = `${count} Service${count === 1 ? '' : 's'} Locked`;
            }
        }
    }





    function renderSelectedServices() {
        ensureLocalServicesLoaded();
        if (!dom.servicesList || typeof EE_CART === 'undefined' || typeof SERVICES === 'undefined') return;
        if (EE_CART.getCount() === 0) {
            dom.servicesList.innerHTML = '';
            return;
        }

        let html = '';
        EE_CART.items.forEach(id => {
            const s = SERVICES.find(x => String(x.id) === String(id));
            if (!s) return;
            const sched = serviceSchedules[id] || { mode: 'Home', date: getLocalDateString(), time: ALL_SLOTS[0] };
            const img = s.squareImage || s.image || (Array.isArray(s.images) ? s.images[0] : '') || 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=200';
            const isHome = sched.mode === 'Home';
            const modeBadgeClass = isHome
                ? 'bg-[#9E2A5B]/10 text-[#9E2A5B] border-[#9E2A5B]/20'
                : 'bg-warm-brown/10 text-warm-brown border-warm-brown/20';
            const modeIcon = isHome ? 'home' : 'storefront';
            const modeLabel = isHome ? 'At Home' : 'At Salon';
            const displayTime = sched.time === 'Anytime' ? '(Flexible Time)' : sched.time;

            html += `
            <div class="bg-white rounded-[20px] border border-muted-beige/70 shadow-card overflow-hidden transition-all" id="bks-${s.id}">
                <div onclick="window.location.href='service.html?openModal=${encodeURIComponent(s.id)}'" class="p-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-ivory/30 transition-colors group">
                    <div class="w-16 h-16 rounded-2xl bg-ivory overflow-hidden flex-shrink-0 border border-muted-beige/40">
                        <img src="${img}" alt="${s.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" onerror="this.style.display='none'">
                    </div>
                    <div class="flex flex-col flex-grow min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <h3 class="font-serif text-[15px] font-bold text-luxury-black leading-snug truncate group-hover:text-warm-brown transition-colors">${s.name}</h3>
                            <button onclick="event.stopPropagation(); removeFromBooking('${s.id}')" class="text-neutral-gray hover:text-muted-rose transition-colors p-0.5 flex-shrink-0" aria-label="Remove" type="button">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[11px] text-neutral-gray font-semibold flex items-center gap-1">
                                <span class="material-symbols-outlined text-[13px] text-[#9E2A5B]">schedule</span> ${formatDuration(s.duration)}
                            </span>
                            <span class="w-1 h-1 rounded-full bg-muted-beige"></span>
                            <span class="font-serif text-[15px] font-bold text-luxury-black">₹${Number(s.price).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <button type="button" onclick="openSlotModal('${s.id}')" class="w-full px-3.5 py-2.5 bg-gradient-to-r from-ivory/80 to-[#FFF0F5]/50 border-t border-dashed border-muted-beige/80 flex items-center justify-between gap-1 cursor-pointer hover:bg-[#FFF0F5] transition-all group focus:outline-none">
                    <div class="flex items-center gap-1.5 min-w-0 flex-grow">
                        <span class="px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 flex-shrink-0 ${modeBadgeClass}">
                            <span class="material-symbols-outlined text-[12px]">${modeIcon}</span> ${modeLabel}
                        </span>
                        <span class="text-[11px] font-bold text-luxury-black whitespace-nowrap flex-shrink-0">
                            ${formatDateDisplay(sched.date)} • ${displayTime}
                        </span>
                    </div>
                    <div class="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-white border border-[#9E2A5B]/30 shadow-subtle group-hover:border-[#9E2A5B] group-hover:shadow-sm transition-all flex-shrink-0">
                        <div class="relative flex h-2 w-2 items-center justify-center">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E8B57] opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2E8B57]"></span>
                        </div>
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#9E2A5B]">Change Slot</span>
                        <span class="material-symbols-outlined text-[13px] text-[#9E2A5B] group-hover:translate-x-0.5 transition-transform hidden sm:block">edit_calendar</span>
                    </div>
                </button>
            </div>`;
        });

        dom.servicesList.innerHTML = html;
        updateVenueVisibility();
    }

        window.removeFromBooking = async function(id) {
        // 1. Storage & Cart Set clean
        if (typeof EE_CART !== 'undefined') {
            EE_CART.remove(id);
        }
        
        // Direct clean from LocalStorage
        try {
            const raw = JSON.parse(localStorage.getItem('ee_cart')) || [];
            const updated = raw.filter(x => String(x) !== String(id));
            localStorage.setItem('ee_cart', JSON.stringify(updated));
        } catch(e) {}

        delete serviceSchedules[id];
        saveSchedulesToLocal();

        const el = document.getElementById('bks-' + id);
        if (el) el.remove();
        if (appliedCouponObj) {
            validateAndApplyPromo(appliedCouponObj.code, true);
        }
        updateTotals();
        checkCartAndToggleState();
        updateVenueVisibility();

        // 2. Realtime Database Cloud Clean (Never restore deleted items)
        const uid = auth.currentUser?.uid || localStorage.getItem('ee_user_uid');
        if (uid) {
            try {
                const cleanArr = typeof EE_CART !== 'undefined' ? Array.from(EE_CART.items).map(String) : [];
                await update(ref(rtdb, `users/${uid}`), {
                    cart: cleanArr,
                    cartUpdatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.warn("RTDB remove sync warning:", e);
            }
        }
    };


        window.openSlotModal = async function(serviceId) {
        const s = SERVICES.find(x => String(x.id) === String(serviceId));
        if (!s || !serviceSchedules[serviceId]) return;

        activeEditingServiceId = serviceId;
        tempModalState = { ...serviceSchedules[serviceId] };

        if (dom.modalServiceTitle) dom.modalServiceTitle.innerText = s.name;

        await fetchBookedSlotsFromFirestore();

        // चेक करें कि सेव किया गया स्लॉट एक्सपायर, बुक या इस्तेमाल तो नहीं हो गया
        if (isSlotExpired(tempModalState.date, tempModalState.time) || 
            isSlotBookedInDB(tempModalState.date, tempModalState.time, tempModalState.mode) ||
            isSlotUsedByOtherCartItem(tempModalState.date, tempModalState.time, serviceId, tempModalState.mode)) {
            
            let free = findFirstAvailableSlot(tempModalState.date, serviceId, tempModalState.mode);
            if (!free) {
                const bestNext = findAvailableDateAndSlot(serviceId, tempModalState.mode);
                tempModalState.date = bestNext.date;
                tempModalState.time = bestNext.time;
            } else {
                tempModalState.time = free;
            }
        }

        renderModalModeButtons();
        renderModalDates();
        renderModalTimeSlots();
        updateModalPreviewText();

        dom.slotModalScrim.classList.remove('hidden');
        dom.slotPickerModal.classList.remove('translate-y-full');
        setTimeout(() => { dom.slotModalScrim.classList.remove('opacity-0'); }, 10);
        document.body.style.overflow = 'hidden';
    };

    function closeSlotModal() {
        dom.slotModalScrim.classList.add('opacity-0');
        dom.slotPickerModal.classList.add('translate-y-full');
        setTimeout(() => {
            dom.slotModalScrim.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    window.setModalMode = function(mode) {
        tempModalState.mode = mode;
        if (isSlotExpired(tempModalState.date, tempModalState.time) || 
            isSlotBookedInDB(tempModalState.date, tempModalState.time, tempModalState.mode) || 
            isSlotUsedByOtherCartItem(tempModalState.date, tempModalState.time, activeEditingServiceId, tempModalState.mode)) {
            const nextFree = findFirstAvailableSlot(tempModalState.date, activeEditingServiceId, tempModalState.mode);
            tempModalState.time = nextFree || '';
        }
        renderModalModeButtons();
        renderModalTimeSlots();
        updateModalPreviewText();
        updateTotals();
    };

    function renderModalModeButtons() {
        const activeClasses = 'bg-white text-luxury-black shadow-sm border border-muted-beige/40';
        const inactiveClasses = 'text-neutral-gray hover:text-luxury-black border border-transparent';

        if (dom.modeBtnHome && dom.modeBtnSalon) {
            dom.modeBtnHome.className = `flex-1 py-2 rounded-lg text-center transition-all font-bold text-[13px] flex items-center justify-center gap-1.5 ${tempModalState.mode === 'Home' ? activeClasses : inactiveClasses}`;
            dom.modeBtnSalon.className = `flex-1 py-2 rounded-lg text-center transition-all font-bold text-[13px] flex items-center justify-center gap-1.5 ${tempModalState.mode === 'Salon' ? activeClasses : inactiveClasses}`;
        }
    }

    function renderModalDates() {
        if (!dom.dateContainer) return;
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let html = '';
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const fullDate = getLocalDateString(d);
            const isSelected = tempModalState.date === fullDate;
            const dayLabel = i === 0 ? 'Today' : (i === 1 ? 'Tmrw' : days[d.getDay()]);

            const cardClass = isSelected
                ? 'bg-luxury-black border-luxury-black text-white shadow-md'
                : 'bg-white border-muted-beige/70 text-luxury-black hover:border-warm-brown';
            const subTextClass = isSelected ? 'text-champagne-gold' : 'text-neutral-gray';

            html += `
            <button type="button" onclick="selectModalDate('${fullDate}')" class="w-[64px] h-[72px] rounded-[18px] border flex flex-col items-center justify-center transition-all flex-shrink-0 ${cardClass}">
                <span class="text-[9px] uppercase font-bold tracking-widest ${subTextClass}">${dayLabel}</span>
                <span class="font-serif text-[22px] font-bold leading-none my-1">${d.getDate()}</span>
                <span class="text-[9px] font-semibold uppercase ${subTextClass}">${months[d.getMonth()]}</span>
            </button>`;
        }
        dom.dateContainer.innerHTML = html;
    }

    window.selectModalDate = function(dateStr) {
        tempModalState.date = dateStr;
        if (isSlotExpired(dateStr, tempModalState.time) || 
            isSlotBookedInDB(dateStr, tempModalState.time, tempModalState.mode) || 
            isSlotUsedByOtherCartItem(dateStr, tempModalState.time, activeEditingServiceId, tempModalState.mode)) {
            const nextFree = findFirstAvailableSlot(dateStr, activeEditingServiceId, tempModalState.mode);
            tempModalState.time = nextFree || '';
        }
        renderModalDates();
        renderModalTimeSlots();
        updateModalPreviewText();
    };


        function renderModalTimeSlots() {
        const anytimeCont = document.getElementById('anytimeContainer');
        if (!dom.timeContainer || !anytimeCont) return;

        const isAnytimeExpired = isSlotExpired(tempModalState.date, 'Anytime');
        const isAnytimeSelected = tempModalState.time === 'Anytime' && !isAnytimeExpired;
        
        if (isAnytimeExpired) {
            anytimeCont.innerHTML = `
                <button type="button" disabled class="w-full py-3 px-4 rounded-xl border border-muted-beige/40 bg-ivory/50 flex items-center justify-between transition-all cursor-not-allowed opacity-60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px] text-neutral-gray/60">schedule</span>
                        <span class="text-[13px] font-bold text-neutral-gray/60 line-through">Anytime (Flexible)</span>
                    </div>
                    <span class="text-[10px] font-semibold text-muted-rose">Expired for today</span>
                </button>
            `;
        } else {
            const anytimeClass = isAnytimeSelected
                ? 'bg-luxury-black border-luxury-black text-white shadow-sm ring-2 ring-champagne-gold/30'
                : 'bg-white border-muted-beige/70 text-luxury-black hover:border-warm-brown hover:bg-ivory/50';

            anytimeCont.innerHTML = `
                <button type="button" onclick="selectModalTime('Anytime')" class="w-full py-3 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${anytimeClass}">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px] ${isAnytimeSelected ? 'text-champagne-gold' : 'text-neutral-gray'}">schedule</span>
                        <span class="text-[13px] font-bold">Anytime (Flexible)</span>
                    </div>
                    <span class="text-[10px] font-semibold opacity-80">We will assign a free slot</span>
                </button>
            `;
        }

        let html = '';

        TIME_GROUPS.forEach(g => {
            let sHtml = '';
            g.slots.forEach(slot => {
                const isExpired = isSlotExpired(tempModalState.date, slot);
                const bookedDB = isSlotBookedInDB(tempModalState.date, slot, tempModalState.mode);
                const usedInCart = isSlotUsedByOtherCartItem(tempModalState.date, slot, activeEditingServiceId, tempModalState.mode);
                const isSelected = tempModalState.time === slot;

                if (isExpired) {
                    sHtml += `
                    <button type="button" disabled class="py-2.5 px-2 rounded-xl bg-ivory/30 border border-muted-beige/30 flex flex-col items-center justify-center cursor-not-allowed opacity-50">
                        <span class="text-[11px] font-bold text-neutral-gray/60 line-through">${slot}</span>
                        <span class="text-[8px] font-bold text-muted-rose uppercase mt-0.5 tracking-wider">Expired</span>
                    </button>`;
                } else if (bookedDB || usedInCart) {
                    sHtml += `
                    <button type="button" disabled class="py-2.5 px-2 rounded-xl bg-ivory/50 border border-muted-beige/40 flex flex-col items-center justify-center cursor-not-allowed opacity-60">
                        <span class="text-[12px] font-bold text-neutral-gray/60 line-through">${slot}</span>
                    </button>`;
                } else {
                    const btnClass = isSelected
                        ? 'bg-luxury-black border-luxury-black text-white shadow-sm ring-2 ring-champagne-gold/30'
                        : (isAnytimeSelected ? 'bg-white/50 border-muted-beige/40 text-neutral-gray/70 hover:border-warm-brown hover:bg-ivory/50 hover:text-luxury-black' : 'bg-white border-muted-beige/70 text-luxury-black hover:border-warm-brown hover:bg-ivory/50');

                    sHtml += `
                    <button type="button" onclick="selectModalTime('${slot}')" class="py-2.5 px-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${btnClass}">
                        <span class="text-[12px] font-bold">${slot}</span>
                    </button>`;
                }
            });

            html += `
            <div>
                <span class="text-[10px] font-bold text-neutral-gray uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">${g.icon}</span> ${g.name}
                </span>
                <div class="grid grid-cols-3 gap-2 sm:gap-3">${sHtml}</div>
            </div>`;
        });

        dom.timeContainer.innerHTML = html;
    }


    window.selectModalTime = function(slot) {
        tempModalState.time = slot;
        renderModalTimeSlots();
        updateModalPreviewText();
    };

    function updateModalPreviewText() {
        if (!dom.modalSelectedPreview) return;
        const modeTxt = tempModalState.mode === 'Home' ? '🏠 At Home' : '🏪 At Salon';
        if (!tempModalState.time) {
            dom.modalSelectedPreview.innerText = `${modeTxt} • No slots available on ${formatDateDisplay(tempModalState.date)}`;
            return;
        }
        if (tempModalState.time === 'Anytime') {
             dom.modalSelectedPreview.innerText = `${modeTxt} • ${formatDateDisplay(tempModalState.date)} (Flexible Time)`;
             return;
        }
        dom.modalSelectedPreview.innerText = `${modeTxt} • ${formatDateDisplay(tempModalState.date)} at ${tempModalState.time}`;
    }

    if (dom.closeSlotModalBtn) dom.closeSlotModalBtn.addEventListener('click', closeSlotModal);
    if (dom.slotModalScrim) dom.slotModalScrim.addEventListener('click', closeSlotModal);
         if (dom.saveSlotBtn) {
        dom.saveSlotBtn.addEventListener('click', () => {
            if (!tempModalState.time) {
                alert("Please select an available time slot.");
                return;
            }
            if (activeEditingServiceId) {
                serviceSchedules[activeEditingServiceId] = { ...tempModalState };
                saveSchedulesToLocal(); // FIX 2: लोकल स्टोरेज में सेव ताकि रीलोड पर रिसेट न हो
                renderSelectedServices();
                updateVenueVisibility(); // FIX 1: सेव करते ही एड्रेस वाला सेक्शन हाइड/शो करने के लिए
                updateTotals(); 
            }
            closeSlotModal();
        });
    }



    // ==================== 4. SMART COUPONS & WALLET POINTS CALCULATION ====================

    async function validateAndApplyPromo(rawCode, isSilentRecalc = false) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) return;

        const subtotal = typeof EE_CART !== 'undefined' ? EE_CART.getTotal() : 0;
        const usedCoupons = (EE_STORAGE.getUsedCoupons ? EE_STORAGE.getUsedCoupons() : []).map(c => c.toUpperCase());

        if (usedCoupons.includes(code)) {
            appliedCouponObj = null;
            appliedDiscount = 0;
            showPromoFeedback(`Coupon ${code} has already been used.`, false);
            updateTotals();
            return;
        }

        let matched = (EE_STORAGE.getCoupons ? EE_STORAGE.getCoupons() : []).find(c => (c.code || '').toUpperCase() === code);

        if (!matched) {
            try {
                const snap = await get(ref(rtdb, `coupons/${code}`));
                if (snap.exists()) {
                    const c = snap.val();
                    if (c && c.active !== false) {
                        matched = c;
                    }
                }
            } catch (e) {}
        }

        if (!matched) {
            appliedCouponObj = null;
            appliedDiscount = 0;
            showPromoFeedback('Invalid or expired coupon code.', false);
            updateTotals();
            return;
        }

        const todayStr = getLocalDateString();
        if (matched.expiry && matched.expiry < todayStr) {
            appliedCouponObj = null;
            appliedDiscount = 0;
            showPromoFeedback(`Coupon ${code} has expired.`, false);
            updateTotals();
            return;
        }

        const profile = EE_STORAGE.getProfile();
        const userPhone = (profile.phone || '').replace(/\D/g, '').slice(-10);
        const targetPhone = (matched.phone || matched.targetPhone || '').replace(/\D/g, '').slice(-10);
        const targetUid = matched.userId || matched.uid || '';
        if ((matched.target === 'personal' || targetPhone || targetUid) &&
            targetUid !== profile.uid &&
            (!targetPhone || targetPhone !== userPhone)) {
            appliedCouponObj = null;
            appliedDiscount = 0;
            showPromoFeedback('This coupon is exclusive to another account.', false);
            updateTotals();
            return;
        }

        let eligibleSubtotal = subtotal;
        if (matched.target === 'category' || matched.category) {
            const reqCat = String(matched.category || '').toLowerCase();
            const reqCatName = matched.categoryName || matched.category;
            let catTotal = 0;

            EE_CART.items.forEach(id => {
                const s = SERVICES.find(x => String(x.id) === String(id));
                if (s) {
                    const sCat = String(s.category || s.cat || '').toLowerCase();
                    if (sCat === reqCat || sCat.includes(reqCat) || reqCat.includes(sCat)) {
                        catTotal += s.price;
                    }
                }
            });

            if (catTotal <= 0) {
                appliedCouponObj = null;
                appliedDiscount = 0;
                showPromoFeedback(`Valid only on ${reqCatName} services.`, false);
                updateTotals();
                return;
            }
            eligibleSubtotal = catTotal;
        }

        const minOrd = parseFloat(matched.minOrder !== undefined ? matched.minOrder : (matched.minCart || 0)) || 0;
        if (subtotal < minOrd) {
            appliedCouponObj = null;
            appliedDiscount = 0;
            showPromoFeedback(`Minimum order of ₹${minOrd} required for ${code}.`, false);
            updateTotals();
            return;
        }

        const val = parseFloat(matched.value !== undefined ? matched.value : (matched.discount || 0)) || 0;
        const isPercent = (matched.discountType || matched.type) === 'percent';
        const rawDisc = isPercent ? Math.round((eligibleSubtotal * val) / 100) : val;

        appliedDiscount = Math.min(rawDisc, eligibleSubtotal);
        appliedCouponObj = { ...matched, code };

        if (!isSilentRecalc) {
            showPromoFeedback(`✓ ${code} applied! You saved ₹${appliedDiscount}.`, true);
        }
        updateTotals();
    }

    function showPromoFeedback(msg, isSuccess) {
        if (!dom.promoFeedback) return;
        dom.promoFeedback.innerText = msg;
        dom.promoFeedback.className = `text-[11px] font-semibold ${isSuccess ? 'text-[#2E8B57]' : 'text-muted-rose'} -mt-1 ml-2 block`;
    }

        function updateTotals() {
        if (typeof EE_CART === 'undefined') return;
        const subtotal = EE_CART.getTotal();
        
        // 0. CALCULATE TOTAL MRP & ITEM DISCOUNT
        let totalMrp = 0;
        if (typeof SERVICES !== 'undefined') {
            EE_CART.items.forEach(id => {
                const s = SERVICES.find(x => String(x.id) === String(id));
                if (s) {
                    const price = Number(s.price) || 0;
                    const mrp = (s.mrp && Number(s.mrp) > price) 
                        ? Number(s.mrp) 
                        : Math.round((price * 1.35) / 50) * 50 - 1; // Fallback MRP logic
                    totalMrp += mrp;
                }
            });
        }
        const itemDiscount = Math.max(0, totalMrp - subtotal);

        const afterCoupon = Math.max(0, subtotal - appliedDiscount);

        const availPoints = EE_STORAGE.getProfile().points || 0;
        const wantsPoints = dom.usePointsCheckbox && dom.usePointsCheckbox.checked && availPoints > 0;
        redeemedPoints = wantsPoints ? Math.min(availPoints, afterCoupon) : 0;

        // 1. CALCULATE TRAVEL FEE
        let travelFee = 0;
        const modes = Object.values(serviceSchedules).map(s => s.mode);
        const hasHomeMode = modes.includes('Home');
        const hasSalonMode = modes.includes('Salon');
        
        if (hasHomeMode && dom.serviceAreaSelect && dom.serviceAreaSelect.value) {
            const selectedOpt = dom.serviceAreaSelect.options[dom.serviceAreaSelect.selectedIndex];
            travelFee = Number(selectedOpt.getAttribute('data-fee')) || 0;
        }

        // 2. CALCULATE CONVENIENCE & HYGIENE FEES
        let convFee = 0;
        let hygFee = 0;

        if (globalFees.convenience && globalFees.convenience.amount > 0) {
            const cMode = globalFees.convenience.mode;
            if (cMode === 'Both' || (cMode === 'Home' && hasHomeMode) || (cMode === 'Salon' && hasSalonMode)) {
                convFee = Number(globalFees.convenience.amount);
            }
        }

        if (globalFees.hygiene && globalFees.hygiene.amount > 0) {
            const hMode = globalFees.hygiene.mode;
            if (hMode === 'Both' || (hMode === 'Home' && hasHomeMode) || (hMode === 'Salon' && hasSalonMode)) {
                hygFee = Number(globalFees.hygiene.amount);
            }
        }

        const finalTotal = Math.max(0, afterCoupon - redeemedPoints) + travelFee + convFee + hygFee;

        // --- UI UPDATES ---
        const itemTotalEl = document.getElementById('bookingItemTotal');
        const itemDiscountEl = document.getElementById('bookingItemDiscount');
        
        if (itemTotalEl) itemTotalEl.innerText = '₹' + totalMrp.toLocaleString('en-IN');
        if (itemDiscountEl) itemDiscountEl.innerText = '-₹' + itemDiscount.toLocaleString('en-IN');
        if (dom.bookingSubtotal) dom.bookingSubtotal.innerText = '₹' + subtotal.toLocaleString('en-IN');

        // Travel Fee UI
        if (dom.travelFeeRow && dom.bookingTravelFee) {
            if (travelFee > 0) {
                dom.travelFeeRow.classList.remove('hidden');
                dom.travelFeeRow.classList.add('flex');
                dom.bookingTravelFee.innerText = '₹' + travelFee.toLocaleString('en-IN');
            } else {
                dom.travelFeeRow.classList.add('hidden');
                dom.travelFeeRow.classList.remove('flex');
            }
        }

        // Convenience Fee UI
        if (dom.bookingConvenienceFee) {
            if (convFee > 0) {
                dom.bookingConvenienceFee.innerText = '₹' + convFee.toLocaleString('en-IN');
                dom.bookingConvenienceFee.className = 'font-bold text-luxury-black text-[13px]';
            } else {
                dom.bookingConvenienceFee.innerText = 'FREE';
                dom.bookingConvenienceFee.className = 'text-[#2E8B57] font-bold uppercase text-[11px] tracking-wider';
            }
        }

        // Hygiene Kit UI
        if (dom.bookingHygieneFee) {
            if (hygFee > 0) {
                dom.bookingHygieneFee.innerText = '₹' + hygFee.toLocaleString('en-IN');
                dom.bookingHygieneFee.className = 'font-bold text-luxury-black text-[13px]';
            } else {
                dom.bookingHygieneFee.innerText = 'FREE';
                dom.bookingHygieneFee.className = 'text-[#2E8B57] font-bold uppercase text-[11px] tracking-wider';
            }
        }

        if (dom.discountRow && dom.bookingDiscount) {
            if (appliedDiscount > 0 && appliedCouponObj) {
                dom.discountRow.classList.remove('hidden');
                dom.discountRow.classList.add('flex');
                if (dom.discountLabelText) dom.discountLabelText.innerText = `Coupon (${appliedCouponObj.code})`;
                dom.bookingDiscount.innerText = '-₹' + appliedDiscount.toLocaleString('en-IN');
            } else {
                dom.discountRow.classList.add('hidden');
                dom.discountRow.classList.remove('flex');
            }
        }

        if (dom.pointsDiscountRow && dom.bookingPointsDiscount) {
            if (redeemedPoints > 0) {
                dom.pointsDiscountRow.classList.remove('hidden');
                dom.pointsDiscountRow.classList.add('flex');
                dom.bookingPointsDiscount.innerText = '-₹' + redeemedPoints.toLocaleString('en-IN');
            } else {
                dom.pointsDiscountRow.classList.add('hidden');
                dom.pointsDiscountRow.classList.remove('flex');
            }
        }

        if (dom.bookingFinalTotal) dom.bookingFinalTotal.innerText = '₹' + finalTotal.toLocaleString('en-IN');
        if (dom.ctaFinalTotal) dom.ctaFinalTotal.innerText = '₹' + finalTotal.toLocaleString('en-IN');
    }

    if (dom.applyPromoBtn && dom.promoInput) {
        dom.applyPromoBtn.addEventListener('click', () => {
            validateAndApplyPromo(dom.promoInput.value);
        });
    }

    if (dom.usePointsCheckbox) {
        dom.usePointsCheckbox.addEventListener('change', () => {
            updateTotals();
        });
    }

    // ==================== 5. CONFIRM BOOKING -> SAVE TO FIRESTORE -> WHATSAPP REDIRECT ====================

    function buildWhatsAppOrderMessage(orderData) {
        const lines = [
            `✨ *NEW BOOKING - ELEGANT ESCAPE* ✨`,
            `*Order ID:* #${orderData.id}`,
            `----------------------------------`,
            `👤 *Customer Details:*`,
            `• *Name:* ${orderData.customerName}`,
            `• *Mobile:* ${orderData.customerPhone}`,
            orderData.customerEmail ? `• *Email:* ${orderData.customerEmail}` : null,
            `• *Address:* ${orderData.address}`,
            `----------------------------------`,
            `💆‍♀️ *Booked Services (${orderData.items.length}):*`
        ].filter(Boolean);

        orderData.items.forEach((item, index) => {
            const timeStr = item.time === 'Anytime' ? '(Flexible Time)' : item.time;
            lines.push(
                `${index + 1}. *${item.name}* - ₹${item.price.toLocaleString('en-IN')}`,
                `   📍 Mode: ${item.mode === 'Home' ? 'At Home (Doorstep)' : 'At Salon Studio'}`,
                `   📅 Slot: ${formatDateDisplay(item.date)} at ${timeStr}`
            );
        });

        lines.push(`----------------------------------`);
        lines.push(`💳 *Payment Summary:*`);
        lines.push(`• *Subtotal:* ₹${orderData.subtotal.toLocaleString('en-IN')}`);
        
        if (orderData.travelFee > 0) {
            lines.push(`• *Travel Fee:* ₹${orderData.travelFee.toLocaleString('en-IN')}`);
        }
        if (orderData.convenienceFee > 0) {
            lines.push(`• *Convenience Fee:* ₹${orderData.convenienceFee.toLocaleString('en-IN')}`);
        }
        if (orderData.hygieneFee > 0) {
            lines.push(`• *Hygiene Kit:* ₹${orderData.hygieneFee.toLocaleString('en-IN')}`);
        }
        
        if (orderData.couponDiscount > 0) {
            lines.push(`• *Coupon (${orderData.couponCode}):* -₹${orderData.couponDiscount.toLocaleString('en-IN')}`);
        }
        if (orderData.pointsUsed > 0) {
            lines.push(`• *Wallet Points Used:* -₹${orderData.pointsUsed.toLocaleString('en-IN')}`);
        }
        lines.push(`• *Total Payable:* *₹${orderData.total.toLocaleString('en-IN')}*`);
        lines.push(`----------------------------------`);
        lines.push(`Please confirm my booking slot and share payment details.`);

        return `https://wa.me/${WHATSAPP_ADMIN_PHONE}?text=${encodeURIComponent(lines.join('\n'))}`;
    }

    function handleConfirm() {
        if (!dom.confirmBtn) return;
        dom.confirmBtn.addEventListener('click', async () => {
            const profile = EE_STORAGE.getProfile();
            const modes = Object.values(serviceSchedules).map(s => s.mode);
            const needsHomeAddress = modes.includes('Home');

            if (!profile.name || !profile.phone) {
                alert("Please login or complete your Name & Mobile Number in the Account section before booking.");
                window.location.href = 'account.html';
                return;
            }

            if (needsHomeAddress && (!profile.address || profile.address.trim().length < 4)) {
                alert("Please add your Doorstep Address in the Account section for Home Service.");
                window.location.href = 'account.html';
                return;
            }

            let selectedAreaName = '';
            let travelFee = 0;

            if (needsHomeAddress) {
                if (!dom.serviceAreaSelect || !dom.serviceAreaSelect.value) {
                    if (dom.areaErrorMsg) dom.areaErrorMsg.classList.remove('hidden');
                    alert("Please select your Service Area from the dropdown to calculate travel charges.");
                    dom.serviceAreaSelect.focus();
                    return;
                }
                const selectedOpt = dom.serviceAreaSelect.options[dom.serviceAreaSelect.selectedIndex];
                selectedAreaName = dom.serviceAreaSelect.value;
                travelFee = Number(selectedOpt.getAttribute('data-fee')) || 0;
            }

            dom.confirmBtn.disabled = true;
            dom.confirmBtn.innerHTML = '<span class="w-4 h-4 border-2 border-champagne-gold border-t-transparent rounded-full animate-spin"></span>'
                + '<span class="text-[11px] font-bold uppercase tracking-widest ml-2">Locking Slots...</span>';

            try {
                await fetchBookedSlotsFromFirestore();

                const bookedItems = [];
                const slotsToLock = [];
                const orderId = 'EE-' + Math.floor(10000 + Math.random() * 90000);

                for (const id of EE_CART.items) {
                    const s = SERVICES.find(x => String(x.id) === String(id));
                    const sc = serviceSchedules[id];
                    if (!s || !sc) continue;

                    if (isSlotBookedInDB(sc.date, sc.time, sc.mode)) {
                        alert(`Sorry! The slot ${formatDateDisplay(sc.date)} at ${sc.time} (${sc.mode}) for "${s.name}" was just booked by another customer. Please choose another available slot.`);
                        initDefaultSchedules();
                        renderSelectedServices();
                        dom.confirmBtn.disabled = false;
                        dom.confirmBtn.innerHTML = '<span class="text-[12px] font-bold tracking-wider uppercase">Confirm Booking</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
                        return;
                    }

                    bookedItems.push({
                        id: s.id,
                        name: s.name,
                        category: s.category || s.cat || '',
                        price: s.price,
                        duration: s.duration,
                        mode: sc.mode,
                        date: sc.date,
                        time: sc.time
                    });

                    // Don't lock 'Anytime' as it's flexible
                    if (sc.time !== 'Anytime') {
                        slotsToLock.push({
                            date: sc.date,
                            time: sc.time,
                            mode: sc.mode,
                            bookingId: orderId
                        });
                    }
                }

                // Final calculation of Global Fees for payload
                const hasHomeMode = modes.includes('Home');
                const hasSalonMode = modes.includes('Salon');
                let convFee = 0;
                let hygFee = 0;

                if (globalFees.convenience && globalFees.convenience.amount > 0) {
                    const cMode = globalFees.convenience.mode;
                    if (cMode === 'Both' || (cMode === 'Home' && hasHomeMode) || (cMode === 'Salon' && hasSalonMode)) {
                        convFee = Number(globalFees.convenience.amount);
                    }
                }

                if (globalFees.hygiene && globalFees.hygiene.amount > 0) {
                    const hMode = globalFees.hygiene.mode;
                    if (hMode === 'Both' || (hMode === 'Home' && hasHomeMode) || (hMode === 'Salon' && hasSalonMode)) {
                        hygFee = Number(globalFees.hygiene.amount);
                    }
                }

                const subtotal = EE_CART.getTotal();
                const afterCoupon = Math.max(0, subtotal - appliedDiscount);
                const finalPointsUsed = Math.min(redeemedPoints, afterCoupon);
                const finalTotal = Math.max(0, afterCoupon - finalPointsUsed) + travelFee + convFee + hygFee;
                const uid = auth.currentUser?.uid || profile.uid || '';

                const orderPayload = {
                    id: orderId,
                    userId: uid,
                    customerName: profile.name,
                    customerPhone: profile.phone,
                    phone: profile.phone,
                    customerEmail: profile.email || '',
                    district: selectedAreaName || profile.district || '',
                    address: needsHomeAddress
                        ? profile.address
                        : 'At Salon Studio (House #42, Goel Market, Gandhi Nagar, Jammu)',
                    items: bookedItems,
                    serviceName: bookedItems.map(i => `${i.name} (${i.mode})`).join(', '),
                    date: bookedItems[0]?.date || getLocalDateString(),
                    time: bookedItems[0]?.time || '',
                    mode: bookedItems.map(i => i.mode).join(', '),
                    subtotal: subtotal,
                    travelFee: travelFee,
                    convenienceFee: convFee,
                    hygieneFee: hygFee,
                    couponCode: appliedCouponObj ? appliedCouponObj.code : '',
                    couponDiscount: appliedDiscount,
                    pointsUsed: finalPointsUsed,
                    total: finalTotal,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };

                await set(ref(rtdb, `bookings/${orderId}`), orderPayload);

                const remainingPoints = Math.max(0, (profile.points || 0) - finalPointsUsed);
                const usedCouponsList = EE_STORAGE.getUsedCoupons ? EE_STORAGE.getUsedCoupons() : [];

                if (appliedCouponObj && appliedCouponObj.code) {
                    const usedCode = appliedCouponObj.code.toUpperCase();
                    if (!usedCouponsList.includes(usedCode)) {
                        usedCouponsList.push(usedCode);
                    }
                    if (EE_STORAGE.setUsedCoupons) EE_STORAGE.setUsedCoupons(usedCouponsList);
                }

                EE_STORAGE.saveProfile('ee_user_points', remainingPoints.toString());

                if (uid) {
                    const userUpdate = {
                        points: remainingPoints,
                        usedCoupons: usedCouponsList
                    };
                    if (appliedCouponObj && appliedCouponObj.code.toUpperCase() === 'WELCOME100') {
                        userUpdate.welcomeCouponUsed = true;
                    }
                    await update(ref(rtdb, `users/${uid}`), userUpdate);
                }

                if (EE_STORAGE.addBookedSlots && slotsToLock.length > 0) EE_STORAGE.addBookedSlots(slotsToLock);
                EE_STORAGE.setBooking(orderPayload);
                localStorage.setItem('ee_current_invoice', JSON.stringify(orderPayload));
                EE_CART.clear();
                localStorage.removeItem('ee_booking_schedules');

                if (uid) {
                    try {
                        await update(ref(rtdb, `users/${uid}`), { cart: [] });
                    } catch (e) {}
                }

                const whatsappUrl = buildWhatsAppOrderMessage(orderPayload);
                if (dom.confirmWhatsappBtn) {
                    dom.confirmWhatsappBtn.href = whatsappUrl;
                }
                if (dom.confirmInvoiceBtn) {
                    dom.confirmInvoiceBtn.href = `invoice.html?id=${encodeURIComponent(orderId)}`;
                }

                if (dom.confirmId) dom.confirmId.innerText = '#' + orderId;
                if (dom.confirmDatetime) {
                    dom.confirmDatetime.innerHTML = bookedItems.map(item => {
                        const timeStr = item.time === 'Anytime' ? '(Flexible)' : item.time;
                        return `<div class="flex items-center justify-between bg-ivory/60 px-3 py-2 rounded-xl border border-muted-beige/50">
                            <span class="truncate pr-2 font-bold">${item.name} (${item.mode})</span>
                            <span class="text-warm-brown flex-shrink-0">${formatDateDisplay(item.date)} • ${timeStr}</span>
                        </div>`;
                    }).join('');
                }
                if (dom.confirmTotal) dom.confirmTotal.innerText = '₹' + finalTotal.toLocaleString('en-IN');

                if (dom.flowContainer) dom.flowContainer.classList.add('hidden');
                if (dom.stickyCta) dom.stickyCta.style.transform = 'translateY(150%)';
                if (dom.confirmContainer) {
                    dom.confirmContainer.classList.remove('hidden');
                    dom.confirmContainer.classList.add('flex');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });

                setTimeout(() => {
                    window.location.href = whatsappUrl;
                }, 600);

            } catch (err) {
                console.error("Booking confirmation error:", err);
                alert("Could not complete booking: " + err.message);
                dom.confirmBtn.disabled = false;
                dom.confirmBtn.innerHTML = '<span class="text-[12px] font-bold tracking-wider uppercase">Confirm Booking</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
            }
        });
    }

    // ==================== 1. INSTANT 0ms RENDER FROM LOCAL STORAGE ====================
    ensureLocalServicesLoaded();
    checkCartAndToggleState();
    populateCustomerDetails();
    renderAvailableCouponsStrip();
    initDefaultSchedules();
    saveSchedulesToLocal();
    renderSelectedServices();
    updateTotals();
    handleConfirm();

    window.addEventListener('storage', () => {
        ensureLocalServicesLoaded();
        renderSelectedServices();
        updateTotals();
    });

    // ==================== 2. BACKGROUND REALTIME DATABASE (RTDB) SYNC ====================
    async function fetchServiceAreas() {
        try {
            const snap = await get(ref(rtdb, "service_areas"));
            if (snap.exists()) {
                serviceAreasList = Object.values(snap.val() || {}).filter(a => a && a.active !== false);
                localStorage.setItem('ee_service_areas', JSON.stringify(serviceAreasList));
            }
        } catch(e) {}
    }

    async function fetchGeneralSettings() {
        try {
            const snap = await get(ref(rtdb, "settings/general"));
            if (snap.exists()) {
                const data = snap.val() || {};
                if (data.fees) {
                    globalFees = data.fees;
                    localStorage.setItem('ee_global_fees', JSON.stringify(globalFees));
                }
            }
        } catch(e) {}
    }

        await Promise.all([
        fetchBookedSlotsFromFirestore(),
        fetchServiceAreas(),
        fetchGeneralSettings()
    ]);

    ensureLocalServicesLoaded();
    checkCartAndToggleState();
    populateCustomerDetails();
    renderAvailableCouponsStrip();
    initDefaultSchedules();
    saveSchedulesToLocal();
    renderSelectedServices();
    updateTotals();

    // ग्लोबल सिंक: Firebase Auth स्टेट को लिसन करेगा ताकि अकाउंट और बुकिंग पेज हमेशा कनेक्टेड रहें
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            EE_STORAGE.saveProfile('ee_user_uid', user.uid);
            await syncUserAccountForBooking();
            populateCustomerDetails();
            updateTotals();
        }
    });
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookingApp);
} else {
    initBookingApp();
}
