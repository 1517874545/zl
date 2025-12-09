// 对话数据库服务
import { supabase } from '../supabase'

export interface Conversation {
  id: string
  user_id?: string
  title: string
  created_at?: string
  updated_at?: string
}

const DEFAULT_USER_ID = 'default_user'

// 创建新对话
export async function createConversation(title: string): Promise<Conversation> {
  const conversationData: any = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: DEFAULT_USER_ID,
    title: title.substring(0, 50), // 限制标题长度
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const result = await supabase.insert<Conversation>('conversations', conversationData)
    return result[0]
  } catch (error: any) {
    console.error('createConversation error', error)
    throw error
  }
}

// 加载对话列表
export async function loadConversations(limit: number = 50): Promise<Conversation[]> {
  try {
    const data = await supabase.selectAll<Conversation>('conversations', {
      order: 'updated_at.desc',
      limit,
    })
    return data
  } catch (error: any) {
    console.warn('loadConversations error', error?.message || error)
    return []
  }
}

// 更新对话标题
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  try {
    await supabase.update('conversations', 
      { 
        title: title.substring(0, 50),
        updated_at: new Date().toISOString(),
      },
      { id: conversationId }
    )
  } catch (error: any) {
    console.error('updateConversationTitle error', error)
    throw error
  }
}

// 删除对话
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    // 先删除该对话下的所有消息
    await supabase.delete('ai_conversations', { conversation_id: conversationId })
    // 再删除对话
    await supabase.delete('conversations', { id: conversationId })
  } catch (error: any) {
    console.error('deleteConversation error', error)
    throw error
  }
}
