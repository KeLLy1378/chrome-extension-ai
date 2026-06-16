// src/types.ts

export type Message =
    | { action: "SIMPLIFY_TEXT", level: Level, text: string, provider?: string }
    | { action: "SIMPLIFY_RESULT", result: string }
    | { action: "RETURN_ORIGINAL_TEXT" }
    | { action: "GET_SELECTED_TEXT" }
    | { action: "ENABLE_BUTTON" }
    | { action: "DISABLE_BUTTON" };

export type Level = "simplify" | "shorten" | "essence";