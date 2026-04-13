import { GROQ_API } from "./config.js";
import { PROMTS } from "./config.js";
// определяем все нужные сообщения, которые будут отправляться
const EnableButtonMessage = { action: "ENABLE_BUTTON" };
const DisableButtonMessage = { action: "DISABLE_BUTTON" };
const GetSelectedTextMessage = { action: "GET_SELECTED_TEXT" };
let returnTextEnabled = false; // переменная для отслеживания, нужно ли возвращать оригинальный текст
// функция для отправки сообщения Groq для упрощения текста
async function GetSimplifiedText(level, text) {
    const promt = PROMTS[level];
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: "POST", // метод POST означает что мы отправляем запрос на сервер, а не просто получаем данные
        headers: {
            'Content-Type': 'application/json', // тут мы говорим что используем json в теле запроса
            'Authorization': `Bearer ${GROQ_API}` // через это мы передаём наш API ключ
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
    }
    else {
        // если всё хорошо то мы принимает данные и отправляем в console.log
        const data = await response.json();
        console.log(data);
        const text = data.choices[0].message.content; // по этому пути мы можем получить текст ответа от groq
        console.log(text);
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
            });
        }
    });
}
;
// // функция чтобы посторить промт для groq в зависимости от уровня сложности
// function buildPrompt(level: Level, text: string): string{
//     return PROMTS[level].replace("{TEXT}", text);
// }
// принимаем сообщение с popup и выполняем нужный запрос
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SIMPLIFY_TEXT") {
        console.log('Получено сообщение для упрощения текста с уровнем:', message.level);
        sendResponse({ text: "message from background" });
        getSelectedText(GetSelectedTextMessage, (text) => {
            //console.log("selected text: ", text);
            if (text.trim() === "") { // проверка на случай если текст пустой или состоит из одних пробелов
                console.log("Нет выделенного текста или текст состоит из одних пробелов");
                return;
            }
            if (text.trim() !== "") {
                GetSimplifiedText(message.level, text);
            }
        });
    }
    if (message.action === "RETURN_ORIGINAL_TEXT") {
        console.log('Получено сообщение для возврата оригинального текста');
        sendResponse({ text: "message from background" });
    }
});
