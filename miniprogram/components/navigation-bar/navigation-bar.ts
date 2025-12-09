Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: '',
    _hasBackListener: false, // 标记是否绑定了back事件监听器
    _defaultBackTimer: null as any // 存储默认返回的定时器
  },
  lifetimes: {
    attached() {
      const rect = wx.getMenuButtonBoundingClientRect()
      wx.getSystemInfo({
        success: (res) => {
          const isAndroid = res.platform === 'android'
          const isDevtools = res.platform === 'devtools'
          this.setData({
            ios: !isAndroid,
            innerPaddingRight: `padding-right: ${res.windowWidth - rect.left}px`,
            leftWidth: `width: ${res.windowWidth - rect.left }px`,
            safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${res.safeArea.top}px); padding-top: ${res.safeArea.top}px` : ``
          })
        }
      })
    },
    detached() {
      // 清理定时器
      if (this.data._defaultBackTimer) {
        clearTimeout(this.data._defaultBackTimer)
        this.setData({ _defaultBackTimer: null })
      }
    }
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show: boolean) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${
          show ? '1' : '0'
        };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      
      // 清除之前的定时器（防止重复点击）
      if (data._defaultBackTimer) {
        clearTimeout(data._defaultBackTimer)
        this.setData({ _defaultBackTimer: null })
      }
      
      // 记录当前页面路由，用于后续检查
      const pages = getCurrentPages()
      const currentRoute = pages.length > 0 ? pages[pages.length - 1].route : ''
      
      // 触发返回事件，让父组件处理
      // 如果父组件绑定了back事件，由父组件决定是否调用wx.navigateBack()
      // 如果父组件没有绑定事件，这里执行默认返回
      let handled = false
      this.triggerEvent('back', { 
        delta: data.delta,
        // 提供一个方法让父组件标记已处理，阻止默认返回
        preventDefault: () => {
          handled = true
          if (this.data._defaultBackTimer) {
            clearTimeout(this.data._defaultBackTimer)
            this.setData({ _defaultBackTimer: null })
          }
        }
      }, {
        // 捕获事件处理结果，如果父组件处理了，就不执行默认返回
        capturePhase: false
      })
      
      // 延迟执行默认返回，给父组件时间处理事件
      // 只有父组件没有标记handled时，才执行默认返回
      const timerId = setTimeout(() => {
        // 如果已被父组件处理，不执行默认返回
        if (handled) {
          this.setData({ _defaultBackTimer: null })
          return
        }
        
        // 检查页面是否还存在（父组件可能已经跳转）
        try {
          const pages = getCurrentPages()
          if (pages.length === 0) {
            this.setData({ _defaultBackTimer: null })
            return
          }
          
          // 检查页面路由是否改变（如果改变了，说明已经跳转了）
          const newRoute = pages[pages.length - 1].route
          if (currentRoute && newRoute !== currentRoute) {
            // 页面已经跳转，不执行返回
            this.setData({ _defaultBackTimer: null })
            return
          }
          
          wx.navigateBack({
            delta: data.delta,
            success: () => {
              this.setData({ _defaultBackTimer: null })
            },
            fail: (err) => {
              this.setData({ _defaultBackTimer: null })
              // 如果返回失败，可能是：
              // 1. 父组件已经执行了返回（这是正常的，忽略错误）
              // 2. 已经是首页了，尝试跳转到首页tab
              if (err.errMsg && err.errMsg.includes('navigateBack')) {
                const pages = getCurrentPages()
                if (pages.length <= 1) {
                  // 如果已经是最后一个页面，尝试跳转到首页
                  wx.switchTab({
                    url: '/pages/index/index',
                    fail: () => {
                      // 忽略错误
                    }
                  })
                }
              }
            }
          })
        } catch (e) {
          // 如果获取页面栈失败，说明可能已经跳转了，忽略错误
          this.setData({ _defaultBackTimer: null })
        }
      }, 300) // 只延迟300ms，如果父组件绑定了事件，应该立即处理
      
      this.setData({ _defaultBackTimer: timerId })
    }
  },
})
