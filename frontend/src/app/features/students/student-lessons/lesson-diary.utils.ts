import { Lesson } from '../lesson-api/lesson.model';

export const DIARY_UPCOMING_LIMIT = 5;
export const DIARY_HISTORY_LIMIT = 5;

export interface LessonDiaryGroups {
  today: Lesson[];
  upcoming: Lesson[];
  history: Lesson[];
}

/** True when any pedagogical field has non-empty text. */
export function hasLessonPedagogy(lesson: Pick<Lesson, 'content' | 'exercises' | 'observations'>): boolean {
  return !!(lesson.content?.trim() || lesson.exercises?.trim() || lesson.observations?.trim());
}

/** Short preview for list cards: first non-empty field, or null when empty. */
export function lessonPedagogyPreview(
  lesson: Pick<Lesson, 'content' | 'exercises' | 'observations'>,
): string | null {
  const candidate = lesson.content?.trim() || lesson.exercises?.trim() || lesson.observations?.trim();
  return candidate || null;
}

function compareByTimeAsc(a: Lesson, b: Lesson): number {
  return a.startTime.localeCompare(b.startTime);
}

function compareByDateTimeAsc(a: Lesson, b: Lesson): number {
  const byDate = a.date.localeCompare(b.date);
  return byDate !== 0 ? byDate : compareByTimeAsc(a, b);
}

function compareByDateTimeDesc(a: Lesson, b: Lesson): number {
  return compareByDateTimeAsc(b, a);
}

/**
 * Next future lesson: first Lesson with date > todayIso, ordered by date then startTime.
 * Does not create lessons or consult Schedule.
 */
export function findNextLesson(lessons: Lesson[], todayIso: string): Lesson | null {
  const upcoming = lessons
    .filter((lesson) => lesson.date > todayIso)
    .sort(compareByDateTimeAsc);
  return upcoming[0] ?? null;
}

/**
 * Split lessons by calendar date relative to todayIso (YYYY-MM-DD).
 * Status is ignored for bucketing. Limits apply after sorting.
 */
export function groupLessonsForDiary(
  lessons: Lesson[],
  todayIso: string,
  options: { upcomingLimit?: number; historyLimit?: number } = {},
): LessonDiaryGroups {
  const upcomingLimit = options.upcomingLimit ?? DIARY_UPCOMING_LIMIT;
  const historyLimit = options.historyLimit ?? DIARY_HISTORY_LIMIT;

  const today: Lesson[] = [];
  const upcoming: Lesson[] = [];
  const history: Lesson[] = [];

  for (const lesson of lessons) {
    if (lesson.date === todayIso) {
      today.push(lesson);
    } else if (lesson.date > todayIso) {
      upcoming.push(lesson);
    } else {
      history.push(lesson);
    }
  }

  today.sort(compareByTimeAsc);
  upcoming.sort(compareByDateTimeAsc);
  history.sort(compareByDateTimeDesc);

  return {
    today,
    upcoming: upcoming.slice(0, upcomingLimit),
    history: history.slice(0, historyLimit),
  };
}
