export type Message = | {action: "SIMPLIFY_TEXT", level: "easy" | "medium" | "hard"} 
| {action: "RETURN_ORIGINAL_TEXT"}