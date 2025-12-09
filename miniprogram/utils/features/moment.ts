// 动态模块工具函数 - 使用 Supabase 数据库

import * as dbMoments from '../db/moments'

// 添加动态（异步）
export async function addMoment(payload: { 
  content: string
  images?: string[]
  location?: string
  mood?: string
  topics?: string[]
  avatar?: string
  nickname?: string
}): Promise<dbMoments.MomentItem> {
  const app = getApp<IAppOption>()
  const userProfile = app.globalData.userProfile || {}
  
  const result = await dbMoments.addMoment({
    content: payload.content,
    images: payload.images,
    location: payload.location,
    mood: payload.mood,
    topics: payload.topics,
    avatar: payload.avatar || userProfile.avatar || '../../assets/avatar-a.png',
    nickname: payload.nickname || userProfile.username || '我',
  })
  
  // 更新全局数据
  const moments = await dbMoments.loadMoments()
  app.globalData.moments = moments
  
  return result
}

// 加载动态列表（异步）
export async function loadMoments(): Promise<dbMoments.MomentItem[]> {
  try {
    const moments = await dbMoments.loadMoments()
    const app = getApp<IAppOption>()
    app.globalData.moments = moments
    return moments
  } catch (error) {
    console.warn('loadMoments error', error)
    return []
  }
}

// 删除动态（异步）
export async function deleteMoment(id: string): Promise<void> {
  await dbMoments.deleteMoment(id)
  // 删除后刷新全局缓存
  const moments = await dbMoments.loadMoments()
  const app = getApp<IAppOption>()
  app.globalData.moments = moments
}





