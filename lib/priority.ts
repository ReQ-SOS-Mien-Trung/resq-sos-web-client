import type { Priority } from "@/type";

export const PRIORITY_ORDER: Record<Priority, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
  P4: 3,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: "Rất nghiêm trọng",
  P2: "Nghiêm trọng",
  P3: "Trung bình",
  P4: "Thấp",
};

export const PRIORITY_BADGE_VARIANT: Record<
  Priority,
  "p1" | "p2" | "p3" | "p4"
> = {
  P1: "p1",
  P2: "p2",
  P3: "p3",
  P4: "p4",
};

export const PRIORITY_TEXT_COLOR: Record<Priority, string> = {
  P1: "text-red-500",
  P2: "text-orange-500",
  P3: "text-yellow-500",
  P4: "text-teal-500",
};

export const PRIORITY_BORDER_COLOR: Record<Priority, string> = {
  P1: "border-red-400 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10",
  P2: "border-orange-400 bg-orange-50/50 dark:border-orange-800/40 dark:bg-orange-900/10",
  P3: "border-yellow-400 bg-yellow-50/50 dark:border-yellow-800/40 dark:bg-yellow-900/10",
  P4: "border-teal-400 bg-teal-50/50 dark:border-teal-800/40 dark:bg-teal-900/10",
};

export const PRIORITY_BORDER_LEFT_COLOR: Record<Priority, string> = {
  P1: "border-l-red-500",
  P2: "border-l-orange-500",
  P3: "border-l-yellow-500",
  P4: "border-l-teal-500",
};
