// src/popup.ts
let currentLevel = 'easy';
const levelSelect = document.getElementById('levelSelect');
const simplifyBtn = document.getElementById('simplifyBtn');
async function saveLevelToStorage(level) {
    await chrome.storage.local.set({ textComplexityLevel: level });
}
async function loadLevelFromStorage() {
    const result = await chrome.storage.local.get('textComplexityLevel');
    if (result.textComplexityLevel) {
        currentLevel = result.textComplexityLevel;
        if (levelSelect)
            levelSelect.value = currentLevel;
    }
    else {
        currentLevel = 'easy';
        if (levelSelect)
            levelSelect.value = 'easy';
        await saveLevelToStorage('easy');
    }
}
if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        currentLevel = e.target.value;
        await saveLevelToStorage(currentLevel);
        chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: currentLevel }).catch(() => { });
    });
}
simplifyBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: currentLevel }).catch(() => { });
});
loadLevelFromStorage();
export {};
