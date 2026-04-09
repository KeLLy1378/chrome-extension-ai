// src/popup.ts

import type { Message } from './types.js';

let currentLevel: "easy" | "medium" | "hard" = 'easy';

// Находим кнопки
const levelBtns = document.querySelectorAll('.level-btn');
const simplifyBtn = document.getElementById('simplifyBtn');
const returnOriginalBtn = document.getElementById('returnOriginalBtn'); // новая кнопка
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
            
            // Активируем соответствующую кнопку
            levelBtns.forEach(btn => {
                const btnLevel = btn.getAttribute('data-level');
                if (btnLevel === currentLevel) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            statusDiv.textContent = `Загружен уровень: ${currentLevel}`;
            statusDiv.style.color = 'blue';
            console.log('[Popup] Уровень загружен из storage:', currentLevel);
        } else {
            // Дефолтный уровень
            currentLevel = 'easy';
            const defaultBtn = document.querySelector('.level-btn[data-level="easy"]');
            if (defaultBtn) defaultBtn.classList.add('active');
            await saveLevelToStorage('easy');
            statusDiv.textContent = `Уровень по умолчанию: easy`;
        }
    } catch (error) {
        console.error('[Popup] Ошибка загрузки:', error);
        statusDiv.textContent = 'Ошибка загрузки настроек';
        statusDiv.style.color = 'red';
    }
}

// Обработчик для кнопок уровня
levelBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        // Убираем активный класс у всех
        levelBtns.forEach(b => b.classList.remove('active'));
        // Добавляем активный класс на нажатую
        btn.classList.add('active');
        // Сохраняем выбранный уровень
        const selectedLevel = btn.getAttribute('data-level') as "easy" | "medium" | "hard";
        currentLevel = selectedLevel;
        
        // Сохраняем в storage
        await saveLevelToStorage(currentLevel);
        
        statusDiv.textContent = `Выбран уровень: ${currentLevel} (сохранён)`;
        statusDiv.style.color = 'blue';
        
        // Опционально: отправляем обновление уровня в background
        const updateMessage: Message = { action: "SIMPLIFY_TEXT", level: currentLevel };
        chrome.runtime.sendMessage(updateMessage).catch(err => 
            console.log('Фоновый процесс ещё не готов:', err)
        );
    });
});

// Обработчик для кнопки упрощения текста
simplifyBtn?.addEventListener('click', () => {
    statusDiv.textContent = 'Упрощаю текст...';
    statusDiv.style.color = 'orange';
    
    // СОЗДАЁМ СООБЩЕНИЕ С ТИПОМ Message
    const simplifyMessage: Message = { 
        action: "SIMPLIFY_TEXT", 
        level: currentLevel 
    };
    
    // ОТПРАВЛЯЕМ В BACKGROUND
    chrome.runtime.sendMessage(simplifyMessage, (response) => {
        if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Ошибка: ' + chrome.runtime.lastError.message;
            statusDiv.style.color = 'red';
        } else {
            statusDiv.textContent = 'Текст упрощается...';
            statusDiv.style.color = 'green';
            console.log('Ответ от background:', response);
        }
    });
});

// Обработчик для кнопки возврата оригинального текста
returnOriginalBtn?.addEventListener('click', () => {
    statusDiv.textContent = 'Возвращаю оригинальный текст...';
    statusDiv.style.color = 'orange';
    
    // СОЗДАЁМ СООБЩЕНИЕ ДЛЯ ВОЗВРАТА
    const returnMessage: Message = { 
        action: "RETURN_ORIGINAL_TEXT"
    };
    
    // ОТПРАВЛЯЕМ В BACKGROUND
    chrome.runtime.sendMessage(returnMessage, (response) => {
        if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Ошибка: ' + chrome.runtime.lastError.message;
            statusDiv.style.color = 'red';
        } else {
            statusDiv.textContent = 'Оригинальный текст восстановлен';
            statusDiv.style.color = 'green';
            console.log('Ответ от background:', response);
        }
    });
});

// Загружаем сохранённый уровень при открытии popup
loadLevelFromStorage();