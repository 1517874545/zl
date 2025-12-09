// 番茄钟数据库服务
import { supabase } from '../supabase'

export interface PomodoroSettings {
  id?: string
  user_id?: string
  focus_duration: number
  short_break_duration: number
  long_break_duration: number
  sound_enabled: boolean
  auto_start_next: boolean
  created_at?: string
  updated_at?: string
}

export interface PomodoroSession {
  id?: string
  user_id?: string
  task_name: string
  duration: number
  type: 'focus' | 'break'
  completed_at?: string
}

const DEFAULT_USER_ID = 'default_user'

// 加载设置
export async function loadSettings(): Promise<{
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  soundEnabled: boolean
  autoStartNext: boolean
} | null> {
  try {
    const data = await supabase.selectOne<PomodoroSettings>('pomodoro_settings', {
      user_id: DEFAULT_USER_ID,
    })
    
    if (data) {
      return {
        focusDuration: data.focus_duration,
        shortBreakDuration: data.short_break_duration,
        longBreakDuration: data.long_break_duration,
        soundEnabled: data.sound_enabled,
        autoStartNext: data.auto_start_next,
      }
    }
    return null
  } catch (error) {
    console.warn('loadSettings error', error)
    return null
  }
}

// 保存设置
export async function saveSettings(settings: {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  soundEnabled: boolean
  autoStartNext?: boolean
}): Promise<void> {
  try {
    const existing = await supabase.selectOne<PomodoroSettings>('pomodoro_settings', {
      user_id: DEFAULT_USER_ID,
    })
    
    const settingsData: any = {
      user_id: DEFAULT_USER_ID,
      focus_duration: settings.focusDuration,
      short_break_duration: settings.shortBreakDuration,
      long_break_duration: settings.longBreakDuration,
      sound_enabled: settings.soundEnabled,
      auto_start_next: settings.autoStartNext || false,
      updated_at: new Date().toISOString(),
    }
    
    if (existing) {
      await supabase.update<PomodoroSettings>('pomodoro_settings', settingsData, {
        user_id: DEFAULT_USER_ID,
      })
    } else {
      settingsData.id = `settings-${Date.now()}`
      settingsData.created_at = new Date().toISOString()
      await supabase.insert<PomodoroSettings>('pomodoro_settings', settingsData)
    }
  } catch (error) {
    console.error('saveSettings error', error)
    throw error
  }
}

// 保存会话记录
export async function saveSession(session: {
  taskName: string
  duration: number
  type: 'focus' | 'break'
}): Promise<void> {
  try {
    const sessionData: any = {
      id: `session-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      task_name: session.taskName,
      duration: session.duration,
      type: session.type,
      completed_at: new Date().toISOString(),
    }
    
    await supabase.insert<PomodoroSession>('pomodoro_sessions', sessionData)
  } catch (error) {
    console.error('saveSession error', error)
    throw error
  }
}

// 加载今日统计
export async function loadTodayStats(): Promise<{ count: number; minutes: number }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    
    // 这里需要根据日期范围查询，但 Supabase 的简单实现可能不支持
    // 简化处理：查询所有记录，然后在代码中过滤
    const allSessions = await supabase.selectAll<PomodoroSession>('pomodoro_sessions', {
      order: 'completed_at.desc',
    })
    
    const todaySessions = allSessions.filter(session => {
      if (!session.completed_at) return false
      const sessionDate = new Date(session.completed_at)
      return sessionDate >= today && sessionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    })
    
    const count = todaySessions.filter(s => s.type === 'focus').length
    const minutes = todaySessions
      .filter(s => s.type === 'focus')
      .reduce((sum, s) => sum + s.duration, 0)
    
    return { count, minutes }
  } catch (error) {
    console.warn('loadTodayStats error', error)
    return { count: 0, minutes: 0 }
  }
}

