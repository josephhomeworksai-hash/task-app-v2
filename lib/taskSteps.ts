import { Json } from "@/lib/database.types";

export type TaskStep = {
  text: string;
  done: boolean;
};

// The ai_steps column is JSON, so check its shape before showing it.
export function toTaskSteps(value: Json | undefined): TaskStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }
    return typeof item.text === "string"
      ? [{ text: item.text, done: item.done === true }]
      : [];
  });
}
