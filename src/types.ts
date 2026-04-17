// src/types.ts

export type Message = 
    | { action: "SIMPLIFY_TEXT", level: Level, apiKey?: string }  // Добавляем apiKey (опциональный)
    | { action: "RETURN_ORIGINAL_TEXT" }
    | { action: "GET_SELECTED_TEXT" }
    | { action: "ENABLE_BUTTON" }
    | { action: "DISABLE_BUTTON" }
    | { action: "UPDATE_API_KEY", apiKey: string }  // Добавляем новый тип для обновления ключа
    | { action: "GET_API_KEY" };  // Опционально

export type Level = "easy" | "medium" | "hard";