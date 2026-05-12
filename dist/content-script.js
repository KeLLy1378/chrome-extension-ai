"use strict";
console.log("Content script loaded");
// глобальная переменная для overlay
let overlay = null;
// глобальная переменная для хранения последнего выделенного текста
let lastSelectedText = null;
// функция получения выделенного текста на странице
async function getSelectedText() {
    let selected = window.getSelection();
    if (!selected || selected.toString().trim() === "") {
        console.log("Нет выделенного текста");
        return null;
    }
    else {
        const text = selected.toString();
        console.log(text);
        return text;
    }
}
// обработчик сообщений от background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "GET_SELECTED_TEXT") {
        const text = await getSelectedText();
        sendResponse({ text: text });
        return true; // важно для асинхронных операций
    }
    if (message.action === "SIMPLIFY_RESULT") {
        if (overlay) {
            const resultBlock = overlay.querySelector("#result");
            if (resultBlock) {
                resultBlock.style.display = "block";
                resultBlock.textContent = message.result;
            }
        }
        return true;
    }
});
// функция создания overlay 
function createOverlay() {
    // создаём div для нашего overlay
    const div = document.createElement("div");
    div.id = "text-adaption-overlay";
    // устанавливаем HTML структуру overlay
    div.innerHTML = `
        <div class="text-adapter-title">Адаптация текста</div>

        <div class="text-adapter-actions">
            <select id="simplification-level">
                <option value="easy">Легкий</option>
                <option value="medium">Средний</option>
                <option value="hard">Сложный</option>
            </select>
            <button id="simplify-button" class="text-adapter-button primary">
                Упростить
            </button>

            <button id="close-overlay-button" class="text-adapter-button secondary">
                Закрыть
            </button>
        </div>

        <div id="selected-text-window" class="text-adapter-selected-window">
            <div class="text-adapter-label">Выделенный фрагмент:</div>
            <div id="selected-text-preview" class="text-adapter-preview"></div>
        </div>

        <div id="result" class="text-adapter-result"></div>
    `;
    // добавляем overlay в body страницы
    document.body.appendChild(div);
    // загружаем уровень из storage и устанавливаем по умолчанию
    const select = div.querySelector('#simplification-level');
    chrome.storage.local.get('textComplexityLevel', (result) => {
        const level = result.textComplexityLevel || 'easy';
        if (select) {
            select.value = level;
        }
    });
    // добавляем обработчики событий для кнопок и других элементов внутри overlay
    const simplifyButton = div.querySelector("#simplify-button");
    const closeButton = div.querySelector("#close-overlay-button");
    const selectedTextWindow = div.querySelector("#selected-text-window");
    const selectedTextPreview = div.querySelector("#selected-text-preview");
    const resultBlock = div.querySelector("#result");
    if (simplifyButton instanceof HTMLButtonElement) {
        simplifyButton.addEventListener("click", (event) => {
            // останавливаем всплытие события, чтобы не сработал обработчик на document для скрытия overlay
            event.stopPropagation();
            if (!lastSelectedText) {
                console.log("Нет сохранённого выделенного текста");
                return;
            }
            const select = div.querySelector('#simplification-level');
            const level = select.value;
            // отправляем запрос на упрощение текста
            chrome.runtime.sendMessage({ action: "SIMPLIFY_TEXT", level: level });
            // показываем окно с выделенным текстом
            if (selectedTextWindow instanceof HTMLDivElement) {
                selectedTextWindow.style.display = "block";
            }
            // заполняем превью выделенного текста
            if (selectedTextPreview instanceof HTMLDivElement) {
                selectedTextPreview.textContent = lastSelectedText;
            }
            // показываем блок с результатом с сообщением ожидания
            if (resultBlock instanceof HTMLDivElement) {
                resultBlock.style.display = "block";
                resultBlock.textContent = "Ожидание ответа от API...";
            }
        });
    }
    if (closeButton instanceof HTMLButtonElement) {
        closeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            hideOverlay();
        });
    }
    return div;
}
// функция показа overlay
function showOverlay(x, y) {
    if (!overlay) {
        overlay = createOverlay();
    }
    // добавляем небольшой отступ от курсора
    const offset = 10;
    overlay.style.left = `${x + offset}px`;
    overlay.style.top = `${y + offset}px`;
    overlay.style.display = "block";
    // сбрасываем состояние элементов overlay
    const selectedTextWindow = overlay.querySelector("#selected-text-window");
    const selectedTextPreview = overlay.querySelector("#selected-text-preview");
    const resultBlock = overlay.querySelector("#result");
    if (selectedTextWindow instanceof HTMLDivElement) {
        selectedTextWindow.style.display = "none";
    }
    if (selectedTextPreview instanceof HTMLDivElement) {
        selectedTextPreview.textContent = "";
    }
    if (resultBlock instanceof HTMLDivElement) {
        resultBlock.style.display = "none";
        resultBlock.textContent = "";
    }
}
// функция скрытия overlay
function hideOverlay() {
    if (overlay) {
        overlay.style.display = "none"; // скрываем его
    }
}
// функция получения координат выделенного текста
function getSelectionCoords() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    // получаем первый диапазон выделенного текста
    const range = selection.getRangeAt(0);
    // получаем координаты этого диапазона
    const coords = range.getBoundingClientRect();
    return coords;
}
// функция для показа overlay при выделении текста рядом с ним
function showOverlayNearSelection() {
    const coords = getSelectionCoords();
    if (!coords) {
        hideOverlay();
        return;
    }
    // рассчитываем позицию overlay с учётом скролла
    const x = coords.left + window.scrollX;
    const y = coords.bottom + window.scrollY + 8;
    showOverlay(x, y);
}
// обработчик события mouseup для показа overlay при выделении текста
document.addEventListener("mouseup", (event) => {
    // если клик был внутри overlay, игнорируем
    if (overlay && event.target instanceof Node && overlay.contains(event.target)) {
        return;
    }
    // используем setTimeout для того, чтобы selection успел обновиться после mouseup
    setTimeout(async () => {
        const text = await getSelectedText();
        if (!text) {
            hideOverlay();
            return;
        }
        lastSelectedText = text;
        showOverlayNearSelection();
    }, 100);
});
