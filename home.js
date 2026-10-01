document.addEventListener('DOMContentLoaded', () => {
    let autoPlayInterval = null;
    let currentIndex = 0;

    // Update Header Location Pill if user has saved a District in Account
    try {
        const savedDistrict = localStorage.getItem('ee_user_district');
        const locSpan = document.querySelector('#mainHeader .sm\\:flex span:last-child');
        if (savedDistrict && locSpan) {
            locSpan.innerText = savedDistrict;
        }
    } catch (e) {}

    // ==================== 1. HERO CAROUSEL CONTROLLER ====================
    function initHeroCarousel() {
        const track = document.getElementById('carouselTrack');
        const container = document.getElementById('heroCarousel');
        const dots = document.querySelectorAll('.carousel-dot');
        if (!track || !container || !dots.length) return;

        const totalSlides = dots.length;
        currentIndex = 0;
        let startX = 0;
        let isDragging = false;

        function updateSlide(index) {
            currentIndex = (index + totalSlides) % totalSlides;
            track.style.transform = `translateX(-${currentIndex * 100}%)`;

            dots.forEach((dot, idx) => {
                if (idx === currentIndex) {
                    dot.classList.remove('bg-white/50', 'w-1.5');
                    dot.classList.add('bg-white', 'w-4');
                } else {
                    dot.classList.remove('bg-white', 'w-4');
                    dot.classList.add('bg-white/50', 'w-1.5');
                }
            });
        }

        function startAutoPlay() {
            stopAutoPlay();
            if (totalSlides <= 1) return;
            autoPlayInterval = setInterval(() => {
                updateSlide(currentIndex + 1);
            }, 4000);
        }

        function stopAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
        }

        dots.forEach((dot) => {
            dot.onclick = () => {
                const index = parseInt(dot.getAttribute('data-index'), 10);
                updateSlide(index);
                startAutoPlay();
            };
        });

        container.ontouchstart = (e) => {
            stopAutoPlay();
            startX = e.touches[0].clientX;
            isDragging = true;
        };

        container.ontouchend = (e) => {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.changedTouches[0].clientX;
            const diffX = endX - startX;
            if (diffX < -35) {
                updateSlide(currentIndex + 1);
            } else if (diffX > 35) {
                updateSlide(currentIndex - 1);
            }
            startAutoPlay();
        };

        container.onmouseenter = stopAutoPlay;
        container.onmouseleave = startAutoPlay;

        updateSlide(0);
        startAutoPlay();
    }

    // ==================== 2. HEADER & BOTTOM NAV SCROLL EFFECT ====================
    const bottomNav = document.getElementById('bottomNav');
    const mainHeader = document.getElementById('mainHeader');
    const brandTitleText = document.getElementById('brandTitleText');
    const brandSubText = document.getElementById('brandSubText');
    const headerBrandText = document.getElementById('headerBrandText');
    const headerSearchBox = document.getElementById('headerSearchBox');
    const mainSearchContainer = document.getElementById('mainSearchContainer');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (headerBrandText && headerSearchBox) {
            if (currentScrollY > 65) {
                if (mainHeader) {
                    mainHeader.classList.remove('bg-transparent', 'border-transparent');
                    mainHeader.classList.add('bg-warm-white/95', 'backdrop-blur-md', 'border-muted-beige/60', 'shadow-subtle');
                }
                if (brandTitleText) {
                    brandTitleText.classList.remove('text-white', 'drop-shadow-sm');
                    brandTitleText.classList.add('text-luxury-black');
                }
                if (brandSubText) {
                    brandSubText.classList.remove('text-soft-gold', 'drop-shadow-sm');
                    brandSubText.classList.add('text-champagne-gold');
                }

                headerBrandText.classList.add('opacity-0', '-translate-y-2', 'pointer-events-none');
                headerBrandText.classList.remove('opacity-100', 'translate-y-0');

                headerSearchBox.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
                headerSearchBox.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
                if (mainSearchContainer) mainSearchContainer.classList.add('opacity-0', 'pointer-events-none');
            } else {
                if (mainHeader) {
                    mainHeader.classList.add('bg-transparent', 'border-transparent');
                    mainHeader.classList.remove('bg-warm-white/95', 'backdrop-blur-md', 'border-muted-beige/60', 'shadow-subtle');
                }
                if (brandTitleText) {
                    brandTitleText.classList.add('text-white', 'drop-shadow-sm');
                    brandTitleText.classList.remove('text-luxury-black');
                }
                if (brandSubText) {
                    brandSubText.classList.add('text-soft-gold', 'drop-shadow-sm');
                    brandSubText.classList.remove('text-champagne-gold');
                }

                headerBrandText.classList.remove('opacity-0', '-translate-y-2', 'pointer-events-none');
                headerBrandText.classList.add('opacity-100', 'translate-y-0');

                headerSearchBox.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
                headerSearchBox.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                if (mainSearchContainer) mainSearchContainer.classList.remove('opacity-0', 'pointer-events-none');
            }
        }

        const homeBookingBar = document.getElementById('homeBookingBar');

        if (bottomNav) {
            if (currentScrollY <= 10) {
                bottomNav.classList.remove('translate-y-full');
                if (homeBookingBar) homeBookingBar.classList.remove('nav-hidden-shift');
                lastScrollY = currentScrollY;
                return;
            }
            if (Math.abs(currentScrollY - lastScrollY) > 5) {
                if (currentScrollY > lastScrollY) {
                    bottomNav.classList.add('translate-y-full');
                    if (homeBookingBar) homeBookingBar.classList.add('nav-hidden-shift');
                } else {
                    bottomNav.classList.remove('translate-y-full');
                    if (homeBookingBar) homeBookingBar.classList.remove('nav-hidden-shift');
                }
                lastScrollY = currentScrollY;
            }
        }
    }, { passive: true });

    // ==================== 3. HOME GREEN CART BAR, TIME FORMATTER & SYNC ====================
    let homeServicesList = [];

    function formatHomeDuration(mins) {
        const m = parseInt(mins, 10) || 60;
        const hrs = Math.floor(m / 60);
        const rem = m % 60;
        if (hrs > 0 && rem > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${rem} mins`;
        if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
        return `${rem} mins`;
    }

    function getCartIds() {
        try {
            if (typeof EE_STORAGE !== 'undefined' && EE_STORAGE.getCart) {
                return (EE_STORAGE.getCart() || []).map(String);
            }
            const raw = JSON.parse(localStorage.getItem('ee_cart')) || [];
            return Array.isArray(raw) ? raw.map(String) : [];
        } catch (e) {
            return [];
        }
    }

    async function saveCartLocalAndRTDB(cartIds) {
        const cleanIds = [...new Set(cartIds.map(String))];
        if (typeof EE_STORAGE !== 'undefined' && EE_STORAGE.setCart) {
            EE_STORAGE.setCart(cleanIds);
        } else {
            localStorage.setItem('ee_cart', JSON.stringify(cleanIds));
        }

        const uid = localStorage.getItem('ee_user_uid');
        if (uid) {
            try {
                const { rtdb, ref, update } = await import("./firebase-client.js");
                await update(ref(rtdb, `users/${uid}`), {
                    cart: cleanIds,
                    cartUpdatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.warn("Cart RTDB background sync warning:", e);
            }
        }
    }

    function updateHomeBookingBar() {
        const bar = document.getElementById('homeBookingBar');
        if (!bar) return;

        const cartIds = getCartIds();
        const count = cartIds.length;

        if (count > 0) {
            let cachedSrvs = homeServicesList;
            if (!cachedSrvs || cachedSrvs.length === 0) {
                try {
                    cachedSrvs = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
                } catch (e) { cachedSrvs = []; }
            }

            let total = 0;
            let lastService = null;
            cartIds.forEach(id => {
                const found = cachedSrvs.find(x => String(x.id) === String(id));
                if (found) {
                    total += (Number(found.price) || 0);
                    lastService = found;
                }
            });

            const countEl = document.getElementById('homeCartCount');
            const wordEl = document.getElementById('homeCartServiceWord');
            const totalEl = document.getElementById('homeCartTotal');
            const imgEl = document.getElementById('homeCartBarImg');
            const catEl = document.getElementById('homeCartBarCategory');

            if (countEl) countEl.innerText = count;
            if (wordEl) wordEl.innerText = count === 1 ? 'service' : 'services';
            if (totalEl) totalEl.innerText = total.toLocaleString('en-IN');

            if (lastService) {
                const coverImg = lastService.squareImage || lastService.image || (Array.isArray(lastService.images) ? lastService.images[0] : '');
                if (imgEl && coverImg) imgEl.src = coverImg;
                if (catEl) catEl.innerText = lastService.category || "Salon For Women";
            }

            bar.classList.remove('booking-hidden');
            bar.classList.add('booking-visible');
        } else {
            bar.classList.remove('booking-visible');
            bar.classList.add('booking-hidden');
        }
    }

    window.quickBookFromHome = function(serviceId) {
        const cartIds = getCartIds();
        if (!cartIds.includes(String(serviceId))) {
            cartIds.push(String(serviceId));
            saveCartLocalAndRTDB(cartIds);
        }
        window.location.href = 'booking.html';
    };

    window.toggleHomeCart = function(serviceId) {
        const idStr = String(serviceId);
        const cartIds = getCartIds();
        const idx = cartIds.indexOf(idStr);

        if (idx >= 0) {
            cartIds.splice(idx, 1);
        } else {
            cartIds.push(idStr);
        }

        saveCartLocalAndRTDB(cartIds);

        // Guard: if homeServicesList isn't loaded yet, try the localStorage cache
        if (!homeServicesList || homeServicesList.length === 0) {
            try {
                homeServicesList = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
            } catch (e) { homeServicesList = []; }
        }

        renderDynamicServicesOnHome(homeServicesList);
        updateHomeBookingBar();
    };

    // ==================== 4. 100% DATABASE RENDERERS ====================

    function renderDynamicBanners(bannersList) {
        const track = document.getElementById('carouselTrack');
        const dotsContainer = document.getElementById('carouselDots');
        if (!track) return;

        if (!Array.isArray(bannersList) || bannersList.length === 0) {
            track.innerHTML = `
            <div class="carousel-slide relative h-full flex flex-col justify-end bg-deep-espresso">
              <div class="relative z-10 p-6 pb-10 flex flex-col gap-2">
                <span class="inline-block px-2.5 py-1 rounded-md bg-champagne-gold text-luxury-black text-[10px] font-bold tracking-wider uppercase w-fit">Welcome</span>
                <h2 class="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">Elegant Escape</h2>
                <p class="text-xs text-white/80 font-medium">Add promotional banners from Admin Panel to showcase here.</p>
              </div>
            </div>`;
            if (dotsContainer) dotsContainer.innerHTML = '';
            return;
        }

        track.innerHTML = bannersList.map((b) => {
            const img = b.mobileImage || b.desktopImage || "";
            const linkHref = b.url ? b.url : 'service.html';
            const clickAction = b.serviceId
                ? `onclick="quickBookFromHome('${b.serviceId}'); return false;"`
                : '';

            return `
            <a href="${linkHref}" ${clickAction} class="carousel-slide relative h-full block cursor-pointer select-none">
              ${img ? `<img src="${img}" alt="${b.title || 'Banner'}" class="w-full h-full object-cover object-center" />` : ''}
            </a>`;
        }).join('');

        if (dotsContainer) {
            dotsContainer.innerHTML = bannersList.length > 1
                ? bannersList.map((_, idx) => `<button class="carousel-dot ${idx === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/50'} h-1.5 rounded-full transition-all" data-index="${idx}" aria-label="Slide ${idx + 1}"></button>`).join('')
                : '';
        }

        initHeroCarousel();
    }

    function renderDynamicCategories(categoriesList) {
        const section = document.getElementById('homeCategoriesSection');
        const catGrid = document.getElementById('homeCategoriesGrid');
        if (!catGrid || !section) return;

        const visibleCats = (Array.isArray(categoriesList) ? categoriesList : [])
            .filter(c => c && c.active !== false && c.featured !== false);

        if (visibleCats.length === 0) {
            section.classList.add('hidden');
            catGrid.innerHTML = '';
            return;
        }

        section.classList.remove('hidden');
        const displayCats = visibleCats.slice(0, 7);

        let html = displayCats.map(c => {
            const catParam = encodeURIComponent(c.name || c.slug || 'all');
            const img = c.image || "";
            return `
            <a href="service.html?cat=${catParam}" class="flex flex-col items-center gap-2 no-underline text-inherit group">
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-[18px] overflow-hidden shadow-subtle border border-muted-beige/40 bg-ivory group-hover:shadow-card transition-all flex items-center justify-center">
                ${img
                    ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${img}" alt="${c.name}" />`
                    : `<span class="material-symbols-outlined text-[26px] text-warm-brown">spa</span>`}
              </div>
              <span class="text-[11px] font-semibold text-luxury-black tracking-wide text-center truncate w-full">${c.name}</span>
            </a>`;
        }).join('');

        html += `
        <a href="service.html?cat=all" class="flex flex-col items-center gap-2 no-underline text-inherit group">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-[18px] overflow-hidden shadow-subtle border border-muted-beige/40 bg-ivory group-hover:shadow-card transition-all flex items-center justify-center text-warm-brown bg-gradient-to-br from-ivory to-muted-beige/30">
            <span class="material-symbols-outlined text-[28px]">grid_view</span>
          </div>
          <span class="text-[11px] font-semibold text-luxury-black tracking-wide">All Services</span>
        </a>`;

        catGrid.innerHTML = html;
    }

    // ==================== RECENTLY VIEWED HANDLER (MIN 3 ITEMS) ====================
    function renderRecentlyViewedSection(allServices) {
        const sec = document.getElementById('homeRecentlyViewedSection');
        const grid = document.getElementById('homeRecentlyViewedGrid');
        if (!sec || !grid) return;

        let sList = Array.isArray(allServices) && allServices.length > 0 ? allServices : homeServicesList;
        if (!sList || sList.length === 0) {
            try {
                sList = JSON.parse(localStorage.getItem('ee_cached_services')) || [];
            } catch(e) { sList = []; }
        }

        if (!sList || sList.length === 0) {
            sec.classList.add('hidden');
            return;
        }

        // Dynamic User Title: "[Name], Look at this!"
        const titleEl = document.getElementById('homeRecentlyViewedTitle');
        if (titleEl) {
            let userName = '';
            try {
                if (typeof EE_STORAGE !== 'undefined' && EE_STORAGE.getProfile) {
                    userName = EE_STORAGE.getProfile().name || '';
                } else {
                    userName = localStorage.getItem('ee_user_name') || '';
                }
            } catch(e) {}
            const firstName = userName ? userName.trim().split(' ')[0] : '';
            titleEl.innerText = firstName ? `${firstName}, Look at this!` : 'Look at this!';
        }

        let recentIds = [];
        try {
            recentIds = JSON.parse(localStorage.getItem('ee_recent_viewed')) || [];
            if (!Array.isArray(recentIds)) recentIds = [];
        } catch(e) { recentIds = []; }

        // Fallback: Agar recent_viewed mein 3 se kam hain, to Cart aur Schedules se match karo
        if (recentIds.length < 3) {
            try {
                const cartIds = JSON.parse(localStorage.getItem('ee_cart')) || [];
                const scheds = JSON.parse(localStorage.getItem('ee_booking_schedules')) || {};
                const combined = [...new Set([...recentIds, ...cartIds, ...Object.keys(scheds)])];
                recentIds = combined.map(String);
            } catch(e) {}
        }

        // Match with Services
        const matchedItems = [];
        recentIds.forEach(id => {
            const found = sList.find(s => s && String(s.id) === String(id));
            if (found && !matchedItems.some(m => String(m.id) === String(found.id))) {
                matchedItems.push(found);
            }
        });

        // 3 Items poora karne ke liye auto-fill karo taaki layout hamesha visible rahe
        if (matchedItems.length < 3) {
            sList.forEach(s => {
                if (matchedItems.length < 3 && s && !matchedItems.some(m => String(m.id) === String(s.id))) {
                    matchedItems.push(s);
                }
            });
        }

        if (matchedItems.length < 3) {
            sec.classList.add('hidden');
            grid.innerHTML = '';
            return;
        }

        sec.classList.remove('hidden');

        grid.innerHTML = matchedItems.map(item => {
            const sqImg = item.squareImage || item.image || (Array.isArray(item.images) ? item.images[0] : '') || 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=200';
            
            return `
            <div onclick="window.location.href='service.html?q=${encodeURIComponent(item.name)}'" 
                 class="min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px] snap-start bg-white rounded-2xl border border-muted-beige/60 p-2 shadow-sm flex flex-col gap-2 cursor-pointer active:scale-95 transition-all hover:border-champagne-gold hover:shadow-card flex-shrink-0 group">
              
              <!-- 1:1 Square Picture Container -->
              <div class="relative w-full aspect-square rounded-xl bg-ivory overflow-hidden flex items-center justify-center border border-muted-beige/30">
                <img src="${sqImg}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>

              <!-- Only Name Display -->
              <span class="text-[11px] font-bold text-luxury-black truncate w-full text-center leading-tight group-hover:text-warm-brown transition-colors">
                ${item.name}
              </span>
            </div>
            `;
        }).join('');
    }

    // Shared 1:1 Square Card Builder for Homepage
    function buildSquareHomeServiceCard(s, cartIds) {
        const price = Number(s.price) || 0;
        const mrp = (s.mrp && Number(s.mrp) > price)
            ? Number(s.mrp)
            : Math.round((price * 1.35) / 50) * 50 - 1;
        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        const rating = s.rating ? Number(s.rating).toFixed(1) : null;
        const sqImg = s.squareImage || s.image || (Array.isArray(s.images) ? s.images[0] : '');
        const inCart = cartIds.includes(String(s.id));

        return `
        <div class="min-w-[155px] w-[155px] sm:min-w-[175px] sm:w-[175px] snap-start bg-white rounded-[18px] border border-muted-beige/60 p-2 shadow-subtle flex-shrink-0 flex flex-col justify-between group hover:shadow-card hover:border-champagne-gold transition-all">
          <div class="relative w-full aspect-square rounded-[14px] bg-ivory overflow-hidden cursor-pointer" onclick="window.location.href='service.html?q=${encodeURIComponent(s.name)}'">
            ${sqImg ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${sqImg}" alt="${s.name}" />` : ''}
            
            ${s.badge ? `
            <div class="absolute top-0 left-0 px-2 py-0.5 rounded-br-lg bg-neutral-700/80 backdrop-blur-md text-white text-[9px] font-bold tracking-wide shadow-sm">
              ${s.badge}
            </div>` : ''}

            ${rating ? `
            <div class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-luxury-black text-[9px] font-bold flex items-center gap-0.5 shadow-sm">
              <span class="material-symbols-outlined text-[11px] text-amber-500" style="font-variation-settings: 'FILL' 1;">star</span>
              <span>${rating}</span>
            </div>` : ''}
          </div>

          <div class="pt-2 px-0.5 flex flex-col flex-grow justify-between">
            <div class="cursor-pointer" onclick="window.location.href='service.html?q=${encodeURIComponent(s.name)}'">
              <h3 class="font-serif text-[13px] font-bold text-luxury-black line-clamp-2 leading-tight min-h-[32px]">${s.name}</h3>
              
              <div class="flex items-center gap-1 text-[10px] text-neutral-gray font-medium mt-1">
                <span class="material-symbols-outlined text-[13px] text-luxury-black/70">schedule</span>
                <span class="truncate">${formatHomeDuration(s.duration)}</span>
              </div>

              <div class="flex flex-wrap items-baseline gap-1 mt-1.5">
                <span class="text-[13px] font-extrabold text-luxury-black">₹${price.toLocaleString('en-IN')}</span>
                ${discount > 0 ? `
                <span class="text-[10px] text-neutral-gray line-through">₹${mrp.toLocaleString('en-IN')}</span>
                <span class="text-[9px] font-bold text-[#198728] pl-0.5">${discount}% OFF</span>` : ''}
              </div>
            </div>

            <button type="button" onclick="toggleHomeCart('${s.id}')"
              class="w-full h-8 mt-2.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                inCart
                  ? 'bg-[#FFF0F5] text-[#9E2A5B] border border-[#9E2A5B]/40 shadow-sm'
                  : 'bg-white hover:bg-[#9E2A5B]/5 text-[#9E2A5B] border border-[#9E2A5B]/30'
              }">
              ${inCart ? '✓ Added' : 'Add To Cart'}
            </button>
          </div>
        </div>`;
    }

    // ==================== 7 + 7 INTELLIGENT POPULAR & TRENDING LOGIC ====================
    async function getWeeklyBookingCounts() {
        try {
            // Local cache check for instant load (6 hours validity)
            const cachedCounts = JSON.parse(localStorage.getItem('ee_weekly_booking_counts'));
            const cacheTime = localStorage.getItem('ee_weekly_counts_time');
            if (cachedCounts && cacheTime && (Date.now() - Number(cacheTime) < 6 * 60 * 60 * 1000)) {
                return cachedCounts;
            }

            const { rtdb, ref, get } = await import("./firebase-client.js");
            const bookingsSnap = await get(ref(rtdb, "bookings"));
            if (!bookingsSnap.exists()) return {};

            const bookingsObj = bookingsSnap.val() || {};
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const counts = {};

            Object.values(bookingsObj).forEach(b => {
                if (!b) return;
                const bookTime = new Date(b.createdAt || 0).getTime();
                // Filter only last 7 days bookings
                if (bookTime >= oneWeekAgo) {
                    if (Array.isArray(b.items)) {
                        b.items.forEach(it => {
                            if (it && it.id) {
                                counts[String(it.id)] = (counts[String(it.id)] || 0) + 1;
                            }
                        });
                    }
                }
            });

            localStorage.setItem('ee_weekly_booking_counts', JSON.stringify(counts));
            localStorage.setItem('ee_weekly_counts_time', Date.now().toString());
            return counts;
        } catch(e) {
            return {};
        }
    }

    async function renderDynamicServicesOnHome(servicesList) {
        const popSection = document.getElementById('homePopularSection');
        const popContainer = document.getElementById('homePopularGrid');
        const trendSection = document.getElementById('homeTrendingSection');
        const trendContainer = document.getElementById('homeTrendingGrid');

        const activeServices = Array.isArray(servicesList) ? servicesList.filter(s => s && s.active !== false) : [];
        homeServicesList = activeServices;
        const cartIds = getCartIds();

        renderRecentlyViewedSection(activeServices);

        if (activeServices.length === 0) {
            if (popSection) popSection.classList.add('hidden');
            if (trendSection) trendSection.classList.add('hidden');
            updateHomeBookingBar();
            return;
        }

        // 1. POPULAR SERVICES (Top 7: Sorted by Rating, Bestseller tags & Price satisfaction)
        const popularSorted = [...activeServices].sort((a, b) => {
            const rA = parseFloat(a.rating) || 4.5;
            const rB = parseFloat(b.rating) || 4.5;
            const tagA = (a.badge && (a.badge.toLowerCase().includes('bestseller') || a.badge.toLowerCase().includes('popular'))) ? 1 : 0;
            const tagB = (b.badge && (b.badge.toLowerCase().includes('bestseller') || b.badge.toLowerCase().includes('popular'))) ? 1 : 0;
            return (tagB * 2 + rB) - (tagA * 2 + rA);
        });

        const popToRender = popularSorted.slice(0, 7);

        if (popSection && popContainer && popToRender.length > 0) {
            popSection.classList.remove('hidden');
            popContainer.innerHTML = popToRender.map(s => buildSquareHomeServiceCard(s, cartIds)).join('');
        }

        // 2. TRENDING SERVICES (Top 7: Sorted by Weekly Orders Velocity + De-duplication)
        const weeklyCounts = await getWeeklyBookingCounts();
        const popularIds = new Set(popToRender.map(p => String(p.id)));

        // Exclude popular items so we get completely unique trending items
        const availableForTrending = activeServices.filter(s => !popularIds.has(String(s.id)));

        const trendingSorted = availableForTrending.sort((a, b) => {
            const countA = weeklyCounts[String(a.id)] || 0;
            const countB = weeklyCounts[String(b.id)] || 0;
            if (countB !== countA) {
                return countB - countA;
            }
            // Fallback: If weekly count is equal, sort by highest discount or rating
            const discA = (a.mrp && a.price) ? ((a.mrp - a.price) / a.mrp) : 0;
            const discB = (b.mrp && b.price) ? ((b.mrp - b.price) / b.mrp) : 0;
            return discB - discA;
        });

        const trendToRender = trendingSorted.slice(0, 7);

                if (trendSection && trendContainer && trendToRender.length > 0) {
            trendSection.classList.remove('hidden');
            trendContainer.innerHTML = trendToRender.map(s => buildSquareHomeServiceCard(s, cartIds)).join('');
        }

        // 3. RANDOM SPOTLIGHT SERVICE CARD (Rotates on each reload)
        renderRandomSpotlightCard(activeServices, cartIds);

        updateHomeBookingBar();
    }

    // ==================== SPOTLIGHT SINGLE CARD RENDERER (AS PER SCREENSHOT) ====================
    function renderRandomSpotlightCard(servicesList, cartIds) {
        const sec = document.getElementById('homeSpotlightSection');
        const cardBox = document.getElementById('homeSpotlightCard');
        if (!sec || !cardBox) return;

        if (!Array.isArray(servicesList) || servicesList.length === 0) {
            sec.classList.add('hidden');
            return;
        }

        // Pick 1 random active service on every page load
        const randomIndex = Math.floor(Math.random() * servicesList.length);
        const s = servicesList[randomIndex];
        if (!s) {
            sec.classList.add('hidden');
            return;
        }

        const price = Number(s.price) || 0;
        const mrp = (s.mrp && Number(s.mrp) > price)
            ? Number(s.mrp)
            : Math.round((price * 1.35) / 50) * 50 - 1;
        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        const rating = s.rating ? Number(s.rating).toFixed(1) : "4.9";
        const badgeText = s.badge || "TOP CHOICE";
        const img = s.image || s.squareImage || (Array.isArray(s.images) ? s.images[0] : '') || 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600';
        const inCart = cartIds.includes(String(s.id));
        const durationText = formatHomeDuration(s.duration);
        const descText = s.desc || s.description || "A luxurious beauty ritual designed to deeply cleanse and rejuvenate your skin.";

        sec.classList.remove('hidden');

        cardBox.innerHTML = `
            <!-- Top Image Box (16:9 Landscape with Pills) -->
            <div class="relative w-full aspect-video rounded-[18px] bg-ivory overflow-hidden cursor-pointer" onclick="window.location.href='service.html?openModal=${encodeURIComponent(s.id)}'">
                <img src="${img}" alt="${s.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                
                <!-- Top-Left Badge -->
                <div class="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-luxury-black/85 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    ${badgeText}
                </div>

                <!-- Top-Right Rating Pill -->
                <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-luxury-black text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
                    <span class="material-symbols-outlined text-[13px] text-amber-500" style="font-variation-settings: 'FILL' 1;">star</span>
                    <span>${rating}</span>
                </div>

                <!-- Bottom-Left Duration Pill Overlaid On Image -->
                <div class="absolute bottom-0 left-0 bg-white px-3 py-1.5 rounded-tr-2xl flex items-center gap-1.5 shadow-sm">
                    <span class="material-symbols-outlined text-[14px] text-muted-rose">schedule</span>
                    <span class="text-[11px] font-bold text-luxury-black">${durationText}</span>
                </div>
            </div>

            <!-- Card Content Body -->
            <div class="pt-3 px-1 flex flex-col flex-grow">
                <div class="cursor-pointer" onclick="window.location.href='service.html?openModal=${encodeURIComponent(s.id)}'">
                    <h3 class="font-serif text-[17px] font-bold text-luxury-black leading-snug">${s.name}</h3>
                    <p class="text-[11px] text-neutral-gray mt-1 line-clamp-1">${descText}</p>
                    
                    <!-- Price, MRP & Discount -->
                    <div class="flex items-center gap-2 mt-2">
                        <span class="text-[17px] font-extrabold text-luxury-black">₹${price.toLocaleString('en-IN')}</span>
                        ${discount > 0 ? `
                        <span class="text-[12px] text-neutral-gray line-through font-medium">₹${mrp.toLocaleString('en-IN')}</span>
                        <span class="flex items-center gap-0.5 text-[11px] font-bold text-[#198728]">
                            <span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">verified</span>
                            ${discount}% OFF
                        </span>` : ''}
                    </div>
                </div>

                <!-- Bottom Row: VIEW DETAILS & ADD Button -->
                <div class="mt-3.5 pt-3 border-t border-dashed border-muted-beige/80 flex items-center justify-between">
                    <button type="button" onclick="window.location.href='service.html?openModal=${encodeURIComponent(s.id)}'" 
                        class="text-[11px] font-bold uppercase tracking-wider text-[#9E2A5B] hover:text-warm-brown transition-colors">
                        VIEW DETAILS
                    </button>
                    
                    <button type="button" onclick="toggleHomeCart('${s.id}')"
                        class="h-8 px-6 rounded-xl font-bold uppercase text-[11px] tracking-wider transition-all shadow-sm flex items-center justify-center gap-1 ${
                            inCart
                                ? 'bg-[#FFF0F5] text-[#9E2A5B] border border-[#9E2A5B]/40 shadow-sm'
                                : 'bg-[#FFF0F5] hover:bg-[#9E2A5B] text-[#9E2A5B] hover:text-white border border-[#9E2A5B]/30'
                        }">
                        ${inCart ? '✓ ADDED' : 'ADD'}
                    </button>
                </div>
            </div>
        `;
    }

    // ==================== 16:9 PROMO SECTIONS RENDERER ====================
    window.handlePromoBannerClick = function(linkType, targetValue) {
        if (linkType === 'service' && targetValue) {
            if (typeof window.quickBookFromHome === 'function') {
                window.quickBookFromHome(targetValue);
            } else {
                window.location.href = `service.html?q=${encodeURIComponent(targetValue)}`;
            }
        } else if (linkType === 'category' && targetValue) {
            window.location.href = `service.html?cat=${encodeURIComponent(targetValue)}`;
        } else if (targetValue) {
            window.location.href = targetValue;
        } else {
            // Intelligent fallback for Book Now click
            window.location.href = 'booking.html';
        }
    };

    function renderDynamicPromoSections(promoData) {
        const sections = [
            { key: 'section_1', secId: 'promoSection1', boxId: 'promoBox1' },
            { key: 'section_2', secId: 'promoSection2', boxId: 'promoBox2' },
            { key: 'section_3', secId: 'promoSection3', boxId: 'promoBox3' }
        ];

        sections.forEach(({ key, secId, boxId }) => {
            const secEl = document.getElementById(secId);
            const boxEl = document.getElementById(boxId);
            if (!secEl || !boxEl) return;

            const item = promoData && promoData[key];
            if (item && item.active !== false && item.image) {
                const targetEscaped = encodeURIComponent(item.targetValue || '');
                const hasBookNow = (item.showBookNow === true || item.showBookNow === 'true' || item.showBookNow === 1);
                const btnText = (item.btnText && item.btnText.trim()) ? item.btnText.trim() : 'Book Now';

                boxEl.classList.add('relative');

                if (hasBookNow) {
                    boxEl.innerHTML = `
                        <div class="relative w-full h-auto rounded-2xl overflow-hidden group">
                            <img src="${item.image}" alt="Promotional Offer" class="w-full h-auto block rounded-2xl transition-transform duration-500 group-hover:scale-[1.01]" />
                            <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none rounded-b-2xl"></div>
                            <div class="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 flex items-center">
                                <button type="button" 
                                    onclick="event.stopPropagation(); window.handlePromoBannerClick('${item.linkType || 'manual'}', decodeURIComponent('${targetEscaped}'))"
                                    class="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-luxury-black/90 hover:bg-black text-champagne-gold hover:text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-floating border border-champagne-gold/50 hover:border-champagne-gold backdrop-blur-md transition-all duration-300 active:scale-95 group/btn cursor-pointer">
                                    <span>${btnText}</span>
                                    <span class="material-symbols-outlined text-[15px] sm:text-[16px] text-champagne-gold group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    boxEl.innerHTML = `
                        <img src="${item.image}" alt="Promotional Offer" class="w-full h-auto block rounded-2xl transition-transform duration-500 hover:scale-[1.01]" />
                    `;
                }

                boxEl.onclick = () => window.handlePromoBannerClick(item.linkType || 'manual', decodeURIComponent(targetEscaped));
                secEl.classList.remove('hidden');
            } else {
                secEl.classList.add('hidden');
                boxEl.innerHTML = '';
                boxEl.onclick = null;
            }
        });
    }

    // ==================== OUR SIGNATURE WORK RENDERER ====================
    function renderDynamicSignatureWork(sigList) {
        const sigSection = document.getElementById('homeSignatureSection');
        const sigGrid = document.getElementById('homeSignatureGrid');
        if (!sigSection || !sigGrid) return;

        const activeSigs = Array.isArray(sigList) ? sigList.filter(w => w && w.active !== false) : [];
        if (activeSigs.length === 0) {
            sigSection.classList.add('hidden');
            sigGrid.innerHTML = '';
            return;
        }

        sigSection.classList.remove('hidden');
        const largeItem = activeSigs.find(w => w.layout === 'large') || activeSigs[0];
        const smallItems = activeSigs.filter(w => w.id !== largeItem.id).slice(0, 2);

        const getSigOnClick = (item) => {
            const type = item.linkType || 'category';
            const val = encodeURIComponent(item.targetValue || item.category || item.title || '');
            return `onclick="window.handlePromoBannerClick('${type}', decodeURIComponent('${val}'))"`;
        };

        let html = `
        <div ${getSigOnClick(largeItem)} class="col-span-1 row-span-2 relative rounded-2xl overflow-hidden group shadow-subtle cursor-pointer active:scale-[0.99] transition-transform">
          <img src="${largeItem.image}" alt="${largeItem.title}" class="w-full h-full object-cover aspect-[3/4] group-hover:scale-105 transition-transform duration-700" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          <div class="absolute bottom-3 left-3 flex flex-col pointer-events-none">
            <span class="text-[9px] font-bold tracking-widest text-white/90 uppercase mb-0.5">${largeItem.category || 'Signature'}</span>
            <span class="font-serif text-sm font-bold text-white">${largeItem.title || ''}</span>
          </div>
        </div>`;

        smallItems.forEach(item => {
            html += `
            <div ${getSigOnClick(item)} class="col-span-1 relative rounded-2xl overflow-hidden group shadow-subtle cursor-pointer active:scale-[0.99] transition-transform">
              <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-700" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
              <div class="absolute bottom-2 left-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-wider text-luxury-black pointer-events-none">
                ${item.title || item.category || 'Salon Work'}
              </div>
            </div>`;
        });

        sigGrid.innerHTML = html;
    }

    // ==================== DYNAMIC COUPONS RENDERER ====================
    window.copyHomeCouponCode = async function(code, btnEl) {
        let copied = false;
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(code);
                copied = true;
            } catch (e) { copied = false; }
        }
        if (!copied) {
            try {
                const temp = document.createElement('textarea');
                temp.value = code;
                temp.setAttribute('readonly', '');
                temp.style.position = 'fixed';
                temp.style.top = '-9999px';
                temp.style.left = '-9999px';
                temp.style.opacity = '0';
                document.body.appendChild(temp);
                temp.focus();
                temp.select();
                temp.setSelectionRange(0, 99999);
                copied = document.execCommand('copy');
                document.body.removeChild(temp);
            } catch (err) {
                console.error("Copy fallback error:", err);
            }
        }

        if (btnEl) {
            btnEl.innerText = 'COPIED ✓';
            btnEl.classList.remove('bg-champagne-gold', 'text-luxury-black');
            btnEl.classList.add('bg-sage-green', 'text-white');
            setTimeout(() => {
                btnEl.innerText = 'COPY';
                btnEl.classList.remove('bg-sage-green', 'text-white');
                btnEl.classList.add('bg-champagne-gold', 'text-luxury-black');
            }, 2000);
        }
    };

    function renderDynamicCouponBanner(couponsList) {
        const couponSec = document.getElementById('homeCouponSection');
        const couponBox = document.getElementById('homeCouponBox');
        const topOfferText = document.getElementById('homeTopOfferText');

        let usedCoupons = [];
        try {
            if (typeof EE_STORAGE !== 'undefined' && EE_STORAGE.getUsedCoupons) {
                usedCoupons = (EE_STORAGE.getUsedCoupons() || []).map(c => String(c).toUpperCase());
            } else {
                usedCoupons = (JSON.parse(localStorage.getItem('ee_used_coupons')) || []).map(c => String(c).toUpperCase());
            }
        } catch (e) { usedCoupons = []; }

        const publicCoupons = (Array.isArray(couponsList) ? couponsList : [])
            .filter(c => c && c.active !== false && c.target !== 'personal');

        const availableCoupons = publicCoupons.filter(c => !usedCoupons.includes(String(c.code || '').trim().toUpperCase()));
        const featuredCoupon = availableCoupons[0] || null;

        if (!featuredCoupon) {
            if (couponSec) couponSec.classList.add('hidden');
            return;
        }

        const code = (featuredCoupon.code || '').toUpperCase();
        const val = Number(featuredCoupon.value || featuredCoupon.discount || 0);
        const isPct = (featuredCoupon.discountType || featuredCoupon.type) === 'percent';
        const offerHeadline = isPct ? `${val}% OFF Your First Booking` : `₹${val} OFF Your First Booking`;

        if (topOfferText && val > 0) {
            topOfferText.innerHTML = `Get <strong class="text-champagne-gold font-bold">${isPct ? val + '% OFF' : '₹' + val + ' OFF'}</strong> with code <strong class="text-white">${code}</strong>`;
        }

        if (couponSec && couponBox) {
            couponSec.classList.remove('hidden');
            couponBox.innerHTML = `
                <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-champagne-gold/10 blur-2xl pointer-events-none"></div>
                <div class="flex flex-col relative z-10 min-w-0 pr-3">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] font-bold text-champagne-gold uppercase tracking-widest flex items-center gap-1">
                      <span class="material-symbols-outlined text-[13px]">redeem</span> Special Offer
                    </span>
                    <span class="px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[8px] font-bold uppercase tracking-wider border border-white/15">1st Booking Only</span>
                  </div>
                  <span class="font-serif text-[15px] sm:text-base font-bold text-white leading-tight">${offerHeadline}</span>
                  <span class="text-[11px] text-white/70 mt-1">Use Code <strong class="text-white font-bold tracking-wide">${code}</strong> on your first order</span>
                </div>
                <button
                  type="button"
                  class="relative z-10 px-5 py-2.5 bg-champagne-gold hover:bg-soft-gold text-luxury-black text-[11px] font-bold uppercase tracking-wider rounded-full transition-all shadow-sm flex-shrink-0 active:scale-95"
                  onclick="copyHomeCouponCode('${code}', this)">
                  COPY
                </button>
            `;
        }
    }

    // ==================== SETTINGS & FOOTER RENDERER ====================
    function renderDynamicSettings(settings) {
        if (!settings) return;
        const footerLinksContainer = document.getElementById('footerDynamicLinks') || document.querySelector('footer .flex.items-center.gap-4');
        const hoursContainer = document.getElementById('footerOperatingHours');

        if (hoursContainer && settings.hours) {
            const wkOpen = settings.hours.weekdayOpen;
            const wkClose = settings.hours.weekdayClose;
            if (wkOpen && wkClose) {
                hoursContainer.innerText = `Hours: Mon - Sat: ${wkOpen} to ${wkClose}`;
                hoursContainer.classList.remove('hidden');
            }
        }

        if (footerLinksContainer) {
            const items = [];

            if (settings.phone) {
                const cleanTel = settings.phone.replace(/[^0-9+]/g, '');
                items.push(`<a href="tel:${cleanTel}" class="text-xs font-bold text-warm-brown hover:text-champagne-gold transition-colors no-underline">Call Us</a>`);
            }

            if (Array.isArray(settings.socialLinks) && settings.socialLinks.length > 0) {
                settings.socialLinks.forEach(s => {
                    if (s && s.url) {
                        let finalUrl = s.url.trim();
                        if (s.platform.toLowerCase() === 'whatsapp' && !finalUrl.startsWith('http')) {
                            const cleanNum = finalUrl.replace(/\D/g, '');
                            finalUrl = `https://wa.me/${cleanNum}`;
                        } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                            finalUrl = `https://${finalUrl}`;
                        }

                        items.push(`<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-warm-brown hover:text-champagne-gold transition-colors no-underline">${s.platform}</a>`);
                    }
                });
            }

            if (items.length > 0) {
                footerLinksContainer.innerHTML = items.join('<span class="w-1 h-1 rounded-full bg-muted-beige"></span>');
            }
        }
    }

    // ==================== MASTER RENDER APPLIER ====================
    function applyHomeData(data) {
        if (!data) return;
        renderDynamicBanners(data.banners || []);
        renderDynamicCategories(data.categories || []);
        renderRecentlyViewedSection(data.services || []);
        renderDynamicServicesOnHome(data.services || []);
        renderDynamicCouponBanner(data.coupons || []);
        renderDynamicSignatureWork(data.signature || []);
             if (data.reviews_summary || data.reviews) {
            renderDynamicReviews(data.reviews_summary, data.reviews);
        }
        if (data.promo_sections) renderDynamicPromoSections(data.promo_sections);
        if (data.settings) renderDynamicSettings(data.settings);
    }

    // ==================== DYNAMIC REVIEWS & RATINGS RENDERER ====================
    function renderDynamicReviews(summaryData, reviewsList) {
        // 1. Render Score Banner
        const scoreEl = document.getElementById('homeAvgRatingScore');
        const headlineEl = document.getElementById('homeRatingHeadline');
        const subtextEl = document.getElementById('homeRatingSubtext');

        if (summaryData) {
            if (scoreEl && summaryData.score) scoreEl.innerText = summaryData.score;
            if (headlineEl && summaryData.title) headlineEl.innerText = summaryData.title;
            if (subtextEl && summaryData.subtext) subtextEl.innerText = summaryData.subtext;
        }

        // 2. Render Cards List
        const grid = document.getElementById('homeReviewsGrid');
        if (!grid) return;

        const activeList = Array.isArray(reviewsList) ? reviewsList.filter(r => r && r.active !== false) : [];
        if (activeList.length === 0) return;

        grid.innerHTML = activeList.map(r => {
            const stars = Math.min(5, Math.max(1, Math.round(parseFloat(r.stars) || 5)));
            const starIcons = Array.from({ length: 5 }, (_, i) => `
                <span class="material-symbols-outlined text-[13px] ${i < stars ? 'text-amber-500' : 'text-neutral-300'}" style="font-variation-settings: 'FILL' 1;">star</span>
            `).join('');

            return `
            <div class="min-w-[280px] snap-start p-5 rounded-[20px] bg-white border border-muted-beige/50 shadow-subtle flex flex-col gap-3 relative">
                <span class="material-symbols-outlined absolute top-4 right-4 text-champagne-gold/20 text-[40px] pointer-events-none">format_quote</span>

                <div class="flex items-center gap-1.5 mb-1">
                    <span class="px-2 py-0.5 rounded bg-ivory text-warm-brown text-[9px] font-bold uppercase tracking-wider">${r.tag || 'Service'}</span>
                    <span class="material-symbols-outlined text-[14px] text-sage-green" title="Verified Booking">verified</span>
                </div>

                <div class="flex items-center gap-0.5">
                    ${starIcons}
                </div>

                <p class="text-xs sm:text-[13px] text-luxury-black italic leading-relaxed relative z-10 flex-grow">
                    "${r.comment}"
                </p>

                <div class="flex flex-col mt-2 pt-3 border-t border-muted-beige/30">
                    <span class="text-[11px] sm:text-xs font-bold text-warm-brown">${r.name}</span>
                    <span class="text-[10px] text-neutral-gray font-medium">${r.location || 'Jammu'}</span>
                </div>
            </div>`;
        }).join('');
    }

    // 1. Instant 0ms Render from Local Cache
    try {
        const cachedHome = JSON.parse(localStorage.getItem('ee_home_rtdb_cache'));
        if (cachedHome) applyHomeData(cachedHome);
    } catch (e) {}

    // 2. Live Fetch from Firebase Realtime Database (RTDB)
    (async function syncHomeFromRTDB() {
        try {
            const { rtdb, ref, get, onValue } = await import("./firebase-client.js");
            const uid = localStorage.getItem('ee_user_uid');

            const [banSnap, catSnap, srvSnap, coupSnap, sigSnap, promoSnap, setSnap, revSumSnap, revSnap] = await Promise.all([
                get(ref(rtdb, "banners")),
                get(ref(rtdb, "categories")),
                get(ref(rtdb, "services")),
                get(ref(rtdb, "coupons")),
                get(ref(rtdb, "signature_work")),
                get(ref(rtdb, "promo_sections")),
                get(ref(rtdb, "settings/general")),
                get(ref(rtdb, "reviews_summary")),
                get(ref(rtdb, "client_reviews"))
            ]);

            const homePayload = {
                banners: banSnap.exists() ? Object.values(banSnap.val() || {}).filter(b => b && b.active !== false) : [],
                categories: catSnap.exists() ? Object.values(catSnap.val() || {}).filter(Boolean) : [],
                services: srvSnap.exists() ? Object.values(srvSnap.val() || {}).filter(s => s && s.active !== false) : [],
                coupons: coupSnap.exists() ? Object.values(coupSnap.val() || {}).filter(c => c && c.active !== false) : [],
                signature: sigSnap.exists() ? Object.values(sigSnap.val() || {}).filter(w => w && w.active !== false) : [],
                promo_sections: promoSnap.exists() ? (promoSnap.val() || {}) : {},
                settings: setSnap.exists() ? setSnap.val() : null,
                reviews_summary: revSumSnap.exists() ? revSumSnap.val() : null,
                reviews: revSnap.exists() ? Object.values(revSnap.val() || {}).filter(r => r && r.active !== false) : []
            };


            localStorage.setItem('ee_cached_services', JSON.stringify(homePayload.services));
            localStorage.setItem('ee_home_rtdb_cache', JSON.stringify(homePayload));
            
            applyHomeData(homePayload);
            updateHomeBookingBar();

            // Realtime listener for live promo section updates (including Book Now button toggle)
            let unsubscribePromo = null;
            try {
                unsubscribePromo = onValue(ref(rtdb, "promo_sections"), (snap) => {
                    if (snap.exists()) {
                        const promoVal = snap.val() || {};
                        renderDynamicPromoSections(promoVal);
                        try {
                            const cachedHome = JSON.parse(localStorage.getItem('ee_home_rtdb_cache')) || {};
                            cachedHome.promo_sections = promoVal;
                            localStorage.setItem('ee_home_rtdb_cache', JSON.stringify(cachedHome));
                        } catch (e) {}
                    }
                });
                // Cleanup listener on page hide to prevent memory leaks
                const cleanupPromoListener = () => {
                    if (typeof unsubscribePromo === 'function') {
                        unsubscribePromo();
                        unsubscribePromo = null;
                    }
                };
                window.addEventListener('pagehide', cleanupPromoListener, { once: true });
                window.addEventListener('beforeunload', cleanupPromoListener, { once: true });
            } catch (e) {
                console.warn("Live promo_sections subscription error:", e);
            }

        } catch (err) {
            console.warn("Home RTDB live sync error:", err);
            try {
                if (!localStorage.getItem('ee_home_rtdb_cache')) {
                    applyHomeData({ banners: [], categories: [], services: [], coupons: [] });
                }
            } catch (e) {}
        }
    })();

    // Listen to local storage changes to keep recently viewed live
    window.addEventListener('storage', () => {
        renderRecentlyViewedSection(homeServicesList);
    });
});