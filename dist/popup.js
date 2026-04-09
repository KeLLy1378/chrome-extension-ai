// popup.js

let currentLevel = 'easy';

// Находим кнопки
const levelBtns = document.querySelectorAll('.level-btn');
const simplifyBtn = document.getElementById('simplifyBtn');
const statusDiv = document.getElementById('status');

// ФУНКЦИЯ СОХРАНЕНИЯ УРОВНЯ В STORAGE
async function saveLevelToStorage(level) {
    try {
        await chrome.storage.local.set({ textComplexityLevel: level });
        console.log('[Popup] Уровень сохранён в storage:', level);
    } catch (error) {
        console.error('[Popup] Ошибка сохранения:', error);
    }
}

// ФУНКЦИЯ ЗАГРУЗКИ УРОВНЯ ИЗ STORAGE
async function loadLevelFromStorage() {
    try {
        const result = await chrome.storage.local.get('textComplexityLevel');
        if (result.textComplexityLevel) {
            currentLevel = result.textComplexityLevel;
            
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
            // Если в storage ничего нет, устанавливаем дефолтный уровень 'easy'
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
        currentLevel = btn.getAttribute('data-level');
        
        // СОХРАНЯЕМ В STORAGE
        await saveLevelToStorage(currentLevel);
        
        statusDiv.textContent = `Выбран уровень: ${currentLevel} (сохранён)`;
        statusDiv.style.color = 'blue';
        
        // ОПЦИОНАЛЬНО: сразу отправляем уровень в background
        chrome.runtime.sendMessage({
            action: "updateLevel",
            level: currentLevel
        }).catch(err => console.log('Фоновый процесс ещё не готов'));
    });
});

// ГЛАВНОЕ: Обработчик для кнопки упрощения
simplifyBtn.addEventListener('click', () => {
    // Показываем статус
    statusDiv.textContent = 'Отправляю команду...';
    statusDiv.style.color = 'orange';
    
    // ОТПРАВЛЯЕМ СООБЩЕНИЕ В BACKGROUND (с текущим уровнем)
    chrome.runtime.sendMessage({
        action: "simplify",
        level: currentLevel
    }, (response) => {
        // Проверяем ответ (если нужен)
        if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Ошибка: ' + chrome.runtime.lastError.message;
            statusDiv.style.color = 'red';
        } else {
            statusDiv.textContent = 'Команда отправлена! Жду ответ...';
            statusDiv.style.color = 'green';
            console.log('Ответ от background:', response);
        }
    });
});

// ЗАГРУЖАЕМ СОХРАНЁННЫЙ УРОВЕНЬ ПРИ ОТКРЫТИИ POPUP
loadLevelFromStorage();