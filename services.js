// --- DATA ARCHITECTURE (100% Connected to Firebase Realtime Database) ---

const DEFAULT_CATEGORIES = ["All"];

const CATEGORY_LAYOUT_MAP = {
    "Popular Picks": "horizontal-scroll",
    "Multi-Service Packages": "hero-cards",
    "Facials": "visual-grid",
    "Rica Waxing Packages": "hero-cards",
    "Rica Waxing": "visual-grid",
    "Manicure": "visual-grid",
    "Pedicure": "visual-grid",
    "Mani-Pedi": "visual-grid",
    "Brazilian Waxing": "discreet-cards",
    "Basic Facial": "compact-list",
    "Clean Up": "compact-list",
    "Bleach": "compact-list",
    "Honey Waxing": "compact-list"
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=600";

const DEFAULT_SERVICES = [];

// Load cached services/categories immediately so Cart & Booking pages have instant data
function getInitialServices() {
    try {
        const cached = JSON.parse(localStorage.getItem('ee_cached_services'));
        if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch (e) {}
    return DEFAULT_SERVICES;
}

function getInitialCategories() {
    try {
        const cached = JSON.parse(localStorage.getItem('ee_cached_categories'));
        if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch (e) {}
    return [...DEFAULT_CATEGORIES];
}

let CATEGORIES = getInitialCategories();
let SERVICES = getInitialServices();
window.SERVICES = SERVICES;
window.CATEGORIES = CATEGORIES;

// Dynamic slug map from Firestore categories
let dynamicSlugToCategoryMap = {};

let state = {
    activeCategory: "All",
    searchQuery: ""
};

const DOM = {
    catContainer: document.getElementById('categoryContainer'),
    catlContainer: document.getElementById('catalogueContainer'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),

    // Green Cart Bar
    bookingBar: document.getElementById('bookingBar'),
    cartBarImg: document.getElementById('cartBarImg'),
    cartBarCategory: document.getElementById('cartBarCategory'),
    cartCount: document.getElementById('cartCount'),
    cartServiceWord: document.getElementById('cartServiceWord'),
    cartTotal: document.getElementById('cartTotal'),

    // Details Modal
    modal: document.getElementById('detailsModal'),
    scrim: document.getElementById('detailsModalScrim'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    mImageCont: document.getElementById('modalImageContainer'),
    mImageSlider: document.getElementById('modalImageSlider'),
    mSliderDots: document.getElementById('modalSliderDots'),
    mBadge: document.getElementById('modalBadge'),
    mCat: document.getElementById('modalCategory'),
    mTitle: document.getElementById('modalTitle'),
    mWishlistBtn: document.getElementById('modalWishlistBtn'),
    mWishlistIcon: document.getElementById('modalWishlistIcon'),
    mDur: document.getElementById('modalDuration'),
    mRat: document.getElementById('modalRating'),
    mRatCont: document.getElementById('modalRatingContainer'),
    mRevCount: document.getElementById('modalReviewsCount'),
    mDesc: document.getElementById('modalDesc'),
    mHighlightsSec: document.getElementById('modalHighlightsSection'),
    mBrandBox: document.getElementById('modalBrandBox'),
    mBrandText: document.getElementById('modalBrandText'),
    mIdealBox: document.getElementById('modalIdealForBox'),
    mIdealText: document.getElementById('modalIdealForText'),
    mIncSec: document.getElementById('modalIncludesSection'),
    mInc: document.getElementById('modalIncludes'),
    mStepsSec: document.getElementById('modalStepsSection'),
    mStepsList: document.getElementById('modalStepsList'),
    mNoteSec: document.getElementById('modalNoteSection'),
    mNoteText: document.getElementById('modalNoteText'),
    mPrice: document.getElementById('modalPrice'),
    mMrp: document.getElementById('modalMrp'),
    mDiscount: document.getElementById('modalDiscount'),
    mBookBtn: document.getElementById('modalBookBtn')
};


const CAT_URL_MAP = {
    'facial': 'Facials',
    'facials': 'Facials',
    'hair': 'Popular Picks',
    'spa': 'Multi-Service Packages',
    'makeup': 'Facials',
    'skin': 'Basic Facial',
    'beauty': 'Clean Up',
    'mani': 'Manicure',
    'pedicure': 'Pedicure',
    'wax': 'Rica Waxing Packages',
    'all': 'All'
};

const SHORT_CATEGORY_LABELS = {
    "All": "All",
    "Popular Picks": "Popular",
    "Multi-Service Packages": "Packages",
    "Facials": "Facials",
    "Basic Facial": "Basic Facial",
    "Clean Up": "Clean Up",
    "Bleach": "Bleach",
    "Rica Waxing Packages": "Rica Combos",
    "Rica Waxing": "Rica Wax",
    "Brazilian Waxing": "Bikini Wax",
    "Honey Waxing": "Honey Wax",
    "Manicure": "Manicure",
    "Pedicure": "Pedicure",
    "Mani-Pedi": "Mani-Pedi"
};

// --- REALTIME DATABASE (RTDB) SUPERFAST LIVE SYNC ---
async function syncCatalogueFromFirestore() {
    try {
        const { rtdb, ref, get } = await import("./firebase-client.js");

        const [catSnap, srvSnap] = await Promise.all([
            get(ref(rtdb, "categories")),
            get(ref(rtdb, "services"))
        ]);

        // 1. Process Categories from Admin Panel (RTDB)
        const dbCategories = [];
        if (catSnap.exists()) {
            const catsObj = catSnap.val() || {};
            Object.entries(catsObj).forEach(([docId, c]) => {
                if (c && c.name) {
                    const catName = c.name.trim();
                    if (!dbCategories.includes(catName)) {
                        dbCategories.push(catName);
                    }
                    const slugKey = (c.slug || docId).toLowerCase();
                    dynamicSlugToCategoryMap[slugKey] = catName;
                    if (c.layout) {
                        CATEGORY_LAYOUT_MAP[catName] = c.layout;
                    }
                }
            });
        }

        // 2. Process Services from Admin Panel (RTDB)
        const dbServices = [];
        if (srvSnap.exists()) {
            const srvsObj = srvSnap.val() || {};
            Object.entries(srvsObj).forEach(([docId, s]) => {
                if (!s || s.active === false) return; // Skip inactive (OFF) services

                const normalized = {
                    id: s.id || docId,
                    name: s.name || "Luxury Service",
                    category: (s.category || "General").trim(),
                    price: Number(s.price) || 0,
                    mrp: Number(s.mrp) || 0,
                                        duration: Number(s.duration) || 60,
                    image: s.image || (Array.isArray(s.images) ? s.images[0] : "") || "",
                    images: Array.isArray(s.images) ? s.images : (s.image ? [s.image] : []),
                    desc: s.desc || s.description || "",

                    includes: Array.isArray(s.includes)
                        ? s.includes
                        : (typeof s.includes === 'string' && s.includes.trim() ? s.includes.split(',').map(x => x.trim()) : []),
                    steps: Array.isArray(s.steps)
                        ? s.steps
                        : (typeof s.steps === 'string' && s.steps.trim() ? s.steps.split(',').map(x => x.trim()) : []),
                    rating: s.rating ? Number(s.rating) : null,
                    reviewsCount: s.reviewsCount || "",
                    badge: s.badge || "",
                    brand: s.brand || s.productsUsed || "",
                    idealFor: s.idealFor || "",
                    note: s.note || s.precautions || "",
                    layout: s.layout || ""
                };

                dbServices.push(normalized);
            });
        }

        // Update global SERVICES if Admin has added services in RTDB
        if (dbServices.length > 0) {
            SERVICES.length = 0;
            dbServices.forEach(item => SERVICES.push(item));
            localStorage.setItem('ee_cached_services', JSON.stringify(SERVICES));
        }

        // Build unified Categories list ("All" + Admin Categories + Any Category used in active Services)
        const activeServiceCategories = [...new Set(SERVICES.map(s => s.category).filter(Boolean))];
        const mergedCategories = ["All"];

        dbCategories.forEach(c => {
            if (!mergedCategories.includes(c)) mergedCategories.push(c);
        });
        activeServiceCategories.forEach(c => {
            if (!mergedCategories.includes(c)) mergedCategories.push(c);
        });

        if (mergedCategories.length > 1) {
            CATEGORIES.length = 0;
            mergedCategories.forEach(c => CATEGORIES.push(c));
            localStorage.setItem('ee_cached_categories', JSON.stringify(CATEGORIES));
        }

        // Re-apply URL category filter if needed
        applyUrlCategoryFilter();

        // Refresh UI if on service.html
        if (DOM.catContainer && DOM.catlContainer) {
            renderCategoryChips();
            renderCatalogue();
            updateBookingBar();
        }

        // Refresh Cart page if on cart.html
        if (typeof EE_CART !== 'undefined' && window.location.pathname.endsWith('cart.html')) {
            EE_CART.renderCartPage();
        }
    } catch (err) {
        console.warn("Realtime DB services sync warning (using cached/fallback data):", err);
    }
}


function applyUrlCategoryFilter() {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('cat');
    if (!catParam) return;

    const cleanParam = catParam.trim().toLowerCase();

    // 1. Check dynamic slug from Firestore categories
    if (dynamicSlugToCategoryMap[cleanParam] && CATEGORIES.includes(dynamicSlugToCategoryMap[cleanParam])) {
        state.activeCategory = dynamicSlugToCategoryMap[cleanParam];
        return;
    }

    // 2. Direct case-insensitive match with CATEGORIES
    const directMatch = CATEGORIES.find(c => c.toLowerCase() === cleanParam || c.toLowerCase().includes(cleanParam));
    if (directMatch) {
        state.activeCategory = directMatch;
        return;
    }

    // 3. Fallback shorthand map
    const mapped = CAT_URL_MAP[cleanParam];
    if (mapped && CATEGORIES.includes(mapped)) {
        state.activeCategory = mapped;
    }
}

function checkAndOpenModalFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const targetModal = params.get('openModal');
    if (!targetModal) return;

    const cleanTarget = decodeURIComponent(targetModal).trim().toLowerCase();

    // जब तक सर्विस डेटा लोड न हो तब तक री-ट्राई करें
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        const sList = (Array.isArray(SERVICES) && SERVICES.length > 0) ? SERVICES : (getInitialServices() || []);
        const found = sList.find(s => s && (
            String(s.id).trim().toLowerCase() === cleanTarget ||
            String(s.name || '').trim().toLowerCase() === cleanTarget
        ));

        if (found) {
            clearInterval(interval);
            setTimeout(() => {
                openModal(found.id);
            }, 100);
        } else if (attempts > 20) {
            clearInterval(interval);
        }
    }, 100);
}


function init() {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');

    applyUrlCategoryFilter();

    if (qParam) {
        state.searchQuery = qParam.toLowerCase();
        if (DOM.searchInput) {
            DOM.searchInput.value = qParam;
            if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = 'block';
        }
    }

    renderCategoryChips();
    setupEventListeners();
    renderCatalogue();
    checkAndOpenModalFromUrl();
}

function setupEventListeners() {
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            if (DOM.clearSearchBtn) {
                DOM.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
            }

            if (state.searchQuery && state.activeCategory !== 'All') {
                state.activeCategory = 'All';
                renderCategoryChips();
            }
            renderCatalogue();
        });
    }

    if (DOM.scrim) DOM.scrim.addEventListener('click', closeModal);
    if (DOM.closeModalBtn) DOM.closeModalBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // SCROLL LOGIC FOR BOTTOM NAV & CART BAR (Matches Home Page)
    const bottomNav = document.getElementById('bottomNav');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (!bottomNav) return;

        if (currentScrollY <= 10) {
            bottomNav.classList.remove('translate-y-full');
            if (DOM.bookingBar) DOM.bookingBar.classList.remove('nav-hidden-shift');
            lastScrollY = currentScrollY;
            return;
        }
        
        if (Math.abs(currentScrollY - lastScrollY) > 5) {
            if (currentScrollY > lastScrollY) {
                // Scrolling down -> Hide Nav, Shift Cart Bar Down
                bottomNav.classList.add('translate-y-full');
                if (DOM.bookingBar) DOM.bookingBar.classList.add('nav-hidden-shift');
            } else {
                // Scrolling up -> Show Nav, Restore Cart Bar Position
                bottomNav.classList.remove('translate-y-full');
                if (DOM.bookingBar) DOM.bookingBar.classList.remove('nav-hidden-shift');
            }
            lastScrollY = currentScrollY;
        }
    }, { passive: true });
}


window.clearSearch = function () {
    if (DOM.searchInput) DOM.searchInput.value = '';
    state.searchQuery = '';
    if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = 'none';
    renderCatalogue();
};

function formatDuration(mins) {
    const m = parseInt(mins, 10) || 0;
    const hrs = Math.floor(m / 60);
    const rem = m % 60;
    if (hrs > 0 && rem > 0) return `${hrs} hr ${rem} mins`;
    if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
    return `${rem} mins`;
}

function getPricingInfo(s) {
    const price = Number(s.price) || 0;
    const mrp = (s.mrp && Number(s.mrp) > price)
        ? Number(s.mrp)
        : Math.round((price * 1.35) / 50) * 50 - 1;
    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    return { mrp, discount };
}

function renderCategoryChips() {
    if (!DOM.catContainer) return;
    DOM.catContainer.innerHTML = CATEGORIES.map(cat => {
        const isActive = state.activeCategory === cat;
        const shortLabel = SHORT_CATEGORY_LABELS[cat] || cat;
        const activeClass = isActive
            ? "bg-warm-brown text-white shadow-subtle border-warm-brown"
            : "bg-white/90 text-luxury-black border-muted-beige/70 hover:border-warm-brown";
        const safeCat = cat.replace(/'/g, "\\'");
        return `<button onclick="setCategory('${safeCat}')" class="px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all flex-shrink-0 cursor-pointer border ${activeClass}">${shortLabel}</button>`;
    }).join('');
}

window.setCategory = function (cat) {
    state.activeCategory = cat;
    renderCategoryChips();
    renderCatalogue();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function resolveCategoryLayout(catName, servicesInCat) {
    if (CATEGORY_LAYOUT_MAP[catName]) return CATEGORY_LAYOUT_MAP[catName];
    // For any new category created from Admin Panel: use visual-grid if services have images
    const hasImages = servicesInCat.some(s => s.image && s.image.trim() !== "");
    return hasImages ? "visual-grid" : "compact-list";
}

function renderCatalogue() {
    if (!DOM.catlContainer) return;

    const filtered = SERVICES.filter(s => {
        const nameStr = (s.name || '').toLowerCase();
        const catStr = (s.category || '').toLowerCase();
        const descStr = (s.desc || '').toLowerCase();
        const searchMatch = !state.searchQuery ||
            nameStr.includes(state.searchQuery) ||
            catStr.includes(state.searchQuery) ||
            descStr.includes(state.searchQuery);
        const catMatch = state.activeCategory === "All" || s.category === state.activeCategory;
        return searchMatch && catMatch;
    });

    if (filtered.length === 0) {
        DOM.catlContainer.innerHTML = '';
        if (DOM.emptyState) {
            DOM.emptyState.classList.remove('hidden');
            DOM.emptyState.classList.add('flex');
        }
        return;
    }

    if (DOM.emptyState) {
        DOM.emptyState.classList.add('hidden');
        DOM.emptyState.classList.remove('flex');
    }

    const grouped = {};
    filtered.forEach(s => {
        const c = s.category || "Services";
        if (!grouped[c]) grouped[c] = [];
        grouped[c].push(s);
    });

    // Ensure all grouped categories render even if newly added
    const orderedCatKeys = [
        ...CATEGORIES.filter(c => c !== "All" && grouped[c]),
        ...Object.keys(grouped).filter(c => !CATEGORIES.includes(c))
    ];

    let html = '';
    orderedCatKeys.forEach(catName => {
        const items = grouped[catName];
        if (!items || !items.length) return;

        const layout = resolveCategoryLayout(catName, items);

        let sectionContent = '';
        if (layout === 'horizontal-scroll') {
            sectionContent = `<div class="flex gap-4 overflow-x-auto hide-scrollbar snap-x pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                ${items.map(s => renderVisualCard(s, true)).join('')}
            </div>`;
        } else if (layout === 'hero-cards') {
            sectionContent = `<div class="flex flex-col gap-5">
                ${items.map(s => renderHeroCard(s)).join('')}
            </div>`;
        } else if (layout === 'visual-grid') {
            sectionContent = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                ${items.map(s => renderVisualCard(s, false)).join('')}
            </div>`;
        } else if (layout === 'discreet-cards') {
            sectionContent = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${items.map(s => renderDiscreetCard(s)).join('')}
            </div>`;
        } else {
            sectionContent = `<div class="flex flex-col gap-3.5">
                ${items.map(s => renderCompactRow(s)).join('')}
            </div>`;
        }

        html += `
        <div class="w-full flex flex-col gap-3.5">
            <div class="flex items-center justify-between">
                <h3 class="font-serif text-[18px] font-bold text-luxury-black">${catName}</h3>
                <span class="text-[11px] font-semibold text-neutral-gray">${items.length} ${items.length === 1 ? 'Service' : 'Services'}</span>
            </div>
            ${sectionContent}
        </div>`;
    });

    DOM.catlContainer.innerHTML = html;
}

function getAddBtnHTML(id, isSmall = false) {
    const inCart = typeof EE_CART !== 'undefined' && EE_CART.has(id);
    const sizeClass = isSmall ? "px-6 py-2 text-[12px]" : "px-7 py-2.5 text-[12px]";
    const base = `${sizeClass} rounded-xl font-bold uppercase tracking-wider transition-all shadow-subtle flex items-center justify-center gap-1 flex-shrink-0`;
    return inCart
        ? `<button onclick="toggleCart('${id}')" id="btn-${id}" class="${base} bg-[#FFF0F5] text-[#9E2A5B] border border-[#9E2A5B]/40 shadow-sm"><span class="material-symbols-outlined text-[15px]">check</span> Added</button>`
        : `<button onclick="toggleCart('${id}')" id="btn-${id}" class="${base} bg-[#9E2A5B] hover:bg-warm-brown text-white border border-[#9E2A5B]">ADD</button>`;
}


function renderVisualCard(s, isSnap = false) {
    const snapClass = isSnap ? "min-w-[290px] w-[290px] snap-start flex-shrink-0" : "w-full";
    const img = s.image || FALLBACK_IMAGE;
    const { mrp, discount } = getPricingInfo(s);
    const ratingVal = s.rating ? Number(s.rating).toFixed(1) : null;

    return `
    <div class="${snapClass} bg-white rounded-[22px] border border-muted-beige/60 p-3 shadow-card flex flex-col justify-between group hover:border-champagne-gold transition-all duration-300">
        <!-- Image Box with Bottom-Left Curved Duration Pill & Top-Right Rating Pill -->
        <div class="relative w-full h-44 rounded-[16px] bg-ivory overflow-hidden cursor-pointer" onclick="openModal('${s.id}')">
            <img src="${img}" alt="${s.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onerror="this.src='${FALLBACK_IMAGE}'" />
            
            ${s.badge ? `
            <div class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-luxury-black/80 backdrop-blur-md text-champagne-gold text-[9px] font-bold uppercase tracking-widest shadow-sm">
                ${s.badge}
            </div>` : ''}

            ${ratingVal ? `
            <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-luxury-black text-[11px] font-bold flex items-center gap-0.5 shadow-sm">
                <span class="material-symbols-outlined text-[13px] text-champagne-gold" style="font-variation-settings: 'FILL' 1;">star</span>
                <span>${ratingVal}</span>
            </div>` : ''}

            <div class="absolute bottom-0 left-0 bg-white pr-3.5 pl-2.5 py-1.5 rounded-tr-[14px] flex items-center gap-1.5 shadow-sm">
                <span class="material-symbols-outlined text-[15px] text-[#9E2A5B]">schedule</span>
                <span class="text-[11px] font-semibold text-luxury-black">${formatDuration(s.duration)}</span>
            </div>
        </div>

        <!-- Content Area -->
        <div class="pt-3.5 px-1 flex flex-col flex-grow justify-between">
            <div class="cursor-pointer" onclick="openModal('${s.id}')">
                <h4 class="font-serif text-[16px] font-bold text-luxury-black leading-snug line-clamp-2">${s.name}</h4>
                ${s.desc ? `<p class="text-[11px] text-neutral-gray mt-1 line-clamp-1">${s.desc}</p>` : ''}
                <!-- Price + Strikethrough + Green Discount -->
                <div class="flex items-center gap-2 mt-2.5">
                    <span class="text-[16px] font-bold text-luxury-black">₹${Number(s.price).toLocaleString('en-IN')}</span>
                    ${discount > 0 ? `
                    <span class="text-[13px] text-neutral-gray line-through font-medium">₹${mrp.toLocaleString('en-IN')}</span>
                    <span class="flex items-center gap-0.5 text-[12px] font-bold text-[#2E8B57] ml-0.5">
                        <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">verified</span>
                        ${discount}% OFF
                    </span>` : ''}
                </div>
            </div>

            <!-- Dashed Divider + VIEW DETAILS & ADD -->
            <div class="mt-3.5 pt-3 border-t border-dashed border-muted-beige/90 flex items-center justify-between">
                <button onclick="openModal('${s.id}')" class="text-[12px] font-bold uppercase tracking-wider text-[#9E2A5B] hover:text-warm-brown transition-colors">
                    VIEW DETAILS
                </button>
                ${getAddBtnHTML(s.id, true)}
            </div>
        </div>
    </div>`;
}

function renderHeroCard(s) {
    return renderVisualCard(s, false);
}

function renderCompactRow(s) {
    const { mrp, discount } = getPricingInfo(s);
    const ratingVal = s.rating ? Number(s.rating).toFixed(1) : null;

    return `
    <div class="p-4 bg-white rounded-[20px] border border-muted-beige/60 shadow-subtle flex flex-col gap-3 hover:border-champagne-gold transition-colors">
        <div class="flex justify-between items-start gap-3 cursor-pointer" onclick="openModal('${s.id}')">
            <div class="flex flex-col flex-grow">
                <div class="flex items-center gap-2 mb-1.5">
                    <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ivory text-luxury-black text-[10px] font-semibold w-fit">
                        <span class="material-symbols-outlined text-[13px] text-[#9E2A5B]">schedule</span> ${formatDuration(s.duration)}
                    </div>
                    ${ratingVal ? `
                    <div class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-ivory text-luxury-black text-[10px] font-bold">
                        <span class="material-symbols-outlined text-[12px] text-champagne-gold" style="font-variation-settings: 'FILL' 1;">star</span> ${ratingVal}
                    </div>` : ''}
                </div>
                <h4 class="font-serif text-[15px] font-bold text-luxury-black leading-snug">${s.name}</h4>
                ${s.desc ? `<p class="text-[11px] text-neutral-gray mt-0.5 line-clamp-1">${s.desc}</p>` : ''}
                <div class="flex items-center gap-2 mt-2">
                    <span class="text-[15px] font-bold text-luxury-black">₹${Number(s.price).toLocaleString('en-IN')}</span>
                    ${discount > 0 ? `
                    <span class="text-[12px] text-neutral-gray line-through">₹${mrp.toLocaleString('en-IN')}</span>
                    <span class="text-[11px] font-bold text-[#2E8B57]">${discount}% OFF</span>` : ''}
                </div>
            </div>
        </div>
        <div class="pt-2.5 border-t border-dashed border-muted-beige/80 flex items-center justify-between">
            <button onclick="openModal('${s.id}')" class="text-[11px] font-bold uppercase tracking-wider text-[#9E2A5B]">
                VIEW DETAILS
            </button>
            ${getAddBtnHTML(s.id, true)}
        </div>
    </div>`;
}

function renderDiscreetCard(s) {
    return renderCompactRow(s);
}

window.toggleCart = async function (id) {
    if (typeof EE_CART === 'undefined') return;
    EE_CART.toggle(id);

    const btn = document.getElementById(`btn-${id}`);
    if (btn) {
        const isSmall = btn.classList.contains('px-6');
        btn.outerHTML = getAddBtnHTML(id, isSmall);
    }

    if (DOM.mBookBtn && DOM.mBookBtn.dataset.currentId === String(id)) {
        updateModalBookBtn(id);
    }

    updateBookingBar();

    // Sync Cart to Firebase Realtime Database (RTDB) alongside LocalStorage
    const uid = localStorage.getItem('ee_user_uid');
    if (uid) {
        try {
            const { rtdb, ref, update } = await import("./firebase-client.js");
            await update(ref(rtdb, `users/${uid}`), {
                cart: Array.from(EE_CART.items).map(String),
                cartUpdatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn("Service page cart RTDB sync warning:", e);
        }
    }
};


function showServiceToast(msg) {
    const toast = document.getElementById('serviceToast');
    const toastMsg = document.getElementById('serviceToastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.innerText = msg;
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('flex');
    }, 2000);
}

// Wishlist Check & Toggle (Syncs with LocalStorage + RTDB User Account)
function isServiceWishlisted(serviceName) {
    if (typeof EE_STORAGE === 'undefined' || !EE_STORAGE.getWishlist) return false;
    const list = EE_STORAGE.getWishlist();
    return Array.isArray(list) && list.includes(serviceName);
}

function updateModalWishlistUI(serviceName) {
    if (!DOM.mWishlistBtn || !DOM.mWishlistIcon) return;
    const liked = isServiceWishlisted(serviceName);
    if (liked) {
        DOM.mWishlistBtn.className = "w-11 h-11 rounded-full bg-muted-rose/10 border border-muted-rose/40 shadow-subtle flex items-center justify-center text-[#E11D48] transition-all active:scale-90 flex-shrink-0 mt-1";
        DOM.mWishlistIcon.style.fontVariationSettings = "'FILL' 1";
    } else {
        DOM.mWishlistBtn.className = "w-11 h-11 rounded-full bg-white border border-muted-beige/80 shadow-subtle flex items-center justify-center text-neutral-gray hover:border-muted-rose transition-all active:scale-90 flex-shrink-0 mt-1";
        DOM.mWishlistIcon.style.fontVariationSettings = "'FILL' 0";
    }
}

async function toggleServiceWishlist(serviceName) {
    if (!serviceName || typeof EE_STORAGE === 'undefined') return;
    const list = EE_STORAGE.getWishlist() || [];
    const idx = list.indexOf(serviceName);
    let added = false;

    if (idx >= 0) {
        list.splice(idx, 1);
        showServiceToast("Removed from wishlist");
    } else {
        list.push(serviceName);
        added = true;
        showServiceToast("Saved to your wishlist ❤️");
    }

    EE_STORAGE.setWishlist(list);
    updateModalWishlistUI(serviceName);

    // Sync with Firebase Realtime Database if user is logged in
    const uid = EE_STORAGE.getProfile().uid;
    if (uid) {
        try {
            const { rtdb, ref, update } = await import("./firebase-client.js");
            await update(ref(rtdb, `users/${uid}`), { wishlist: list });
        } catch (e) {
            console.warn("Wishlist RTDB sync warning:", e);
        }
    }
}

function updateBookingBar() {
    if (!DOM.bookingBar || typeof EE_CART === 'undefined') return;
    const count = EE_CART.getCount();

    if (count > 0) {
        DOM.cartCount.innerText = count;
        if (DOM.cartServiceWord) {
            DOM.cartServiceWord.innerText = count === 1 ? 'service' : 'services';
        }
        DOM.cartTotal.innerText = EE_CART.getTotal().toLocaleString('en-IN');

        // Pick the latest added service to show its circular photo & category in the green bar
        const cartIds = Array.from(EE_CART.items);
        const lastId = cartIds[cartIds.length - 1];
        const lastService = SERVICES.find(x => String(x.id) === String(lastId));

        if (lastService) {
            if (DOM.cartBarImg && lastService.image) {
                DOM.cartBarImg.src = lastService.image;
            }
            if (DOM.cartBarCategory) {
                DOM.cartBarCategory.innerText = lastService.category || "Salon For Women";
            }
        }

        DOM.bookingBar.classList.remove('booking-hidden', 'translate-y-full');
        DOM.bookingBar.classList.add('booking-visible');
    } else {
        DOM.bookingBar.classList.remove('booking-visible');
        DOM.bookingBar.classList.add('booking-hidden', 'translate-y-full');
    }
}

// Helper: Extract multiple images array for the modal slider
function getServiceImagesList(s) {
    const imgs = [];
    if (Array.isArray(s.images)) {
        s.images.forEach(u => { if (u && String(u).trim()) imgs.push(String(u).trim()); });
    } else if (typeof s.images === 'string' && s.images.trim()) {
        s.images.split(',').forEach(u => { if (u && u.trim()) imgs.push(u.trim()); });
    }
    if (s.image && String(s.image).trim()) {
        String(s.image).split(',').forEach(u => {
            const clean = u.trim();
            if (clean && !imgs.includes(clean)) imgs.unshift(clean);
        });
    }
    return imgs;
}

window.scrollModalSliderTo = function (index) {
    if (!DOM.mImageSlider) return;
    const width = DOM.mImageSlider.clientWidth;
    DOM.mImageSlider.scrollTo({ left: width * index, behavior: 'smooth' });
};

window.openModal = function (id) {
    const s = SERVICES.find(x => String(x.id) === String(id));
    if (!s || !DOM.modal) return;

    // 100% Guaranteed Track recently viewed in LocalStorage on Pop-up Open
    try {
        const targetId = String(s.id);
        let viewed = JSON.parse(localStorage.getItem('ee_recent_viewed')) || [];
        if (!Array.isArray(viewed)) viewed = [];
        
        // Remove duplicate if already exists, then push to top
        viewed = viewed.filter(x => String(x) !== targetId);
        viewed.unshift(targetId);
        
        if (viewed.length > 20) viewed = viewed.slice(0, 20);
        localStorage.setItem('ee_recent_viewed', JSON.stringify(viewed));
        
        // Trigger storage event for live sync
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.warn("Recent view track error:", e);
    }

    const { mrp, discount } = getPricingInfo(s);

    // 1. Swipeable Image Slider & Dots (Full 16:9 Aspect Ratio)
    const imagesList = getServiceImagesList(s);
  if (imagesList.length > 0 && DOM.mImageSlider) {
        DOM.mImageCont.classList.remove('hidden');
        DOM.mImageSlider.innerHTML = imagesList.map((imgUrl, idx) => `
            <div class="w-full aspect-video flex-shrink-0 snap-center relative">
                <img src="${imgUrl}" alt="${s.name} ${idx + 1}" class="w-full h-full object-cover" onerror="this.src='${FALLBACK_IMAGE}'" />
            </div>
        `).join('');


        if (DOM.mSliderDots) {
            if (imagesList.length > 1) {
                DOM.mSliderDots.classList.remove('hidden');
                DOM.mSliderDots.classList.add('flex');
                DOM.mSliderDots.innerHTML = imagesList.map((_, idx) => `
                    <button type="button" onclick="scrollModalSliderTo(${idx})" class="modal-slider-dot h-1.5 rounded-full transition-all ${idx === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}"></button>
                `).join('');

                DOM.mImageSlider.onscroll = () => {
                    const slideIdx = Math.round(DOM.mImageSlider.scrollLeft / (DOM.mImageSlider.clientWidth || 1));
                    const dots = DOM.mSliderDots.querySelectorAll('.modal-slider-dot');
                    dots.forEach((d, i) => {
                        d.className = `modal-slider-dot h-1.5 rounded-full transition-all ${i === slideIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`;
                    });
                };
            } else {
                DOM.mSliderDots.classList.add('hidden');
                DOM.mSliderDots.classList.remove('flex');
            }
        }
        DOM.mImageSlider.scrollLeft = 0;
    } else {
        DOM.mImageCont.classList.add('hidden');
    }

    if (DOM.mBadge) {
        if (s.badge) {
            DOM.mBadge.innerText = s.badge;
            DOM.mBadge.classList.remove('hidden');
        } else {
            DOM.mBadge.classList.add('hidden');
        }
    }

    // 2. Title, Category, Duration & Wishlist Heart Button
    DOM.mCat.innerText = s.category || 'Luxury Service';
    DOM.mTitle.innerText = s.name || '';
    DOM.mDur.innerText = formatDuration(s.duration);

    updateModalWishlistUI(s.name);
    if (DOM.mWishlistBtn) {
        DOM.mWishlistBtn.onclick = () => toggleServiceWishlist(s.name);
    }

    // 3. Rating Points & Reviews Count
    if (s.rating && Number(s.rating) > 0) {
        DOM.mRatCont.classList.remove('hidden');
        DOM.mRatCont.classList.add('flex');
        DOM.mRat.innerText = Number(s.rating).toFixed(1);
        if (DOM.mRevCount) {
            DOM.mRevCount.innerText = s.reviewsCount ? `(${s.reviewsCount})` : '';
        }
    } else {
        DOM.mRatCont.classList.add('hidden');
        DOM.mRatCont.classList.remove('flex');
    }

    // 4. Description
    DOM.mDesc.innerText = s.desc || 'Experience a relaxing, hygienic doorstep salon ritual crafted by our verified beauty professionals.';

    // 5. Highlights (Brand / Products Used & Ideal For)
    if (DOM.mHighlightsSec) {
        const hasBrand = !!(s.brand && s.brand.trim());
        const hasIdeal = !!(s.idealFor && s.idealFor.trim());

        if (hasBrand || hasIdeal) {
            DOM.mHighlightsSec.classList.remove('hidden');
            if (DOM.mBrandBox && DOM.mBrandText) {
                if (hasBrand) {
                    DOM.mBrandText.innerText = s.brand;
                    DOM.mBrandBox.classList.remove('hidden');
                } else {
                    DOM.mBrandBox.classList.add('hidden');
                }
            }
            if (DOM.mIdealBox && DOM.mIdealText) {
                if (hasIdeal) {
                    DOM.mIdealText.innerText = s.idealFor;
                    DOM.mIdealBox.classList.remove('hidden');
                } else {
                    DOM.mIdealBox.classList.add('hidden');
                }
            }
        } else {
            DOM.mHighlightsSec.classList.add('hidden');
        }
    }

    // 6. What's Included
    const includesList = Array.isArray(s.includes) ? s.includes.filter(Boolean) : [];
    if (includesList.length > 0) {
        if (DOM.mIncSec) DOM.mIncSec.classList.remove('hidden');
        DOM.mInc.innerHTML = includesList.map(inc => `
            <li class="flex items-start gap-2.5">
                <span class="material-symbols-outlined text-[16px] text-sage-green mt-0.5">check_circle</span>
                <span class="text-[12px] font-medium text-luxury-black leading-relaxed">${inc}</span>
            </li>
        `).join('');
    } else {
        if (DOM.mIncSec) DOM.mIncSec.classList.add('hidden');
        DOM.mInc.innerHTML = '';
    }

       // 7. Treatment Steps / Procedure (Numbered 01, 02 style like reference screenshot)
    if (DOM.mStepsSec && DOM.mStepsList) {
        const stepsList = Array.isArray(s.steps) ? s.steps.filter(Boolean) : [];
        if (stepsList.length > 0) {
            DOM.mStepsSec.classList.remove('hidden');
            DOM.mStepsList.innerHTML = stepsList.map((step, idx) => {
                const numStr = String(idx + 1).padStart(2, '0');
                return `
                <div class="flex flex-col gap-0.5">
                    <span class="text-[12px] font-extrabold text-dusty-rose tracking-wider">${numStr}</span>
                    <span class="text-[13px] font-bold text-luxury-black leading-snug">${step}</span>
                </div>`;
            }).join('');
        } else {
            DOM.mStepsSec.classList.add('hidden');
            DOM.mStepsList.innerHTML = '';
        }
    }

    // 8. Safety / Aftercare Note
    if (DOM.mNoteSec && DOM.mNoteText) {
        if (s.note && s.note.trim()) {
            DOM.mNoteText.innerText = s.note;
            DOM.mNoteSec.classList.remove('hidden');
        } else {
            DOM.mNoteSec.classList.add('hidden');
        }
    }

    // 9. Price, MRP & Discount in Sticky Top Header
    DOM.mPrice.innerText = `₹${Number(s.price).toLocaleString('en-IN')}`;
    if (DOM.mMrp && DOM.mDiscount) {
        if (discount > 0) {
            DOM.mMrp.innerText = `₹${mrp.toLocaleString('en-IN')}`;
            DOM.mDiscount.innerText = `• ${discount}% OFF`;
        } else {
            DOM.mMrp.innerText = '';
            DOM.mDiscount.innerText = '';
        }
    }

    DOM.mBookBtn.dataset.currentId = String(id);
    updateModalBookBtn(id);

    // Clicking ADD inside popup adds to cart and immediately closes the popup!
    DOM.mBookBtn.onclick = () => {
        if (!EE_CART.has(id)) {
            toggleCart(id);
        } else {
            toggleCart(id);
        }
        window.closeModal();
    };

    // Hide Green Cart Bar while Popup is Open
    if (DOM.bookingBar) {
        DOM.bookingBar.classList.add('booking-hidden', 'translate-y-full');
    }

    // Reset scroll position of modal to top so image shows first
    const scrollCont = document.getElementById('modalScrollContainer');
    if (scrollCont) scrollCont.scrollTop = 0;

    // Animate Modal Open
    DOM.scrim.classList.remove('hidden');
    DOM.modal.classList.remove('translate-y-full');
    setTimeout(() => { DOM.scrim.classList.remove('opacity-0'); }, 10);
    document.body.style.overflow = 'hidden';
};

function updateModalBookBtn(id) {
    if (!DOM.mBookBtn || typeof EE_CART === 'undefined') return;
    const inCart = EE_CART.has(id);
    DOM.mBookBtn.innerHTML = inCart ? '✓ ADDED' : 'ADD';
    DOM.mBookBtn.className = inCart
        ? 'h-10 px-5 rounded-xl bg-[#FFF0F5] text-[#9E2A5B] border border-[#9E2A5B]/40 text-[12px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center'
        : 'h-10 px-6 rounded-xl bg-[#A6264C] hover:bg-warm-brown text-white text-[13px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center';
}


window.closeModal = function () {
    if (!DOM.scrim || !DOM.modal) return;
    DOM.scrim.classList.add('opacity-0');
    DOM.modal.classList.add('translate-y-full');
    setTimeout(() => {
        DOM.scrim.classList.add('hidden');
        document.body.style.overflow = '';
        // Show sleek Green Cart Bar on Service Page after popup closes
        updateBookingBar();
    }, 300);
};

// Bootstrap & Sync from Realtime Database on Page Load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('categoryContainer')) {
        init();
        updateBookingBar();
    }
    syncCatalogueFromFirestore();
});