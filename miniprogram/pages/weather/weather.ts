// 天气页面
import { loadWeather, loadWeatherForecast, loadCityList, addCity, setDefaultCity, deleteCity } from '../../utils/features/weather'
import { CONFIG } from '../../utils/config'

interface WeatherData {
  currentCity: string
  currentTemp: number
  weatherDesc: string
  humidity: number
  windSpeed: number
  airQuality: string
  updateTime: string
  suggestion: string
  forecast: Array<{
    date: string
    weather: string
    high: number
    low: number
  }>
  cityList: Array<{
    id: string
    name: string
    isDefault: boolean
  }>
  showCityPicker: boolean
  deleteMode: boolean
}

Page<WeatherData, WechatMiniprogram.Page.CustomOption>({
  data: {
    currentCity: '加载中...',
    currentTemp: 0,
    weatherDesc: '',
    humidity: 0,
    windSpeed: 0,
    airQuality: '良',
    updateTime: '',
    suggestion: '',
    forecast: [],
    cityList: [],
    showCityPicker: false,
    deleteMode: false,
  },

  onLoad() {
    this.loadWeatherData()
  },

  onShow() {
    this.loadWeatherData()
  },

  onPullDownRefresh() {
    this.loadWeatherData(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadWeatherData(done?: () => void, overrideCity?: { id: string; name: string; isDefault?: boolean }) {
    try {
      wx.showLoading({ title: '加载中...' })

      // 如果传入了 overrideCity，则直接用该城市，跳过定位流程
      if (overrideCity) {
        const [weather, forecast] = await Promise.all([
          Promise.race([
            loadWeather(overrideCity.name),
            new Promise<any>((resolve) => {
              setTimeout(() => resolve({
                temp: 0,
                weather: '未知',
                humidity: 0,
                windSpeed: 0,
                airQuality: '良',
              }), 10000) // 10秒超时
            })
          ]),
          Promise.race([
            loadWeatherForecast(overrideCity.name),
            new Promise<any[]>((resolve) => {
              setTimeout(() => resolve([]), 10000) // 10秒超时
            })
          ])
        ])

        const forecastList = (forecast && forecast.length > 0) ? forecast : this.buildMockForecast()
        const suggestion = this.generateSuggestion(weather)

        this.setData({
          currentCity: overrideCity.name,
          currentTemp: weather.temp,
          weatherDesc: weather.weather,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          airQuality: weather.airQuality || '良',
          updateTime: this.formatTime(new Date()),
          suggestion,
          forecast: forecastList.map(item => ({
            date: this.formatDate(item.date),
            weather: item.weather,
            high: item.high,
            low: item.low,
          })),
        })
        // 同时刷新城市列表以便下次展示
        const cityList = await loadCityList()
        this.setData({ cityList })
        if (done) done()
        return
      }

      // 优先尝试定位，自动切换到当前定位城市
      // 添加超时处理，避免一直等待
      // 定位失败是正常情况，完全静默回退到默认城市
      try {
        await Promise.race([
          this.getLocationAndLoadWeather(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('定位超时')), 8000) // 8秒超时
          })
        ])
        // 加载城市列表（用于城市切换功能）
        const cityList = await loadCityList()
        this.setData({ cityList })
        if (done) done()
        return
      } catch (locationError: any) {
        // 定位失败是正常情况，完全静默回退到默认城市
        // 不输出任何错误日志，避免控制台显示错误
        // 定位失败时，使用保存的默认城市或城市列表中的第一个
      }

      // 定位失败，使用保存的城市
      const cityList = await loadCityList()
      // 如果用户在弹窗中选择了城市，优先使用该城市；否则使用默认/列表首个
      const defaultCity = cityList.find(c => c.isDefault) || cityList[0]
      const targetCity = overrideCity || defaultCity
      
      if (!targetCity) {
        // 如果也没有保存的城市，显示提示
        wx.hideLoading()
        wx.showToast({
          title: '请添加城市或开启定位',
          icon: 'none',
          duration: 2000,
        })
        this.setData({
          currentCity: '未设置',
          cityList,
        })
        if (done) done()
        return
      }

      // 加载天气数据（添加超时处理）
      const [weather, forecast] = await Promise.all([
        Promise.race([
          loadWeather(targetCity.name),
          new Promise<any>((resolve) => {
            setTimeout(() => resolve({
              temp: 0,
              weather: '未知',
              humidity: 0,
              windSpeed: 0,
              airQuality: '良',
            }), 10000) // 10秒超时
          })
        ]),
        Promise.race([
          loadWeatherForecast(defaultCity.name),
          new Promise<any[]>((resolve) => {
            setTimeout(() => resolve([]), 10000) // 10秒超时
          })
        ])
      ])
      
      const forecastList = (forecast && forecast.length > 0) ? forecast : this.buildMockForecast()

      // 生成生活建议
      const suggestion = this.generateSuggestion(weather)
      
      this.setData({
        currentCity: targetCity.name,
        currentTemp: weather.temp,
        weatherDesc: weather.weather,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        airQuality: weather.airQuality || '良',
        updateTime: this.formatTime(new Date()),
        suggestion,
        forecast: forecastList.map(item => ({
          date: this.formatDate(item.date),
          weather: item.weather,
          high: item.high,
          low: item.low,
        })),
        cityList,
      })
    } catch (error) {
      console.error('loadWeatherData error', error)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      })
    } finally {
      wx.hideLoading()
      if (done) done()
    }
  },

  async getLocationAndLoadWeather() {
    try {
      // 先确保定位权限（如果拒绝过，引导去设置页开启）
      await this.ensureLocationPermission()

      // 获取位置（添加超时处理）
      // 缩短超时时间，快速回退
      const res = await Promise.race([
        new Promise<WechatMiniprogram.GetLocationSuccessCallbackResult>((resolve, reject) => {
          wx.getLocation({
            type: 'gcj02',
            success: resolve,
            fail: (err) => {
              // 定位失败，静默抛出错误，不输出日志
              reject(new Error('定位失败'))
            },
          })
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('定位超时')), 5000) // 5秒超时
        })
      ])

    const longitude = res.longitude
    const latitude = res.latitude

    // 使用经纬度获取城市名称（添加超时处理）
    const cityName = await Promise.race([
      this.resolveCityName(longitude, latitude),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(''), 3000) // 3秒超时，缩短超时时间
      })
    ])

    // 加载天气数据（使用经纬度，避免定位失败时城市名不准）
    // 添加超时处理，避免API调用卡住
    const [weather, forecast] = await Promise.all([
      Promise.race([
        this.loadWeatherByLocation(longitude, latitude),
        new Promise<any>((resolve) => {
          setTimeout(() => resolve({
            temp: 0,
            weather: '未知',
            humidity: 0,
            windSpeed: 0,
            airQuality: '良',
          }), 8000) // 8秒超时，返回默认值
        })
      ]),
      Promise.race([
        this.loadForecastByLocation(longitude, latitude),
        new Promise<any[]>((resolve) => {
          setTimeout(() => resolve([]), 8000) // 8秒超时，返回空数组
        })
      ])
    ])

    const forecastList = (forecast && forecast.length > 0) ? forecast : this.buildMockForecast()

    // 生成生活建议
    const suggestion = this.generateSuggestion(weather)

    // 将定位到的城市保存为默认城市（可选）
    if (cityName) {
      try {
        // 检查城市是否已存在
        const cityList = await loadCityList()
        let city = cityList.find(c => c.name === cityName)
        
        if (!city) {
          // 如果不存在，添加该城市
          city = await addCity({ name: cityName, isDefault: true })
        } else {
          // 如果存在，设置为默认
          await setDefaultCity(city.id)
        }
      } catch (e) {
        // 保存定位城市失败，静默处理，不影响显示
        // 不输出错误日志
      }
    }

    this.setData({
      currentCity: cityName || '当前位置',
      currentTemp: weather.temp,
      weatherDesc: weather.weather,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      airQuality: weather.airQuality || '良',
      updateTime: this.formatTime(new Date()),
      suggestion,
      forecast: forecastList.map(item => ({
        date: this.formatDate(item.date),
        weather: item.weather,
        high: item.high,
        low: item.low,
      })),
    })
    } catch (error) {
      // 定位过程中的任何错误都静默抛出，让外层处理
      // 不输出任何日志，避免控制台显示错误
      throw error
    }
  },

  // 确保已获取位置权限，如果用户拒绝过，引导去设置开启
  async ensureLocationPermission(): Promise<void> {
    // 查询当前权限
    const settingRes = await new Promise<WechatMiniprogram.GetSettingSuccessCallbackResult>((resolve) => {
      wx.getSetting({
        success: resolve,
        fail: () => resolve({ authSetting: {} } as any),
      })
    })

    const hasAuth = !!settingRes.authSetting['scope.userLocation']
    if (hasAuth) return

    // 主动申请
    try {
      await new Promise<WechatMiniprogram.AuthorizeSuccessCallbackResult>((resolve, reject) => {
        wx.authorize({
          scope: 'scope.userLocation',
          success: resolve,
          fail: reject,
        })
      })
      return
    } catch (authError) {
      // 用户拒绝，弹窗引导去设置
      const modalRes = await new Promise<WechatMiniprogram.ShowModalSuccessCallbackResult>((resolve) => {
        wx.showModal({
          title: '需要开启定位权限',
          content: '请在设置中打开“位置信息”权限，才能自动获取当前城市。',
          confirmText: '去设置',
          cancelText: '稍后',
          success: resolve,
        })
      })

      if (modalRes.confirm) {
        // 打开设置页，用户返回后不自动再次申请，由外层重新触发流程
        await new Promise((resolve) => {
          wx.openSetting({
            success: resolve,
            fail: resolve,
          })
        })
      }

      throw new Error('位置权限未开启')
    }
  },

  // 使用经纬度查询城市名称（和风天气 city/lookup 支持经纬度）
  async resolveCityName(longitude: number, latitude: number): Promise<string> {
    try {
      const domain = CONFIG.weather.qweatherDomain || 'https://api.qweather.com'
      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${domain}/geo/v2/city/lookup`, // 修正：应该是 /geo/v2/city/lookup
          method: 'GET',
          data: {
            location: `${longitude},${latitude}`,
            key: CONFIG.weather.qweatherKey,
            number: 1,
          },
          success: resolve,
          fail: reject,
        })
      })
      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        if (data.code === '200' && data.location && data.location.length > 0) {
          return data.location[0].name || ''
        }
      }
      return ''
    } catch (error) {
      console.warn('resolveCityName error', error)
      return ''
    }
  },

  // 使用经纬度查询当前天气
  async loadWeatherByLocation(longitude: number, latitude: number) {
    try {
      const weather = await loadWeather(`${longitude},${latitude}`)
      return weather
    } catch (error) {
      console.error('loadWeatherByLocation error', error)
      // 回退为默认值
      return {
        temp: 0,
        weather: '未知',
        humidity: 0,
        windSpeed: 0,
        airQuality: '良',
      }
    }
  },

  // 使用经纬度查询预报
  async loadForecastByLocation(longitude: number, latitude: number) {
    try {
      const forecast = await loadWeatherForecast(`${longitude},${latitude}`)
      return forecast
    } catch (error) {
      console.error('loadForecastByLocation error', error)
      return []
    }
  },

  generateSuggestion(weather: any): string {
    const suggestions: string[] = []
    
    if (weather.weather.includes('雨')) {
      suggestions.push('今天有雨，记得带伞')
    }
    if (weather.temp < 10) {
      suggestions.push('天气较冷，注意保暖')
    } else if (weather.temp > 30) {
      suggestions.push('天气炎热，注意防暑')
    }
    if (weather.airQuality && ['重度污染', '严重污染'].includes(weather.airQuality)) {
      suggestions.push('空气质量较差，减少户外活动')
    }
    
    return suggestions.length > 0 ? suggestions.join('；') : '天气不错，适合外出'
  },

  formatTime(date: Date): string {
    const hh = date.getHours().toString().padStart(2, '0')
    const mm = date.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
  },

  formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdays[date.getDay()]
    return `${month}-${day} ${weekday}`
  },

  // 当接口超时或返回空时，使用模拟的7天预报占位，避免空白
  buildMockForecast() {
    const forecast: Array<{ date: string; weather: string; high: number; low: number }> = []
    const today = new Date()
    const weathers = ['晴', '多云', '小雨', '阴', '晴转多云']
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      forecast.push({
        date: date.toISOString(),
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        high: Math.floor(Math.random() * 8) + 20,
        low: Math.floor(Math.random() * 6) + 12,
      })
    }
    return forecast
  },

  onChangeCity() {
    this.setData({ showCityPicker: true, deleteMode: false })
  },

  onCloseCityPicker() {
    this.setData({ showCityPicker: false, deleteMode: false })
  },

  async onSelectCity(event: WechatMiniprogram.TouchEvent) {
    const city = event.currentTarget.dataset.city
    // 尝试设为默认城市，失败也不影响后续展示
    try {
      await setDefaultCity(city.id)
    } catch (err) {
      console.warn('setDefaultCity fail, fallback to local display', err)
    }
    this.setData({ showCityPicker: false, deleteMode: false })
    await this.loadWeatherData(undefined, city)
  },

  onAddCity() {
    wx.showModal({
      title: '添加城市',
      editable: true,
      placeholderText: '请输入城市名称',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            await addCity({ name: res.content.trim() })
            const cityList = await loadCityList()
            this.setData({ cityList })
            wx.showToast({
              title: '添加成功',
              icon: 'success',
            })
          } catch (error) {
            wx.showToast({
              title: '添加失败',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  onToggleDeleteMode() {
    this.setData({ deleteMode: !this.data.deleteMode })
  },

  async onDeleteCity(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id as string | undefined
    if (!id) return
    wx.showModal({
      title: '删除城市',
      content: '确认删除该城市吗？',
      success: async (res) => {
        if (!res.confirm) return
        let loadingShown = false
        try {
          wx.showLoading({ title: '删除中...' })
          loadingShown = true
          await deleteCity(id)
          const cityList = await loadCityList()
          this.setData({
            cityList,
            // 如果列表为空或只剩一个，自动退出删除模式
            deleteMode: cityList.length > 0 && this.data.deleteMode ? this.data.deleteMode : false,
          })
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        } finally {
          if (loadingShown) {
            wx.hideLoading()
          }
        }
      }
    })
  },

  noop() {
    // 空函数，阻止事件冒泡
  },
})

