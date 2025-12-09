// 番茄钟页面
import { loadPomodoroSettings, savePomodoroSettings, savePomodoroSession } from '../../utils/features/pomodoro'

interface PomodoroData {
  // 计时器状态
  isRunning: boolean
  currentTime: number // 剩余秒数
  displayTime: string
  statusText: string
  currentTask: string
  taskName: string
  progressAngle: number
  
  // 模式：'focus' | 'shortBreak' | 'longBreak'
  mode: string
  focusCount: number // 完成的专注次数
  
  // 设置
  settings: {
    focusDuration: number
    shortBreakDuration: number
    longBreakDuration: number
    soundEnabled: boolean
  }
  showSettings: boolean
  
  // 统计
  todayCount: number
  totalMinutes: number
  
  // 定时器
  timer: number | null
}

Page<PomodoroData, WechatMiniprogram.Page.CustomOption>({
  data: {
    isRunning: false,
    currentTime: 25 * 60, // 默认25分钟
    displayTime: '25:00',
    statusText: '准备开始',
    currentTask: '',
    taskName: '',
    progressAngle: 0,
    progressOpacity: 0.2, // 进度透明度
    mode: 'focus',
    focusCount: 0,
    settings: {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      soundEnabled: true,
    },
    showSettings: false,
    todayCount: 0,
    totalMinutes: 0,
    timer: null,
  },

  onLoad() {
    this.loadSettings()
    this.loadStats()
    this.updateDisplayTime()
  },

  onUnload() {
    this.stopTimer()
  },

  onHide() {
    // 页面隐藏时暂停计时器（可选，也可以继续运行）
    // this.pauseTimer()
  },

  async loadSettings() {
    try {
      const settings = await loadPomodoroSettings()
      this.setData({
        settings,
        currentTime: settings.focusDuration * 60,
      })
      this.updateDisplayTime()
    } catch (error) {
      console.error('loadSettings error', error)
    }
  },

  async loadStats() {
    try {
      // TODO: 从数据库加载统计数据
      // 这里先使用本地存储
      const today = new Date().toDateString()
      const todayData = wx.getStorageSync(`pomodoro_${today}`) || { count: 0, minutes: 0 }
      this.setData({
        todayCount: todayData.count || 0,
        totalMinutes: todayData.minutes || 0,
      })
    } catch (error) {
      console.error('loadStats error', error)
    }
  },

  onToggleTimer() {
    if (this.data.isRunning) {
      this.pauseTimer()
    } else {
      this.startTimer()
    }
  },

  startTimer() {
    if (this.data.currentTime <= 0) {
      this.resetTimer()
    }
    
    this.setData({ isRunning: true })
    this.updateStatusText()
    
    const timer = setInterval(() => {
      let currentTime = this.data.currentTime - 1
      
      if (currentTime <= 0) {
        this.completeTimer()
        return
      }
      
      this.setData({ currentTime })
      this.updateDisplayTime()
      this.updateProgress()
    }, 1000)
    
    this.setData({ timer })
  },

  pauseTimer() {
    this.setData({ isRunning: false })
    this.updateStatusText()
    this.stopTimer()
  },

  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.setData({ timer: null })
    }
  },

  resetTimer() {
    this.stopTimer()
    const duration = this.data.mode === 'focus' 
      ? this.data.settings.focusDuration 
      : this.data.mode === 'shortBreak'
      ? this.data.settings.shortBreakDuration
      : this.data.settings.longBreakDuration
    
    this.setData({
      isRunning: false,
      currentTime: duration * 60,
    })
    this.updateDisplayTime()
    this.updateProgress()
    this.updateStatusText()
  },

  onResetTimer() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置计时器吗？',
      success: (res) => {
        if (res.confirm) {
          this.resetTimer()
        }
      },
    })
  },

  completeTimer() {
    this.stopTimer()
    
    if (this.data.mode === 'focus') {
      // 完成一个专注
      this.completeFocus()
    } else {
      // 休息结束，回到专注
      this.setData({ mode: 'focus' })
      this.resetTimer()
    }
    
    // 播放提示音
    if (this.data.settings.soundEnabled) {
      wx.vibrateShort()
    }
    
    wx.showToast({
      title: this.data.mode === 'focus' ? '专注完成！' : '休息结束',
      icon: 'success',
    })
  },

  async completeFocus() {
    const focusCount = this.data.focusCount + 1
    const minutes = this.data.settings.focusDuration
    
    // 保存记录
    try {
      await savePomodoroSession({
        taskName: this.data.taskName || '未命名任务',
        duration: minutes,
        type: 'focus',
      })
    } catch (error) {
      console.error('savePomodoroSession error', error)
    }
    
    // 更新统计
    const today = new Date().toDateString()
    const todayData = wx.getStorageSync(`pomodoro_${today}`) || { count: 0, minutes: 0 }
    todayData.count = (todayData.count || 0) + 1
    todayData.minutes = (todayData.minutes || 0) + minutes
    wx.setStorageSync(`pomodoro_${today}`, todayData)
    
    this.setData({
      focusCount,
      todayCount: todayData.count,
      totalMinutes: todayData.minutes,
    })
    
    // 每4个番茄后长休息
    if (focusCount % 4 === 0) {
      this.setData({ mode: 'longBreak' })
    } else {
      this.setData({ mode: 'shortBreak' })
    }
    
    this.resetTimer()
  },

  updateDisplayTime() {
    const minutes = Math.floor(this.data.currentTime / 60)
    const seconds = this.data.currentTime % 60
    const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    this.setData({ displayTime })
  },

  updateProgress() {
    const duration = this.data.mode === 'focus' 
      ? this.data.settings.focusDuration * 60
      : this.data.mode === 'shortBreak'
      ? this.data.settings.shortBreakDuration * 60
      : this.data.settings.longBreakDuration * 60
    
    const progress = 1 - (this.data.currentTime / duration)
    // 使用透明度显示进度，而不是旋转
    const progressOpacity = 0.2 + (progress * 0.8) // 从0.2到1.0
    this.setData({ 
      progressOpacity,
      // 保留 progressAngle 以防其他地方使用，但不再用于旋转
      progressAngle: progress * 360 
    })
  },

  updateStatusText() {
    let statusText = '准备开始'
    if (this.data.isRunning) {
      statusText = this.data.mode === 'focus' ? '专注中' : '休息中'
    } else if (this.data.currentTime < this.data.settings.focusDuration * 60) {
      statusText = '已暂停'
    }
    this.setData({ statusText })
  },

  onTaskInput(event: WechatMiniprogram.Input) {
    this.setData({
      taskName: event.detail.value || '',
      currentTask: event.detail.value || '',
    })
  },

  onOpenSettings() {
    this.setData({ showSettings: true })
  },

  onCloseSettings() {
    this.setData({ showSettings: false })
  },

  onFocusDurationInput(event: WechatMiniprogram.Input) {
    const inputValue = event.detail.value
    // 允许用户输入任何内容，包括空字符串
    // 只在输入有效数字时更新，否则保持原值
    const numValue = parseInt(inputValue)
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(60, numValue))
      this.setData({
        'settings.focusDuration': clampedValue,
      })
    }
  },

  onFocusDurationBlur(event: WechatMiniprogram.Input) {
    // 失去焦点时验证并修正值
    const inputValue = event.detail.value.trim()
    let value = parseInt(inputValue)
    if (isNaN(value) || value < 1) {
      value = 25 // 默认值
    }
    const clampedValue = Math.max(1, Math.min(60, value))
    this.setData({
      'settings.focusDuration': clampedValue,
    })
  },

  onShortBreakInput(event: WechatMiniprogram.Input) {
    const inputValue = event.detail.value
    // 允许用户输入任何内容，包括空字符串
    // 只在输入有效数字时更新，否则保持原值
    const numValue = parseInt(inputValue)
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(30, numValue))
      this.setData({
        'settings.shortBreakDuration': clampedValue,
      })
    }
  },

  onShortBreakBlur(event: WechatMiniprogram.Input) {
    // 失去焦点时验证并修正值
    const inputValue = event.detail.value.trim()
    let value = parseInt(inputValue)
    if (isNaN(value) || value < 1) {
      value = 5 // 默认值
    }
    const clampedValue = Math.max(1, Math.min(30, value))
    this.setData({
      'settings.shortBreakDuration': clampedValue,
    })
  },

  onLongBreakInput(event: WechatMiniprogram.Input) {
    const inputValue = event.detail.value
    // 允许用户输入任何内容，包括空字符串
    // 只在输入有效数字时更新，否则保持原值
    const numValue = parseInt(inputValue)
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(60, numValue))
      this.setData({
        'settings.longBreakDuration': clampedValue,
      })
    }
  },

  onLongBreakBlur(event: WechatMiniprogram.Input) {
    // 失去焦点时验证并修正值
    const inputValue = event.detail.value.trim()
    let value = parseInt(inputValue)
    if (isNaN(value) || value < 1) {
      value = 15 // 默认值
    }
    const clampedValue = Math.max(1, Math.min(60, value))
    this.setData({
      'settings.longBreakDuration': clampedValue,
    })
  },

  onSoundToggle(event: WechatMiniprogram.SwitchChange) {
    this.setData({
      'settings.soundEnabled': event.detail.value,
    })
  },

  async onSaveSettings() {
    try {
      await savePomodoroSettings(this.data.settings)
      this.setData({ showSettings: false })
      
      // 如果当前是初始状态，更新倒计时
      if (!this.data.isRunning && this.data.currentTime === this.data.settings.focusDuration * 60) {
        this.resetTimer()
      }
      
      wx.showToast({
        title: '设置已保存',
        icon: 'success',
      })
    } catch (error) {
      console.error('saveSettings error', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none',
      })
    }
  },

  noop() {
    // 空函数，阻止事件冒泡
  },
})

