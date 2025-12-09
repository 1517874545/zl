// AI助手对话列表页面
import {
  loadConversations,
  deleteConversation,
  type Conversation,
} from '../../utils/db/conversations'

Page({
  data: {
    conversations: [] as Conversation[],
  },

  async onLoad() {
    await this.loadConversations()
  },

  async onShow() {
    // 每次显示页面时刷新列表
    await this.loadConversations()
  },

  async loadConversations() {
    try {
      const conversations = await loadConversations(50)
      // 格式化时间
      const conversationsWithTime = conversations.map(conv => ({
        ...conv,
        formattedTime: this.formatTime(conv.updated_at),
      }))
      this.setData({ conversations: conversationsWithTime })
    } catch (error) {
      console.error('loadConversations error', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      })
    }
  },

  onNewConversation() {
    // 跳转到AI助手页面，不传conversation_id表示新建对话
    wx.navigateTo({
      url: '/pages/ai-assistant/ai-assistant',
    })
  },

  onConversationTap(event: WechatMiniprogram.TouchEvent) {
    const conversationId = event.currentTarget.dataset.id
    if (conversationId) {
      wx.navigateTo({
        url: `/pages/ai-assistant/ai-assistant?conversationId=${conversationId}`,
      })
    }
  },

  formatTime(iso?: string): string {
    if (!iso) return ''
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    
    if (days === 0) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `今天 ${hours}:${minutes}`
    } else if (days === 1) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `昨天 ${hours}:${minutes}`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}-${day}`
    }
  },
})
