// The task priorities. supabase/migrations/9_priority_and_ai_steps.sql allows
// the same three values.
export const PRIORITY_OPTIONS = [
  {
    value: "high",
    label: "High",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  {
    value: "medium",
    label: "Medium",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "low",
    label: "Low",
    className: "bg-green-100 text-green-800 border-green-200",
  },
];

export function getPriorityOption(value: string | null | undefined) {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === value) ??
    PRIORITY_OPTIONS[1]
  );
}
