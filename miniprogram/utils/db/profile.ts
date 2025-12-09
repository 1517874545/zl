// 用户资料数据库服务
import { supabase } from '../supabase'

export interface UserProfile {
  id?: string
  avatar: string
  username: string
  bio: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

const DEFAULT_USER_ID = 'default_user' // 可以后续改为从微信登录获取

// 加载用户资料
export async function loadUserProfile(fallback: UserProfile): Promise<UserProfile> {
  try {
    const data = await supabase.selectOne<UserProfile>('user_profiles', { user_id: DEFAULT_USER_ID })
    if (data) {
      return data
    }
    return fallback
  } catch (error) {
    console.warn('loadUserProfile error', error)
    return fallback
  }
}

// 更新用户资料
export async function updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const existing = await supabase.selectOne<UserProfile>('user_profiles', { user_id: DEFAULT_USER_ID })
    
    if (existing) {
      await supabase.update<UserProfile>('user_profiles', {
        ...profile,
        updated_at: new Date().toISOString(),
      }, { user_id: DEFAULT_USER_ID })
    } else {
      const profileData: any = {
        user_id: DEFAULT_USER_ID,
        avatar: profile.avatar || '../../assets/avatar-b.png',
        username: profile.username || '生活记录者',
        bio: profile.bio || '点击编辑个人简介，让朋友更了解你。',
      }
      await supabase.insert<UserProfile>('user_profiles', profileData)
    }
    
    const result = await supabase.selectOne<UserProfile>('user_profiles', { user_id: DEFAULT_USER_ID })
    if (result) {
      return result
    }
    throw new Error('Failed to retrieve updated profile')
  } catch (error) {
    console.error('updateUserProfile error', error)
    throw error
  }
}

