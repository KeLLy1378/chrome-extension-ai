import type { Message } from "./types"; 

// принимаем сообщение с popup
// тут мы получаем запрос на упрощение текста.
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    if (message.action === "SIMPLIFY_TEXT") {
        console.log('Получено сообщение для упрощения текста с уровнем:', message.level);
        sendResponse({text: "message from background"});
    }
});