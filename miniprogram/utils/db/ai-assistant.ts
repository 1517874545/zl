// AI助手数据库服务
import { supabase } from '../supabase'

export interface AIMessage {
  id: string
  user_id?: string
  conversation_id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

const DEFAULT_USER_ID = 'default_user'

// 保存消息
export async function saveMessage(message: {
  role: 'user' | 'assistant'
  content: string
  conversation_id?: string
}): Promise<AIMessage> {
  // 使用更精确的时间戳和随机数避免ID冲突
  const messageData: any = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: DEFAULT_USER_ID,
    role: message.role,
    content: message.content,
    conversation_id: message.conversation_id || null,
    created_at: new Date().toISOString(),
  }

  try {
    const result = await supabase.insert<AIMessage>('ai_conversations', messageData)
    return result[0]
  } catch (error: any) {
    console.warn('saveMessage skipped', error?.message || error)
    const msg = error?.message || ''
    // 忽略 RLS/权限类错误，返回本地数据以不中断主流程
    if (msg.includes('row level security') || msg.includes('violates')) {
      return messageData
    }
    throw error
  }
}

// 加载消息列表
export async function loadMessages(conversationId?: string, limit: number = 50): Promise<AIMessage[]> {
  try {
    const options: any = {
      order: 'created_at.desc',
    }
    
    // 如果指定了conversation_id，添加过滤条件
    if (conversationId) {
      options.filter = { conversation_id: conversationId }
    }
    
    const data = await supabase.selectAll<AIMessage>('ai_conversations', options)
    return data.slice(0, limit).reverse() // 反转以显示时间顺序
  } catch (error: any) {
    console.warn('loadMessages skipped', error?.message || error)
    // RLS/权限问题直接返回空
    const msg = error?.message || ''
    if (msg.includes('row level security') || msg.includes('violates')) {
      return []
    }
    return []
  }
}

// 清空指定对话的消息
export async function clearConversationMessages(conversationId: string): Promise<void> {
  try {
    await supabase.delete('ai_conversations', { conversation_id: conversationId })
    console.log('clearConversationMessages: 已清空对话消息')
  } catch (error: any) {
    console.warn('clearConversationMessages error', error?.message || error)
    const msg = error?.message || ''
    if (msg.includes('row level security') || msg.includes('violates')) {
      console.warn('清空对话消息失败：RLS策略限制')
    } else {
      throw error
    }
  }
}

// 清空消息
export async function clearMessages(): Promise<void> {
  try {
    // 删除当前用户的所有消息
    await supabase.delete('ai_conversations', { user_id: DEFAULT_USER_ID })
    console.log('clearMessages: 已清空对话历史')
  } catch (error: any) {
    console.warn('clearMessages error', error?.message || error)
    const msg = error?.message || ''
    // 如果RLS策略不允许删除，至少记录日志
    if (msg.includes('row level security') || msg.includes('violates')) {
      console.warn('清空历史失败：RLS策略限制，请检查数据库权限配置')
      // 不抛出错误，允许继续使用（虽然历史可能还在）
    } else {
      throw error
    }
  }
}

