// The rules for AI task steps, used by the break-down-task Edge Function.
//
// This file checks OpenAI's reply before it is saved. It is plain TypeScript
// (no Deno or Node features), so the Jest tests in tests/unit can test it too.

export const MIN_STEPS = 2;
export const MAX_STEPS = 6;
export const MAX_STEP_LENGTH = 120;

export type TaskStep = {
  text: string;
  done: boolean;
};

// Tidy up one step: no bullet or "Step 1:" in front, single spaces, not too long.
function cleanStepText(raw: string): string {
  return raw
    .trim()
    .replace(/^[-*•]\s*/, "")
    .replace(/^(?:step\s*)?\d+\s*[.):-]\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_STEP_LENGTH)
    .trim();
}

// Turn the AI's reply into a list of steps. Returns [] if the reply is not
// usable, so a bad reply never overwrites a task's steps.
export function parseSteps(raw: string | null | undefined): TaskStep[] {
  const cleaned = (raw ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { steps?: unknown } | null)?.steps;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const steps: TaskStep[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const text = cleanStepText(item);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    steps.push({ text, done: false });
    if (steps.length === MAX_STEPS) break;
  }

  return steps.length >= MIN_STEPS ? steps : [];
}
