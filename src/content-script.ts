console.log("Content script loaded");

// тип сообщений Message
type Message = 
    | { action: "SIMPLIFY_TEXT", level: Level, apiKey?: string }  // Добавляем apiKey (опциональный)
    | { action: "SIMPLIFY_RESULT", result: string }
    | { action: "RETURN_ORIGINAL_TEXT" }
    | { action: "GET_SELECTED_TEXT" }
    | { action: "ENABLE_BUTTON" }
    | { action: "DISABLE_BUTTON" }
    | { action: "UPDATE_API_KEY", apiKey: string }  // Добавляем новый тип для обновления ключа
    | { action: "GET_API_KEY" };  // Опционально

// локальное определение типа Level
type Level = "easy" | "medium" | "hard";

// глобальная переменная для overlay
let overlay: HTMLDivElement | null = null;
// глобальная переменная для хранения последнего выделенного текста
let lastSelectedText: string | null = null;
let chatOverlay: HTMLDivElement | null = null;
// создадим html элемент по нажатию на который будет появляться chatOverlay
let chatIconButton: HTMLButtonElement | null = null;

// функция получения выделенного текста на странице
async function getSelectedText(): Promise<string | null> {
    let selected: Selection | null = window.getSelection();
    if (!selected || selected.toString().trim() === "") {
        console.log("Нет выделенного текста");
        return null;
    } else {
        const text = selected.toString();
        console.log(text);
        return text;
    }
}

// обработчик сообщений от background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "GET_SELECTED_TEXT") {
        const text = await getSelectedText();
        sendResponse({text: text});
        return true; // важно для асинхронных операций
    }
    if (message.action === "SIMPLIFY_RESULT") {
        if (overlay) {
            const resultBlock = overlay.querySelector("#result") as HTMLDivElement;
            if (resultBlock) {
                resultBlock.style.display = "block";
                resultBlock.textContent = message.result;
            }
        }
        return true;
    }
});


// функция создания overlay 
function createOverlay(): HTMLDivElement {
    // создаём div для нашего overlay
    const div = document.createElement("div");
    div.id = "text-adaption-overlay";

    // устанавливаем HTML структуру overlay
    div.innerHTML = `
        <div class="text-adapter-title">Адаптация текста</div>

        <div class="text-adapter-actions">
            <select id="simplification-level">
                <option value="easy">Легкое упрощение</option>
                <option value="medium">Среднее упрощение</option>
                <option value="hard">Сильное упрощение</option>
            </select>
            <button id="simplify-button" class="text-adapter-button primary">
                Упростить
            </button>

            <button id="close-overlay-button" class="text-adapter-button secondary">
                Закрыть
            </button>
        </div>
    `;

    // добавляем overlay в body страницы
    document.body.appendChild(div);

    // загружаем уровень из storage и устанавливаем по умолчанию
    const select = div.querySelector('#simplification-level') as HTMLSelectElement;

    chrome.storage.local.get('textComplexityLevel', (result) => {
        const level: Level = (result.textComplexityLevel as Level) || 'easy';
        if (select) {
            select.value = level;
        }
    });

    // добавляем обработчики событий для кнопок и других элементов внутри overlay
    const simplifyButton = div.querySelector("#simplify-button");
    const closeButton = div.querySelector("#close-overlay-button");

    // обработчик кнопки упрощения текста
    if (simplifyButton instanceof HTMLButtonElement) {

    simplifyButton.addEventListener("click", async (event) => {

        event.stopPropagation();

        if (!lastSelectedText) {
            return;
        }

        const select =
            div.querySelector(
                "#simplification-level"
            ) as HTMLSelectElement;

        const level = select.value as Level;

        showChatOverlay();

        appendMessage(
            "user",
            lastSelectedText
        );

        appendMessage(
            "assistant",
            "Генерируем ответ..."
        );

        chrome.runtime.sendMessage(
            {
                action: "SIMPLIFY_TEXT",

                text: lastSelectedText,

                level: level
            },

            (response) => {

                if (!response) {

                    appendMessage(
                        "assistant",
                        "Нет ответа от background???"
                    );

                    return;
                }

                if (response.success) {

                    appendMessage(
                        "assistant",
                        response.result
                    );

                } else {

                    appendMessage(
                        "assistant",
                        `Ошибка:
${response.error}`
                    );
                }
            }
        );
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
function showOverlay(x: number, y: number): void {
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
function hideOverlay(): void {
    if (overlay) {
        overlay.style.display = "none"; // скрываем его
    }
}

// функция получения координат выделенного текста
function getSelectionCoords(): DOMRect | null {
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
function showOverlayNearSelection(): void {
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



// фукнция chatOverlay для ответа от ИИ

function createChatOverlay(): HTMLDivElement {
    const div = document.createElement("div");

    div.id = "ai-chat-overlay";

    div.innerHTML = `
        <div class="ai-chat-header">
            <span>Чат</span>

            <button id="close-chat-overlay">
                ✕
            </button>
        </div>

        <div id="ai-chat-messages" class="ai-chat-messages"></div>

        <div class="ai-chat-input-container">
            <input 
                id="ai-chat-input"
                type="text"
                placeholder="Напишите сообщение..."
            />

            <button id="send-chat-message">
                Отправить
            </button>
        </div>
    `;

    document.body.appendChild(div);

    const closeButton = div.querySelector("#close-chat-overlay");

    if (closeButton instanceof HTMLButtonElement) {
        closeButton.addEventListener("click", () => {
            div.style.display = "none";
        });
    }

    return div;
}

// функция показа chatOverlay

function showChatOverlay(): void {
    if (!chatOverlay) {
        chatOverlay = createChatOverlay();
    }

    chatOverlay.style.display = "flex";
}

// функция добавления сообщения в chatOverlay

function appendMessage(
    role: "user" | "assistant",
    text: string
): void {

    if (!chatOverlay) {
        return;
    }

    const messagesContainer = chatOverlay.querySelector("#ai-chat-messages");

    if (!(messagesContainer instanceof HTMLDivElement)) {
        return;
    }

    const message = document.createElement("div");

    message.classList.add("ai-chat-message");
    message.classList.add(role);

    message.textContent = text;

    messagesContainer.appendChild(message);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// функция создания иконки для открытия chatOverlay

function createChatIconButton(): HTMLButtonElement {

    const button = document.createElement("button");

    button.id = "ai-chat-floating-button";

    button.innerHTML = "Chat";

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        toggleChatOverlay();
    });

    document.body.appendChild(button);

    return button;
}

function toggleChatOverlay(): void {

    if (!chatOverlay) {
        showChatOverlay();
        return;
    }

    const isVisible = chatOverlay.style.display === "flex";

    if (isVisible) {
        chatOverlay.style.display = "none";
    } else {
        chatOverlay.style.display = "flex";
    }
}

// инициализация кнопки для открытия chatOverlay при загрузке страницы
chatIconButton = createChatIconButton();