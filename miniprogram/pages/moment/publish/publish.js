const { addMoment } = require('../../../utils/features/moment')

Page({
  data: {
    content: '',
    images: [],
    location: '',
  },

  onContentInput(event) {
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
          const images = this.data.images.concat(res.tempFilePaths).slice(0, 9)
          this.setData({ images })
        }
      },
    })
  },

  onRemoveImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    const images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images })
  },

  onLocationInput(event) {
    this.setData({
      location: event.detail.value || '',
    })
  },

  onChooseLocation() {
    if (!wx.chooseLocation) {
      wx.showToast({ title: '当前版本不支持定位', icon: 'none' })
      return
    }
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: res.name || res.address || '',
        })
      },
      fail: () => {
        wx.showToast({ title: '定位失败', icon: 'none' })
      },
    })
  },

  onCancel() {
    wx.navigateBack()
  },

  onSubmit() {
    const content = (this.data.content || '').trim()
    if (!content) {
      wx.showToast({
        title: '请输入动态内容',
        icon: 'none',
      })
      return
    }
    addMoment({
      content,
      images: this.data.images,
      location: (this.data.location || '').trim(),
    })
    wx.showToast({
      title: '发布成功',
      icon: 'success',
      duration: 600,
    })
    setTimeout(() => {
      wx.navigateBack()
    }, 600)
  },
})

