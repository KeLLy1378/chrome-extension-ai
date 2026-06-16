import { PROMTS } from "./config.js";
// определяем все нужные сообщения, которые будут отправляться
const EnableButtonMessage = { action: "ENABLE_BUTTON" };
const DisableButtonMessage = { action: "DISABLE_BUTTON" };
const GetSelectedTextMessage = { action: "GET_SELECTED_TEXT" };
let returnTextEnabled = false; // переменная для отслеживания, нужно ли возвращать оригинальный текст
// функция для отправки запроса к Cloudflare Worker
async function GetSimplifiedText(level, text, provider) {
    const promt = PROMTS[level];
    const WORKER_URL = 'https://chrome-extension-worker.kelly781337673.workers.dev/';
    let response;
    try {
        response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: promt,
                text: text,
                provider: provider
            })
        });
    }
    catch (err) {
        console.error("Не удалось связаться с Worker:", err);
        return { ok: false, error: "Нет связи с сервером. Проверьте интернет-соединение." };
    }
    if (!response.ok) {
        const errorJson = await response.json().catch(async () => {
            const t = await response.text();
            return { raw: t };
        });
        console.log("Status:", response.status);
        console.log("Worker error full:", errorJson);
        return { ok: false, error: errorJson?.error || "Ошибка сервера. Попробуйте позже." };
    }
    else {
        const data = await response.json();
        return { ok: true, result: data.result, provider: data.provider, model: data.model };
    }
}
// функция получения текста со страницы
function getSelectedText(msg, callback) {
    // отпрвка запроса в content-script для получения выделенного текста
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        const currentTab = tabs[0]; // тут храниться текущая вкладка. union type на случай если undefined
        if (currentTab != null && currentTab.id != null) {
            chrome.tabs.sendMessage(currentTab.id, GetSelectedTextMessage, (response) => {
                if (response != null && response.text != null) {
                    callback(response.text); // вызываем callback с полученным текстом
                }
                else {
                    console.log("Нет ответа от content-script или в ответе нет текста");
                }
            });
        }
    });
}
;
// принимаем сообщение с content script и выполняем нужный запрос
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SIMPLIFY_TEXT") {
        try {
            console.log("Получен запрос на упрощение");
            GetSimplifiedText(message.level, message.text, message.provider).then((simplified) => {
                if (simplified.ok) {
                    sendResponse({
                        success: true,
                        result: simplified.result,
                        provider: simplified.provider,
                        model: simplified.model
                    });
                }
                else {
                    sendResponse({
                        success: false,
                        error: simplified.error
                    });
                }
            }).catch((error) => {
                console.error(error);
                sendResponse({
                    success: false,
                    error: "Нет связи с сервером. Проверьте интернет-соединение."
                });
            });
        }
        catch (error) {
            console.error(error);
            sendResponse({
                success: false,
                error: "Нет связи с сервером. Проверьте интернет-соединение."
            });
        }
        return true;
    }
});
