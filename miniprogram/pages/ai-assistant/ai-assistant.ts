// AI助手页面
import {
  sendMessageToAI,
  loadConversationHistory,
  clearConversationHistory,
  type AIMessage,
} from '../../utils/features/ai-assistant'
import {
  createConversation,
  updateConversationTitle,
  type Conversation,
} from '../../utils/db/conversations'
import * as dbAI from '../../utils/db/ai-assistant'

interface AIAssistantPageData {
  messages: AIMessage[]
  inputValue: string
  loading: boolean
  canSend: boolean
  scrollIntoView: string
  conversationId?: string
  conversation?: Conversation
}

Page<AIAssistantPageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    messages: [],
    inputValue: '',
    loading: false,
    canSend: false,
    scrollIntoView: '',
    conversationId: undefined,
    conversation: undefined,
  },

  async onLoad(options: { conversationId?: string }) {
    if (options.conversationId) {
      // 加载已有对话
      this.setData({ conversationId: options.conversationId })
      await this.loadHistory()
    } else {
      // 新建对话，清空消息
      this.setData({ messages: [] })
    }
  },

  async loadHistory() {
    try {
      const messages = await loadConversationHistory(this.data.conversationId, 50)
      this.setData({ 
        messages,
        scrollIntoView: messages.length > 0 ? `msg-${messages[messages.length - 1].id}` : '',
      })
    } catch (error) {
      console.error('loadHistory error', error)
    }
  },

  onInputChange(event: WechatMiniprogram.Input) {
    const value = event.detail.value || ''
    this.setData({
      inputValue: value,
      canSend: !!value.trim(),
    })
  },

  async onSendMessage() {
    const content = this.data.inputValue.trim()
    if (!content || this.data.loading) return

    // 如果是新对话且还没有conversationId，创建新对话
    let conversationId = this.data.conversationId
    if (!conversationId) {
      try {
        const conversation = await createConversation(content)
        conversationId = conversation.id
        this.setData({ 
          conversationId,
          conversation,
        })
      } catch (error) {
        console.error('createConversation error', error)
        wx.showToast({
          title: '创建对话失败',
          icon: 'none',
        })
        return
      }
    }

    // 添加用户消息到界面
    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    
    // 保存当前消息列表的引用，避免异步更新时数据不一致
    let currentMessages = [...this.data.messages, userMessage]
    
    // 如果是第一条消息，更新对话标题
    if (currentMessages.length === 1 && conversationId) {
      try {
        await updateConversationTitle(conversationId, content)
      } catch (error) {
        console.warn('updateConversationTitle error', error)
      }
    }
    
    this.setData({
      messages: currentMessages,
      inputValue: '',
      loading: true,
      canSend: false,
      scrollIntoView: `msg-${userMessage.id}`,
    })

    try {
      // 发送消息给AI
      const reply = await sendMessageToAI(content, conversationId)
      
      // 添加AI回复到界面（使用保存的消息列表引用）
      const aiMessage: AIMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      }
      
      // 基于保存的消息列表追加AI回复
      this.setData({
        messages: [...currentMessages, aiMessage],
        loading: false,
        canSend: false,
        scrollIntoView: `msg-${aiMessage.id}`,
      })
    } catch (error) {
      console.error('sendMessageToAI error', error)
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，我现在无法回答这个问题。请稍后再试。',
        createdAt: new Date().toISOString(),
      }
      // 基于保存的消息列表追加错误消息
      this.setData({
        messages: [...currentMessages, errorMessage],
        loading: false,
        canSend: false,
        scrollIntoView: `msg-${errorMessage.id}`,
      })
    }
  },

  async onNewConversation() {
    // 跳转到对话列表页面
    wx.redirectTo({
      url: '/pages/ai-assistant/list',
    })
  },

  async onClearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前对话的历史吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            if (this.data.conversationId) {
              // 清空当前对话的消息
              await dbAI.clearConversationMessages(this.data.conversationId)
            } else {
              // 清空所有消息（兼容旧逻辑）
              await clearConversationHistory()
            }
            this.setData({ messages: [] })
            wx.showToast({
              title: '已清空',
              icon: 'success',
            })
          } catch (error) {
            console.error('clearConversationHistory error', error)
            wx.showToast({
              title: '清空失败',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  formatTime(iso: string): string {
    const date = new Date(iso)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },
})

