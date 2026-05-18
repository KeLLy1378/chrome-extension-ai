import { PROMTS } from "./config.js";
// определяем все нужные сообщения, которые будут отправляться
const EnableButtonMessage = { action: "ENABLE_BUTTON" };
const DisableButtonMessage = { action: "DISABLE_BUTTON" };
const GetSelectedTextMessage = { action: "GET_SELECTED_TEXT" };
let returnTextEnabled = false; // переменная для отслеживания, нужно ли возвращать оригинальный текст
// функция для отправки сообщения Groq для упрощения текста
async function GetSimplifiedText(level, text) {
    const promt = PROMTS[level];
    const apiGroqKey = await chrome.storage.local.get('apiKey');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: "POST", // метод POST означает что мы отправляем запрос на сервер, а не просто получаем данные
        headers: {
            'Content-Type': 'application/json', // тут мы говорим что используем json в теле запроса
            'Authorization': `Bearer ${apiGroqKey.apiKey}` // через это мы передаём наш API ключ
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: promt
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        })
    });
    // проверка на случай если что то не так с запросом, чтобы вывелась сама ошибка, а не просто in promise error
    if (!response.ok) {
        const errorJson = await response.json().catch(async () => {
            const text = await response.text();
            return { raw: text };
        });
        console.log("Status:", response.status);
        console.log("Groq error full:", errorJson);
        return null;
    }
    else {
        // если всё хорошо то мы принимает данные и отправляем в console.log
        const data = await response.json();
        console.log(data);
        const text = data.choices[0].message.content; // по этому пути мы можем получить текст ответа от groq
        console.log(text);
        return text;
    }
}
;
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
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "SIMPLIFY_TEXT") {
        try {
            console.log("Получен запрос на упрощение");
            const simplifiedText = await GetSimplifiedText(message.level, message.text);
            sendResponse({
                success: true,
                result: simplifiedText
            });
        }
        catch (error) {
            console.error(error);
            sendResponse({
                success: false,
                error: "Ошибка API"
            });
        }
        return true;
    }
});
