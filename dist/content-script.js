"use strict";
console.log("Content script loaded");
// глобальная переменная для overlay
let overlay = null;
// глобальная переменная для хранения последнего выделенного текста
let lastSelectedText = null;
let chatOverlay = null;
let chatOverlayShadow = null;
let chatIconButton = null;
let selectedProvider = 'groq';
const minTextLength = 200; // минимальная длина текста для упрощения
// Shadow host и root для всего UI расширения
let extensionHost = null;
let shadowRootRef = null;
const overlayCssUrl = chrome.runtime.getURL('overlay.css');
// Инициализация единого Shadow Root для всего UI расширения
async function initializeShadowRoot() {
    if (shadowRootRef)
        return shadowRootRef;
    if (!document.body) {
        await new Promise((resolve) => {
            window.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
    }
    extensionHost = document.createElement('div');
    extensionHost.id = 'extension-ui-host';
    extensionHost.style.position = 'absolute';
    extensionHost.style.left = '0';
    extensionHost.style.top = '0';
    extensionHost.style.zIndex = '2147483647';
    document.body.appendChild(extensionHost);
    const shadow = extensionHost.attachShadow({ mode: 'open' });
    // загрузка overlay.css и вставка в shadow root как <style>
    try {
        const cssUrl = overlayCssUrl;
        const res = await fetch(cssUrl);
        const css = await res.text();
        const style = document.createElement('style');
        style.textContent = css;
        shadow.appendChild(style);
    }
    catch (err) {
        // при ошибке загрузки CSS — продолжим без него
        console.warn('Не удалось загрузить overlay.css into ShadowRoot', err);
    }
    const extraStyle = document.createElement('style');
    extraStyle.textContent = `
        .simply-chip__hint { display: none; }
        .simply-chip:hover .simply-chip__hint { display: block; }
    `;
    shadow.appendChild(extraStyle);
    shadowRootRef = shadow;
    return shadowRootRef;
}
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
        console.log("Кол-во символов в выделенном тексте:", text.length);
        return text;
    }
}
function trimPartialWords(text) {
    let result = text.trim();
    result = result.replace(/^\S*?\s/, (match) => {
        return /^[а-яёa-z]/.test(match) ? '' : match;
    });
    result = result.replace(/\s\S*$/, (match) => {
        return /[.!?»)\]]\s*$/.test(match) ? match : '';
    });
    return result.trim();
}
function getPageText() {
    const ignoreTags = ['script', 'style', 'nav', 'header', 'footer',
        'button', 'input', 'select', 'textarea', 'menu',
        'aside', 'form', 'noscript'];
    const clone = document.body.cloneNode(true);
    ignoreTags.forEach(tag => {
        clone.querySelectorAll(tag).forEach(el => el.remove());
    });
    return clone.innerText.trim();
}
// обработчик сообщений от background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "GET_SELECTED_TEXT") {
        getSelectedText().then(text => {
            sendResponse({ text: text });
        });
        return true; // важно для асинхронных операций
    }
});
// функция создания overlay 
async function createOverlay() {
    await initializeShadowRoot();
    // создаём div для нашего overlay внутри ShadowRoot
    const div = document.createElement('div');
    div.id = 'text-adaption-overlay';
    div.innerHTML = `
        <div class="text-adapter-actions">
            <button class="text-adapter-level" data-level="simplify">Упростить язык</button>
            <button class="text-adapter-level" data-level="shorten">Сократить</button>
            <button class="text-adapter-level" data-level="essence">Выжать суть</button>
        </div>
    `;
    shadowRootRef?.appendChild(div);
    overlay = div;
    div.querySelectorAll('.text-adapter-level').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!lastSelectedText)
                return;
            if (lastSelectedText.trim().length < minTextLength) {
                alert(`Пожалуйста, выделите текст длиной не менее ${minTextLength} символов для упрощения.`);
                return;
            }
            const level = btn.dataset.level;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            simplifyText(lastSelectedText, level);
            hideOverlay();
        });
    });
    return div;
}
// функция показа overlay
async function showOverlay(x, y) {
    if (!overlay) {
        overlay = await createOverlay();
    }
    if (!overlay)
        return;
    // добавляем небольшой отступ от курсора
    const offset = 10;
    overlay.style.left = `${x + offset}px`;
    overlay.style.top = `${y + offset}px`;
    overlay.style.display = 'block';
    // сбрасываем состояние элементов overlay (внутри shadow root)
    const selectedTextWindow = shadowRootRef?.querySelector('#selected-text-window');
    const selectedTextPreview = shadowRootRef?.querySelector('#selected-text-preview');
    const resultBlock = shadowRootRef?.querySelector('#result');
    if (selectedTextWindow instanceof HTMLDivElement) {
        selectedTextWindow.style.display = 'none';
    }
    if (selectedTextPreview instanceof HTMLDivElement) {
        selectedTextPreview.textContent = '';
    }
    if (resultBlock instanceof HTMLDivElement) {
        resultBlock.style.display = 'none';
        resultBlock.textContent = '';
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
async function showOverlayNearSelection() {
    const coords = getSelectionCoords();
    if (!coords) {
        hideOverlay();
        return;
    }
    // рассчитываем позицию overlay с учётом скролла
    const x = coords.left + window.scrollX;
    const y = coords.bottom + window.scrollY + 8;
    await showOverlay(x, y);
}
// обработчик события mouseup для показа overlay при выделении текста
document.addEventListener('mouseup', (event) => {
    // если клик был внутри extensionHost, игнорируем
    if (extensionHost && event.composedPath().includes(extensionHost)) {
        return;
    }
    // используем setTimeout для того, чтобы selection успел обновиться после mouseup
    setTimeout(async () => {
        const text = await getSelectedText();
        if (!text) {
            hideOverlay();
            return;
        }
        lastSelectedText = trimPartialWords(text) || text;
        await showOverlayNearSelection();
    }, 100);
});
document.addEventListener('mousedown', (event) => {
    if (overlay &&
        overlay.style.display !== 'none' &&
        extensionHost &&
        !event.composedPath().includes(extensionHost)) {
        hideOverlay();
    }
});
// фукнция chatOverlay для ответа от ИИ
async function createChatOverlay() {
    await initializeShadowRoot();
    const div = document.createElement('div');
    div.id = 'ai-chat-overlay';
    div.innerHTML = `
        <div class="simply-header">
            <div class="simply-header-title">
                <span>Simply</span>
            </div>
            <button id="close-chat-overlay">✕</button>
        </div>

        <div id="simply-feed" class="simply-feed"></div>

        <div class="simply-footer-bar">
            <select id="simply-provider" class="simply-provider">
                <option value="groq">Groq — gpt-oss-120b</option>
                <option value="gemini">Gemini — gemini-2.5-flash</option>
            </select>
        </div>
    `;
    shadowRootRef?.appendChild(div);
    const closeButton = div.querySelector('#close-chat-overlay');
    if (closeButton instanceof HTMLButtonElement) {
        closeButton.addEventListener('click', () => {
            div.style.display = 'none';
        });
    }
    const providerSelect = div.querySelector('#simply-provider');
    if (providerSelect instanceof HTMLSelectElement) {
        providerSelect.value = selectedProvider;
        providerSelect.addEventListener('change', () => {
            selectedProvider = providerSelect.value;
            chrome.storage.local.set({ selectedProvider });
        });
    }
    chatOverlay = div;
    return div;
}
// функция показа chatOverlay
async function showChatOverlay() {
    if (!chatOverlay) {
        chatOverlay = await createChatOverlay();
    }
    if (!chatOverlay)
        return;
    chatOverlay.style.display = 'flex';
}
const RESULT_LABELS = {
    simplify: 'УПРОЩЁННЫЙ ЯЗЫК',
    shorten: 'СОКРАЩЕНО',
    essence: 'СУТЬ',
};
function addFeedBlock(originalText, level) {
    const feed = shadowRootRef?.querySelector('#simply-feed');
    const resultLabel = RESULT_LABELS[level] || 'РЕЗУЛЬТАТ';
    const block = document.createElement('div');
    block.className = 'simply-block';
    block.innerHTML = `
        <div class="simply-block__original">
            <span class="simply-label">ОРИГИНАЛ</span>
            <div class="simply-block__text">${originalText}</div>
        </div>
        <div class="simply-block__result">
            <span class="simply-label">${resultLabel}</span>
            <div class="simply-block__text">...</div>
            <button class="simply-copy">Скопировать</button>
            <div class="simply-block__model"></div>
        </div>
    `;
    const copyBtn = block.querySelector('.simply-copy');
    copyBtn.addEventListener('click', () => {
        const text = block.querySelector('.simply-block__result .simply-block__text')?.textContent || '';
        navigator.clipboard.writeText(text);
    });
    feed.appendChild(block);
    feed.scrollTop = feed.scrollHeight;
    return block;
}
async function simplifyText(text, level) {
    await showChatOverlay();
    const block = addFeedBlock(text, level);
    const resultText = block.querySelector('.simply-block__result .simply-block__text');
    const modelLabel = block.querySelector('.simply-block__model');
    chrome.runtime.sendMessage({ action: 'SIMPLIFY_TEXT', text, level, provider: selectedProvider }, (response) => {
        if (response?.success) {
            resultText.textContent = response.result;
            if (response?.provider && response?.model) {
                const providerName = response.provider === 'gemini' ? 'Gemini' : 'Groq';
                modelLabel.textContent = `${providerName} · ${response.model}`;
            }
        }
        else {
            resultText.textContent = response?.error || 'Не удалось получить ответ.';
        }
        const feed = shadowRootRef?.querySelector('#simply-feed');
        if (feed)
            feed.scrollTop = feed.scrollHeight;
    });
}
// функция создания иконки для открытия chatOverlay
async function createChatIconButton() {
    await initializeShadowRoot();
    const button = document.createElement('button');
    button.id = 'ai-chat-floating-button';
    button.innerHTML = 'S';
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        // не ждём: showChatOverlay асинхронна
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        showChatOverlay();
    });
    shadowRootRef?.appendChild(button);
    return button;
}
function toggleChatOverlay() {
    if (!chatOverlay) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        showChatOverlay();
        return;
    }
    const isVisible = chatOverlay.style.display === 'flex';
    if (isVisible) {
        chatOverlay.style.display = 'none';
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        showChatOverlay();
    }
}
// инициализация кнопки для открытия chatOverlay при загрузке страницы
(async () => {
    try {
        const stored = await chrome.storage.local.get(['showFloatingButton', 'selectedProvider']);
        const show = stored.showFloatingButton !== false;
        selectedProvider = stored.selectedProvider || 'groq';
        if (show) {
            chatIconButton = await createChatIconButton();
        }
    }
    catch (err) {
        console.warn('Не удалось инициализировать кнопку чата', err);
    }
})();
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !('showFloatingButton' in changes))
        return;
    const show = changes.showFloatingButton.newValue !== false;
    if (show) {
        if (!chatIconButton) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            createChatIconButton().then(btn => { chatIconButton = btn; });
        }
        else {
            chatIconButton.style.display = '';
        }
    }
    else {
        if (chatIconButton) {
            chatIconButton.style.display = 'none';
        }
    }
});
