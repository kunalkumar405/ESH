/**
 * Elegant Escape - PWA Installation & App Download System
 */

(function () {
    let deferredPrompt = null;

    // Check if the app is already installed or running in standalone mode
    function isAppInstalled() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIosStandalone = window.navigator.standalone === true;
        const isInstalledFlag = localStorage.getItem('ee_pwa_installed') === 'true';

        return isStandalone || isIosStandalone || isInstalledFlag;
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((reg) => {
                    // Registration successful
                })
                .catch((err) => {
                    console.log('SW registration note:', err.message);
                });
        });
    }

    // Hide all PWA download elements immediately
    function hideAllPwaUI() {
        const cardSection = document.getElementById('pwaInstallCardSection');
        const headerBtn = document.getElementById('headerPwaInstallBtn');
        const iosModal = document.getElementById('pwaIosModal');

        if (cardSection) {
            cardSection.style.transition = 'all 0.4s ease-out';
            cardSection.style.opacity = '0';
            cardSection.style.transform = 'scale(0.96)';
            setTimeout(() => {
                cardSection.style.display = 'none';
            }, 400);
        }

        if (headerBtn) {
            headerBtn.style.transition = 'all 0.3s ease-out';
            headerBtn.style.opacity = '0';
            headerBtn.style.transform = 'scale(0.7)';
            setTimeout(() => {
                headerBtn.style.display = 'none';
            }, 300);
        }

        if (iosModal) {
            iosModal.classList.add('hidden');
        }
    }

    // Show PWA UI if not installed and not dismissed
    function initPwaUI() {
        const cardSection = document.getElementById('pwaInstallCardSection');
        const headerBtn = document.getElementById('headerPwaInstallBtn');

        if (isAppInstalled()) {
            // If already downloaded/installed, app shouldn't look again
            hideAllPwaUI();
            return;
        }

        // Show header button if not installed
        if (headerBtn) {
            headerBtn.style.display = 'flex';
        }

        // Show home screen card if not dismissed this session
        if (cardSection) {
            if (sessionStorage.getItem('ee_pwa_dismissed') === 'true') {
                cardSection.style.display = 'none';
            } else {
                cardSection.style.display = 'block';
            }
        }
    }

    // Listen for beforeinstallprompt event (Chrome, Android, Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default browser mini-infobar
        e.preventDefault();
        deferredPrompt = e;

        if (!isAppInstalled()) {
            initPwaUI();
        } else {
            hideAllPwaUI();
        }
    });

    // Listen for appinstalled event (fired when app has been installed)
    window.addEventListener('appinstalled', () => {
        localStorage.setItem('ee_pwa_installed', 'true');
        deferredPrompt = null;
        hideAllPwaUI();
        showFeedbackToast('Elegant Escape App installed successfully! 🎉');
    });

    // Check display-mode changes (e.g. user opens standalone window)
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
        if (evt.matches) {
            localStorage.setItem('ee_pwa_installed', 'true');
            hideAllPwaUI();
        }
    });

    // Trigger installation
    async function triggerInstallFlow() {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    localStorage.setItem('ee_pwa_installed', 'true');
                    hideAllPwaUI();
                    showFeedbackToast('Installing Elegant Escape App...');
                }
            } catch (err) {
                console.error('Install prompt error:', err);
            }
            deferredPrompt = null;
        } else {
            // Check if iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                showIosModal();
            } else {
                // Desktop or browser where prompt is in address bar or menu
                showBrowserGuideModal();
            }
        }
    }

    function showIosModal() {
        const modal = document.getElementById('pwaIosModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    function showBrowserGuideModal() {
        const modal = document.getElementById('pwaBrowserModal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            showFeedbackToast('Tap browser menu (⋮) and select "Install App" or "Add to Home Screen"');
        }
    }

    function showFeedbackToast(msg) {
        let toast = document.getElementById('pwaFeedbackToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pwaFeedbackToast';
            toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-full bg-luxury-black text-white text-xs font-semibold shadow-floating border border-champagne-gold/60 flex items-center gap-2 transition-all duration-300 opacity-0 -translate-y-2 pointer-events-none';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span class="material-symbols-outlined text-[18px] text-champagne-gold">verified</span> <span>${msg}</span>`;
        toast.classList.remove('opacity-0', '-translate-y-2', 'pointer-events-none');
        toast.classList.add('opacity-100', 'translate-y-0');

        setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-2', 'pointer-events-none');
            toast.classList.remove('opacity-100', 'translate-y-0');
        }, 3500);
    }

    // Attach event listeners after DOM loads
    document.addEventListener('DOMContentLoaded', () => {
        // Initial check: if already installed, hide immediately
        if (isAppInstalled()) {
            hideAllPwaUI();
            return;
        }

        initPwaUI();

        // Card Install CTA Button
        const cardInstallBtn = document.getElementById('pwaCardInstallBtn');
        if (cardInstallBtn) {
            cardInstallBtn.addEventListener('click', (e) => {
                e.preventDefault();
                triggerInstallFlow();
            });
        }

        // Header Install Button
        const headerInstallBtn = document.getElementById('headerPwaInstallBtn');
        if (headerInstallBtn) {
            headerInstallBtn.addEventListener('click', (e) => {
                e.preventDefault();
                triggerInstallFlow();
            });
        }

        // Card Dismiss Button (Close for session)
        const cardDismissBtn = document.getElementById('pwaCardDismissBtn');
        if (cardDismissBtn) {
            cardDismissBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardSection = document.getElementById('pwaInstallCardSection');
                if (cardSection) {
                    cardSection.style.transition = 'all 0.3s ease-out';
                    cardSection.style.opacity = '0';
                    cardSection.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        cardSection.style.display = 'none';
                        sessionStorage.setItem('ee_pwa_dismissed', 'true');
                    }, 300);
                }
            });
        }

        // Close iOS Modal
        const closeIosBtn = document.getElementById('closeIosModalBtn');
        if (closeIosBtn) {
            closeIosBtn.addEventListener('click', () => {
                const modal = document.getElementById('pwaIosModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        const iosModalBackdrop = document.getElementById('pwaIosModalBackdrop');
        if (iosModalBackdrop) {
            iosModalBackdrop.addEventListener('click', () => {
                const modal = document.getElementById('pwaIosModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        // Close Browser Guide Modal
        const closeBrowserBtn = document.getElementById('closeBrowserModalBtn');
        if (closeBrowserBtn) {
            closeBrowserBtn.addEventListener('click', () => {
                const modal = document.getElementById('pwaBrowserModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        const browserModalBackdrop = document.getElementById('pwaBrowserModalBackdrop');
        if (browserModalBackdrop) {
            browserModalBackdrop.addEventListener('click', () => {
                const modal = document.getElementById('pwaBrowserModal');
                if (modal) modal.classList.add('hidden');
            });
        }
    });
})();
