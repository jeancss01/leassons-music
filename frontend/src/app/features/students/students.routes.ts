import { Routes } from '@angular/router';

export const STUDENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./student-list/student-list').then((m) => m.StudentList),
  },
  {
    path: 'new',
    loadComponent: () => import('./student-form/student-form').then((m) => m.StudentForm),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./student-form/student-form').then((m) => m.StudentForm),
  },
  {
    path: ':id/schedule/new',
    loadComponent: () => import('./schedule-form/schedule-form').then((m) => m.ScheduleForm),
  },
  {
    path: ':id/schedule/:scheduleId/edit',
    loadComponent: () => import('./schedule-form/schedule-form').then((m) => m.ScheduleForm),
  },
  {
    path: ':id/lesson/new',
    loadComponent: () => import('./lesson-form/lesson-form').then((m) => m.LessonForm),
  },
  {
    path: ':id/lesson/:lessonId/edit',
    loadComponent: () => import('./lesson-form/lesson-form').then((m) => m.LessonForm),
  },
  {
    path: ':id/lesson/:lessonId',
    loadComponent: () => import('./lesson-detail/lesson-detail').then((m) => m.LessonDetail),
  },
  {
    path: ':id',
    loadComponent: () => import('./student-detail/student-detail').then((m) => m.StudentDetail),
  },
];
