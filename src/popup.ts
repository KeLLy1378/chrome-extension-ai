// src/popup.ts

import type { Message } from './types.js';

let currentLevel: "easy" | "medium" | "hard" = 'easy';

const levelSelect = document.getElementById('levelSelect') as HTMLSelectElement | null;
const simplifyBtn = document.getElementById('simplifyBtn');

async function saveLevelToStorage(level: "easy" | "medium" | "hard"): Promise<void> {
    await chrome.storage.local.set({ textComplexityLevel: level });
}

async function loadLevelFromStorage(): Promise<void> {
    const result = await chrome.storage.local.get('textComplexityLevel');
    if (result.textComplexityLevel) {
        currentLevel = result.textComplexityLevel as "easy" | "medium" | "hard";
        if (levelSelect) levelSelect.value = currentLevel;
    } else {
        currentLevel = 'easy';
        if (levelSelect) levelSelect.value = 'easy';
        await saveLevelToStorage('easy');
    }
}

if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        currentLevel = (e.target as HTMLSelectElement).value as "easy" | "medium" | "hard";
        await saveLevelToStorage(currentLevel);
        chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: currentLevel }).catch(() => {});
    });
}

simplifyBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: currentLevel }).catch(() => {});
});

loadLevelFromStorage();