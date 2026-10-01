document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchPageInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const recentSec = document.getElementById('recentSearchesSection');
    const recentList = document.getElementById('recentSearchesList');
    const suggSec = document.getElementById('suggestionsSection');
    const suggList = document.getElementById('suggestionsList');
    const resSec = document.getElementById('resultsSection');
    const resList = document.getElementById('resultsList');
    const resHeading = document.getElementById('resultsHeading');
    const emptyState = document.getElementById('searchEmptyState');

    let allServices = [];
    try {
        allServices = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
    } catch (e) {
        allServices = [];
    }

    // ऑटो-फ़ोकस
    setTimeout(() => {
        if (input) {
            input.focus();
            input.click();
        }
    }, 150);

    // ==================== 1. CART LOGIC ====================
    function getCartIds() {
        try {
            if (typeof EE_STORAGE !== 'undefined' && EE_STORAGE.getCart) {
                return (EE_STORAGE.getCart() || []).map(String);
            }
            const raw = JSON.parse(localStorage.getItem('ee_cart')) || [];
            return Array.isArray(raw) ? raw.map(String) : [];
        } catch (e) { return []; }
    }

    async function toggleSearchCart(id) {
        const idStr = String(id);
        
        if (typeof EE_CART !== 'undefined' && EE_CART.toggle) {
            EE_CART.toggle(idStr);
        } else {
            const cartIds = getCartIds();
            const idx = cartIds.indexOf(idStr);
            if (idx >= 0) {
                cartIds.splice(idx, 1);
            } else {
                cartIds.push(idStr);
            }
            if (typeof EE_STORAGE !== 'undefined' && EE_STORAGE.setCart) {
                EE_STORAGE.setCart(cartIds);
            } else {
                localStorage.setItem('ee_cart', JSON.stringify(cartIds));
            }
        }

        const currentCart = getCartIds();
        const uid = localStorage.getItem('ee_user_uid');
        if (uid) {
            try {
                const { rtdb, ref, update } = await import("./firebase-client.js");
                await update(ref(rtdb, `users/${uid}`), {
                    cart: currentCart,
                    cartUpdatedAt: new Date().toISOString()
                });
            } catch (e) {}
        }

        renderResults(input.value.trim());
        updateSearchCartBar();
    }
    window.toggleSearchCart = toggleSearchCart;

    window.openServiceModalFromSearch = function(serviceId, serviceName) {
        saveRecentSearch(serviceName);
        window.location.href = `service.html?openModal=${encodeURIComponent(serviceId)}`;
    };

    function updateSearchCartBar() {
        const bar = document.getElementById('searchBookingBar');
        if (!bar) return;
        const cartIds = getCartIds();
        if (cartIds.length > 0) {
            let total = 0;
            let lastService = null;
            cartIds.forEach(id => {
                const found = allServices.find(s => String(s.id) === String(id));
                if (found) {
                    total += (Number(found.price) || 0);
                    lastService = found;
                }
            });

            const countEl = document.getElementById('searchCartCount');
            const wordEl = document.getElementById('searchCartServiceWord');
            const totalEl = document.getElementById('searchCartTotal');
            if (countEl) countEl.innerText = cartIds.length;
            if (wordEl) wordEl.innerText = cartIds.length === 1 ? 'service' : 'services';
            if (totalEl) totalEl.innerText = total.toLocaleString('en-IN');

            if (lastService) {
                const img = lastService.image || (Array.isArray(lastService.images) ? lastService.images[0] : '');
                const imgEl = document.getElementById('searchCartBarImg');
                const catEl = document.getElementById('searchCartBarCategory');
                if (imgEl && img) imgEl.src = img;
                if (catEl) catEl.innerText = lastService.category || "Salon For Women";
            }
            bar.classList.remove('hidden');
        } else {
            bar.classList.add('hidden');
        }
    }
    updateSearchCartBar();

    // ==================== 2. RECENT SEARCHES ====================
    function getRecentSearches() {
        try {
            return JSON.parse(localStorage.getItem('ee_recent_searches')) || [];
        } catch (e) { return []; }
    }

    function saveRecentSearch(query) {
        const q = (query || '').trim();
        if (!q) return;
        let list = getRecentSearches().filter(x => x.toLowerCase() !== q.toLowerCase());
        list.unshift(q);
        if (list.length > 8) list = list.slice(0, 8);
        localStorage.setItem('ee_recent_searches', JSON.stringify(list));
    }

    window.clearRecentSearches = function() {
        localStorage.removeItem('ee_recent_searches');
        renderRecentSearches();
    };

    function renderRecentSearches() {
        const list = getRecentSearches();
        if (!recentSec || !recentList) return;
        if (list.length === 0) {
            recentSec.classList.add('hidden');
            return;
        }
        recentSec.classList.remove('hidden');
        recentList.innerHTML = list.map(item => {
            const safeItem = item.replace(/'/g, "\\'");
            return `
            <button onclick="applySearchQuery('${safeItem}')" type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-muted-beige/60 shadow-subtle text-[11px] font-semibold text-luxury-black hover:border-warm-brown transition-colors">
                <span class="material-symbols-outlined text-[14px] text-neutral-gray">history</span>
                <span>${item}</span>
            </button>`;
        }).join('');
    }

    window.applySearchQuery = function(query) {
        input.value = query;
        triggerSearch(query);
    };

    // ==================== 3. SEARCH ENGINE ====================
    let currentMatchedList = [];

    function triggerSearch(rawVal) {
        const query = (rawVal || '').trim().toLowerCase();
        if (!query) {
            currentMatchedList = [];
            if (clearBtn) clearBtn.classList.add('hidden');
            if (suggSec) suggSec.classList.add('hidden');
            if (resSec) resSec.classList.add('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            renderRecentSearches();
            return;
        }

        if (clearBtn) clearBtn.classList.remove('hidden');
        if (recentSec) recentSec.classList.add('hidden');

        currentMatchedList = allServices.filter(s => {
            const name = (s.name || '').toLowerCase();
            const cat = (s.category || '').toLowerCase();
            const desc = (s.desc || s.description || '').toLowerCase();
            return name.includes(query) || cat.includes(query) || desc.includes(query);
        });

        if (currentMatchedList.length === 0) {
            if (suggSec) suggSec.classList.add('hidden');
            if (resSec) resSec.classList.add('hidden');
            if (emptyState) {
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
            }
            return;
        }

        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
        }

        // 1. Suggestions List Render
        if (suggSec && suggList) {
            suggSec.classList.remove('hidden');
            suggList.innerHTML = currentMatchedList.slice(0, 5).map(s => {
                const sImg = s.image || (Array.isArray(s.images) ? s.images[0] : '');
                const safeName = (s.name || '').replace(/'/g, "\\'");
                const regex = new RegExp(`(${query})`, 'gi');
                const highlighted = s.name.replace(regex, '<span class="text-luxury-black font-extrabold">$1</span>');

                return `
                <div onclick="openServiceModalFromSearch('${s.id}', '${safeName}')"
                    class="flex items-center gap-3 p-3 hover:bg-ivory/50 transition-colors cursor-pointer group">
                    <div class="w-10 h-10 rounded-xl bg-ivory border border-muted-beige/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        ${sImg ? `<img src="${sImg}" alt="${s.name}" class="w-full h-full object-cover" />` : `<span class="material-symbols-outlined text-[20px] text-warm-brown">spa</span>`}
                    </div>
                    <div class="flex flex-col min-w-0 flex-grow">
                        <span class="text-[13px] text-neutral-600 truncate">${highlighted}</span>
                    </div>
                    <span class="material-symbols-outlined text-[16px] text-neutral-gray group-hover:text-warm-brown -rotate-45">arrow_upward</span>
                </div>`;
            }).join('');
        }

        // 2. Top Results Cards Render
        renderResults(query, currentMatchedList);
    }

    function renderResults(query, preFiltered) {
        const q = (query || input.value || '').trim().toLowerCase();
        if (!q) return;

        const matched = preFiltered || currentMatchedList;
        if (!matched || matched.length === 0 || !resSec || !resList) return;

        const cartIds = getCartIds();
        resSec.classList.remove('hidden');
        if (resHeading) resHeading.innerText = `Top results for "${input.value.trim()}"`;

        resList.innerHTML = matched.map(s => {
            const sImg = s.image || (Array.isArray(s.images) ? s.images[0] : '');
            const inCart = cartIds.includes(String(s.id));
            const price = Number(s.price) || 0;
            const mrp = Number(s.mrp) || Math.round(price * 1.35);
            const safeName = (s.name || '').replace(/'/g, "\\'");

            return `
            <div class="p-3 bg-white rounded-2xl border border-muted-beige/60 shadow-subtle flex items-center justify-between gap-3 group hover:border-champagne-gold transition-all">
                <div class="flex items-center gap-3 min-w-0 cursor-pointer flex-grow" onclick="openServiceModalFromSearch('${s.id}', '${safeName}')">
                    <div class="w-14 h-14 rounded-xl bg-ivory border border-muted-beige/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        ${sImg ? `<img src="${sImg}" alt="${s.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />` : `<span class="material-symbols-outlined text-[24px] text-warm-brown">spa</span>`}
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-[13px] font-bold text-luxury-black truncate group-hover:text-warm-brown transition-colors">${s.name}</span>
                        <span class="text-[10px] text-neutral-gray font-medium flex items-center gap-1 mt-0.5">
                            <span class="material-symbols-outlined text-[13px] text-muted-rose">schedule</span> ${s.duration || 60} mins
                        </span>
                        <div class="flex items-baseline gap-1.5 mt-1">
                            <span class="text-[13px] font-extrabold text-luxury-black">₹${price.toLocaleString('en-IN')}</span>
                            ${mrp > price ? `<span class="text-[10px] text-neutral-gray line-through">₹${mrp.toLocaleString('en-IN')}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button type="button" onclick="event.stopPropagation(); toggleSearchCart('${s.id}')"
                    class="h-8 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center flex-shrink-0 ${
                        inCart
                            ? 'bg-[#FFF0F5] text-[#9E2A5B] border border-[#9E2A5B]/40 shadow-sm'
                            : 'bg-[#9E2A5B] text-white hover:bg-warm-brown shadow-subtle'
                    }">
                    ${inCart ? '✓ Added' : 'ADD'}
                </button>
            </div>`;
        }).join('');
    }

    window.clearSearchInput = function() {
        if (!input) return;
        input.value = '';
        input.focus();
        triggerSearch('');
    };

    if (input) {
        input.addEventListener('input', (e) => {
            triggerSearch(e.target.value);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = input.value.trim();
                if (val) {
                    saveRecentSearch(val);
                    if (currentMatchedList.length > 0) {
                        const topMatch = currentMatchedList[0];
                        window.location.href = `service.html?openModal=${encodeURIComponent(topMatch.id)}`;
                    }
                }
                input.blur();
            }
        });
    }

    renderRecentSearches();
});
