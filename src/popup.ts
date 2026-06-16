// src/popup.ts

import type { Message } from './types.js';

const infoBtn = document.getElementById('infoBtn') as HTMLButtonElement | null;
const overlay = document.getElementById('overlay') as HTMLDivElement | null;
const infoCloseBtn = document.getElementById('closeOverlay') as HTMLButtonElement | null;
const versionBadge = document.getElementById('extension-version-badge') as HTMLDivElement | null;
const toggleFloatingBtn = document.getElementById('toggleFloatingBtn') as HTMLInputElement | null;

infoBtn?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
});
infoCloseBtn?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
});

function setVersionBadge(): void {
    if (!versionBadge) return;
    try {
        const manifest = chrome.runtime.getManifest();
        const version = manifest?.version || 'unknown';
        versionBadge.textContent = `v${version} — stable`;
    } catch (error) {
        console.warn('[Popup] Не удалось получить версию расширения', error);
    }
}

async function initializePopup(): Promise<void> {
    setVersionBadge();

    const stored = await chrome.storage.local.get('showFloatingButton');
    const show = stored.showFloatingButton !== false;
    if (toggleFloatingBtn) {
        toggleFloatingBtn.checked = show;
    }
}

toggleFloatingBtn?.addEventListener('change', () => {
    const show = toggleFloatingBtn!.checked;
    chrome.storage.local.set({ showFloatingButton: show });
});

initializePopup();
