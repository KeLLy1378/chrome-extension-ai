export type Message = | {action: "SIMPLIFY_TEXT", level: Level} 
| {action: "RETURN_ORIGINAL_TEXT"}
| {action: "GET_SELECTED_TEXT"}
| {action: "ENABLE_BUTTON"}
| {action: "DISABLE_BUTTON"}

export type Level = "easy" | "medium" | "hard";