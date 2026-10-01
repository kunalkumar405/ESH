document.addEventListener("DOMContentLoaded", () => {
    try {
        // लोकल स्टोरेज से रियल बुकिंग का डेटा निकालें
        const bookingData = localStorage.getItem('ee_current_invoice');
        if (!bookingData) {
            alert("No booking data found for invoice!");
            window.close();
            return;
        }

        const order = JSON.parse(bookingData);

        // Date Formatting function
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        };

        // 1. Populate Header & Customer Details
        document.getElementById('inv-number').innerText = `: ${order.id || 'N/A'}`;
        document.getElementById('inv-date').innerText = `: ${formatDate(order.createdAt || order.date)}`;
        document.getElementById('inv-booking-id').innerText = `: ${order.id || 'N/A'}`;
        document.getElementById('inv-booking-mode').innerText = `: ${order.mode || 'Home'}`;

        document.getElementById('inv-customer-name').innerText = order.customerName || 'Customer';
        document.getElementById('inv-customer-phone').innerText = order.customerPhone ? `+91 ${order.customerPhone}` : 'N/A';
        document.getElementById('inv-customer-address').innerText = order.address || order.district || 'At Salon Studio';

        // 2. Render Items Table
        const tbody = document.getElementById('inv-items-body');
        let itemsHtml = '';
        
        if (Array.isArray(order.items) && order.items.length > 0) {
            order.items.forEach((item, index) => {
                const price = Number(item.price) || 0;
                const qty = 1; // Since app currently saves 1 per item
                
                itemsHtml += `
                <tr class="border-b border-gray-100 last:border-0">
                    <td class="py-4 px-4 text-center font-bold text-dark-brown/70">${index + 1}</td>
                    <td class="py-4 px-4">
                        <span class="block font-bold text-luxury-black text-sm">${item.name}</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">Mode: ${item.mode || 'Home'} • Slot: ${item.time || 'Flexible'}</span>
                    </td>
                    <td class="py-4 px-4 text-center font-semibold">${qty}</td>
                    <td class="py-4 px-4 text-right font-semibold">₹${price.toLocaleString('en-IN')}</td>
                    <td class="py-4 px-4 text-right font-bold text-luxury-black">₹${price.toLocaleString('en-IN')}</td>
                </tr>`;
            });
        } else {
            // Fallback if legacy order format
            itemsHtml = `
            <tr>
                <td class="py-4 px-4 text-center font-bold text-dark-brown/70">1</td>
                <td class="py-4 px-4 font-bold text-luxury-black text-sm">${order.serviceName || 'Luxury Services'}</td>
                <td class="py-4 px-4 text-center font-semibold">1</td>
                <td class="py-4 px-4 text-right font-semibold">₹${(order.subtotal || order.total || 0).toLocaleString('en-IN')}</td>
                <td class="py-4 px-4 text-right font-bold text-luxury-black">₹${(order.subtotal || order.total || 0).toLocaleString('en-IN')}</td>
            </tr>`;
        }
        tbody.innerHTML = itemsHtml;

        // 3. Render Totals & Fees
        document.getElementById('inv-subtotal').innerText = `₹${(Number(order.subtotal) || 0).toLocaleString('en-IN')}`;
        
        // Calculate Total Discount (Coupons + Points)
        const totalDiscount = (Number(order.couponDiscount) || 0) + (Number(order.pointsUsed) || 0);
        if (totalDiscount > 0) {
            const discRow = document.getElementById('inv-discount-row');
            discRow.classList.remove('hidden');
            discRow.classList.add('flex');
            document.getElementById('inv-discount').innerText = `- ₹${totalDiscount.toLocaleString('en-IN')}`;
        }

        // Individual Fees Breakdown
        const tFee = Number(order.travelFee) || 0;
        if (tFee > 0) {
            const travelRow = document.getElementById('inv-travel-row');
            travelRow.classList.remove('hidden'); travelRow.classList.add('flex');
            document.getElementById('inv-travel').innerText = `₹${tFee.toLocaleString('en-IN')}`;
        }

        const cFee = Number(order.convenienceFee) || 0;
        if (cFee > 0) {
            const convRow = document.getElementById('inv-conv-row');
            convRow.classList.remove('hidden'); convRow.classList.add('flex');
            document.getElementById('inv-conv').innerText = `₹${cFee.toLocaleString('en-IN')}`;
        }

        const hFee = Number(order.hygieneFee) || 0;
        if (hFee > 0) {
            const hygRow = document.getElementById('inv-hygiene-row');
            hygRow.classList.remove('hidden'); hygRow.classList.add('flex');
            document.getElementById('inv-hygiene').innerText = `₹${hFee.toLocaleString('en-IN')}`;
        }

        // Final Total
        document.getElementById('inv-total').innerText = `₹${(Number(order.total) || 0).toLocaleString('en-IN')}`;

        // 4. Payment Status
        const status = String(order.status || '').toLowerCase();
        const statusEl = document.getElementById('inv-payment-status');
        if (status === 'completed' || status === 'confirmed' || status === 'paid') {
            statusEl.className = "px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1";
            statusEl.innerHTML = `<span class="material-symbols-outlined text-[12px]">check_circle</span> PAID`;
        } else {
            statusEl.className = "px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1";
            statusEl.innerHTML = `<span class="material-symbols-outlined text-[12px]">pending</span> PENDING`;
        }

    } catch (e) {
        console.error("Error generating invoice:", e);
        alert("Failed to load invoice data.");
    }
});