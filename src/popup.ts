// src/popup.ts

import type { Message } from './types.js';

const returnOriginalText: Message = {
    action: "RETURN_ORIGINAL_TEXT"
};

let currentLevel: "easy" | "medium" | "hard" = 'easy';

const levelSelect = document.getElementById('levelSelect') as HTMLSelectElement | null; // as HTMLSelectElement, чтобы TS знал, что это элемент select
const simplifyBtn = document.getElementById('simplifyBtn') as HTMLButtonElement | null; // as HTMLButtonElement, чтобы TS знал, что это элемент button
const returnBtn = document.getElementById('returnBtn') as HTMLButtonElement;
const checkbox = document.getElementById('showApiKey') as HTMLInputElement | null;

async function saveLevelToStorage(level: "easy" | "medium" | "hard"): Promise<void> {
    await chrome.storage.local.set({ textComplexityLevel: level });
}

// показ api ключа при нажатии на чекбокс
checkbox?.addEventListener('change', () => {
    const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement | null;
    if (apiKeyInput){
        switch (checkbox.checked) {
            case true:
                apiKeyInput.type = "text";
                break;
            case false:
                apiKeyInput.type = "password";
                break;
        }
    }
});

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

// функция для того чтобы сделать сообщение для упрощения текста даже если currentlevel меняется
function createSimplifyMessage(currentLevel: "easy" | "medium" | "hard"): Message {
    return {
        action: "SIMPLIFY_TEXT",
        level: currentLevel
    }
};

if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        currentLevel = (e.target as HTMLSelectElement).value as "easy" | "medium" | "hard";
        await saveLevelToStorage(currentLevel);
        chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: currentLevel }).catch(() => {});
    });
};

simplifyBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage(createSimplifyMessage(currentLevel));
});

returnBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage(returnOriginalText);
    });
loadLevelFromStorage();