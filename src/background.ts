chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SIMPLIFY_TEXT") {
        console.log('Получено сообщение для упрощения текста с уровнем:', message.level);
        sendResponse({text: "hi"});
        return true; // это указывает на то, что мы будем отправлять ответ асинхронно
    }
});