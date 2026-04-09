// src/popup.ts

import type { Message } from './types.js';

let currentLevel: "easy" | "medium" | "hard" = 'easy';

// Находим элементы по ID
const levelSelect = document.getElementById('levelSelect') as HTMLSelectElement | null;
const simplifyBtn = document.getElementById('simplifyBtn');
const statusDiv = document.getElementById('status');

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
            
            // Устанавливаем значение в select
            if (levelSelect) {
                levelSelect.value = currentLevel;
            }
            
            if (statusDiv) {
                statusDiv.textContent = `Загружен уровень: ${currentLevel}`;
                statusDiv.style.color = 'blue';
            }
            console.log('[Popup] Уровень загружен из storage:', currentLevel);
        } else {
            // Дефолтный уровень
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

// Обработчик для select (выбор уровня)
if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        const selectedLevel = (e.target as HTMLSelectElement).value as "easy" | "medium" | "hard";
        currentLevel = selectedLevel;
        
        // Сохраняем в storage
        await saveLevelToStorage(currentLevel);
        
        if (statusDiv) {
            statusDiv.textContent = `Выбран уровень: ${currentLevel} (сохранён)`;
            statusDiv.style.color = 'blue';
        }
        
        // Опционально: отправляем обновление уровня в background
        const updateMessage: Message = { action: "SIMPLIFY_TEXT", level: currentLevel };
        chrome.runtime.sendMessage(updateMessage).catch(err => 
            console.log('Фоновый процесс ещё не готов:', err)
        );
    });
}

// Обработчик для кнопки упрощения текста
simplifyBtn?.addEventListener('click', () => {
    if (statusDiv) {
        statusDiv.textContent = 'Упрощаю текст...';
        statusDiv.style.color = 'orange';
    }
    
    // СОЗДАЁМ СООБЩЕНИЕ С ТИПОМ Message
    const simplifyMessage: Message = { 
        action: "SIMPLIFY_TEXT", 
        level: currentLevel 
    };
    
    // ОТПРАВЛЯЕМ В BACKGROUND
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
            console.log('Ответ от background:', response);
        }
    });
});

// Загружаем сохранённый уровень при открытии popup
loadLevelFromStorage();