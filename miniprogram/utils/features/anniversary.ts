// 纪念日模块工具函数 - 使用 Supabase 数据库

import * as dbAnniversaries from '../db/anniversaries'

// 加载纪念日列表（异步）
export async function loadAnniversaries(fallback: AnniversaryMeta[] = []): Promise<AnniversaryMeta[]> {
  try {
    const list = await dbAnniversaries.loadAnniversaries(fallback)
    const app = getApp<IAppOption>()
    app.globalData.anniversaries = list
    return list
  } catch (e) {
    console.warn('loadAnniversaries error', e)
    return fallback
  }
}

// 保存纪念日列表（已废弃，使用 upsertAnniversary）
export function saveAnniversaries(list: AnniversaryMeta[]): void {
  // 已迁移到数据库，此函数保留以兼容旧代码
  const app = getApp<IAppOption>()
  app.globalData.anniversaries = list
}

// 保存或更新纪念日（异步）
export async function upsertAnniversary(input: {
  id?: string
  title: string
  from: string
  target: string
  pinned?: boolean
  repeat?: AnniversaryMeta['repeat']
  avatars?: AnniversaryMeta['avatars']
}): Promise<AnniversaryMeta[]> {
  const list = await dbAnniversaries.upsertAnniversary(input)
  const app = getApp<IAppOption>()
  app.globalData.anniversaries = list
  return list
}

// 根据 ID 查找纪念日（异步）
export async function findAnniversaryById(id: string): Promise<AnniversaryMeta | undefined> {
  const item = await dbAnniversaries.findAnniversaryById(id)
  return item || undefined
}

// 删除纪念日（异步）
export async function deleteAnniversary(id: string): Promise<AnniversaryMeta[]> {
  const list = await dbAnniversaries.deleteAnniversary(id)
  const app = getApp<IAppOption>()
  app.globalData.anniversaries = list
  return list
}







