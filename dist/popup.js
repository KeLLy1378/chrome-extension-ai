// src/popup.ts
const infoBtn = document.getElementById('infoBtn');
const overlay = document.getElementById('overlay');
const infoCloseBtn = document.getElementById('closeOverlay');
const versionBadge = document.getElementById('extension-version-badge');
const toggleFloatingBtn = document.getElementById('toggleFloatingBtn');
infoBtn?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
});
infoCloseBtn?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
});
function setVersionBadge() {
    if (!versionBadge)
        return;
    try {
        const manifest = chrome.runtime.getManifest();
        const version = manifest?.version || 'unknown';
        versionBadge.textContent = `v${version} — stable`;
    }
    catch (error) {
        console.warn('[Popup] Не удалось получить версию расширения', error);
    }
}
async function initializePopup() {
    setVersionBadge();
    const stored = await chrome.storage.local.get('showFloatingButton');
    const show = stored.showFloatingButton !== false;
    if (toggleFloatingBtn) {
        toggleFloatingBtn.checked = show;
    }
}
toggleFloatingBtn?.addEventListener('change', () => {
    const show = toggleFloatingBtn.checked;
    chrome.storage.local.set({ showFloatingButton: show });
});
initializePopup();
export {};
