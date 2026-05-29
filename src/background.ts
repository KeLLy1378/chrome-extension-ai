import type { Message } from "./types.js"; 
import { PROMTS } from "./config.js";
import type { Level } from "./types.js";

// определяем все нужные сообщения, которые будут отправляться
const EnableButtonMessage: Message = {action: "ENABLE_BUTTON"};
const DisableButtonMessage: Message = {action: "DISABLE_BUTTON"};
const GetSelectedTextMessage: Message = {action: "GET_SELECTED_TEXT"};

let returnTextEnabled: boolean = false; // переменная для отслеживания, нужно ли возвращать оригинальный текст


// функция для отправки запроса к Cloudflare Worker
async function GetSimplifiedText(level: Level, text: string) {
    const promt: string = PROMTS[level];
    const WORKER_URL = 'https://chrome-extension-worker.kelly781337673.workers.dev/';

    const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: promt,
            text: text
        })
    });

    if (!response.ok) {
        const errorJson = await response.json().catch(async () => {
            const t = await response.text();
            return { raw: t };
        });
        console.log("Status:", response.status);
        console.log("Worker error full:", errorJson);
        return null;
    } else {
        const data = await response.json();
        return data.result;
    }
}

// функция получения текста со страницы
function getSelectedText(msg: Message, callback: (text: string) => void) { // callback нужен для того, чтобы работать с текстом после его получения, так как получение текста асинхронное
    // отпрвка запроса в content-script для получения выделенного текста
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => { // через query мы получаем массив вкладок и достаём оттуда текущую активную вкладку
        const currentTab: chrome.tabs.Tab | undefined = tabs[0]; // тут храниться текущая вкладка. union type на случай если undefined
        if (currentTab != null && currentTab.id != null){
            chrome.tabs.sendMessage(currentTab.id, GetSelectedTextMessage, (response) => {
                if (response != null && response.text != null){
                    callback(response.text); // вызываем callback с полученным текстом
                }
                else {
                    console.log("Нет ответа от content-script или в ответе нет текста");
                }
            });
        }
    }
)};

// принимаем сообщение с content script и выполняем нужный запрос
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SIMPLIFY_TEXT") {
        try {
            console.log("Получен запрос на упрощение");
            
            GetSimplifiedText(message.level, message.text).then((simplifiedText) => {
                if (simplifiedText === null) {
                    sendResponse({
                        success: false,
                        error: "Ошибка API: не удалось получить ответ. Проверьте API ключ."
                    });
                } else {
                    sendResponse({
                        success: true,
                        result: simplifiedText
                    });
                }
            }).catch((error) => {
                console.error(error);
                sendResponse({
                    success: false,
                    error: "Ошибка API"
                });
            });
        } catch (error) {
            console.error(error);
            sendResponse({
                success: false,
                error: "Ошибка API"
            });
        }
        return true;
    }
});