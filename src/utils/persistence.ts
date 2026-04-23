import type { CourseLayout } from '../types'

const STORAGE_KEY = 'course-design-app.saved-courses'
const DRAFT_KEY = 'course-design-app.wizard-draft'

export const saveCourse = (course: CourseLayout): void => {
  const existing = loadCourses()
  const deduped = existing.filter((item) => item.id !== course.id)
  const next = [course, ...deduped].slice(0, 20)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export const loadCourses = (): CourseLayout[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as CourseLayout[]
  } catch {
    return []
  }
}

export const saveWizardDraft = (value: unknown): void => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(value))
}

export const loadWizardDraft = <T>(fallback: T): T => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
