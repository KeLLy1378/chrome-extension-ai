// src/popup.ts

import type { Message } from './types.js';

let currentLevel: "easy" | "medium" | "hard" = 'easy';
let currentApiKey: string = '';

// Находим элементы по ID
const levelSelect = document.getElementById('levelSelect') as HTMLSelectElement | null;
const simplifyBtn = document.getElementById('simplifyBtn');
const statusDiv = document.getElementById('status');
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement | null;
const showApiKeyCheckbox = document.getElementById('showApiKey') as HTMLInputElement | null;

// Функция сохранения уровня в storage
async function saveLevelToStorage(level: "easy" | "medium" | "hard"): Promise<void> {
    try {
        await chrome.storage.local.set({ textComplexityLevel: level });
        console.log('[Popup] Уровень сохранён в storage:', level);
    } catch (error) {
        console.error('[Popup] Ошибка сохранения:', error);
    }
}

// Функция загрузки уровня из storage
async function loadLevelFromStorage(): Promise<void> {
    try {
        const result = await chrome.storage.local.get('textComplexityLevel');
        if (result.textComplexityLevel) {
            currentLevel = result.textComplexityLevel as "easy" | "medium" | "hard";
            
            if (levelSelect) {
                levelSelect.value = currentLevel;
            }
            
            if (statusDiv) {
                statusDiv.textContent = `Загружен уровень: ${currentLevel}`;
                statusDiv.style.color = 'blue';
            }
            console.log('[Popup] Уровень загружен из storage:', currentLevel);
        } else {
            currentLevel = 'easy';
            if (levelSelect) {
                levelSelect.value = 'easy';
            }
            await saveLevelToStorage('easy');
            if (statusDiv) {
                statusDiv.textContent = `Уровень по умолчанию: easy`;
            }
        }
    } catch (error) {
        console.error('[Popup] Ошибка загрузки:', error);
        if (statusDiv) {
            statusDiv.textContent = 'Ошибка загрузки настроек';
            statusDiv.style.color = 'red';
        }
    }
}

// ========== ФУНКЦИИ ДЛЯ API КЛЮЧА ==========

// Функция сохранения API ключа в storage
async function saveApiKeyToStorage(apiKey: string): Promise<void> {
    try {
        await chrome.storage.local.set({ apiKey: apiKey });
        console.log('[Popup] API ключ сохранён в storage, длина:', apiKey.length);
    } catch (error) {
        console.error('[Popup] Ошибка сохранения API ключа:', error);
    }
}

// Функция загрузки API ключа из storage (С УЛУЧШЕННОЙ ОТЛАДКОЙ)
async function loadApiKeyFromStorage(): Promise<void> {
    try {
        console.log('[Popup] Начинаем загрузку API ключа из storage...');
        const result = await chrome.storage.local.get('apiKey');
        console.log('[Popup] Получены данные из storage:', result);
        
        if (result.apiKey && typeof result.apiKey === 'string') {
            currentApiKey = result.apiKey;
            if (apiKeyInput) {
                apiKeyInput.value = currentApiKey;
                console.log('[Popup] API ключ установлен в поле ввода, длина:', currentApiKey.length);
            } else {
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
        } else {
            console.log('[Popup] API ключ не найден в storage или не является строкой');
            if (apiKeyInput) {
                apiKeyInput.value = '';
            }
        }
    } catch (error) {
        console.error('[Popup] Ошибка загрузки API ключа:', error);
    }
}

// Функция для отслеживания изменений в поле API ключа
function setupApiKeyTracking(): void {
    if (!apiKeyInput) {
        console.error('[Popup] Поле apiKeyInput не найдено, отслеживание не настроено');
        return;
    }
    
    console.log('[Popup] Настройка отслеживания изменений API ключа');
    
    let saveTimeout: number | undefined;
    
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
function setupShowApiKeyToggle(): void {
    if (!showApiKeyCheckbox || !apiKeyInput) return;
    
    showApiKeyCheckbox.addEventListener('change', () => {
        if (showApiKeyCheckbox.checked) {
            apiKeyInput.type = 'text';
        } else {
            apiKeyInput.type = 'password';
        }
    });
}

// ========== КОНЕЦ ФУНКЦИЙ ДЛЯ API КЛЮЧА ==========

// Обработчик для select (выбор уровня)
if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        const selectedLevel = (e.target as HTMLSelectElement).value as "easy" | "medium" | "hard";
        currentLevel = selectedLevel;
        
        await saveLevelToStorage(currentLevel);
        
        if (statusDiv) {
            statusDiv.textContent = `Выбран уровень: ${currentLevel} (сохранён)`;
            statusDiv.style.color = 'blue';
        }
        
        const updateMessage: Message = { action: "SIMPLIFY_TEXT", level: currentLevel };
        chrome.runtime.sendMessage(updateMessage).catch(err => 
            console.log('Фоновый процесс ещё не готов:', err)
        );
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
        } else {
            if (statusDiv) {
                statusDiv.textContent = 'Текст упрощается...';
                statusDiv.style.color = 'green';
            }
            console.log('Ответ от background:', response?.text);
        }
    });
});

// Загружаем сохранённые настройки при открытии popup
async function initializePopup(): Promise<void> {
    console.log('[Popup] Инициализация popup...');
    console.log('[Popup] Поле apiKeyInput найдено:', !!apiKeyInput);
    await loadLevelFromStorage();
    await loadApiKeyFromStorage();
    setupApiKeyTracking();
    setupShowApiKeyToggle();
}

// Инициализируем popup
initializePopup();