import { v4 as uuidv4 } from "uuid";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  
  let userId = localStorage.getItem("commute_user_id");
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem("commute_user_id", userId);
  }
  return userId;
}

export function clearUserId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("commute_user_id");
  }
}
