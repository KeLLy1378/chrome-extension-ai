"use strict";
console.log("Content script loaded");
// content-script случает сообщения от background и возвращает выделенный текст при запросе
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "GET_SELECTED_TEXT") {
        let selected = window.getSelection();
        if (!selected || selected.toString().trim() === "") { // проверка на то, что текст есть и он не пустой
            console.log("Нет выделенного текста");
            sendResponse({ text: null });
            return; // так мы показываем что действие происходит асинхронно и не отправляем ответ сразу, а только после получения текста
        }
        else {
            const text = selected.toString();
            console.log(text);
            sendResponse({ text: text });
            return;
        }
    }
});
