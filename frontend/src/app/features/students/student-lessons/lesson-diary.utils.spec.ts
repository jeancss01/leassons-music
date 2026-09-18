import { Lesson } from '../lesson-api/lesson.model';
import {
  findNextLesson,
  groupLessonsForDiary,
  hasLessonPedagogy,
  lessonPedagogyPreview,
} from './lesson-diary.utils';

function lesson(partial: Partial<Lesson> & Pick<Lesson, 'id' | 'date'>): Lesson {
  return {
    studentId: 's1',
    scheduleId: null,
    startTime: '19:00:00',
    durationMinutes: 60,
    type: 'REGULAR',
    status: 'SCHEDULED',
    cancellationReason: null,
    content: null,
    exercises: null,
    observations: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...partial,
  };
}

describe('lesson-diary.utils', () => {
  it('detects pedagogy presence', () => {
    expect(hasLessonPedagogy(lesson({ id: '1', date: '2026-09-18' }))).toBe(false);
    expect(hasLessonPedagogy(lesson({ id: '2', date: '2026-09-18', content: '  ' }))).toBe(false);
    expect(hasLessonPedagogy(lesson({ id: '3', date: '2026-09-18', content: 'CAGED' }))).toBe(true);
  });

  it('builds pedagogy preview from first non-empty field', () => {
    expect(lessonPedagogyPreview(lesson({ id: '1', date: '2026-09-18' }))).toBeNull();
    expect(
      lessonPedagogyPreview(lesson({ id: '2', date: '2026-09-18', exercises: 'Arpejos' })),
    ).toBe('Arpejos');
    expect(
      lessonPedagogyPreview(
        lesson({ id: '3', date: '2026-09-18', content: 'Escala', exercises: 'Arpejos' }),
      ),
    ).toBe('Escala');
  });

  it('groups by date and sorts within buckets', () => {
    const today = '2026-09-18';
    const groups = groupLessonsForDiary(
      [
        lesson({ id: 'h2', date: '2026-09-10', startTime: '10:00:00', status: 'COMPLETED' }),
        lesson({ id: 'u2', date: '2026-09-30', startTime: '19:00:00' }),
        lesson({ id: 't2', date: today, startTime: '20:00:00' }),
        lesson({ id: 'h1', date: '2026-09-12', startTime: '19:00:00', status: 'NO_SHOW' }),
        lesson({ id: 'u1', date: '2026-09-23', startTime: '19:00:00' }),
        lesson({ id: 't1', date: today, startTime: '09:00:00', status: 'COMPLETED' }),
        lesson({ id: 'past-scheduled', date: '2026-09-01', status: 'SCHEDULED' }),
      ],
      today,
    );

    expect(groups.today.map((item) => item.id)).toEqual(['t1', 't2']);
    expect(groups.upcoming.map((item) => item.id)).toEqual(['u1', 'u2']);
    expect(groups.history.map((item) => item.id)).toEqual(['h1', 'h2', 'past-scheduled']);
  });

  it('finds the next future lesson by date then time', () => {
    const today = '2026-09-18';
    const next = findNextLesson(
      [
        lesson({ id: 'later', date: '2026-09-30', startTime: '10:00:00' }),
        lesson({ id: 'today', date: today, startTime: '19:00:00' }),
        lesson({ id: 'next-late', date: '2026-09-23', startTime: '20:00:00' }),
        lesson({ id: 'next', date: '2026-09-23', startTime: '09:00:00' }),
        lesson({ id: 'past', date: '2026-09-10', status: 'COMPLETED' }),
      ],
      today,
    );

    expect(next?.id).toBe('next');
  });

  it('returns null when there is no future lesson', () => {
    expect(
      findNextLesson(
        [
          lesson({ id: 'today', date: '2026-09-18' }),
          lesson({ id: 'past', date: '2026-09-10', status: 'COMPLETED' }),
        ],
        '2026-09-18',
      ),
    ).toBeNull();
  });

  it('limits upcoming and history to 5', () => {
    const today = '2026-09-18';
    const upcoming = Array.from({ length: 7 }, (_, index) =>
      lesson({
        id: `u${index}`,
        date: `2026-09-${String(19 + index).padStart(2, '0')}`,
      }),
    );
    const history = Array.from({ length: 7 }, (_, index) =>
      lesson({
        id: `h${index}`,
        date: `2026-09-${String(10 - index).padStart(2, '0')}`,
        status: 'COMPLETED',
      }),
    );

    const groups = groupLessonsForDiary([...upcoming, ...history], today);
    expect(groups.upcoming).toHaveLength(5);
    expect(groups.history).toHaveLength(5);
    expect(groups.upcoming[0].id).toBe('u0');
    expect(groups.history[0].id).toBe('h0');
  });
});
