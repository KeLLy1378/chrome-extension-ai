export type Message = | {action: "SIMPLIFY_TEXT", level: "easy" | "medium" | "hard"} 
| {action: "RETURN_ORIGINAL_TEXT"}
| {action: "GET_SELECTED_TEXT"}
| {action: "ENABLE_BUTTON"}
| {action: "DISABLE_BUTTON"}