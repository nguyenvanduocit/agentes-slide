import type { Chapter, Lesson } from "./types";

// Pure navigation over the deck: a position is (lesson index, step index) in reading order.

export interface Position {
  readonly lesson: number;
  readonly step: number;
}

export function flatLessons(chapters: readonly Chapter[]): readonly Lesson[] {
  return chapters.flatMap((c) => c.lessons);
}

function stepCount(lessons: readonly Lesson[], lesson: number): number {
  return lessons[lesson]?.steps.length ?? 0;
}

/** Next step; past a lesson's last step, the first step of the next lesson. Stays put at the end. */
export function next(lessons: readonly Lesson[], at: Position): Position {
  if (at.step + 1 < stepCount(lessons, at.lesson)) return { lesson: at.lesson, step: at.step + 1 };
  if (at.lesson + 1 < lessons.length) return { lesson: at.lesson + 1, step: 0 };
  return at;
}

/** Previous step; before a lesson's first step, the last step of the previous lesson. Stays put at the start. */
export function prev(lessons: readonly Lesson[], at: Position): Position {
  if (at.step > 0) return { lesson: at.lesson, step: at.step - 1 };
  if (at.lesson > 0) return { lesson: at.lesson - 1, step: Math.max(0, stepCount(lessons, at.lesson - 1) - 1) };
  return at;
}

/** Position for a `#slug/step` hash (step is 1-based); the start when the hash names nothing known. */
export function fromHash(lessons: readonly Lesson[], hash: string): Position {
  const [slug = "", rawStep = "1"] = hash.replace(/^#/, "").split("/");
  const lesson = lessons.findIndex((l) => l.slug === slug);
  if (lesson < 0) return { lesson: 0, step: 0 };
  const step = Number.parseInt(rawStep, 10) - 1;
  const last = stepCount(lessons, lesson) - 1;
  return { lesson, step: Number.isFinite(step) ? Math.min(Math.max(step, 0), last) : 0 };
}

export function toHash(lessons: readonly Lesson[], at: Position): string {
  const slug = lessons[at.lesson]?.slug ?? "";
  return `#${slug}/${String(at.step + 1)}`;
}
