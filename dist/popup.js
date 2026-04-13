// src/popup.ts
const returnOriginalText = {
    action: "RETURN_ORIGINAL_TEXT"
};
let currentLevel = 'easy';
const levelSelect = document.getElementById('levelSelect'); // as HTMLSelectElement, чтобы TS знал, что это элемент select
const simplifyBtn = document.getElementById('simplifyBtn'); // as HTMLButtonElement, чтобы TS знал, что это элемент button
const returnBtn = document.getElementById('returnBtn');
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
// функция для того чтобы сделать сообщение для упрощения текста даже если currentlevel меняется
function createSimplifyMessage(currentLevel) {
    return {
        action: "SIMPLIFY_TEXT",
        level: currentLevel
    };
}
;
if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        currentLevel = e.target.value;
        await saveLevelToStorage(currentLevel);
        chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: currentLevel }).catch(() => { });
    });
}
;
simplifyBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage(createSimplifyMessage(currentLevel));
});
returnBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage(returnOriginalText);
});
loadLevelFromStorage();
export {};
