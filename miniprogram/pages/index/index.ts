// index.ts
import { loadAnniversaries } from '../../utils/features/anniversary'
import { loadUserProfile } from '../../utils/db/profile'

const app = getApp<IAppOption>()
const DAY = 24 * 60 * 60 * 1000

type AnniversaryState = AnniversaryMeta & {
  daysLeft: number
  progress: number
  remainingText: string
  totalDays: number
}

interface HomePageData {
  greeting: string
  dateInfo: {
    dayDisplay: string
    dateDesc: string
    weekday: string
  }
  anniversary: AnniversaryState
  shortcuts: FeatureShortcut[]
  userProfile: {
    avatar: string
  }
}

const defaultAnniversary: AnniversaryState = {
  id: '',
  title: '',
  from: '',
  target: '',
  avatars: {
    left: '',
    right: '',
  },
  daysLeft: 0,
  progress: 0,
  remainingText: '',
  totalDays: 0,
}

Page<HomePageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    greeting: '',
    dateInfo: {
      dayDisplay: '',
      dateDesc: '',
      weekday: '',
    },
    anniversary: defaultAnniversary,
    shortcuts: [],
    userProfile: {
      avatar: '../../assets/avatar-a.png', // 默认头像
    },
  },

  onLoad() {
    this.setData({
      shortcuts: app.globalData.featureShortcuts,
    })
    this.refreshClock()
  },

  onShow() {
    this.refreshClock()
    // 确保显示最新的置顶纪念日
    this.updateAnniversary()
    // 加载用户头像
    this.loadUserProfile()
  },

  // 头像加载失败回退默认图
  onHeroAvatarError() {
    this.setData({
      userProfile: {
        ...this.data.userProfile,
        avatar: '../../assets/avatar-a.png',
      },
    })
  },

  refreshClock() {
    this.updateGreeting()
    this.updateDateInfo()
    this.updateAnniversary()
  },

  updateGreeting() {
    const hour = new Date().getHours()
    let greeting = '你好，开始舒心的一天~'
    if (hour < 6) {
      greeting = '清晨好，收获宁静时光~'
    } else if (hour < 11) {
      greeting = '上午好，工作顺利哦~'
    } else if (hour < 14) {
      greeting = '中午好，别忘了补充能量~'
    } else if (hour < 18) {
      greeting = '下午好，继续元气满满~'
    } else {
      greeting = '晚上好，放松一下好好休息~'
    }
    this.setData({ greeting })
  },

  updateDateInfo() {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    this.setData({
      dateInfo: {
        dayDisplay: day,
        dateDesc: `${year}年${month}月`,
        weekday: weekdays[now.getDay()],
      },
    })
  },

  async updateAnniversary() {
    // 从数据库加载最新数据
    try {
      const allAnniversaries = await loadAnniversaries(app.globalData.anniversaries || [])
      
      if (!allAnniversaries || allAnniversaries.length === 0) {
        this.setData({ anniversary: defaultAnniversary })
        return
      }
      
      // 查找置顶的纪念日（优先显示置顶的）
      // 使用更严格的判断：pinned 必须明确为 true
      const pinnedAnniversary = allAnniversaries.find((item) => {
        return item.pinned === true || item.pinned === 'true'
      })
      
      const target = pinnedAnniversary || allAnniversaries[0]
      
      if (!target) {
        this.setData({ anniversary: defaultAnniversary })
        return
      }
      
      const computed = this.computeAnniversaryState(target)
      this.setData({
        anniversary: computed,
      })
    } catch (error) {
      console.error('updateAnniversary error', error)
      // 如果加载失败，使用全局数据作为后备
      const allAnniversaries = app.globalData.anniversaries || []
      if (allAnniversaries.length > 0) {
        const target = allAnniversaries[0]
        const computed = this.computeAnniversaryState(target)
        this.setData({
          anniversary: computed,
        })
      } else {
        this.setData({ anniversary: defaultAnniversary })
      }
    }
  },

  computeAnniversaryState(meta: AnniversaryMeta): AnniversaryState {
    const now = new Date()
    const targetDate = this.computeNextTargetDate(meta, now)
    const cycleStart = this.computeCycleStartDate(meta, targetDate)

    const totalDays = Math.max(1, Math.round((targetDate.getTime() - cycleStart.getTime()) / DAY))
    const daysLeft = Math.max(0, Math.round((targetDate.getTime() - now.getTime()) / DAY))
    const elapsed = Math.max(0, Math.min(totalDays, totalDays - daysLeft))
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)))
    const years = Math.floor(daysLeft / 365)
    const months = Math.floor((daysLeft % 365) / 30)
    const remainingText = years > 0
      ? `${years}年${months}月`
      : `${months}月${(daysLeft % 30)}天`

    return {
      ...meta,
      daysLeft,
      progress,
      remainingText,
      totalDays,
    }
  },

  computeNextTargetDate(item: AnniversaryMeta, base: Date): Date {
    const target = new Date(item.target.replace(/-/g, '/'))
    const repeat = (item.repeat !== undefined && item.repeat !== null) ? item.repeat : 'none'

    if (repeat === 'none') {
      return target
    }

    const next = new Date(target.getTime())

    if (repeat === 'year') {
      while (next.getTime() < base.getTime()) {
        next.setFullYear(next.getFullYear() + 1)
      }
    } else if (repeat === 'month') {
      while (next.getTime() < base.getTime()) {
        next.setMonth(next.getMonth() + 1)
      }
    } else if (repeat === 'day') {
      while (next.getTime() < base.getTime()) {
        next.setDate(next.getDate() + 1)
      }
    }

    return next
  },

  computeCycleStartDate(item: AnniversaryMeta, targetDate: Date): Date {
    const repeat = (item.repeat !== undefined && item.repeat !== null) ? item.repeat : 'none'
    if (repeat === 'year') {
      const start = new Date(targetDate.getTime())
      start.setFullYear(start.getFullYear() - 1)
      return start
    }
    if (repeat === 'month') {
      const start = new Date(targetDate.getTime())
      const month = start.getMonth()
      start.setMonth(month - 1)
      return start
    }
    if (repeat === 'day') {
      const start = new Date(targetDate.getTime())
      start.setDate(start.getDate() - 1)
      return start
    }
    return new Date(item.from.replace(/-/g, '/'))
  },

  goToAnniversaryDetail() {
    wx.navigateTo({
      url: '/pages/anniversary/list',
    })
  },

  // 加载用户头像
  async loadUserProfile() {
    try {
      // 从数据库加载用户资料
      const profile = await loadUserProfile({
        avatar: '../../assets/avatar-b.png',
        username: '生活记录者',
        bio: '点击编辑个人简介，让朋友更了解你。',
      })
      
      if (profile && profile.avatar) {
        this.setData({
          'userProfile.avatar': profile.avatar
        })
        // 更新全局数据
        app.globalData.userProfile = {
          avatar: profile.avatar,
          username: profile.username,
          bio: profile.bio,
        }
      }
    } catch (e) {
      console.warn('loadUserProfile error', e)
      // 如果加载失败，从本地存储加载
      try {
        const userProfile = wx.getStorageSync('userProfile') as { avatar: string } | undefined
        if (userProfile && userProfile.avatar) {
          this.setData({
            'userProfile.avatar': userProfile.avatar
          })
        }
      } catch (err) {
        console.warn('loadUserProfile from storage error', err)
      }
    }
  },

  onFeatureTap(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id
    if (id === 'anniversary') {
      wx.navigateTo({
        url: '/pages/anniversary/list',
      })
      return
    }
    if (id === 'schedule') {
      wx.navigateTo({
        url: '/pages/schedule/schedule',
      })
      return
    }
    if (id === 'saving') {
      wx.navigateTo({
        url: '/pages/saving/saving',
      })
      return
    }
    if (id === 'notes') {
      wx.navigateTo({
        url: '/pages/notes/list',
      })
      return
    }
    if (id === 'weather') {
      wx.navigateTo({
        url: '/pages/weather/weather',
      })
      return
    }
    if (id === 'pomodoro') {
      wx.navigateTo({
        url: '/pages/pomodoro/pomodoro',
      })
      return
    }
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    })
  },

  onAIAssistantTap() {
    wx.navigateTo({
      url: '/pages/ai-assistant/list',
    })
  },
})
