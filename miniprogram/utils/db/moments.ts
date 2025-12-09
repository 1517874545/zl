// 动态数据库服务
import { supabase } from '../supabase'

export interface MomentComment {
  id: string
  nickname: string
  content: string
  time: string
  moment_id: string
  created_at?: string
}

export interface MomentItem {
  id: string
  avatar: string
  nickname: string
  time: string
  location: string
  content: string
  images: string[]
  mood?: string
  topics?: string[]
  favoritedByMe?: boolean
  comments?: Array<{
    id: string
    nickname: string
    content: string
    time: string
    parent_id?: string
    reply_to_user?: string
  }>
  likes?: number
  likedByMe?: boolean
  user_id?: string
  created_at?: string
  updated_at?: string
}

// 从数据库加载动态列表（包含评论）
export async function loadMoments(): Promise<MomentItem[]> {
  try {
    const moments = await supabase.selectAll<MomentItem>('moments', {
      order: 'created_at.desc',
    })
    
    // 加载每条动态的评论
    const momentsWithComments = await Promise.all(
      moments.map(async (moment) => {
        const comments = await supabase.selectAll<MomentComment>('moment_comments', {
          filter: { moment_id: moment.id },
          order: 'created_at.asc',
        })
        
        // 解析图片数组，并过滤无效图片
        let images: string[] = []
        try {
          const rawImages = typeof moment.images === 'string' ? JSON.parse(moment.images) : (moment.images || [])
          images = Array.isArray(rawImages) ? rawImages.filter((img: any) => {
            // 过滤掉无效的图片路径
            if (!img || typeof img !== 'string') return false
            const trimmed = img.trim()
            if (trimmed === '') return false
            // 过滤掉包含无效字符的路径
            if (trimmed.includes('undefined') || trimmed.includes('null')) return false
            // 过滤掉临时文件路径（开发工具中不稳定）
            if (trimmed.startsWith('http://tmp/') || trimmed.startsWith('http://127.0.0.1')) return false
            // 过滤掉明显无效的路径格式
            if (trimmed.startsWith('http://') && trimmed.includes('_tmp_')) return false
            return true
          }) : []
        } catch (e) {
          console.warn('Parse images error:', e)
          images = []
        }
        
        return {
          ...moment,
          images,
          topics: typeof (moment as any).topics === 'string' ? JSON.parse((moment as any).topics) : ((moment as any).topics || []),
          mood: (moment as any).mood || moment.mood,
          comments: comments.map(c => ({
            id: c.id,
            nickname: c.nickname,
            content: c.content,
            time: c.time,
          })),
          likes: moment.likes || 0,
          likedByMe: (moment as any).liked_by_me || (moment as any).likedByMe || false,
        }
      })
    )
    
    return momentsWithComments
  } catch (error) {
    console.warn('loadMoments error', error)
    return []
  }
}

// 删除动态（关联评论表已设置 ON DELETE CASCADE）
export async function deleteMoment(id: string): Promise<void> {
  try {
    await supabase.delete('moments', { id })
  } catch (error) {
    console.error('deleteMoment error', error)
    throw error
  }
}

// 添加动态
export async function addMoment(payload: {
  content: string
  images?: string[]
  location?: string
  mood?: string
  topics?: string[]
  avatar?: string
  nickname?: string
}): Promise<MomentItem> {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`

  // 过滤无效图片路径
  const validImages = (payload.images || []).filter((img: string) => {
    if (!img || typeof img !== 'string') return false
    const trimmed = img.trim()
    if (trimmed === '') return false
    // 过滤掉包含无效字符的路径
    if (trimmed.includes('undefined') || trimmed.includes('null')) return false
    // 过滤掉临时文件路径（开发工具中不稳定，但允许本地路径）
    // 注意：本地路径（如 wxfile://）是允许的，只过滤 http://tmp/ 和 http://127.0.0.1
    if (trimmed.startsWith('http://tmp/') || (trimmed.startsWith('http://127.0.0.1') && trimmed.includes('_tmp_'))) return false
    return true
  })

  const momentData: any = {
    id: `moment-${Date.now()}`,
    avatar: payload.avatar || '../../assets/avatar-a.png',
    nickname: payload.nickname || '我',
    time,
    location: payload.location || '生活记录',
    content: payload.content,
    images: validImages,
    mood: payload.mood || null,
    topics: payload.topics ? JSON.stringify(payload.topics) : null,
    likes: 0,
    liked_by_me: false,
    favorited_by_me: false,
  }

  try {
    const result = await supabase.insert<MomentItem>('moments', momentData)
    return {
      ...result[0],
      images: typeof result[0].images === 'string' ? JSON.parse(result[0].images) : (result[0].images || []),
      topics: typeof (result[0] as any).topics === 'string' ? JSON.parse((result[0] as any).topics) : ((result[0] as any).topics || []),
      mood: (result[0] as any).mood || result[0].mood,
      comments: [],
      likedByMe: (result[0] as any).liked_by_me || false,
      favoritedByMe: (result[0] as any).favorited_by_me || false,
    }
  } catch (error) {
    console.error('addMoment error', error)
    throw error
  }
}

// 添加评论
export async function addComment(momentId: string, comment: {
  nickname: string
  content: string
  time: string
}): Promise<MomentComment> {
  const commentData: any = {
    id: `comment-${Date.now()}`,
    moment_id: momentId,
    nickname: comment.nickname,
    content: comment.content,
    time: comment.time,
  }

  try {
    const result = await supabase.insert<MomentComment>('moment_comments', commentData)
    return result[0]
  } catch (error) {
    console.error('addComment error', error)
    throw error
  }
}

// 更新点赞状态
export async function updateLike(momentId: string, liked: boolean, likesCount: number): Promise<void> {
  try {
    // 数据库字段使用下划线命名，需要使用 any 类型
    await supabase.update<any>('moments', {
      liked_by_me: liked,
      likes: likesCount,
    }, { id: momentId })
  } catch (error) {
    console.error('updateLike error', error)
    throw error
  }
}

