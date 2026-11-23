// Unit tests for the step rules of the break-down-task Edge Function.
// They need no Supabase project and no keys: npx jest tests/unit
import {
  MAX_STEP_LENGTH,
  MAX_STEPS,
  parseSteps,
} from "../../supabase/functions/_shared/stepRules";

describe("Step rules", () => {
  test("reads the steps and marks them as not done", () => {
    expect(parseSteps('{"steps": ["Buy paint", "Paint the wall"]}')).toEqual([
      { text: "Buy paint", done: false },
      { text: "Paint the wall", done: false },
    ]);
  });

  test("accepts a reply wrapped in a code fence", () => {
    const reply = '```json\n{"steps": ["One thing", "Another thing"]}\n```';
    expect(parseSteps(reply)).toHaveLength(2);
  });

  test("removes numbering and bullets", () => {
    const steps = parseSteps('{"steps": ["1. Call Ana", "Step 2: Send it", "- Relax"]}');
    expect(steps.map((step) => step.text)).toEqual([
      "Call Ana",
      "Send it",
      "Relax",
    ]);
  });

  test("drops repeated, empty and non-text steps", () => {
    const steps = parseSteps('{"steps": ["Plan", "plan", "", 7, "Do it"]}');
    expect(steps.map((step) => step.text)).toEqual(["Plan", "Do it"]);
  });

  test("limits the number and length of steps", () => {
    const many = Array.from({ length: 10 }, (_, i) => `Task ${"x".repeat(200)} ${i}`);
    const unique = many.map((text, i) => `${i}a ${text}`);
    const steps = parseSteps(JSON.stringify({ steps: unique }));
    expect(steps).toHaveLength(MAX_STEPS);
    steps.forEach((step) =>
      expect(step.text.length).toBeLessThanOrEqual(MAX_STEP_LENGTH)
    );
  });

  test("returns no steps for an unusable reply", () => {
    expect(parseSteps("Sorry, I can't")).toEqual([]);
    expect(parseSteps('{"steps": ["Only one"]}')).toEqual([]);
    expect(parseSteps(null)).toEqual([]);
  });
});
