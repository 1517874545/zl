const appInstance = getApp<IAppOption>()
import { loadMoments } from '../../utils/features/moment'
import * as dbMoments from '../../utils/db/moments'

interface NotificationItem {
  id: string
  type: 'like' | 'comment'
  from: string
  message: string
  time: string
  read: boolean
}

interface MomentPageData {
  moments: MomentItem[]
  refreshing: boolean
  notifications: NotificationItem[]
  unreadCount: number
  showMessagePanel: boolean
  activeCommentId: string
  commentDrafts: Record<string, string>
}

Page<MomentPageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    moments: [],
    refreshing: false,
    notifications: [],
    unreadCount: 0,
    showMessagePanel: false,
    activeCommentId: '',
    commentDrafts: {},
  },

  async onLoad() {
    await this.loadMomentsData()
  },

  async onShow() {
    await this.loadMomentsData()
  },

  async loadMomentsData() {
    try {
      const moments = await loadMoments()
      // 过滤无效的图片路径
      const validMoments = moments.map(moment => ({
        ...moment,
        images: (moment.images || []).filter((img: string) => {
          // 过滤掉空字符串、null、undefined 和无效路径
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
        }),
      }))
      this.setData({ moments: validMoments })
    } catch (error) {
      console.error('loadMomentsData error', error)
      // 如果加载失败，使用全局数据作为后备
      this.setData({
        moments: appInstance.globalData.moments || [],
      })
    }
  },

  async onPullDownRefresh() {
    this.setData({ refreshing: true })
    try {
      await this.loadMomentsData()
      wx.showToast({
        title: '动态已更新',
        icon: 'success',
        duration: 800,
      })
    } catch (error) {
      wx.showToast({
        title: '更新失败',
        icon: 'none',
      })
    } finally {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  getNowTime() {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  },

  pickRandomName() {
    const pool = ['Luna', 'Eric', 'Nana', 'Seven', 'Tina', 'Arthur']
    const index = Math.floor(Math.random() * pool.length)
    return pool[index]
  },

  addNotification(type: 'like' | 'comment', from: string, message: string) {
    const time = this.getNowTime()
    const notifications = [
      {
        id: `msg-${Date.now()}`,
        type,
        from,
        message,
        time,
        read: false,
      },
      ...this.data.notifications,
    ]
    this.setData({
      notifications,
      unreadCount: this.data.unreadCount + 1,
    })
  },

  onMessageBellTap() {
    this.setData({
      showMessagePanel: true,
      unreadCount: 0,
      notifications: this.data.notifications.map((item) => ({
        ...item,
        read: true,
      })),
    })
  },

  onCloseMessagePanel() {
    this.setData({
      showMessagePanel: false,
    })
  },

  onMarkMessagesRead() {
    this.setData({
      unreadCount: 0,
      notifications: this.data.notifications.map((item) => ({
        ...item,
        read: true,
      })),
    })
  },

  onPreviewImage(event: WechatMiniprogram.TouchEvent) {
    const mid = event.currentTarget.dataset.mid as string
    const index = Number(event.currentTarget.dataset.index)
    const target = this.data.moments.find((item) => item.id === mid)
    if (!target || !target.images || !target.images.length) return
    // 过滤有效图片
    const validImages = target.images.filter((img: string) => img && typeof img === 'string' && !img.includes('undefined') && !img.includes('null'))
    if (validImages.length === 0) return
    wx.previewImage({
      current: validImages[Math.min(index, validImages.length - 1)],
      urls: validImages,
    })
  },

  // 图片加载错误处理（静默处理，减少控制台输出）
  onImageError(event: WechatMiniprogram.ImageError) {
    const mid = event.currentTarget.dataset.mid as string
    const index = Number(event.currentTarget.dataset.index)
    // 静默处理，不输出错误（避免控制台噪音）
    // 如果需要调试，可以取消下面的注释
    // console.warn('Image load error (silently handled):', { mid, index })
    
    // 从动态中移除无效图片（静默处理，不显示错误）
    const updated = this.data.moments.map((item) => {
      if (item.id === mid && item.images && item.images.length > index) {
        const validImages = item.images.filter((img: string, idx: number) => idx !== index)
        return { ...item, images: validImages }
      }
      return item
    })
    this.setData({ moments: updated })
  },

  // 头像加载错误处理（静默处理）
  onAvatarError(event: WechatMiniprogram.ImageError) {
    const mid = event.currentTarget.dataset.mid as string
    // 静默处理，不输出错误（避免控制台噪音）
    // 如果需要调试，可以取消下面的注释
    // console.warn('Avatar load error (silently handled):', { mid })
    
    // 使用默认头像
    const updated = this.data.moments.map((item) => {
      if (item.id === mid) {
        return { ...item, avatar: '../../assets/avatar-a.png' }
      }
      return item
    })
    this.setData({ moments: updated })
  },

  async onLikeTap(event: WechatMiniprogram.TouchEvent) {
    const mid = event.currentTarget.dataset.mid as string
    const moment = this.data.moments.find(item => item.id === mid)
    if (!moment) return
    
    const liked = !moment.likedByMe
    const likes = Math.max(0, (moment.likes || 0) + (liked ? 1 : -1))
    
    // 立即更新 UI
    const updated = this.data.moments.map((item) => {
      if (item.id !== mid) return item
      return {
        ...item,
        likedByMe: liked,
        likes,
      }
    })
    this.setData({ moments: updated })
    
    // 保存到数据库
    try {
      await dbMoments.updateLike(mid, liked, likes)
    } catch (error) {
      console.error('updateLike error', error)
      // 如果失败，恢复原状态
      this.setData({ moments: this.data.moments })
    }
  },

  onCommentEntry(event: WechatMiniprogram.TouchEvent) {
    const mid = event.currentTarget.dataset.mid as string
    this.setData({
      activeCommentId: mid,
    })
  },

  onCommentInputChange(event: WechatMiniprogram.Input) {
    const mid = event.currentTarget.dataset.mid as string
    const value = event.detail.value || ''
    this.setData({
      commentDrafts: {
        ...this.data.commentDrafts,
        [mid]: value,
      },
    })
  },

  async onCommentSend(event: WechatMiniprogram.TouchEvent) {
    const mid = event.currentTarget.dataset.mid as string
    const value = (this.data.commentDrafts[mid] || '').trim()
    if (!value) {
      return
    }
    
    const app = getApp<IAppOption>()
    const userProfile = app.globalData.userProfile || {}
    const nickname = userProfile.username || '我'
    const now = this.getNowTime()
    
    // 立即更新 UI
    const updated = this.data.moments.map((item) => {
      if (item.id !== mid) return item
      const comments = [
        ...item.comments,
        {
          id: `comment-${Date.now()}`,
          nickname,
          content: value,
          time: now,
        },
      ]
      return {
        ...item,
        comments,
      }
    })
    const drafts = { ...this.data.commentDrafts }
    drafts[mid] = ''
    this.setData({
      moments: updated,
      commentDrafts: drafts,
      activeCommentId: '',
    })
    
    // 保存到数据库
    try {
      await dbMoments.addComment(mid, {
        nickname,
        content: value,
        time: now,
      })
      wx.showToast({
        title: '评论成功',
        icon: 'success',
      })
    } catch (error) {
      console.error('addComment error', error)
      wx.showToast({
        title: '评论失败，请重试',
        icon: 'none',
      })
      // 如果失败，重新加载数据
      await this.loadMomentsData()
    }
  },

  onPublishTap() {
    wx.navigateTo({
      url: '/pages/moment/publish/publish',
    })
  },

  // 删除动态
  async onDeleteMoment(event: WechatMiniprogram.TouchEvent) {
    const mid = event.currentTarget.dataset.mid as string
    if (!mid) return

    const confirmRes = await new Promise<WechatMiniprogram.ShowModalSuccessCallbackResult>((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '删除后不可恢复，确认删除该动态？',
        confirmColor: '#e54d42',
        success: resolve,
      })
    })

    if (!confirmRes.confirm) return

    // 先本地移除，提升响应
    const cached = this.data.moments
    const filtered = cached.filter(item => item.id !== mid)
    this.setData({ moments: filtered })

    try {
      await dbMoments.deleteMoment(mid)
      wx.showToast({ title: '已删除', icon: 'success', duration: 800 })
    } catch (error) {
      console.error('delete moment error', error)
      wx.showToast({ title: '删除失败，请重试', icon: 'none' })
      // 恢复
      this.setData({ moments: cached })
    }
  },

  // 获取心情表情
  getMoodEmoji(mood: string): string {
    const moods: Record<string, string> = {
      'happy': '😊',
      'sad': '😢',
      'excited': '🤩',
      'tired': '😴',
      'angry': '😠',
      'calm': '😌',
      'love': '😍',
    }
    return moods[mood] || ''
  },

  // 获取心情名称
  getMoodName(mood: string): string {
    const moods: Record<string, string> = {
      'happy': '开心',
      'sad': '难过',
      'excited': '兴奋',
      'tired': '疲惫',
      'angry': '生气',
      'calm': '平静',
      'love': '喜欢',
    }
    return moods[mood] || ''
  },

  noop() {},
})

