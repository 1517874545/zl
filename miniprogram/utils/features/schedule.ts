// 课程表模块

// 课程信息接口
export interface Course {
  id: string
  name: string
  location: string
  teacher: string
  startLesson: number
  endLesson: number
  startTime: string
  endTime: string
  color: string
}

// 星期课程数据
export interface DaySchedule {
  weekday: number
  courses: Course[]
}

// 星期按钮信息
export interface WeekdayButton {
  weekday: number
  shortName: string
  fullName: string
  date: string
  isActive: boolean
}

// 课程表页面数据
export interface SchedulePageData {
  weekdays: WeekdayButton[]
  currentWeekday: number
  daySchedule: DaySchedule | null
  showAddMenu: boolean
  showImportModal: boolean
  showCourseModal: boolean
  importText: string
  importError: string
  courseForm: CourseForm
  editingCourseId: string
  weeklySchedule: DaySchedule[]
  weekdayLabels: string[]
  pickerWeekLabels: string[]
}

export interface CourseForm {
  weekday: number
  name: string
  location: string
  teacher: string
  startLesson: number
  endLesson: number
  startTime: string
  endTime: string
}

// 课程时间配置
export const COURSE_TIME_SLOTS = [
  { lesson: 1, startTime: '08:00', endTime: '08:45' },
  { lesson: 2, startTime: '08:55', endTime: '09:40' },
  { lesson: 3, startTime: '10:00', endTime: '10:45' },
  { lesson: 4, startTime: '10:55', endTime: '11:40' },
  { lesson: 5, startTime: '14:00', endTime: '14:45' },
  { lesson: 6, startTime: '14:55', endTime: '15:40' },
  { lesson: 7, startTime: '16:00', endTime: '16:45' },
  { lesson: 8, startTime: '16:55', endTime: '17:40' },
  { lesson: 9, startTime: '19:00', endTime: '19:45' },
  { lesson: 10, startTime: '19:55', endTime: '20:40' },
]

// 星期配置 (按JavaScript的getDay()顺序: 0=周日, 1=周一, ..., 6=周六)
export const WEEKDAY_CONFIG = [
  { shortName: 'SUN', fullName: '星期日' },   // 0
  { shortName: 'MON', fullName: '星期一' },   // 1
  { shortName: 'TUE', fullName: '星期二' },   // 2
  { shortName: 'WED', fullName: '星期三' },   // 3
  { shortName: 'THU', fullName: '星期四' },   // 4
  { shortName: 'FRI', fullName: '星期五' },   // 5
  { shortName: 'SAT', fullName: '星期六' },   // 6
]

// 课程颜色配置
export const COURSE_COLORS = [
  '#4A90E2', '#50C878', '#FF6B6B', '#FFB347', '#9B59B6',
  '#3498DB', '#E74C3C', '#F39C12', '#1ABC9C', '#34495E'
]

const STORAGE_KEY = 'weekly_schedule'

const DEFAULT_COURSES: Course[] = [
  {
    id: 'course-001',
    name: '高等数学',
    location: '教学楼A101',
    teacher: '张教授',
    startLesson: 1,
    endLesson: 2,
    startTime: '08:00',
    endTime: '09:40',
    color: '#4A90E2'
  },
  {
    id: 'course-002',
    name: '大学英语',
    location: '外语楼B201',
    teacher: '李老师',
    startLesson: 3,
    endLesson: 4,
    startTime: '10:00',
    endTime: '11:40',
    color: '#50C878'
  },
  {
    id: 'course-003',
    name: '计算机基础',
    location: '实验楼C302',
    teacher: '王教授',
    startLesson: 5,
    endLesson: 6,
    startTime: '14:00',
    endTime: '15:40',
    color: '#FF6B6B'
  },
  {
    id: 'course-004',
    name: '物理实验',
    location: '物理楼D103',
    teacher: '赵老师',
    startLesson: 7,
    endLesson: 8,
    startTime: '16:00',
    endTime: '17:40',
    color: '#FFB347'
  }
]

export const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  { weekday: 0, courses: [] },
  { weekday: 1, courses: DEFAULT_COURSES.slice(0, 2) },
  { weekday: 2, courses: DEFAULT_COURSES.slice(1, 3) },
  { weekday: 3, courses: DEFAULT_COURSES.slice(0, 3) },
  { weekday: 4, courses: DEFAULT_COURSES.slice(2, 4) },
  { weekday: 5, courses: DEFAULT_COURSES.slice(1, 4) },
  { weekday: 6, courses: [] },
]

// 课程表模块 - 使用 Supabase 数据库

import * as dbSchedule from '../db/schedule'

// 加载周课程表（异步）
export async function loadWeeklySchedule(fallback: DaySchedule[] = DEFAULT_WEEKLY_SCHEDULE): Promise<DaySchedule[]> {
  try {
    const schedule = await dbSchedule.loadWeeklySchedule(fallback)
    return schedule
  } catch (e) {
    console.warn('loadWeeklySchedule error', e)
    return fallback
  }
}

// 保存周课程表（已废弃，使用 replaceWeekSchedule）
export function saveWeeklySchedule(week: DaySchedule[]): void {
  // 已迁移到数据库，此函数保留以兼容旧代码
}

export function assignCourseColor(index: number): string {
  return COURSE_COLORS[index % COURSE_COLORS.length]
}

function isLessonOverlap(a: Course, b: Course) {
  return !(a.endLesson < b.startLesson || a.startLesson > b.endLesson)
}

function insertAndOverride(dayCourses: Course[], incoming: Course): Course[] {
  const kept = dayCourses.filter((c) => {
    if (c.id === incoming.id) return false
    return !isLessonOverlap(c, incoming)
  })
  return [...kept, incoming].sort((a, b) => a.startLesson - b.startLesson)
}

function normalizeDayCourses(courses: Course[]): Course[] {
  return courses.reduce<Course[]>((acc, current) => {
    const next = insertAndOverride(acc, current)
    return next
  }, [])
}

// 保存或更新课程到周课程表（异步）
export async function upsertCourseToWeek(
  week: DaySchedule[],
  weekday: number,
  course: Course,
): Promise<DaySchedule[]> {
  const nextWeek = week.map((day) => {
    if (day.weekday !== weekday) {
      return day
    }
    const courses = insertAndOverride(day.courses, course)
    return {
      ...day,
      courses,
    }
  })
  
  // 保存到数据库
  await dbSchedule.replaceWeekSchedule(nextWeek)
  return nextWeek
}

// 替换整个周课程表（异步）
export async function replaceWeekSchedule(newWeek: DaySchedule[]): Promise<DaySchedule[]> {
  const normalized = newWeek.map((day) => ({
    ...day,
    courses: normalizeDayCourses(day.courses || []),
  }))
  await dbSchedule.replaceWeekSchedule(normalized)
  return normalized
}

// 从周课表中删除指定课程并落库
export async function deleteCourseFromWeek(
  week: DaySchedule[],
  weekday: number,
  courseId: string,
): Promise<DaySchedule[]> {
  const nextWeek = week.map((day) => {
    if (day.weekday !== weekday) return day
    return {
      ...day,
      courses: day.courses.filter((c) => c.id !== courseId),
    }
  })
  // 先删库里该课程，再写回整周数据，保证两边一致
  await dbSchedule.deleteCourse(courseId)
  await dbSchedule.replaceWeekSchedule(nextWeek)
  return nextWeek
}

export function parseExternalSchedule(text: string): DaySchedule[] | null {
  if (!text.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) {
      return null
    }
    const grouped: Record<number, Course[]> = {}
    parsed.forEach((item: any, idx: number) => {
      const weekday = typeof item.weekday === 'number' ? item.weekday : 1
      if (!grouped[weekday]) {
        grouped[weekday] = []
      }
      grouped[weekday].push({
        id: item.id || `course-${Date.now()}-${idx}`,
        name: item.name || '未命名课程',
        location: item.location || '未知教室',
        teacher: item.teacher || '未知教师',
        startLesson: Number(item.startLesson) || 1,
        endLesson: Number(item.endLesson) || 2,
        startTime: item.startTime || '08:00',
        endTime: item.endTime || '08:45',
        color: assignCourseColor(idx),
      })
    })

    const week: DaySchedule[] = WEEKDAY_CONFIG.map((_, weekday) => ({
      weekday,
      courses: grouped[weekday]
        ? grouped[weekday].sort((a, b) => a.startLesson - b.startLesson)
        : [],
    }))
    return week
  } catch (error) {
    console.warn('parseExternalSchedule error', error)
    return null
  }
}

export function createEmptyCourseForm(currentWeekday: number): CourseForm {
  return {
    weekday: currentWeekday,
    name: '',
    location: '',
    teacher: '',
    startLesson: 1,
    endLesson: 2,
    startTime: '08:00',
    endTime: '08:45',
  }
}


