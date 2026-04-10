// src/popup.js

let currentLevel = 'easy';

// Находим элементы по ID
const levelSelect = document.getElementById('levelSelect');
const simplifyBtn = document.getElementById('simplifyBtn');
const statusDiv = document.getElementById('status');

// СКРЫВАЕМ или УДАЛЯЕМ статус Div, чтобы сообщения не выводились
if (statusDiv) {
    statusDiv.style.display = 'none'; // Скрываем элемент
    // или можно полностью удалить: statusDiv.remove();
}

// Функция сохранения уровня в storage
async function saveLevelToStorage(level) {
    try {
        await chrome.storage.local.set({ textComplexityLevel: level });
        console.log('[Popup] Уровень сохранён в storage:', level);
    } catch (error) {
        console.error('[Popup] Ошибка сохранения:', error);
    }
}

// Функция загрузки уровня из storage
async function loadLevelFromStorage() {
    try {
        const result = await chrome.storage.local.get('textComplexityLevel');
        if (result.textComplexityLevel) {
            currentLevel = result.textComplexityLevel;
            
            // Устанавливаем значение в select
            if (levelSelect) {
                levelSelect.value = currentLevel;
            }
            
            // УБИРАЕМ вывод в statusDiv
            console.log('[Popup] Уровень загружен из storage:', currentLevel);
        } else {
            // Дефолтный уровень
            currentLevel = 'easy';
            if (levelSelect) {
                levelSelect.value = 'easy';
            }
            await saveLevelToStorage('easy');
            console.log('[Popup] Установлен уровень по умолчанию: easy');
        }
    } catch (error) {
        console.error('[Popup] Ошибка загрузки:', error);
    }
}

// Обработчик для select (выбор уровня)
if (levelSelect) {
    levelSelect.addEventListener('change', async (e) => {
        const selectedLevel = e.target.value;
        currentLevel = selectedLevel;
        
        // Сохраняем в storage
        await saveLevelToStorage(currentLevel);
        
        // УБИРАЕМ вывод в statusDiv
        console.log('[Popup] Выбран уровень:', currentLevel);
        
        // Опционально: отправляем обновление уровня в background
        const updateMessage = { action: "SIMPLIFY_TEXT", level: currentLevel };
        chrome.runtime.sendMessage(updateMessage).catch(err => 
            console.log('Фоновый процесс ещё не готов:', err)
        );
    });
}

// Обработчик для кнопки упрощения текста
if (simplifyBtn) {
    simplifyBtn.addEventListener('click', () => {
        // УБИРАЕМ вывод в statusDiv
        console.log('[Popup] Нажата кнопка упрощения текста');
        
        // СОЗДАЁМ СООБЩЕНИЕ
        const simplifyMessage = { 
            action: "SIMPLIFY_TEXT", 
            level: currentLevel 
        };
        
        // ОТПРАВЛЯЕМ В BACKGROUND
        chrome.runtime.sendMessage(simplifyMessage, (response) => {
            if (chrome.runtime.lastError) {
                // УБИРАЕМ вывод в statusDiv
                console.error('[Popup] Ошибка:', chrome.runtime.lastError.message);
            } else {
                // УБИРАЕМ вывод в statusDiv
                console.log('[Popup] Ответ от background:', response?.text);
                console.log('[Popup] Текст упрощается...');
            }
        });
    });
}

// Загружаем сохранённый уровень при открытии popup
loadLevelFromStorage();