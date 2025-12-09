// 课程表数据库服务
import { supabase } from '../supabase'

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
  weekday: number
  user_id?: string
  created_at?: string
}

export interface DaySchedule {
  weekday: number
  courses: Course[]
}

// 从数据库加载课程表
export async function loadWeeklySchedule(fallback: DaySchedule[] = []): Promise<DaySchedule[]> {
  try {
    const courses = await supabase.selectAll<any>('courses', {
      order: 'weekday.asc,start_lesson.asc',
    })
    
    // 转换字段名
    const convertedCourses: Course[] = courses.map((c: any) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      teacher: c.teacher,
      startLesson: c.start_lesson || c.startLesson,
      endLesson: c.end_lesson || c.endLesson,
      startTime: c.start_time || c.startTime,
      endTime: c.end_time || c.endTime,
      color: c.color,
      weekday: c.weekday,
    }))
    
    // 按星期分组
    const weekdayMap: Record<number, Course[]> = {}
    convertedCourses.forEach(course => {
      if (!weekdayMap[course.weekday]) {
        weekdayMap[course.weekday] = []
      }
      weekdayMap[course.weekday].push(course)
    })
    
    // 构建周课程表
    const weekSchedule: DaySchedule[] = []
    for (let weekday = 0; weekday < 7; weekday++) {
      weekSchedule.push({
        weekday,
        courses: weekdayMap[weekday] || [],
      })
    }
    
    return weekSchedule
  } catch (error) {
    console.warn('loadWeeklySchedule error', error)
    return fallback
  }
}

// 保存课程
export async function upsertCourse(course: Course): Promise<void> {
  try {
    const courseData: any = {
      id: course.id,
      name: course.name,
      location: course.location,
      teacher: course.teacher,
      start_lesson: course.startLesson,
      end_lesson: course.endLesson,
      start_time: course.startTime,
      end_time: course.endTime,
      color: course.color,
      weekday: course.weekday,
    }

    await supabase.upsert<Course>('courses', courseData)
  } catch (error) {
    console.error('upsertCourse error', error)
    throw error
  }
}

// 删除课程
export async function deleteCourse(courseId: string): Promise<void> {
  try {
    await supabase.delete('courses', { id: courseId })
  } catch (error) {
    console.error('deleteCourse error', error)
    throw error
  }
}

// 替换整个课程表
export async function replaceWeekSchedule(weekSchedule: DaySchedule[]): Promise<void> {
  try {
    // 先删除所有现有课程
    const existingCourses = await supabase.selectAll<Course>('courses')
    for (const course of existingCourses) {
      await supabase.delete('courses', { id: course.id })
    }
    
    // 插入新课程
    const coursesToInsert: any[] = []
    weekSchedule.forEach(day => {
      day.courses.forEach(course => {
        coursesToInsert.push({
          id: course.id,
          name: course.name,
          location: course.location,
          teacher: course.teacher,
          start_lesson: course.startLesson,
          end_lesson: course.endLesson,
          start_time: course.startTime,
          end_time: course.endTime,
          color: course.color,
          weekday: day.weekday,
        })
      })
    })
    
    if (coursesToInsert.length > 0) {
      await supabase.insert<Course>('courses', coursesToInsert)
    }
  } catch (error) {
    console.error('replaceWeekSchedule error', error)
    throw error
  }
}

