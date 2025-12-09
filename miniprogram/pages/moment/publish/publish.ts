import { addMoment } from '../../../utils/features/moment'

interface PublishPageData {
  content: string
  images: string[]
  location: string
  mood: string
  topics: string[]
  showMoodPicker: boolean
  showTopicInput: boolean
  topicInputValue: string
  moods?: Array<{ id: string; name: string; emoji: string }>
  moodEmoji?: string
  moodName?: string
}

const MOODS = [
  { id: 'happy', name: '开心', emoji: '😊' },
  { id: 'sad', name: '难过', emoji: '😢' },
  { id: 'excited', name: '兴奋', emoji: '🤩' },
  { id: 'tired', name: '疲惫', emoji: '😴' },
  { id: 'angry', name: '生气', emoji: '😠' },
  { id: 'calm', name: '平静', emoji: '😌' },
  { id: 'love', name: '喜欢', emoji: '😍' },
  { id: 'none', name: '无', emoji: '' },
]

Page<PublishPageData>({
  data: {
    content: '',
    images: [],
    location: '',
    mood: '',
    topics: [],
    showMoodPicker: false,
    showTopicInput: false,
    topicInputValue: '',
    moodEmoji: '',
    moodName: '',
  },

  onLoad() {
    // 确保 moods 数据正确初始化
    this.setData({
      moods: MOODS,
      showMoodPicker: false,
      showTopicInput: false,
    })
  },

  onShow() {
    // 页面显示时确保遮罩层关闭
    if (this.data.showMoodPicker || this.data.showTopicInput) {
      this.setData({
        showMoodPicker: false,
        showTopicInput: false,
      })
    }
  },

  onHide() {
    // 页面隐藏时关闭所有遮罩层
    this.setData({
      showMoodPicker: false,
      showTopicInput: false,
    })
  },

  onUnload() {
    // 页面卸载时关闭所有遮罩层
    this.setData({
      showMoodPicker: false,
      showTopicInput: false,
    })
  },

  onContentInput(event: WechatMiniprogram.TextareaInput) {
    this.setData({
      content: event.detail.value || '',
    })
  },

  onAddImage() {
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths.length) {
          const images = [...this.data.images, ...res.tempFilePaths].slice(0, 9)
          this.setData({ images })
        }
      },
    })
  },

  onRemoveImage(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  onLocationInput(event: WechatMiniprogram.Input) {
    this.setData({
      location: event.detail.value || '',
    })
  },

  async onChooseLocation() {
    // 检查是否支持定位功能
    if (!wx.chooseLocation) {
      wx.showModal({
        title: '提示',
        content: '当前版本不支持定位功能，请手动输入地点',
        showCancel: false,
      })
      return
    }

    wx.showLoading({ title: '定位中...', mask: true })

    try {
      // 先检查定位权限
      const settingRes = await new Promise<WechatMiniprogram.GetSettingSuccessCallbackResult>((resolve) => {
        wx.getSetting({
          success: resolve,
          fail: () => resolve({ authSetting: {} } as any),
        })
      })

      // 如果未授权，先请求授权
      if (!settingRes.authSetting['scope.userLocation']) {
        wx.hideLoading()
        try {
          await new Promise<void>((resolve, reject) => {
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => {
                wx.showLoading({ title: '定位中...', mask: true })
                resolve()
              },
              fail: (err) => {
                // 用户拒绝授权，引导去设置
                if (err.errMsg && err.errMsg.includes('auth deny')) {
                  wx.showModal({
                    title: '需要位置权限',
                    content: '定位功能需要位置权限，请在设置中开启。如果无法定位，也可以手动输入地点。',
                    confirmText: '去设置',
                    cancelText: '手动输入',
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        wx.openSetting({
                          success: () => {
                            // 用户从设置返回后，再次尝试定位
                            setTimeout(() => {
                              this.onChooseLocation()
                            }, 500)
                          },
                        })
                      }
                    },
                  })
                } else {
                  wx.showToast({
                    title: '定位失败，请手动输入地点',
                    icon: 'none',
                    duration: 2000,
                  })
                }
                reject(err)
              },
            })
          })
        } catch (authError) {
          // 授权失败，不继续执行
          return
        }
      }

      // 调用选择位置
      wx.chooseLocation({
        success: (res) => {
          wx.hideLoading()
          this.setData({
            location: res.name || res.address || '',
          })
          wx.showToast({
            title: '定位成功',
            icon: 'success',
            duration: 1000,
          })
        },
        fail: (err) => {
          wx.hideLoading()
          console.warn('chooseLocation error:', err)
          let errorMsg = '定位失败'
          let showModal = false
          
          if (err.errMsg) {
            if (err.errMsg.includes('auth deny') || err.errMsg.includes('permission')) {
              errorMsg = '需要位置权限，请在设置中开启'
              showModal = true
            } else if (err.errMsg.includes('cancel')) {
              // 用户取消，不显示提示
              return
            } else if (err.errMsg.includes('fail') || err.errMsg.includes('not support')) {
              errorMsg = '定位功能不可用，请手动输入地点'
              showModal = true
            }
          }

          if (showModal) {
            wx.showModal({
              title: '定位失败',
              content: errorMsg + '。您也可以手动输入地点。',
              showCancel: false,
            })
          } else {
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000,
            })
          }
        },
      })
    } catch (error) {
      wx.hideLoading()
      console.error('onChooseLocation error:', error)
      wx.showModal({
        title: '定位失败',
        content: '定位功能暂时不可用，请手动输入地点。',
        showCancel: false,
      })
    }
  },

  onCancel() {
    // 关闭所有遮罩层后再返回
    this.setData({
      showMoodPicker: false,
      showTopicInput: false,
    })
    // 延迟返回，确保遮罩层先关闭
    setTimeout(() => {
      wx.navigateBack()
    }, 50)
  },

  async onSubmit() {
    const { content, images, location, mood, topics } = this.data
    if (!content.trim()) {
      wx.showToast({
        title: '请输入动态内容',
        icon: 'none',
      })
      return
    }
    
    wx.showLoading({ title: '发布中...' })
    try {
      await addMoment({
        content: content.trim(),
        images,
        location: location.trim(),
        mood: mood || undefined,
        topics: topics.length > 0 ? topics : undefined,
      })
      wx.hideLoading()
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 600,
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none',
      })
      console.error('publish moment error', error)
    }
  },

  // 显示心情选择器
  onShowMoodPicker() {
    this.setData({ showMoodPicker: true })
  },

  // 关闭心情选择器
  onCloseMoodPicker() {
    if (this.data.showMoodPicker) {
      this.setData({ showMoodPicker: false })
    }
  },

  // 选择心情
  onMoodSelect(event: WechatMiniprogram.TouchEvent) {
    const mood = event.currentTarget.dataset.mood || ''
    const moodInfo = MOODS.find(m => m.id === mood) || { id: '', name: '', emoji: '' }
    this.setData({
      mood,
      moodEmoji: moodInfo.emoji,
      moodName: moodInfo.name,
      showMoodPicker: false,
    })
  },

  // 移除心情
  onRemoveMood() {
    this.setData({ 
      mood: '',
      moodEmoji: '',
      moodName: '',
    })
  },

  // 显示话题输入
  onShowTopicInput() {
    this.setData({ showTopicInput: true })
  },

  // 关闭话题输入
  onCloseTopicInput() {
    if (this.data.showTopicInput) {
      this.setData({
        showTopicInput: false,
        topicInputValue: '',
      })
    }
  },

  // 话题输入
  onTopicInput(event: WechatMiniprogram.Input) {
    this.setData({
      topicInputValue: event.detail.value || '',
    })
  },

  // 添加话题
  onAddTopic() {
    let topic = this.data.topicInputValue.trim()
    if (!topic) return
    
    // 移除#号（如果有）
    if (topic.startsWith('#')) {
      topic = topic.slice(1)
    }
    
    if (!topic) return
    
    if (this.data.topics.includes(topic)) {
      wx.showToast({
        title: '话题已存在',
        icon: 'none',
      })
      return
    }
    
    if (this.data.topics.length >= 5) {
      wx.showToast({
        title: '最多添加5个话题',
        icon: 'none',
      })
      return
    }
    
    this.setData({
      topics: [...this.data.topics, topic],
      topicInputValue: '',
      showTopicInput: false,
    })
  },

  // 删除话题
  onRemoveTopic(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const topics = [...this.data.topics]
    topics.splice(index, 1)
    this.setData({ topics })
  },

  // 获取心情信息
  getMoodInfo(moodId: string) {
    return MOODS.find(m => m.id === moodId) || { id: '', name: '', emoji: '' }
  },

  // 空方法，用于阻止事件冒泡
  noop() {
    // 空方法，用于 catchtap 阻止事件冒泡
  },
})

