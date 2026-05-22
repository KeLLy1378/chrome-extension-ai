// src/popup.ts
let currentLevel = 'easy';
let currentApiKey = '';
// Находим элементы по ID
const levelSelect = document.getElementById('levelSelect');
const simplifyBtn = document.getElementById('simplifyBtn');
const statusDiv = document.getElementById('status');
const apiKeyInput = document.getElementById('apiKeyInput');
const showApiKeyCheckbox = document.getElementById('showApiKey');
const infoBtn = document.getElementById('infoBtn');
const overlay = document.getElementById('overlay');
const infoCloseBtn = document.getElementById('closeOverlay');
const versionBadge = document.getElementById('extension-version-badge');
// Обработчик для кнопки информации
infoBtn?.addEventListener('click', () => {
    if (overlay != null) {
        overlay.classList.remove('hidden');
    }
});
infoCloseBtn?.addEventListener('click', () => {
    if (overlay != null) {
        overlay.classList.add('hidden');
    }
});
// Функция сохранения уровня в storage
async function saveLevelToStorage(level) {
    try {
        await chrome.storage.local.set({ textComplexityLevel: level });
        console.log('[Popup] Уровень сохранён в storage:', level);
    }
    catch (error) {
        console.error('[Popup] Ошибка сохранения:', error);
    }
}
// Функция загрузки уровня из storage
async function loadLevelFromStorage() {
    try {
        const result = await chrome.storage.local.get('textComplexityLevel');
        if (result.textComplexityLevel) {
            currentLevel = result.textComplexityLevel;
            if (levelSelect) {
                levelSelect.value = currentLevel;
            }
            if (statusDiv) {
                statusDiv.textContent = `Загружен уровень: ${currentLevel}`;
                statusDiv.style.color = 'blue';
            }
            console.log('[Popup] Уровень загружен из storage:', currentLevel);
        }
        else {
            currentLevel = 'easy';
            if (levelSelect) {
                levelSelect.value = 'easy';
            }
            await saveLevelToStorage('easy');
            if (statusDiv) {
                statusDiv.textContent = `Уровень по умолчанию: easy`;
            }
        }
    }
    catch (error) {
        console.error('[Popup] Ошибка загрузки:', error);
        if (statusDiv) {
            statusDiv.textContent = 'Ошибка загрузки настроек';
            statusDiv.style.color = 'red';
        }
    }
}
// ========== ФУНКЦИИ ДЛЯ API КЛЮЧА ==========
// Функция сохранения API ключа в storage
async function saveApiKeyToStorage(apiKey) {
    try {
        await chrome.storage.local.set({ apiKey: apiKey });
        console.log('[Popup] API ключ сохранён в storage, длина:', apiKey.length);
    }
    catch (error) {
        console.error('[Popup] Ошибка сохранения API ключа:', error);
    }
}
// Функция загрузки API ключа из storage (С УЛУЧШЕННОЙ ОТЛАДКОЙ)
async function loadApiKeyFromStorage() {
    try {
        console.log('[Popup] Начинаем загрузку API ключа из storage...');
        const result = await chrome.storage.local.get('apiKey');
        console.log('[Popup] Получены данные из storage:', result);
        if (result.apiKey && typeof result.apiKey === 'string') {
            currentApiKey = result.apiKey;
            if (apiKeyInput) {
                apiKeyInput.value = currentApiKey;
                console.log('[Popup] API ключ установлен в поле ввода, длина:', currentApiKey.length);
            }
            else {
                console.error('[Popup] Поле apiKeyInput не найдено в DOM!');
            }
            if (statusDiv) {
                statusDiv.textContent = 'API ключ загружен';
                statusDiv.style.color = 'green';
                setTimeout(() => {
                    if (statusDiv && statusDiv.textContent === 'API ключ загружен') {
                        statusDiv.textContent = '';
                    }
                }, 2000);
            }
            console.log('[Popup] API ключ загружен из storage');
        }
        else {
            console.log('[Popup] API ключ не найден в storage или не является строкой');
            if (apiKeyInput) {
                apiKeyInput.value = '';
            }
        }
    }
    catch (error) {
        console.error('[Popup] Ошибка загрузки API ключа:', error);
    }
}
// Функция для отслеживания изменений в поле API ключа
function setupApiKeyTracking() {
    if (!apiKeyInput) {
        console.error('[Popup] Поле apiKeyInput не найдено, отслеживание не настроено');
        return;
    }
    console.log('[Popup] Настройка отслеживания изменений API ключа');
    let saveTimeout;
    const handleApiKeyChange = () => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(async () => {
            const newApiKey = apiKeyInput.value.trim();
            console.log('[Popup] Изменение API ключа, новая длина:', newApiKey.length);
            if (newApiKey !== currentApiKey) {
                currentApiKey = newApiKey;
                await saveApiKeyToStorage(currentApiKey);
                if (statusDiv) {
                    statusDiv.textContent = 'API ключ сохранён';
                    statusDiv.style.color = 'green';
                    setTimeout(() => {
                        if (statusDiv && statusDiv.textContent === 'API ключ сохранён') {
                            statusDiv.textContent = '';
                        }
                    }, 2000);
                }
                console.log('[Popup] API ключ обновлён и сохранён');
            }
        }, 500);
    };
    apiKeyInput.addEventListener('input', handleApiKeyChange);
    apiKeyInput.addEventListener('change', handleApiKeyChange);
    console.log('[Popup] Отслеживание изменений API ключа настроено');
}
// Функция для показа/скрытия API ключа
function setupShowApiKeyToggle() {
    if (!showApiKeyCheckbox || !apiKeyInput)
        return;
    showApiKeyCheckbox.addEventListener('change', () => {
        if (showApiKeyCheckbox.checked) {
            apiKeyInput.type = 'text';
        }
        else {
            apiKeyInput.type = 'password';
        }
    });
}
// ========== КОНЕЦ ФУНКЦИЙ ДЛЯ API КЛЮЧА ==========
// Обработчик для select (выбор уровня)
if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        const selectedLevel = e.target.value;
        currentLevel = selectedLevel;
        await saveLevelToStorage(currentLevel);
        if (statusDiv) {
            statusDiv.textContent = `Выбран уровень: ${currentLevel} (сохранён)`;
            statusDiv.style.color = 'blue';
        }
    });
}
// Обработчик для кнопки упрощения текста
simplifyBtn?.addEventListener('click', () => {
    if (!currentApiKey) {
        if (statusDiv) {
            statusDiv.textContent = 'Ошибка: сначала введите API ключ';
            statusDiv.style.color = 'red';
        }
        return;
    }
    if (statusDiv) {
        statusDiv.textContent = 'Упрощаю текст...';
        statusDiv.style.color = 'orange';
    }
    const simplifyMessage = {
        action: "SIMPLIFY_TEXT",
        level: currentLevel,
        apiKey: currentApiKey
    };
    chrome.runtime.sendMessage(simplifyMessage, (response) => {
        if (chrome.runtime.lastError) {
            if (statusDiv) {
                statusDiv.textContent = 'Ошибка: ' + chrome.runtime.lastError.message;
                statusDiv.style.color = 'red';
            }
        }
        else {
            if (statusDiv) {
                statusDiv.textContent = 'Текст упрощается...';
                statusDiv.style.color = 'green';
            }
            console.log('Ответ от background:', response?.text);
        }
    });
});
function setVersionBadge() {
    if (!versionBadge)
        return;
    try {
        const manifest = chrome.runtime.getManifest();
        const version = manifest?.version || 'unknown';
        versionBadge.textContent = `v${version} — beta test`;
    }
    catch (error) {
        console.warn('[Popup] Не удалось получить версию расширения', error);
    }
}
// Загружаем сохранённые настройки при открытии popup
async function initializePopup() {
    console.log('[Popup] Инициализация popup...');
    console.log('[Popup] Поле apiKeyInput найдено:', !!apiKeyInput);
    await loadLevelFromStorage();
    await loadApiKeyFromStorage();
    setupApiKeyTracking();
    setupShowApiKeyToggle();
    setVersionBadge();
}
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.textComplexityLevel) {
        const newLevel = changes.textComplexityLevel.newValue;
        currentLevel = newLevel;
        if (levelSelect) {
            levelSelect.value = newLevel;
        }
    }
});
// Инициализируем popup
initializePopup();
export {};
