import { 
    auth, 
    rtdb, 
    googleProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    ref, 
    get, 
    set, 
    update 
} from "./firebase-client.js";


// Toast helper
window.showToast = function(msg) {
    const toast = document.getElementById('accountToast');
    const toastMsg = document.getElementById('accountToastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// Modal Handlers
window.openAccountModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }
}

window.closeAccountModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

document.querySelectorAll('[id$="Modal"]').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.closeAccountModal(modal.id);
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('[id$="Modal"]').forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                window.closeAccountModal(modal.id);
            }
        });
    }
});

let currentUserUid = EE_STORAGE.getProfile().uid || null;
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 घंटा

// Populate UI from Data
function populateProfileUI(data) {
    if (data.name) {
        document.getElementById('acc-user-name').innerText = data.name;
        document.getElementById('input-profile-name').value = data.name;
        const initialsEl = document.getElementById('acc-user-initials');
        if (initialsEl) {
            const parts = data.name.trim().split(/\s+/);
            initialsEl.innerText = (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '');
            initialsEl.innerText = initialsEl.innerText.toUpperCase() || 'EE';
        }
    }
    if (data.phone) {
        document.getElementById('acc-user-phone').innerText = data.phone;
        document.getElementById('input-profile-phone').value = data.phone;
    }
      if (data.email) {
        document.getElementById('acc-user-email').innerText = data.email;
        document.getElementById('input-profile-email').value = data.email;
    }

    // Points & Wallet Balance Update (Default 0, Synced from Admin/Firestore)
    const pointsVal = (data.points !== undefined && data.points !== null)
        ? (parseInt(data.points, 10) || 0)
        : (EE_STORAGE.getProfile().points || 0);

    const pointsEl = document.getElementById('acc-user-points');
    const walletEl = document.getElementById('acc-wallet-balance');
    const modalPointsEl = document.getElementById('acc-modal-points');

    if (pointsEl) pointsEl.innerText = pointsVal;
    if (walletEl) walletEl.innerText = `₹${pointsVal}`;
    if (modalPointsEl) modalPointsEl.innerText = pointsVal;

    // Header Location (District) & Quick Address Card Update
    const headerLocEl = document.getElementById('acc-header-location');
    const quickAddrEl = document.getElementById('acc-quick-address');
    const addresses = EE_STORAGE.getAddresses();
    const activeAddrObj = addresses.find(a => a.isDefault) || addresses[0] || null;

    const districtToDisplay = data.district || activeAddrObj?.district || EE_STORAGE.getProfile().district || '';
    if (headerLocEl && districtToDisplay) {
        headerLocEl.innerText = districtToDisplay;
    }

    const primaryAddressText = activeAddrObj?.fullText || data.address || '';
    if (quickAddrEl) {
        if (activeAddrObj) {
            quickAddrEl.innerText = activeAddrObj.district
                ? `${activeAddrObj.district} (${addresses.length} Saved)`
                : primaryAddressText;
        } else if (primaryAddressText) {
            quickAddrEl.innerText = primaryAddressText.split(',').slice(-2)[0]?.trim() || primaryAddressText;
        } else {
            quickAddrEl.innerText = 'Add Address';
        }
    }
}


// ======================= SMART ADDRESS & PINCODE AUTO-DETECT LOGIC =======================

let editingAddressIndex = -1;
let lastDetectedAutoSuffix = '';

// पिन कोड डालते ही जिला (District) ऑटो-डिटेक्ट करने का फंक्शन
window.handlePincodeInput = async function(rawVal) {
    const pin = rawVal.replace(/\D/g, '').slice(0, 6);
    const pinInput = document.getElementById('input-address-pincode');
    if (pinInput && pinInput.value !== pin) pinInput.value = pin;

    const statusMsg = document.getElementById('pincodeStatusMsg');
    const checkIcon = document.getElementById('pincodeCheckIcon');
    const districtInput = document.getElementById('input-address-district');
    const addrTextarea = document.getElementById('input-address-text');

    if (pin.length < 6) {
        if (statusMsg) statusMsg.classList.add('hidden');
        if (checkIcon) checkIcon.classList.add('hidden');
        return;
    }

    if (statusMsg) {
        statusMsg.innerText = "Checking...";
        statusMsg.className = "text-[9px] font-bold text-warm-brown";
    }
    if (checkIcon) checkIcon.classList.add('hidden');

    try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();

        if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            const district = po.District || '';
            const areaName = po.Name || '';

            if (districtInput) districtInput.value = district;

            const autoSuffix = `${areaName ? areaName + ', ' : ''}${district} - ${pin}`;
            if (addrTextarea) {
                const currentText = addrTextarea.value.trim();
                if (!currentText || currentText === lastDetectedAutoSuffix) {
                    addrTextarea.value = autoSuffix;
                } else if (!currentText.includes(district)) {
                    const cleaned = lastDetectedAutoSuffix ? currentText.replace(lastDetectedAutoSuffix, '').replace(/,\s*$/, '').trim() : currentText;
                    addrTextarea.value = cleaned ? `${cleaned}, ${autoSuffix}` : autoSuffix;
                }
            }
            lastDetectedAutoSuffix = autoSuffix;

            const headerLocEl = document.getElementById('acc-header-location');
            if (headerLocEl && district) {
                headerLocEl.innerText = district;
            }

            if (statusMsg) {
                statusMsg.innerText = district;
                statusMsg.className = "text-[9px] font-bold text-sage-green";
            }
            if (checkIcon) checkIcon.classList.remove('hidden');
        } else {
            if (statusMsg) {
                statusMsg.innerText = "Invalid PIN";
                statusMsg.className = "text-[9px] font-bold text-muted-rose";
            }
        }
    } catch (err) {
        console.error("Pincode API error:", err);
        if (statusMsg) {
            statusMsg.innerText = "Enter manually";
            statusMsg.className = "text-[9px] font-bold text-neutral-gray";
        }
    }
};

function renderAddressesUI() {
    const listContainer = document.getElementById('savedAddressesList');
    const addBtn = document.getElementById('showAddAddressBtn');
    const formContainer = document.getElementById('addressFormContainer');
    const cancelBtn = document.getElementById('cancelAddressFormBtn');
    if (!listContainer) return;

    const addresses = EE_STORAGE.getAddresses();

    if (addresses.length === 0) {
        listContainer.innerHTML = '';
        if (addBtn) addBtn.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        window.openAddressForm(-1);
        return;
    }

    if (cancelBtn) cancelBtn.classList.remove('hidden');
    if (formContainer && formContainer.classList.contains('hidden') && addBtn) {
        addBtn.classList.remove('hidden');
    }

    listContainer.innerHTML = addresses.map((item, idx) => `
        <div onclick="selectDefaultAddress(${idx})"
            class="p-4 rounded-2xl border ${item.isDefault ? 'border-warm-brown bg-ivory/60' : 'border-muted-beige/60 bg-white'} shadow-subtle flex flex-col gap-1.5 cursor-pointer hover:border-champagne-gold transition-all">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-symbols-outlined text-[18px] text-warm-brown">location_on</span>
                    <span class="text-xs font-bold text-luxury-black truncate">${item.district || 'Saved Address'}${item.pincode ? ' - ' + item.pincode : ''}</span>
                    ${item.isDefault ? '<span class="px-2 py-0.5 rounded-full bg-warm-brown text-white text-[9px] font-bold uppercase tracking-wider">Active</span>' : ''}
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0" onclick="event.stopPropagation()">
                    <button onclick="openAddressForm(${idx})" type="button" title="Edit Address"
                        class="w-7 h-7 rounded-full bg-ivory hover:bg-champagne-gold/40 text-warm-brown flex items-center justify-center transition-colors">
                        <span class="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                    <button onclick="deleteAddressItem(${idx})" type="button" title="Delete Address"
                        class="w-7 h-7 rounded-full bg-muted-rose/10 hover:bg-muted-rose text-muted-rose hover:text-white flex items-center justify-center transition-colors">
                        <span class="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                </div>
            </div>
            <p class="text-xs text-neutral-gray font-medium leading-relaxed pl-6">${item.fullText}</p>
            ${item.phone ? `<p class="text-[11px] text-warm-brown font-semibold pl-6">Mobile: +91 ${item.phone}</p>` : ''}
        </div>
    `).join('');
}

window.openAddressForm = function(index = -1) {
    editingAddressIndex = index;
    const formContainer = document.getElementById('addressFormContainer');
    const addBtn = document.getElementById('showAddAddressBtn');
    const titleEl = document.getElementById('addressFormTitle');
    const pinInput = document.getElementById('input-address-pincode');
    const distInput = document.getElementById('input-address-district');
    const phoneInput = document.getElementById('input-address-phone');
    const textInput = document.getElementById('input-address-text');
    const statusMsg = document.getElementById('pincodeStatusMsg');
    const checkIcon = document.getElementById('pincodeCheckIcon');

    if (statusMsg) statusMsg.classList.add('hidden');
    if (checkIcon) checkIcon.classList.add('hidden');
    lastDetectedAutoSuffix = '';

    const defaultUserPhone = (EE_STORAGE.getProfile().phone || '').replace(/\D/g, '').slice(-10);
    const addresses = EE_STORAGE.getAddresses();

    if (index >= 0 && addresses[index]) {
        const addr = addresses[index];
        if (titleEl) titleEl.innerText = "Edit Address";
        if (pinInput) pinInput.value = addr.pincode || '';
        if (distInput) distInput.value = addr.district || '';
        if (phoneInput) phoneInput.value = addr.phone || defaultUserPhone;
        if (textInput) textInput.value = addr.manualText || addr.fullText || '';
    } else {
        if (titleEl) titleEl.innerText = "Add New Address";
        if (pinInput) pinInput.value = '';
        if (distInput) distInput.value = '';
        if (phoneInput) phoneInput.value = defaultUserPhone;
        if (textInput) textInput.value = '';
    }

    if (addBtn) addBtn.classList.add('hidden');
    if (formContainer) {
        formContainer.classList.remove('hidden');
        formContainer.classList.add('flex');
    }
};


window.cancelAddressForm = function() {
    const formContainer = document.getElementById('addressFormContainer');
    const addBtn = document.getElementById('showAddAddressBtn');
    if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.classList.remove('flex');
    }
    if (addBtn && EE_STORAGE.getAddresses().length > 0) {
        addBtn.classList.remove('hidden');
    }
};

async function syncAddressesToCloud(addresses) {
    EE_STORAGE.setAddresses(addresses);
    const active = addresses.find(a => a.isDefault) || addresses[0] || null;
    const primaryAddress = active ? active.fullText : '';
    const primaryDistrict = active ? active.district : '';

    EE_STORAGE.saveProfile('ee_user_address', primaryAddress);
    EE_STORAGE.saveProfile('ee_user_district', primaryDistrict);
    EE_STORAGE.saveProfile('ee_last_sync', Date.now().toString());

    populateProfileUI({ address: primaryAddress, district: primaryDistrict });
    renderAddressesUI();

    if (currentUserUid) {
        await update(ref(rtdb, `users/${currentUserUid}`), {
            addresses,
            address: primaryAddress,
            district: primaryDistrict
        });
    }
}

window.selectDefaultAddress = async function(index) {
    const addresses = EE_STORAGE.getAddresses();
    if (!addresses[index]) return;
    addresses.forEach((a, i) => { a.isDefault = (i === index); });
    try {
        await syncAddressesToCloud(addresses);
        window.showToast(`Location set to ${addresses[index].district || 'selected address'}`);
    } catch (e) {
        console.error("Error setting default address:", e);
    }
};

window.deleteAddressItem = async function(index) {
    const addresses = EE_STORAGE.getAddresses();
    if (!addresses[index]) return;
    const wasDefault = addresses[index].isDefault;
    addresses.splice(index, 1);
    if (wasDefault && addresses.length > 0) {
        addresses[0].isDefault = true;
    }
    try {
        await syncAddressesToCloud(addresses);
        window.showToast('Address deleted');
    } catch (e) {
        alert("Failed to delete address: " + e.message);
    }
};

// ======================= WISHLIST LOGIC (LocalStorage + RTDB) =======================

function renderWishlistUI() {
    const container = document.getElementById('wishlistItemsContainer');
    if (!container) return;

    const wishlist = EE_STORAGE.getWishlist();

    if (!wishlist || wishlist.length === 0) {
        container.innerHTML = `
            <div class="py-8 text-center flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-[32px] text-neutral-gray/60">favorite_border</span>
                <p class="text-xs font-semibold text-neutral-gray">Your wishlist is empty.</p>
                <a href="service.html" class="mt-1 px-4 py-2 rounded-full bg-ivory text-warm-brown text-[10px] font-bold uppercase tracking-wider no-underline hover:bg-champagne-gold/30 transition-colors">Explore Services</a>
            </div>
        `;
        return;
    }

    let cachedServices = [];
    try {
        cachedServices = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
    } catch (e) {
        cachedServices = [];
    }

    container.innerHTML = wishlist.map((item, idx) => {
        const found = cachedServices.find(s => s && s.name && s.name.trim().toLowerCase() === String(item).trim().toLowerCase());
        const srvImg = found ? (found.image || (Array.isArray(found.images) ? found.images[0] : '')) : '';
        const price = found && found.price ? `₹${Number(found.price).toLocaleString('en-IN')}` : '';
        const safeQuery = encodeURIComponent(item);

        return `
        <div onclick="window.location.href='service.html?openModal=${safeQuery}'"
            class="p-3 rounded-2xl bg-white border border-muted-beige/60 flex items-center justify-between gap-3 group hover:border-champagne-gold transition-all shadow-subtle cursor-pointer">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-xl bg-ivory border border-muted-beige/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    ${srvImg 
                        ? `<img src="${srvImg}" alt="${item}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />`
                        : `<span class="material-symbols-outlined text-[22px] text-warm-brown">spa</span>`}
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="text-[13px] font-bold text-luxury-black truncate group-hover:text-warm-brown transition-colors">${item}</span>
                    ${price ? `<span class="text-[11px] font-extrabold text-luxury-black mt-0.5">${price}</span>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0" onclick="event.stopPropagation()">
                <button onclick="closeAccountModal('wishlistModal'); window.location.href='service.html?openModal=${safeQuery}';"
                    type="button"
                    class="px-3 py-1.5 rounded-full bg-ivory hover:bg-champagne-gold text-[10px] font-bold uppercase tracking-wider text-warm-brown hover:text-luxury-black transition-colors">
                    View
                </button>
                <button onclick="removeFromWishlist(${idx})"
                    type="button"
                    title="Remove from Wishlist"
                    class="w-7 h-7 rounded-full bg-muted-rose/10 hover:bg-muted-rose text-muted-rose hover:text-white flex items-center justify-center transition-colors">
                    <span class="material-symbols-outlined text-[15px]">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
}


window.removeFromWishlist = async function(index) {
    const wishlist = EE_STORAGE.getWishlist();
    if (index < 0 || index >= wishlist.length) return;

    wishlist.splice(index, 1);
    EE_STORAGE.setWishlist(wishlist);
    renderWishlistUI();
    window.showToast('Removed from wishlist');

    if (currentUserUid) {
        try {
            await update(ref(rtdb, `users/${currentUserUid}`), { wishlist });
        } catch (err) {
            console.error("Wishlist cloud sync error:", err);
        }
    }
};

window.addToWishlist = async function(serviceName) {
    if (!serviceName) return;
    const wishlist = EE_STORAGE.getWishlist();
    if (!wishlist.includes(serviceName)) {
        wishlist.push(serviceName);
        EE_STORAGE.setWishlist(wishlist);
        renderWishlistUI();
        window.showToast('Added to wishlist!');

        if (currentUserUid) {
            try {
                await update(ref(rtdb, `users/${currentUserUid}`), { wishlist });
            } catch (err) {
                console.error("Wishlist cloud sync error:", err);
            }
        }
    } else {
        window.showToast('Already in your wishlist');
    }
};

// ======================= PROFILE & ADDRESS SAVING =======================

window.saveProfileData = async function() {
    const name = document.getElementById('input-profile-name').value.trim();
    const phone = document.getElementById('input-profile-phone').value.trim();
    const email = document.getElementById('input-profile-email').value.trim();

    if (!currentUserUid) return;

    try {
        await update(ref(rtdb, `users/${currentUserUid}`), { name, phone, email });
        EE_STORAGE.saveProfile('ee_user_name', name);
        EE_STORAGE.saveProfile('ee_user_phone', phone);
        EE_STORAGE.saveProfile('ee_user_email', email);
        EE_STORAGE.saveProfile('ee_last_sync', Date.now().toString());
        
        populateProfileUI({ name, phone, email });
        window.closeAccountModal('profileModal');
        window.showToast('Profile updated successfully!');
    } catch (e) {
        alert("Error saving profile: " + e.message);
    }
}


window.saveAddressData = async function() {
    const pincode = document.getElementById('input-address-pincode')?.value.trim() || '';
    const district = document.getElementById('input-address-district')?.value.trim() || '';
    const rawPhone = document.getElementById('input-address-phone')?.value.trim() || '';
    const phone = rawPhone.replace(/\D/g, '').slice(-10) || (EE_STORAGE.getProfile().phone || '').replace(/\D/g, '').slice(-10);
    const manualText = document.getElementById('input-address-text')?.value.trim() || '';

    if (!manualText && !district) {
        alert("Please enter your PIN code or complete address.");
        return;
    }

    const saveBtn = document.getElementById('saveAddressBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";
    }

    let fullText = manualText;
    if (district && !fullText.toLowerCase().includes(district.toLowerCase())) {
        fullText = fullText ? `${fullText}, ${district}` : district;
    }
    if (pincode && !fullText.includes(pincode)) {
        fullText = `${fullText} - ${pincode}`;
    }

    const addresses = EE_STORAGE.getAddresses();
    const newEntry = {
        pincode,
        district,
        phone,
        manualText: manualText || fullText,
        fullText,
        isDefault: true,
        updatedAt: new Date().toISOString()
    };

    addresses.forEach(a => { a.isDefault = false; });

    if (editingAddressIndex >= 0 && addresses[editingAddressIndex]) {
        addresses[editingAddressIndex] = newEntry;
    } else {
        addresses.unshift(newEntry);
    }

    try {
        await syncAddressesToCloud(addresses);
        window.cancelAddressForm();
        window.showToast('Address saved successfully!');
    } catch (e) {
        alert("Error saving address: " + e.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save Address";
        }
    }
}


window.contactWhatsAppHelp = function(context) {
    const phone = "917780910928";
    const name = EE_STORAGE.getProfile().name || "Customer";
    let message = context === 'booking_summary' 
        ? `Hello Elegant Escape Team, I need assistance with my booking. Customer: ${name}.`
        : `Hello Elegant Escape Team, I would like assistance regarding your doorstep salon services. Name: ${name}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ======================= SMART SYNC & INSTANT AUTH LOGIC =======================

const authContainer = document.getElementById('authContainer');
const profileContainer = document.getElementById('profileContainer');
const cpModal = document.getElementById('completeProfileModal');

// ======================= DYNAMIC COUPONS LOGIC (WELCOME100 + ALL + CATEGORY + PERSONAL) =======================

// हर कूपन के अमाउंट और मिनिमम ऑर्डर से ऑटोमेटिक "Flat ₹50 OFF above ₹100" फॉर्मेट बनाने का फंक्शन
function formatCouponOfferText(coupon) {
    const code = (coupon.code || '').toUpperCase();
    const discountVal = parseFloat(coupon.value !== undefined ? coupon.value : (coupon.discount || 0)) || 0;
    const minOrderVal = parseFloat(coupon.minOrder !== undefined ? coupon.minOrder : (coupon.minCart || 0)) || 0;
    const isPercent = (coupon.discountType || coupon.type) === 'percent';

    if (discountVal > 0) {
        const mainOffer = isPercent
            ? `${discountVal}% OFF`
            : `Flat ₹${discountVal} OFF`;
        const minPart = minOrderVal > 0 ? ` above ₹${minOrderVal}` : '';

        let suffix = '';
        const rawDesc = (coupon.description || coupon.title || '').trim();
        // अगर डिस्क्रिप्शन में पहले से ही "flat / off / above" लिखा है तो उसे दोबारा रिपीट न करें
        const isDuplicateManualText = /flat|off|above|booking/i.test(rawDesc);

        if (code === 'WELCOME100') {
            suffix = 'First Booking Offer';
        } else if (rawDesc && !isDuplicateManualText) {
            suffix = rawDesc;
        } else if (coupon.target === 'category' || coupon.category) {
            suffix = `Valid on ${coupon.categoryName || coupon.category}`;
        } else if (coupon.target === 'personal' || coupon.type === 'personal') {
            suffix = 'Exclusive Offer';
        } else {
            suffix = 'Special Salon Offer';
        }

        return `${mainOffer}${minPart}${suffix ? ' • ' + suffix : ''}`;
    }

    return coupon.description || coupon.title || 'Special Luxury Offer';
}

function renderCouponsUI() {
    const container = document.getElementById('couponsListContainer');
    const titleEl = document.getElementById('couponsModalTitle');
    const badgeEl = document.getElementById('acc-coupon-badge');

    const activeCoupons = EE_STORAGE.getCoupons();

    if (titleEl) {
        titleEl.innerText = `Active Coupons (${activeCoupons.length})`;
    }

    if (badgeEl) {
        if (activeCoupons.length > 0) {
            badgeEl.innerText = activeCoupons[0].code.toUpperCase();
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    if (!container) return;

    if (activeCoupons.length === 0) {
        container.innerHTML = `
            <div class="py-8 text-center flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-[32px] text-neutral-gray/60">confirmation_number</span>
                <p class="text-xs font-semibold text-neutral-gray">No active coupons available right now.</p>
                <span class="text-[10px] text-neutral-gray/80">Check back later for exclusive salon offers!</span>
            </div>
        `;
        return;
    }

    container.innerHTML = activeCoupons.map((coupon, idx) => {
        const code = (coupon.code || '').toUpperCase();
        const desc = formatCouponOfferText(coupon);

        let tag = 'All Services';
        let tagStyle = 'bg-champagne-gold/25 text-warm-brown';

        if (coupon.target === 'personal' || coupon.type === 'personal') {
            tag = 'Exclusive For You';
            tagStyle = 'bg-purple-100 text-purple-800';
        } else if (coupon.target === 'category' || coupon.category) {
            tag = `Only on ${coupon.categoryName || coupon.category}`;
            tagStyle = 'bg-amber-100 text-warm-brown';
        } else if (code === 'WELCOME100') {
            tag = 'New User • 1st Booking';
        }

        return `
            <div class="p-4 rounded-xl ${idx === 0 ? 'bg-ivory' : 'bg-white'} border border-muted-beige/60 flex items-center justify-between gap-3 shadow-subtle hover:border-champagne-gold transition-colors">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-[12px] font-bold text-luxury-black uppercase tracking-wider">${code}</span>
                        <span class="px-2 py-0.5 rounded-full ${tagStyle} text-[8px] font-bold uppercase tracking-wider">${tag}</span>
                    </div>
                    <span class="text-[11px] text-neutral-gray mt-1 block truncate font-medium">${desc}</span>
                </div>
                <button
                    onclick="copyCouponCode('${code}', this)"
                    class="px-4 py-2 rounded-full bg-white border border-muted-beige/60 hover:border-champagne-gold transition-colors text-warm-brown text-[10px] font-bold tracking-wider flex-shrink-0 shadow-sm"
                    type="button">
                    COPY
                </button>
            </div>
        `;
    }).join('');
}


window.copyCouponCode = async function(code, btnEl) {
    let copied = false;

    // 1. पहले मॉडर्न Clipboard API ट्राई करें
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(code);
            copied = true;
        } catch (err) {
            copied = false;
        }
    }

    // 2. अगर मोबाइल / HTTP / WebView में ब्लॉक हो, तो 100% काम करने वाला Fallback इस्तेमाल करें
    if (!copied) {
        try {
            const tempInput = document.createElement('textarea');
            tempInput.value = code;
            tempInput.setAttribute('readonly', '');
            tempInput.style.position = 'fixed';
            tempInput.style.top = '-9999px';
            tempInput.style.left = '-9999px';
            tempInput.style.opacity = '0';
            document.body.appendChild(tempInput);
            tempInput.focus();
            tempInput.select();
            tempInput.setSelectionRange(0, 99999); // Mobile iOS/Android support
            copied = document.execCommand('copy');
            document.body.removeChild(tempInput);
        } catch (err) {
            console.error('Copy fallback error:', err);
        }
    }

    if (btnEl) {
        btnEl.innerText = 'COPIED';
        setTimeout(() => { btnEl.innerText = 'COPY'; }, 2000);
    }
    window.showToast(`Coupon ${code} copied!`);
};

// जब यूजर बुकिंग/चेकआउट में कोई कूपन इस्तेमाल कर ले, तो इस फंक्शन को कॉल करने पर वह कूपन हमेशा के लिए हट जाएगा
window.markCouponAsUsed = async function(couponCode) {
    if (!couponCode) return;
    const cleanCode = couponCode.trim().toUpperCase();

    const usedList = EE_STORAGE.getUsedCoupons();
    if (!usedList.includes(cleanCode)) {
        usedList.push(cleanCode);
        EE_STORAGE.setUsedCoupons(usedList);
    }

    renderCouponsUI();

    const uid = currentUserUid || auth.currentUser?.uid;
    if (uid) {
        try {
            const updatePayload = { usedCoupons: usedList };
            if (cleanCode === 'WELCOME100') {
                updatePayload.welcomeCouponUsed = true;
            }
            await update(ref(rtdb, `users/${uid}`), updatePayload);
        } catch (err) {
            console.error("Error marking coupon as used in RTDB:", err);
        }
    }
};

// Realtime Database से All Users, Category और Personal कूपन सिंक करने का फंक्शन
async function syncCouponsFromCloud(uid, userData) {
    const usedCoupons = Array.isArray(userData.usedCoupons)
        ? userData.usedCoupons.map(c => String(c).toUpperCase())
        : [];

    if (userData.welcomeCouponUsed && !usedCoupons.includes('WELCOME100')) {
        usedCoupons.push('WELCOME100');
    }
    EE_STORAGE.setUsedCoupons(usedCoupons);

    const combinedMap = new Map();

    // 1. नया यूजर होने पर WELCOME100 (जब तक इस्तेमाल न हो)
    if (!usedCoupons.includes('WELCOME100')) {
        combinedMap.set('WELCOME100', {
            code: 'WELCOME100',
            description: 'Flat ₹100 OFF above ₹499 • First Booking Offer',
            discount: 100,
            value: 100,
            discountType: 'flat',
            minOrder: 499,
            target: 'welcome',
            type: 'welcome'
        });
    }

    // 2. यूजर के नोड (users/{uid}.coupons) में डायरेक्ट दिए गए पर्सनल कूपन
    if (Array.isArray(userData.coupons)) {
        userData.coupons.forEach(c => {
            if (!c) return;
            const item = typeof c === 'string'
                ? { code: c, description: 'Exclusive Personal Offer', target: 'personal', type: 'personal' }
                : { ...c, target: c.target || 'personal', type: c.type || 'personal' };
            const codeKey = (item.code || '').trim().toUpperCase();
            if (codeKey && item.active !== false && !usedCoupons.includes(codeKey)) {
                combinedMap.set(codeKey, { ...item, code: codeKey });
            }
        });
    }

    // 3. एडमिन पैनल के 'coupons' नोड से All Users, Category और Personal कूपन फेच करें
    try {
        const couponsSnap = await get(ref(rtdb, "coupons"));
        const userPhone = (userData.phone || '').replace(/\D/g, '').slice(-10);
        const userEmail = (userData.email || auth.currentUser?.email || '').trim().toLowerCase();
        const todayStr = new Date().toISOString().split('T')[0];

        if (couponsSnap.exists()) {
            const couponsObj = couponsSnap.val() || {};
            Object.entries(couponsObj).forEach(([docId, c]) => {
                if (!c || c.active === false) return;
                if (c.expiry && c.expiry < todayStr) return;

                const codeKey = (c.code || docId || '').trim().toUpperCase();
                if (!codeKey || usedCoupons.includes(codeKey)) return;

                const targetMode = (c.target || '').toLowerCase();
                const targetUid = c.userId || c.uid || '';
                const targetPhone = (c.phone || c.targetPhone || '').replace(/\D/g, '').slice(-10);
                const targetEmail = (c.targetEmail || '').trim().toLowerCase();

                const isPersonalMatch = (targetUid && targetUid === uid) ||
                                        (targetPhone && userPhone && targetPhone === userPhone) ||
                                        (targetEmail && userEmail && targetEmail === userEmail);

                const isForAll = targetMode === 'all' || (!targetMode && !targetUid && !targetPhone && !c.category);
                const isForCategory = targetMode === 'category' || Boolean(c.category);
                const isForPersonal = (targetMode === 'personal' || Boolean(targetUid || targetPhone || targetEmail)) && isPersonalMatch;

                if (isForAll || isForCategory || isForPersonal) {
                    const val = c.value !== undefined ? c.value : (c.discount || 0);
                    const dType = c.discountType || ((c.type === 'percent' || c.type === 'flat') ? c.type : 'flat');
                    const minOrd = c.minCart !== undefined ? c.minCart : (c.minOrder || 0);

                    combinedMap.set(codeKey, {
                        code: codeKey,
                        description: c.description || c.title || `${dType === 'percent' ? val + '% OFF' : 'Flat ₹' + val + ' OFF'}`,
                        discount: val,
                        value: val,
                        discountType: dType,
                        minOrder: minOrd,
                        minCart: minOrd,
                        expiry: c.expiry || '',
                        target: isForPersonal ? 'personal' : (isForCategory ? 'category' : 'all'),
                        category: c.category || '',
                        categoryName: c.categoryName || c.category || '',
                        type: isForPersonal ? 'personal' : (isForCategory ? 'category' : 'global')
                    });
                }
            });
        }
    } catch (err) {
        console.warn("Global coupons RTDB fetch skipped:", err);
    }

    const finalCoupons = Array.from(combinedMap.values());
    EE_STORAGE.setCoupons(finalCoupons);
    renderCouponsUI();
}


// ======================= MY BOOKINGS LOGIC (ACTIVE & COMPLETED FROM FIRESTORE) =======================

let currentBookingsTab = 'active';

function isBookingCompleted(status) {
    const s = String(status || 'pending').toLowerCase();
    return s === 'completed' || s === 'done' || s === 'finished';
}

function isBookingCancelled(status) {
    const s = String(status || '').toLowerCase();
    return s === 'cancelled' || s === 'rejected';
}

function formatBookingDateLabel(dateStr) {
    if (!dateStr) return 'Scheduled';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function renderMyBookingsUI() {
    const quickCountEl = document.getElementById('acc-quick-bookings');
    const activeCountEl = document.getElementById('countActiveBookings');
    const completedCountEl = document.getElementById('countCompletedBookings');
    const listContainer = document.getElementById('myBookingsListContainer');

    const allBookings = EE_STORAGE.getUserBookings ? EE_STORAGE.getUserBookings() : [];
    const activeList = allBookings.filter(b => !isBookingCompleted(b.status) && !isBookingCancelled(b.status));
    const completedList = allBookings.filter(b => isBookingCompleted(b.status));

    // 1. Update Quick Action Card Subtitle
    if (quickCountEl) {
        if (activeList.length > 0) {
            quickCountEl.innerText = `${activeList.length} Active`;
            quickCountEl.className = "text-[10px] text-sage-green font-bold mt-1";
        } else if (completedList.length > 0) {
            quickCountEl.innerText = `${completedList.length} Completed`;
            quickCountEl.className = "text-[10px] text-neutral-gray font-medium mt-1";
        } else {
            quickCountEl.innerText = "0 Active";
            quickCountEl.className = "text-[10px] text-neutral-gray font-medium mt-1";
        }
    }

    // 2. Update Modal Tab Counters
    if (activeCountEl) activeCountEl.innerText = activeList.length;
    if (completedCountEl) completedCountEl.innerText = completedList.length;

      // 3. Render Recent Booking Card on Main Screen
    const recentCardContainer = document.getElementById('recentBookingContainer');
    if (recentCardContainer) {
        if (allBookings.length > 0) {
            const latest = allBookings[0];
            const firstItem = latest.items && latest.items.length > 0 ? latest.items[0] : null;
            const sName = latest.serviceName || (firstItem ? firstItem.name : 'Luxury Service');
            const sId = firstItem ? firstItem.id : '';
            const dt = formatBookingDateLabel(latest.date);
            const tm = latest.time === 'Anytime' ? 'Flexible Time' : latest.time;
            const statusRaw = String(latest.status || 'pending').toLowerCase();
            const isDone = isBookingCompleted(statusRaw);

            // लोकल स्टोरेज से सर्विस की इमेज निकालें
            let srvImg = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=200';
            try {
                const cachedServices = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
                const found = cachedServices.find(s => s && String(s.id) === String(sId));
                if (found) {
                    srvImg = found.squareImage || found.image || (Array.isArray(found.images) ? found.images[0] : srvImg);
                }
            } catch(e) {}

            const statusBadge = isDone 
                ? `<span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sage-green/15 text-sage-green">Completed</span>`
                : `<span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-warm-brown flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-warm-brown animate-pulse"></span> Active</span>`;

            recentCardContainer.innerHTML = `
                <div class="w-full bg-white rounded-[20px] p-4 border border-muted-beige/60 shadow-subtle flex flex-col gap-3.5 hover:border-champagne-gold transition-colors group relative overflow-hidden">
                    <div class="flex justify-between items-center border-b border-muted-beige/40 pb-2.5">
                       <span class="text-[10px] font-bold text-neutral-gray uppercase tracking-widest flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">schedule</span> Recent Booking</span>
                       ${statusBadge}
                    </div>
                    <div class="flex items-start gap-4">
                        <!-- Clickable Image for Service Modal -->
                        <div onclick="window.location.href='service.html?openModal=${encodeURIComponent(sId)}'" class="w-[84px] h-[84px] rounded-[16px] bg-ivory border border-muted-beige/50 overflow-hidden flex-shrink-0 cursor-pointer shadow-sm relative group-hover:border-warm-brown transition-colors">
                            <img src="${srvImg}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Service" />
                            <div class="absolute inset-0 bg-black/5"></div>
                        </div>
                        
                        <!-- Booking Info -->
                        <div class="flex flex-col flex-grow min-w-0 cursor-pointer" onclick="openMyBookingsModal()">
                            <span class="font-serif text-[15px] sm:text-base font-bold text-luxury-black leading-snug line-clamp-2">${sName}</span>
                            
                            ${!isDone ? `
                            <span class="inline-flex items-center gap-1 mt-1.5 mb-1 text-[9px] font-extrabold uppercase tracking-wider text-[#9E2A5B]">
                                <span class="material-symbols-outlined text-[12px]">upcoming</span> Upcoming Service
                            </span>` : ''}

                            <!-- Highlighted Date & Time -->
                            <div class="flex items-center gap-1.5 mt-1 px-2.5 py-1.5 rounded-lg bg-warm-white border border-muted-beige/60 w-fit">
                                <span class="material-symbols-outlined text-[15px] text-warm-brown">event_available</span>
                                <span class="text-[11px] font-extrabold text-luxury-black">${dt} • ${tm}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            recentCardContainer.classList.remove('hidden');
        } else {
            recentCardContainer.classList.add('hidden');
            recentCardContainer.innerHTML = '';
        }
    }

    if (!listContainer) return;

    const listToShow = currentBookingsTab === 'active' ? activeList : completedList;

    if (listToShow.length === 0) {
        listContainer.innerHTML = `
            <div class="py-10 text-center flex flex-col items-center gap-2.5">
                <div class="w-14 h-14 rounded-full bg-ivory flex items-center justify-center text-neutral-gray/60">
                    <span class="material-symbols-outlined text-[28px]">event_busy</span>
                </div>
                <p class="text-xs font-bold text-luxury-black">
                    ${currentBookingsTab === 'active' ? 'No Active Bookings Right Now' : 'No Completed Bookings Yet'}
                </p>
                <p class="text-[11px] text-neutral-gray max-w-[220px]">
                    ${currentBookingsTab === 'active'
                        ? 'Book a doorstep beauty service to see your upcoming schedule here.'
                        : 'Your finished salon sessions will appear here.'}
                </p>
                ${currentBookingsTab === 'active' ? `
                    <a href="service.html" class="mt-1 px-5 py-2.5 rounded-full bg-warm-brown text-white text-[10px] font-bold uppercase tracking-wider no-underline hover:bg-luxury-black transition-colors shadow-subtle">
                        Explore Services
                    </a>
                ` : ''}
            </div>
        `;
        return;
    }

    listContainer.innerHTML = listToShow.map(b => {
        const orderId = b.id || 'EE-BOOKING';
        const totalAmt = parseFloat(b.total || 0) || 0;
        const statusRaw = String(b.status || 'pending').toLowerCase();
        const isDone = isBookingCompleted(statusRaw);

        const statusBadge = isDone
            ? `<span class="px-2.5 py-0.5 rounded-full bg-sage-green/15 text-sage-green border border-sage-green/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"><span class="material-symbols-outlined text-[11px]">check_circle</span> Completed</span>`
            : `<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-warm-brown border border-champagne-gold/40 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-warm-brown animate-pulse"></span> ${statusRaw === 'confirmed' ? 'Confirmed' : 'Active'}</span>`;

        const itemsHtml = Array.isArray(b.items) && b.items.length > 0
            ? b.items.map(item => `
                <div class="flex items-center justify-between gap-2 py-1.5 border-b border-dashed border-muted-beige/50 last:border-b-0 text-xs">
                    <div class="min-w-0">
                        <span class="font-bold text-luxury-black block truncate">${item.name}</span>
                        <span class="text-[10px] text-neutral-gray font-medium">
                            ${item.mode === 'Salon' ? '🏪 At Salon' : '🏠 At Home'} • ${formatBookingDateLabel(item.date)} at ${item.time || ''}
                        </span>
                    </div>
                    <span class="font-bold text-warm-brown flex-shrink-0">₹${(parseFloat(item.price) || 0).toLocaleString('en-IN')}</span>
                </div>
            `).join('')
            : `
                <div class="py-1 text-xs">
                    <span class="font-bold text-luxury-black block">${b.serviceName || 'Salon Service'}</span>
                    <span class="text-[10px] text-neutral-gray font-medium">${formatBookingDateLabel(b.date)} ${b.time ? '• ' + b.time : ''}</span>
                </div>
            `;

        return `
            <div class="p-4 rounded-2xl bg-warm-white border border-muted-beige/80 shadow-subtle flex flex-col gap-2.5">
                <div class="flex items-center justify-between border-b border-muted-beige/50 pb-2">
                    <span class="font-mono text-[11px] font-bold text-warm-brown">#${orderId}</span>
                    ${statusBadge}
                </div>
                <div class="flex flex-col">
                    ${itemsHtml}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-muted-beige/50">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-gray">Total Amount</span>
                    <span class="font-serif text-sm font-bold text-luxury-black">₹${totalAmt.toLocaleString('en-IN')}</span>
                </div>
                <!-- DOWNLOAD INVOICE BUTTON -->
                <div class="pt-2.5 mt-0.5">
                    <button onclick="event.stopPropagation(); downloadInvoice('${orderId}')" class="w-full py-2.5 rounded-xl bg-ivory border border-muted-beige/80 text-warm-brown text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-champagne-gold hover:text-luxury-black transition-colors shadow-sm">
                        <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                        Download Invoice
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// नया फ़ंक्शन: इनवॉइस डाउनलोड करने के लिए
window.downloadInvoice = function(orderId) {
    const allBookings = EE_STORAGE.getUserBookings ? EE_STORAGE.getUserBookings() : [];
    const booking = allBookings.find(b => String(b.id) === String(orderId));
    if (booking) {
        // डेटा को लोकल स्टोरेज में सेव करके नया टैब खोलें
        localStorage.setItem('ee_current_invoice', JSON.stringify(booking));
        window.open(`invoice.html?id=${encodeURIComponent(orderId)}`, '_blank');
    } else {
        alert("Booking details not found!");
    }
};

window.switchBookingsModalTab = function(tabName) {
    currentBookingsTab = tabName === 'completed' ? 'completed' : 'active';
    const activeBtn = document.getElementById('tabActiveBookingsBtn');
    const completedBtn = document.getElementById('tabCompletedBookingsBtn');

    if (activeBtn && completedBtn) {
        if (currentBookingsTab === 'active') {
            activeBtn.className = "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-full bg-warm-brown text-white shadow-sm transition-all";
            completedBtn.className = "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-full text-neutral-500 hover:text-luxury-black transition-all";
        } else {
            completedBtn.className = "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-full bg-warm-brown text-white shadow-sm transition-all";
            activeBtn.className = "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-full text-neutral-500 hover:text-luxury-black transition-all";
        }
    }
    renderMyBookingsUI();
};

async function syncUserBookingsFromCloud(uid, userPhone) {
    const cleanUserPhone = String(userPhone || EE_STORAGE.getProfile().phone || '').replace(/\D/g, '').slice(-10);
    if (!uid && !cleanUserPhone) return;

    try {
        const snap = await get(ref(rtdb, "bookings"));
        const matchedBookings = [];

        if (snap.exists()) {
            const bookingsObj = snap.val() || {};
            Object.entries(bookingsObj).forEach(([docId, b]) => {
                if (!b) return;
                const bPhone = String(b.customerPhone || b.phone || '').replace(/\D/g, '').slice(-10);
                const isUidMatch = uid && b.userId && b.userId === uid;
                const isPhoneMatch = cleanUserPhone && bPhone && bPhone === cleanUserPhone;

                if (isUidMatch || isPhoneMatch) {
                    matchedBookings.push({
                        ...b,
                        id: b.id || docId
                    });
                }
            });
        }

        matchedBookings.sort((a, b) => {
            const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tB - tA;
        });

        EE_STORAGE.setUserBookings(matchedBookings);
        renderMyBookingsUI();
    } catch (err) {
        console.warn("Could not sync user bookings from RTDB:", err);
    }
}

window.openMyBookingsModal = async function() {
    window.switchBookingsModalTab('active');
    window.openAccountModal('myBookingsModal');
    const profile = EE_STORAGE.getProfile();
    await syncUserBookingsFromCloud(currentUserUid || profile.uid, profile.phone);
};

// 1. INSTANT RENDER ON PAGE LOAD (0-Second Wait)
(function initInstantView() {
    renderWishlistUI();
    renderAddressesUI();
    renderCouponsUI();
    renderMyBookingsUI();
    const cached = EE_STORAGE.getProfile();
    if (cached.uid && cached.name) {
        currentUserUid = cached.uid;
        authContainer.classList.add('hidden');
        populateProfileUI(cached);
        profileContainer.classList.remove('hidden');
        profileContainer.classList.add('flex');
    }

    // ऑटो-डिटेक्ट: अगर हेडर के विशलिस्ट आइकॉन से आए हैं तो विशलिस्ट तुरंत खोलें
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'wishlist') {
        setTimeout(() => {
            window.openAccountModal('wishlistModal');
        }, 100);
    }
})();


// 2. REALTIME DATABASE CLOUD SYNC FUNCTION
window.syncProfileFromFirestore = async function(isManualClick = false) {
    const uid = currentUserUid || auth.currentUser?.uid || EE_STORAGE.getProfile().uid;
    if (!uid) return 'no_uid';

    const icon = document.getElementById('refreshBtnIcon');
    if (isManualClick && icon) {
        icon.classList.add('animate-spin');
    }

    try {
        const userSnap = await get(ref(rtdb, `users/${uid}`));
        if (userSnap.exists()) {
            const data = userSnap.val() || {};
            const cleanEmail = data.email || auth.currentUser?.email || '';
            const cloudPoints = (data.points !== undefined && data.points !== null)
                ? (parseInt(data.points, 10) || 0)
                : 0;

            EE_STORAGE.saveProfile('ee_user_uid', uid);
            EE_STORAGE.saveProfile('ee_user_name', data.name || '');
            EE_STORAGE.saveProfile('ee_user_phone', data.phone || '');
            EE_STORAGE.saveProfile('ee_user_email', cleanEmail);
            EE_STORAGE.saveProfile('ee_user_address', data.address || '');
            EE_STORAGE.saveProfile('ee_user_district', data.district || '');
            EE_STORAGE.saveProfile('ee_user_points', cloudPoints.toString());
            EE_STORAGE.saveProfile('ee_last_sync', Date.now().toString());

            if (Array.isArray(data.addresses)) {
                EE_STORAGE.setAddresses(data.addresses);
            } else if (data.address) {
                EE_STORAGE.setAddresses([{
                    pincode: '',
                    district: data.district || '',
                    state: '',
                    manualText: data.address,
                    fullText: data.address,
                    isDefault: true
                }]);
            }

            const missingFields = {};
            if (Array.isArray(data.wishlist)) {
                EE_STORAGE.setWishlist(data.wishlist);
            } else {
                missingFields.wishlist = EE_STORAGE.getWishlist();
            }
            if (data.points === undefined) {
                missingFields.points = 0;
            }
            if (!Array.isArray(data.usedCoupons)) {
                missingFields.usedCoupons = [];
            }
            if (!Array.isArray(data.coupons)) {
                missingFields.coupons = [];
            }
            if (Object.keys(missingFields).length > 0) {
                await update(ref(rtdb, `users/${uid}`), missingFields);
            }

            await Promise.all([
                syncCouponsFromCloud(uid, data),
                syncUserBookingsFromCloud(uid, data.phone)
            ]);

            populateProfileUI({ ...data, email: cleanEmail, points: cloudPoints });
            renderWishlistUI();
            renderAddressesUI();
            renderMyBookingsUI();

            if (isManualClick) {
                window.showToast('Data synced from cloud!');
            }
            return 'exists';
        }
        return 'not_found';
    } catch (err) {
        console.error("Error syncing from RTDB:", err);
        if (isManualClick) {
            window.showToast('Sync failed. Check connection.');
        }
        return 'error';
    } finally {
        if (isManualClick && icon) {
            setTimeout(() => icon.classList.remove('animate-spin'), 400);
        }
    }
};



// Auth UI Toggle Logic
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showSignupBtn = document.getElementById('showSignupBtn');

if (showLoginBtn && showSignupBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginBtn.className = "flex-1 py-2 text-xs font-bold uppercase rounded-full bg-warm-brown text-white shadow-sm transition-all";
        showSignupBtn.className = "flex-1 py-2 text-xs font-bold uppercase rounded-full text-neutral-500 hover:text-luxury-black transition-all";
        if(loginForm) loginForm.classList.remove('hidden');
        if(signupForm) signupForm.classList.add('hidden');
    });
    
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupBtn.className = "flex-1 py-2 text-xs font-bold uppercase rounded-full bg-warm-brown text-white shadow-sm transition-all";
        showLoginBtn.className = "flex-1 py-2 text-xs font-bold uppercase rounded-full text-neutral-500 hover:text-luxury-black transition-all";
        if(signupForm) signupForm.classList.remove('hidden');
        if(loginForm) loginForm.classList.add('hidden');
    });
}

let isSigningUp = false;
let isGoogleLogin = false;

// completeProfileModal: clicking outside should NOT dismiss it
// The user MUST fill the form to have a proper account
if (cpModal) {
    cpModal.addEventListener('click', async (e) => {
        // Intentionally blocked: user must complete profile to proceed
        // Do not dismiss on outside click
    });
}

// ======================= AUTH STATE LISTENER (Persistent Session) =======================
// Rules:
// 1. If user is logged in Firebase + has local cache → show profile immediately
// 2. If user is logged in Firebase + no cache → sync from DB
// 3. If DB has no record (new Google user) → show complete profile modal (ALWAYS, not just first time)
// 4. If user is NOT logged in Firebase but has local cache → keep showing profile (offline mode)
// 5. If user is NOT logged in and no cache → show auth screen
onAuthStateChanged(auth, async (user) => {
    if (isSigningUp) return;

    const cached = EE_STORAGE.getProfile();

    if (user) {
        // Admin email protection: don't overwrite user session with admin session
        if (user.email === 'kkbot405@gmail.com' && cached.uid && cached.name) {
            currentUserUid = cached.uid;
            authContainer.classList.add('hidden');
            profileContainer.classList.remove('hidden');
            profileContainer.classList.add('flex');
            return;
        }

        currentUserUid = user.uid;
        EE_STORAGE.saveProfile('ee_user_uid', user.uid);

        const now = Date.now();
        const hasValidCache = Boolean(cached.name && (!cached.uid || cached.uid === user.uid));
        const isCacheExpired = (now - cached.lastSync) > ONE_HOUR_MS;

        if (hasValidCache) {
            // Instantly show profile from cache
            authContainer.classList.add('hidden');
            cpModal.classList.add('hidden');
            cpModal.classList.remove('flex');
            profileContainer.classList.remove('hidden');
            profileContainer.classList.add('flex');

            // Background sync if cache is stale
            if (isCacheExpired) {
                window.syncProfileFromFirestore(false);
            }
        } else {
            // No valid cache: must sync from DB
            const syncStatus = await window.syncProfileFromFirestore(false);

            if (syncStatus === 'exists') {
                // Profile found in DB: show profile
                authContainer.classList.add('hidden');
                cpModal.classList.add('hidden');
                cpModal.classList.remove('flex');
                profileContainer.classList.remove('hidden');
                profileContainer.classList.add('flex');
            } else if (syncStatus === 'not_found') {
                // New user (Google or other): profile doesn't exist yet → show complete form
                // This handles BOTH first-time Google login AND page reload before profile is saved
                authContainer.classList.add('hidden');
                profileContainer.classList.add('hidden');
                profileContainer.classList.remove('flex');
                const cpNameEl = document.getElementById('cpName');
                if (cpNameEl) cpNameEl.value = user.displayName || '';
                cpModal.classList.remove('hidden');
                cpModal.classList.add('flex');
            } else {
                // Error: show cached profile or auth screen
                if (cached.name) {
                    authContainer.classList.add('hidden');
                    profileContainer.classList.remove('hidden');
                    profileContainer.classList.add('flex');
                } else {
                    authContainer.classList.remove('hidden');
                }
            }
        }
    } else {
        // Not logged in to Firebase
        // Rule 4: If local cache exists, keep showing profile (offline / session mode)
        if (cached.uid && cached.name) {
            currentUserUid = cached.uid;
            authContainer.classList.add('hidden');
            profileContainer.classList.remove('hidden');
            profileContainer.classList.add('flex');
            return;
        }

        // Rule 5: No user, no cache → show auth
        currentUserUid = null;
        isGoogleLogin = false;
        profileContainer.classList.add('hidden');
        profileContainer.classList.remove('flex');
        cpModal.classList.add('hidden');
        cpModal.classList.remove('flex');
        authContainer.classList.remove('hidden');
    }
});

// Google Login
document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
    try {
        isGoogleLogin = true;
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        isGoogleLogin = false;
        alert("Google Login failed: " + error.message);
    }
});

// Create Account (Sign Up with Name, Mobile, Email, Password - 100% RTDB)
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim().replace(/\D/g, '').slice(-10);
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorMsg = document.getElementById('signupErrorMsg');
    const submitBtn = document.getElementById('signupSubmitBtn');

    if (errorMsg) {
        errorMsg.innerText = '';
        errorMsg.classList.add('hidden');
    }
    submitBtn.disabled = true;
    submitBtn.innerText = "Creating Account...";
    isSigningUp = true;

    try {
        // Realtime Database में चेक करें कि मोबाइल नंबर पहले से रजिस्टर्ड तो नहीं है
        const usersSnap = await get(ref(rtdb, "users"));
        if (usersSnap.exists()) {
            const usersObj = usersSnap.val() || {};
            const phoneExists = Object.values(usersObj).some(
                u => u && String(u.phone || '').replace(/\D/g, '').slice(-10) === phone
            );
            if (phoneExists) {
                throw new Error("Mobile number already registered. Please login.");
            }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        currentUserUid = user.uid;

        const initialWishlist = EE_STORAGE.getWishlist();
        const userData = {
            name,
            phone,
            email,
            address: '',
            district: '',
            points: 0,
            usedCoupons: [],
            coupons: [],
            wishlist: initialWishlist,
            createdAt: new Date().toISOString()
        };

        await set(ref(rtdb, `users/${user.uid}`), userData);

        EE_STORAGE.saveProfile('ee_user_uid', user.uid);
        EE_STORAGE.saveProfile('ee_user_name', name);
        EE_STORAGE.saveProfile('ee_user_phone', phone);
        EE_STORAGE.saveProfile('ee_user_email', email);
        EE_STORAGE.saveProfile('ee_user_address', '');
        EE_STORAGE.saveProfile('ee_user_district', '');
        EE_STORAGE.saveProfile('ee_user_points', '0');
        EE_STORAGE.saveProfile('ee_last_sync', Date.now().toString());

        await syncCouponsFromCloud(user.uid, userData);
        populateProfileUI(userData);
        renderWishlistUI();
        renderAddressesUI();

        authContainer.classList.add('hidden');
        profileContainer.classList.remove('hidden');
        profileContainer.classList.add('flex');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.showToast("Account created! WELCOME100 unlocked.");

    } catch (err) {
        if (errorMsg) {
            errorMsg.innerText = err.code === 'auth/email-already-in-use'
                ? "Email already registered. Please login."
                : err.message;
            errorMsg.classList.remove('hidden');
        }
    } finally {
        isSigningUp = false;
        submitBtn.disabled = false;
        submitBtn.innerText = "Create Account";
    }
});

// Smart Login (Email OR Mobile + Password - 100% RTDB)
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginId = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('loginErrorMsg');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (errorMsg) {
        errorMsg.innerText = '';
        errorMsg.classList.add('hidden');
    }
    submitBtn.disabled = true;
    submitBtn.innerText = "Authenticating...";

    try {
        let loginEmail = loginId;

        // अगर यूजर ने ईमेल की जगह 10-अंकों का मोबाइल नंबर डाला है
        if (!loginId.includes('@')) {
            const cleanPhone = loginId.replace(/\D/g, '').slice(-10);
            let matchedEmail = '';

            // 1. पहले Realtime Database के 'users' नोड में मोबाइल नंबर से ईमेल ढूंढें
            const usersSnap = await get(ref(rtdb, "users"));
            if (usersSnap.exists()) {
                const usersObj = usersSnap.val() || {};
                const matchedUser = Object.values(usersObj).find(
                    u => u && String(u.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone
                );
                if (matchedUser && matchedUser.email) {
                    matchedEmail = matchedUser.email;
                }
            }

            // 2. अगर लोकल कैश में वही नंबर सेव है तो वहां से ईमेल ले लें (Fallback)
            if (!matchedEmail) {
                const cached = EE_STORAGE.getProfile();
                const cachedPhone = String(cached.phone || '').replace(/\D/g, '').slice(-10);
                if (cachedPhone === cleanPhone && cached.email) {
                    matchedEmail = cached.email;
                }
            }

            if (!matchedEmail) {
                throw new Error("Mobile number not registered. Please Sign Up or login with Email.");
            }
            loginEmail = matchedEmail;
        }

        const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
        currentUserUid = cred.user.uid;
        await window.syncProfileFromFirestore(false);

        if (errorMsg) {
            errorMsg.innerText = '';
            errorMsg.classList.add('hidden');
        }
        authContainer.classList.add('hidden');
        profileContainer.classList.remove('hidden');
        profileContainer.classList.add('flex');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.showToast("Logged in successfully!");

    } catch (err) {
        if (errorMsg) {
            errorMsg.innerText = (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found')
                ? "Incorrect Mobile, Email, or Password."
                : err.message;
            errorMsg.classList.remove('hidden');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Login";
    }
});

// Complete Profile Submit (For Google Login users missing info - 100% RTDB)
document.getElementById('completeProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserUid) return;

    const btn = document.getElementById('cpSubmitBtn');
    btn.disabled = true;
    btn.innerText = "Saving...";

    const name = document.getElementById('cpName').value.trim();
    const phone = document.getElementById('cpPhone').value.trim().replace(/\D/g, '').slice(-10);
    const address = document.getElementById('cpAddress').value.trim();
    const email = auth.currentUser?.email || '';
    const initialWishlist = EE_STORAGE.getWishlist();

    try {
        const payload = {
            name,
            phone,
            address,
            district: '',
            points: 0,
            usedCoupons: [],
            coupons: [],
            email,
            wishlist: initialWishlist,
            createdAt: new Date().toISOString()
        };
        await set(ref(rtdb, `users/${currentUserUid}`), payload);

        EE_STORAGE.saveProfile('ee_user_uid', currentUserUid);
        EE_STORAGE.saveProfile('ee_user_name', name);
        EE_STORAGE.saveProfile('ee_user_phone', phone);
        EE_STORAGE.saveProfile('ee_user_email', email);
        EE_STORAGE.saveProfile('ee_user_address', address);
        EE_STORAGE.saveProfile('ee_user_district', '');
        EE_STORAGE.saveProfile('ee_user_points', '0');
        EE_STORAGE.saveProfile('ee_last_sync', Date.now().toString());

        await syncCouponsFromCloud(currentUserUid, payload);

        isGoogleLogin = false;
        cpModal.classList.add('hidden');
        cpModal.classList.remove('flex');

        populateProfileUI(payload);
        renderWishlistUI();
        renderAddressesUI();
        profileContainer.classList.remove('hidden');
        profileContainer.classList.add('flex');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.showToast("Welcome to Elegant Escape!");
    } catch (err) {
        alert("Failed to save profile: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Details";
    }
});

// Manual Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm("Are you sure you want to sign out?")) {
        isGoogleLogin = false;
        currentUserUid = null;
        EE_STORAGE.clearProfile();
        await signOut(auth);
        profileContainer.classList.add('hidden');
        profileContainer.classList.remove('flex');
        authContainer.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.showToast("Signed out successfully.");
    }
});
