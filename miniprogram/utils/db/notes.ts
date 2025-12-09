// 笔记数据库服务
import { supabase } from '../supabase'

export interface NoteEntry {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  attachments: string[]
  pinned?: boolean
  category_id?: string
  tags?: string[]
  reminder_time?: string
  template_type?: string
  cover?: string
  user_id?: string
}

export interface NoteCategory {
  id: string
  user_id?: string
  name: string
  color: string
  icon?: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

// 从数据库加载笔记列表
export async function loadNotes(fallback: NoteEntry[] = []): Promise<NoteEntry[]> {
  try {
    const data = await supabase.selectAll<NoteEntry>('notes', {
      order: 'updated_at.desc',
    })
    
    return data.map(item => ({
      ...item,
      attachments: typeof item.attachments === 'string' ? JSON.parse(item.attachments) : (item.attachments || []),
      pinned: item.pinned || false,
      category_id: (item as any).category_id || item.category_id,
      tags: typeof (item as any).tags === 'string' ? JSON.parse((item as any).tags) : ((item as any).tags || []),
      reminder_time: (item as any).reminder_time || item.reminder_time,
      template_type: (item as any).template_type || item.template_type,
      cover: (item as any).cover || 'summer',
      createdAt: (item as any).created_at || item.createdAt || new Date().toISOString(),
      updatedAt: (item as any).updated_at || item.updatedAt || new Date().toISOString(),
    })).sort((a, b) => {
      // 置顶排在最前
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  } catch (error) {
    console.warn('loadNotes error', error)
    return fallback
  }
}

// 加载笔记分类
export async function loadNoteCategories(): Promise<NoteCategory[]> {
  try {
    const data = await supabase.selectAll<NoteCategory>('note_categories', {
      order: 'sort_order.asc,created_at.asc',
    })
    return data
  } catch (error) {
    console.warn('loadNoteCategories error', error)
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
    const categories = await loadNoteCategories()
    const categoryData: any = {
      id: `category-${Date.now()}`,
      user_id: 'default_user',
      name: category.name,
      color: category.color || '#4A90E2',
      icon: category.icon || '',
      sort_order: categories.length,
    }
    const result = await supabase.insert<NoteCategory>('note_categories', categoryData)
    return result[0]
  } catch (error) {
    console.error('addNoteCategory error', error)
    throw error
  }
}

// 保存笔记（插入或更新）
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
  const nowIso = new Date().toISOString()
  const attachments = payload.attachments || []
  const pinned = payload.pinned || false

  let noteData: any
  if (payload.id) {
    // 更新现有笔记
    const existing = await supabase.selectOne<NoteEntry>('notes', { id: payload.id })
    noteData = {
      id: payload.id,
      content: payload.content,
      attachments: JSON.stringify(attachments),
      pinned,
      category_id: payload.category_id || null,
      tags: payload.tags ? JSON.stringify(payload.tags) : null,
      reminder_time: payload.reminder_time || null,
      template_type: payload.template_type || null,
      cover: payload.cover || null,
      updated_at: nowIso,
      created_at: existing?.createdAt || nowIso,
    }
  } else {
    // 创建新笔记
    noteData = {
      id: `note-${Date.now()}`,
      content: payload.content,
      attachments: JSON.stringify(attachments),
      pinned,
      category_id: payload.category_id || null,
      tags: payload.tags ? JSON.stringify(payload.tags) : null,
      reminder_time: payload.reminder_time || null,
      template_type: payload.template_type || null,
      cover: payload.cover || null,
      created_at: nowIso,
      updated_at: nowIso,
    }
  }

  try {
    await supabase.upsert<NoteEntry>('notes', noteData)
    const result = await supabase.selectOne<NoteEntry>('notes', { id: noteData.id })
    if (result) {
      return {
        ...result,
        attachments: typeof result.attachments === 'string' ? JSON.parse(result.attachments) : result.attachments,
        category_id: result.category_id,
        tags: typeof result.tags === 'string' ? JSON.parse(result.tags) : (result.tags || []),
        reminder_time: result.reminder_time,
        template_type: result.template_type,
        cover: result.cover || 'summer',
        createdAt: result.created_at || result.createdAt,
        updatedAt: result.updated_at || result.updatedAt,
      }
    }
    throw new Error('Failed to retrieve saved note')
  } catch (error) {
    console.error('upsertNote error', error)
    throw error
  }
}

// 根据 ID 获取笔记
export async function getNoteById(id: string): Promise<NoteEntry | null> {
  try {
    const data = await supabase.selectOne<NoteEntry>('notes', { id })
    if (data) {
      return {
        ...data,
        attachments: typeof data.attachments === 'string' ? JSON.parse(data.attachments) : data.attachments,
        category_id: data.category_id,
        tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : (data.tags || []),
        reminder_time: data.reminder_time,
        template_type: data.template_type,
        cover: data.cover || 'summer',
        createdAt: data.created_at || data.createdAt,
        updatedAt: data.updated_at || data.updatedAt,
      }
    }
    return null
  } catch (error) {
    console.error('getNoteById error', error)
    return null
  }
}

// 更新笔记置顶状态
export async function updateNotePinned(id: string, pinned: boolean): Promise<NoteEntry[]> {
  try {
    await supabase.update<NoteEntry>('notes', {
      pinned,
      updated_at: new Date().toISOString(),
    }, { id })
    return loadNotes()
  } catch (error) {
    console.error('updateNotePinned error', error)
    throw error
  }
}

// 删除笔记
export async function removeNote(id: string): Promise<NoteEntry[]> {
  try {
    await supabase.delete('notes', { id })
    return loadNotes()
  } catch (error) {
    console.error('removeNote error', error)
    throw error
  }
}

