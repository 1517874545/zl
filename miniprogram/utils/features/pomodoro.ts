// 番茄钟功能模块
import * as dbPomodoro from '../db/pomodoro'

export interface PomodoroSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  soundEnabled: boolean
  autoStartNext?: boolean
}

export interface PomodoroSession {
  taskName: string
  duration: number
  type: 'focus' | 'break'
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  soundEnabled: true,
  autoStartNext: false,
}

// 加载番茄钟设置
export async function loadPomodoroSettings(): Promise<PomodoroSettings> {
  try {
    const settings = await dbPomodoro.loadSettings()
    return settings || DEFAULT_SETTINGS
  } catch (error) {
    console.error('loadPomodoroSettings error', error)
    return DEFAULT_SETTINGS
  }
}

// 保存番茄钟设置
export async function savePomodoroSettings(settings: PomodoroSettings): Promise<void> {
  try {
    await dbPomodoro.saveSettings(settings)
  } catch (error) {
    console.error('savePomodoroSettings error', error)
    throw error
  }
}

// 保存番茄钟记录
export async function savePomodoroSession(session: PomodoroSession): Promise<void> {
  try {
    await dbPomodoro.saveSession(session)
  } catch (error) {
    console.error('savePomodoroSession error', error)
    throw error
  }
}

// 加载今日统计
export async function loadTodayStats(): Promise<{ count: number; minutes: number }> {
  try {
    return await dbPomodoro.loadTodayStats()
  } catch (error) {
    console.error('loadTodayStats error', error)
    return { count: 0, minutes: 0 }
  }
}

