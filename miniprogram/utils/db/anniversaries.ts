// 纪念日数据库服务
import { supabase } from '../supabase'

export interface AnniversaryMeta {
  id: string
  title: string
  from: string
  target: string
  avatars: {
    left: string
    right: string
  }
  pinned?: boolean
  repeat?: 'none' | 'year' | 'month' | 'day'
  created_at?: string
  updated_at?: string
}

// 从数据库加载纪念日列表
export async function loadAnniversaries(fallback: AnniversaryMeta[] = []): Promise<AnniversaryMeta[]> {
  try {
    const data = await supabase.selectAll<any>('anniversaries', {
      order: 'target_date.asc',
    })
    
    // 处理字段映射和 avatars JSON 字段
    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      from: item.from_date || item.from,
      target: item.target_date || item.target,
      avatars: typeof item.avatars === 'string' ? JSON.parse(item.avatars) : item.avatars,
      pinned: item.pinned || false,
      repeat: item.repeat_type || item.repeat || 'none',
    }))
  } catch (error) {
    console.warn('loadAnniversaries error', error)
    return fallback
  }
}

// 保存纪念日（插入或更新）
export async function upsertAnniversary(input: {
  id?: string
  title: string
  from: string
  target: string
  pinned?: boolean
  repeat?: AnniversaryMeta['repeat']
  avatars?: AnniversaryMeta['avatars']
}): Promise<AnniversaryMeta[]> {
  const id = input.id || `anniv-${Date.now()}`
  
  const anniversaryData: any = {
    id,
    title: input.title,
    from_date: input.from,
    target_date: input.target,
    pinned: input.pinned === true,
    repeat_type: input.repeat || 'none',
    avatars: JSON.stringify(input.avatars || {
      left: '../../assets/avatar-a.png',
      right: '../../assets/avatar-b.png',
    }),
  }

  try {
    await supabase.upsert<any>('anniversaries', anniversaryData)
    return loadAnniversaries()
  } catch (error) {
    console.error('upsertAnniversary error', error)
    throw error
  }
}

// 根据 ID 查找纪念日
export async function findAnniversaryById(id: string): Promise<AnniversaryMeta | null> {
  try {
    const data = await supabase.selectOne<any>('anniversaries', { id })
    if (data) {
      return {
        id: data.id,
        title: data.title,
        from: data.from_date || data.from,
        target: data.target_date || data.target,
        avatars: typeof data.avatars === 'string' ? JSON.parse(data.avatars) : data.avatars,
        pinned: data.pinned || false,
        repeat: data.repeat_type || data.repeat || 'none',
      }
    }
    return null
  } catch (error) {
    console.error('findAnniversaryById error', error)
    return null
  }
}

// 删除纪念日
export async function deleteAnniversary(id: string): Promise<AnniversaryMeta[]> {
  try {
    await supabase.delete('anniversaries', { id })
    return loadAnniversaries()
  } catch (error) {
    console.error('deleteAnniversary error', error)
    throw error
  }
}

