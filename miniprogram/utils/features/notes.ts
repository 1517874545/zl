// 笔记模块工具函数 - 使用 Supabase 数据库

import * as dbNotes from '../db/notes'

export interface NoteCategory {
  id: string
  name: string
  color: string
  icon?: string
}

// 加载笔记列表（异步）
export async function loadNotes(fallback: NoteEntry[] = []): Promise<NoteEntry[]> {
  try {
    const list = await dbNotes.loadNotes(fallback)
    const app = getApp<IAppOption>()
    app.globalData.notes = list
    return normalizeNotes(list)
  } catch (error) {
    console.warn('loadNotes error', error)
    return normalizeNotes(fallback)
  }
}

// 保存笔记列表（已废弃，使用 upsertNote）
export function saveNotes(list: NoteEntry[]): void {
  // 已迁移到数据库，此函数保留以兼容旧代码
  const app = getApp<IAppOption>()
  app.globalData.notes = list
}

// 加载笔记分类
export async function loadNoteCategories(): Promise<NoteCategory[]> {
  try {
    const categories = await dbNotes.loadNoteCategories()
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
    }))
  } catch (error) {
    console.error('loadNoteCategories error', error)
    return []
  }
}

// 添加笔记分类
export async function addNoteCategory(category: {
  name: string
  color?: string
  icon?: string
}): Promise<NoteCategory> {
  try {
    const result = await dbNotes.addNoteCategory(category)
    return {
      id: result.id,
      name: result.name,
      color: result.color,
      icon: result.icon,
    }
  } catch (error) {
    console.error('addNoteCategory error', error)
    throw error
  }
}

// 保存或更新笔记（异步）
export async function upsertNote(payload: {
  id?: string
  content: string
  attachments?: string[]
  pinned?: boolean
  category_id?: string
  tags?: string[]
  reminder_time?: string
  template_type?: string
  cover?: string
}): Promise<NoteEntry> {
  const result = await dbNotes.upsertNote(payload)
  const app = getApp<IAppOption>()
  const list = await dbNotes.loadNotes()
  app.globalData.notes = list
  return {
    ...result,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

// 根据 ID 获取笔记（异步）
export async function getNoteById(id: string): Promise<NoteEntry | undefined> {
  const note = await dbNotes.getNoteById(id)
  return note || undefined
}

export function deriveNoteTitle(content: string): string {
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => !!line) || '未命名笔记'
  )
}

export function formatNoteTime(iso: string): string {
  const date = new Date(iso)
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const hh = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

// 更新笔记置顶状态（异步）
export async function updateNotePinned(id: string, pinned: boolean): Promise<NoteEntry[]> {
  const list = await dbNotes.updateNotePinned(id, pinned)
  const app = getApp<IAppOption>()
  app.globalData.notes = list
  return normalizeNotes(list)
}

// 删除笔记（异步）
export async function removeNote(id: string): Promise<NoteEntry[]> {
  const list = await dbNotes.removeNote(id)
  const app = getApp<IAppOption>()
  app.globalData.notes = list
  return normalizeNotes(list)
}

function normalizeNotes(list: NoteEntry[]): NoteEntry[] {
  return list.map((item) => ({
    ...item,
    attachments: (item.attachments !== undefined) ? item.attachments : [],
    pinned: (item.pinned !== undefined) ? item.pinned : false,
  }))
}

function sortNotes(list: NoteEntry[]): NoteEntry[] {
  return [...list].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}








