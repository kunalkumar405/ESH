document.addEventListener("DOMContentLoaded", () => {
    try {
        // 1. Fetch & Resolve Booking Data (Supports localStorage, URL ?id=..., or latest saved booking)
        const order = resolveInvoiceOrder();
        
        if (!order) {
            const paperEl = document.getElementById('invoice-paper');
            const emptyEl = document.getElementById('invoice-empty-state');
            const actionsEl = document.getElementById('action-buttons');
            
            if (paperEl) paperEl.classList.add('hidden');
            if (emptyEl) {
                emptyEl.classList.remove('hidden');
                emptyEl.classList.add('flex');
            }
            if (actionsEl) {
                // Keep only back button in empty state
                const dlBtn = document.getElementById('btn-download-pdf');
                if (dlBtn) dlBtn.style.display = 'none';
            }
            return;
        }

        // 2. Date & Time Helpers
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        };

        const formatDateTime = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const hour12 = hours % 12 || 12;
            return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} • ${hour12}:${minutes} ${ampm}`;
        };

        // 3. Format Booking Mode Display
        const rawMode = String(order.mode || '').toLowerCase();
        let displayMode = 'Doorstep Home Service';
        if (rawMode.includes('salon')) {
            displayMode = 'Salon Studio Visit';
        } else if (rawMode.includes('home')) {
            displayMode = 'Doorstep Home Service';
        } else if (order.mode) {
            displayMode = order.mode;
        }

        // 4. Populate Header & Customer Details
        const orderIdStr = String(order.id || '').replace(/^#/, '');
        const invNoEl = document.getElementById('inv-number');
        if (invNoEl) invNoEl.innerText = `: #${orderIdStr || 'EE-0000'}`;

        const invDateEl = document.getElementById('inv-date');
        if (invDateEl) {
            const rawDate = order.createdAt || order.date || new Date().toISOString();
            invDateEl.innerText = `: ${order.createdAt ? formatDateTime(rawDate) : formatDate(rawDate)}`;
        }

        const invBookingIdEl = document.getElementById('inv-booking-id');
        if (invBookingIdEl) invBookingIdEl.innerText = `: #${orderIdStr || 'N/A'}`;

        const invModeEl = document.getElementById('inv-booking-mode');
        if (invModeEl) invModeEl.innerText = `: ${displayMode}`;

        // Customer Info
        const custNameEl = document.getElementById('inv-customer-name');
        if (custNameEl) custNameEl.innerText = order.customerName || order.userName || 'Valued Customer';

        const custPhoneEl = document.getElementById('inv-customer-phone');
        if (custPhoneEl) {
            const phoneDigits = String(order.customerPhone || order.phone || '').replace(/\D/g, '').slice(-10);
            custPhoneEl.innerText = phoneDigits ? `+91 ${phoneDigits}` : 'N/A';
        }

        const custAddrEl = document.getElementById('inv-customer-address');
        if (custAddrEl) {
            custAddrEl.innerText = order.address || order.district || 'At Salon Studio (House #42, Goel Market, Gandhi Nagar, Jammu)';
        }

        const custEmailEl = document.getElementById('inv-customer-email');
        const custEmailRow = document.getElementById('inv-customer-email-row');
        const emailVal = order.customerEmail || order.email || '';
        if (custEmailEl && custEmailRow) {
            if (emailVal) {
                custEmailEl.innerText = emailVal;
                custEmailRow.classList.remove('hidden');
                custEmailRow.classList.add('flex');
            } else {
                custEmailRow.classList.add('hidden');
            }
        }

        // 5. Render Items Table
        const tbody = document.getElementById('inv-items-body');
        let itemsHtml = '';
        
        if (Array.isArray(order.items) && order.items.length > 0) {
            order.items.forEach((item, index) => {
                const price = Number(item.price) || 0;
                const qty = Number(item.quantity || item.qty) || 1;
                const totalItemPrice = price * qty;
                
                const itemMode = item.mode === 'Salon' ? '🏪 Salon Studio' : '🏠 Doorstep Home';
                const itemSchedule = item.date 
                    ? `${formatDate(item.date)}${item.time && item.time !== 'Flexible' ? ' at ' + item.time : ''}`
                    : (item.time || 'Confirmed Schedule');

                itemsHtml += `
                <tr class="border-b border-gray-100 last:border-0 hover:bg-soft-blush/10 transition-colors">
                    <td class="py-3.5 px-4 text-center font-bold text-dark-brown/70 align-top text-xs">${index + 1}</td>
                    <td class="py-3.5 px-4 align-top">
                        <span class="block font-bold text-luxury-black text-sm leading-tight">${item.name}</span>
                        <div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-dark-brown/70">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soft-blush/60 text-elegant-rose font-semibold text-[10px]">
                                ${itemMode}
                            </span>
                            <span class="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                <span class="material-symbols-outlined text-[13px] text-luxury-gold">calendar_today</span>
                                ${itemSchedule}
                            </span>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-center font-semibold text-xs align-top">${qty}</td>
                    <td class="py-3.5 px-4 text-right font-semibold text-xs align-top">₹${price.toLocaleString('en-IN')}</td>
                    <td class="py-3.5 px-4 text-right font-bold text-luxury-black text-sm align-top">₹${totalItemPrice.toLocaleString('en-IN')}</td>
                </tr>`;
            });
        } else {
            // Fallback for single service structure
            const fallbackPrice = Number(order.subtotal || order.total) || 0;
            const singleSchedule = order.date ? `${formatDate(order.date)} ${order.time ? '• ' + order.time : ''}` : 'Confirmed Slot';
            itemsHtml = `
            <tr class="border-b border-gray-100 last:border-0">
                <td class="py-3.5 px-4 text-center font-bold text-dark-brown/70 text-xs align-top">1</td>
                <td class="py-3.5 px-4 align-top">
                    <span class="block font-bold text-luxury-black text-sm">${order.serviceName || 'Luxury Salon Services'}</span>
                    <span class="block text-[11px] text-gray-500 mt-0.5">Mode: ${displayMode} • Slot: ${singleSchedule}</span>
                </td>
                <td class="py-3.5 px-4 text-center font-semibold text-xs align-top">1</td>
                <td class="py-3.5 px-4 text-right font-semibold text-xs align-top">₹${fallbackPrice.toLocaleString('en-IN')}</td>
                <td class="py-3.5 px-4 text-right font-bold text-luxury-black text-sm align-top">₹${fallbackPrice.toLocaleString('en-IN')}</td>
            </tr>`;
        }
        if (tbody) tbody.innerHTML = itemsHtml;

        // 6. Render Totals & Fees Breakdown
        const subtotal = Number(order.subtotal) || 0;
        const subtotalEl = document.getElementById('inv-subtotal');
        if (subtotalEl) subtotalEl.innerText = `₹${subtotal.toLocaleString('en-IN')}`;
        
        // Calculate Total Discount (Coupon + Loyalty Points)
        const couponDisc = Number(order.couponDiscount) || 0;
        const pointsDisc = Number(order.pointsUsed) || 0;
        const totalDiscount = couponDisc + pointsDisc;
        
        const discRow = document.getElementById('inv-discount-row');
        if (totalDiscount > 0 && discRow) {
            discRow.classList.remove('hidden');
            discRow.classList.add('flex');
            
            const discLabelEl = document.getElementById('inv-discount-label');
            if (discLabelEl) {
                if (order.couponCode) {
                    discLabelEl.innerHTML = `Discount <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-soft-blush text-elegant-rose ml-1 tracking-wider uppercase">${order.couponCode}</span>`;
                } else if (pointsDisc > 0 && couponDisc === 0) {
                    discLabelEl.innerText = `Loyalty Points Redeemed`;
                } else {
                    discLabelEl.innerText = `Discount & Rewards`;
                }
            }
            const discValEl = document.getElementById('inv-discount');
            if (discValEl) discValEl.innerText = `- ₹${totalDiscount.toLocaleString('en-IN')}`;
        } else if (discRow) {
            discRow.classList.add('hidden');
            discRow.classList.remove('flex');
        }

        // Travel Charge
        const tFee = Number(order.travelFee) || 0;
        const travelRow = document.getElementById('inv-travel-row');
        if (travelRow) {
            if (tFee > 0) {
                travelRow.classList.remove('hidden'); travelRow.classList.add('flex');
                document.getElementById('inv-travel').innerText = `₹${tFee.toLocaleString('en-IN')}`;
            } else {
                travelRow.classList.add('hidden'); travelRow.classList.remove('flex');
            }
        }

        // Convenience Fee
        const cFee = Number(order.convenienceFee) || 0;
        const convRow = document.getElementById('inv-conv-row');
        if (convRow) {
            if (cFee > 0) {
                convRow.classList.remove('hidden'); convRow.classList.add('flex');
                document.getElementById('inv-conv').innerText = `₹${cFee.toLocaleString('en-IN')}`;
            } else {
                convRow.classList.add('hidden'); convRow.classList.remove('flex');
            }
        }

        // Hygiene Fee
        const hFee = Number(order.hygieneFee) || 0;
        const hygRow = document.getElementById('inv-hygiene-row');
        if (hygRow) {
            if (hFee > 0) {
                hygRow.classList.remove('hidden'); hygRow.classList.add('flex');
                document.getElementById('inv-hygiene').innerText = `₹${hFee.toLocaleString('en-IN')}`;
            } else {
                hygRow.classList.add('hidden'); hygRow.classList.remove('flex');
            }
        }

        // Final Total
        const totalEl = document.getElementById('inv-total');
        if (totalEl) {
            const finalTotal = Number(order.total) || (subtotal - totalDiscount + tFee + cFee + hFee);
            totalEl.innerText = `₹${Math.max(0, finalTotal).toLocaleString('en-IN')}`;
        }

        // 7. Payment Status & Method
        const status = String(order.status || '').toLowerCase();
        const statusEl = document.getElementById('inv-payment-status');
        if (statusEl) {
            if (status === 'completed' || status === 'confirmed' || status === 'paid') {
                statusEl.className = "px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1";
                statusEl.innerHTML = `<span class="material-symbols-outlined text-[13px]">check_circle</span> PAID`;
            } else if (status === 'cancelled') {
                statusEl.className = "px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1";
                statusEl.innerHTML = `<span class="material-symbols-outlined text-[13px]">cancel</span> CANCELLED`;
            } else {
                statusEl.className = "px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1";
                statusEl.innerHTML = `<span class="material-symbols-outlined text-[13px]">schedule</span> PENDING`;
            }
        }

        const methodEl = document.getElementById('inv-payment-method');
        if (methodEl) {
            methodEl.innerText = order.paymentMethod || 'Pay after Service (Cash / UPI)';
        }

        // 8. QR CODE CORRECTION & GENERATION (Points to https://elegantsalons.in/)
        renderCorrectQRCode("https://elegantsalons.in/");

    } catch (e) {
        console.error("Error generating invoice:", e);
        const emptyEl = document.getElementById('invoice-empty-state');
        const paperEl = document.getElementById('invoice-paper');
        if (paperEl) paperEl.classList.add('hidden');
        if (emptyEl) {
            emptyEl.classList.remove('hidden');
            emptyEl.classList.add('flex');
            emptyEl.querySelector('p').innerText = "An error occurred while loading this invoice. Please try again from My Bookings.";
        }
    }
});

/**
 * Robust invoice order resolver
 * Checks URL ?id=..., localStorage 'ee_current_invoice', 'ee_booking', and 'ee_user_bookings'
 */
function resolveInvoiceOrder() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id') || urlParams.get('orderId');

    // 1. Check ee_current_invoice in localStorage
    let current = null;
    try {
        const rawCurrent = localStorage.getItem('ee_current_invoice');
        if (rawCurrent) current = JSON.parse(rawCurrent);
    } catch (e) {
        console.warn("Could not parse ee_current_invoice:", e);
    }

    if (targetId) {
        const cleanTargetId = String(targetId).replace(/^#/, '');
        if (current && String(current.id || '').replace(/^#/, '') === cleanTargetId) {
            return current;
        }

        // Search in ee_user_bookings
        try {
            const rawBookings = localStorage.getItem('ee_user_bookings');
            if (rawBookings) {
                const list = JSON.parse(rawBookings);
                if (Array.isArray(list)) {
                    const match = list.find(b => String(b.id || '').replace(/^#/, '') === cleanTargetId);
                    if (match) {
                        localStorage.setItem('ee_current_invoice', JSON.stringify(match));
                        return match;
                    }
                }
            }
        } catch (e) {}
    }

    // 2. If current invoice is valid, return it
    if (current && (current.id || current.items || current.total)) {
        return current;
    }

    // 3. Fallback: Check ee_booking (latest confirmed order)
    try {
        const rawBooking = localStorage.getItem('ee_booking');
        if (rawBooking) {
            const b = JSON.parse(rawBooking);
            if (b && (b.id || b.total)) return b;
        }
    } catch (e) {}

    // 4. Fallback: Latest from ee_user_bookings
    try {
        const rawBookings = localStorage.getItem('ee_user_bookings');
        if (rawBookings) {
            const list = JSON.parse(rawBookings);
            if (Array.isArray(list) && list.length > 0) {
                return list[0];
            }
        }
    } catch (e) {}

    return null;
}

/**
 * QR Code Generator: Renders clean, high-resolution QR code pointing to https://elegantsalons.in/
 * Uses QRCode.js (canvas) if available, with API fallback image.
 */
function renderCorrectQRCode(targetUrl) {
    const qrContainer = document.getElementById('inv-qr-container');
    const qrImg = document.getElementById('inv-qr-code');

    // Always update the fallback img tag
    if (qrImg) {
        const encodedUrl = encodeURIComponent(targetUrl);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodedUrl}&color=111111&bgcolor=ffffff&margin=4`;
    }

    // If QRCode.js library is loaded, draw onto local canvas for 0ms render & zero CORS issues
    if (window.QRCode && qrContainer) {
        try {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: targetUrl,
                width: 74,
                height: 74,
                colorDark: "#111111",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (err) {
            console.warn("Local QRCode generation error, relying on image tag:", err);
        }
    }
}
