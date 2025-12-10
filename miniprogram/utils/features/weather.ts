// 天气功能模块
import * as dbWeather from '../db/weather'
import { CONFIG } from '../config'

export interface WeatherInfo {
  temp: number
  weather: string
  humidity: number
  windSpeed: number
  airQuality?: string
}

export interface WeatherForecastItem {
  date: string
  weather: string
  high: number
  low: number
}

export interface CityInfo {
  id: string
  name: string
  isDefault: boolean
}

// 规范化城市名/坐标，去掉前后空格与异常反斜杠，坐标去掉空格
function normalizeLocationInput(cityNameOrCoord: string): string {
  const raw = (cityNameOrCoord || '').trim()
  // 去掉前缀反斜杠，避免 \北京 这类导致 %5C 开头
  let cleaned = raw.replace(/^[\\/]+/, '').replace(/[\\]/g, '')
  // 只保留数字/字母/中文/逗号/点/减号，去掉其他符号（如大括号）
  cleaned = cleaned.replace(/[^0-9A-Za-z,\.\-\u4e00-\u9fa5]/g, '')
  // 如果是坐标，去除空格
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',').map(part => part.trim()).join(',')
  }
  return cleaned
}

// 获取城市位置ID（和风天气需要location ID）
async function getCityLocationId(cityNameOrCoord: string): Promise<string> {
  try {
    const normalized = normalizeLocationInput(cityNameOrCoord)
    // 如果已经是location ID格式（纯数字），直接返回
    if (/^\d+$/.test(normalized)) {
      return normalized
    }
    
    // 使用配置的专属域名，如果没有配置则使用默认域名
    const domain = CONFIG.weather.qweatherDomain || 'https://api.qweather.com'
    const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
      wx.request({
        url: `${domain}/geo/v2/city/lookup`, // 修正：应该是 /geo/v2/city/lookup
        method: 'GET',
        data: {
          location: normalized, // 支持城市名或经纬度 "lon,lat"
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
        return data.location[0].id
      } else {
        console.warn('getCityLocationId: API返回错误', data.code, data)
        throw new Error(`城市查询失败: ${data.code} - ${data.msg || '未知错误'}`)
      }
    } else {
      console.warn('getCityLocationId: HTTP错误', response.statusCode, response.data)
      throw new Error(`城市查询HTTP错误: ${response.statusCode}`)
    }
  } catch (error: any) {
    console.error('getCityLocationId error', error)
    throw error // 抛出错误，而不是返回城市名
  }
}

// 加载当前天气（支持城市名或“lon,lat”坐标）
export async function loadWeather(cityNameOrCoord: string): Promise<WeatherInfo> {
  try {
    const normalized = normalizeLocationInput(cityNameOrCoord)

    // 如果使用模拟数据，返回模拟天气
    if (CONFIG.weather.useMockData) {
      const mockWeather: WeatherInfo = {
        temp: Math.floor(Math.random() * 15) + 15, // 15-30度
        weather: ['晴', '多云', '小雨', '阴'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 30) + 50, // 50-80%
        windSpeed: Math.floor(Math.random() * 10) + 5, // 5-15 km/h
        airQuality: ['优', '良', '轻度污染'][Math.floor(Math.random() * 3)],
      }
      return mockWeather
    }

    // 如果通过代理调用
    if (CONFIG.weather.apiProxy && !CONFIG.weather.directCall) {
      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${CONFIG.weather.apiProxy}/current`,
          method: 'GET',
          data: { city: normalized },
          success: resolve,
          fail: reject,
        })
      })

      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        return {
          temp: data.temp || 0,
          weather: data.weather || '晴',
          humidity: data.humidity || 0,
          windSpeed: data.windSpeed || 0,
          airQuality: data.airQuality || '良',
        }
      }
    }

    // 直接调用和风天气API
    if (CONFIG.weather.directCall && CONFIG.weather.qweatherKey) {
      const locationId = await getCityLocationId(normalized)
      // 使用配置的专属域名
      const domain = CONFIG.weather.qweatherDomain || 'https://api.qweather.com'
      
      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${domain}/v7/weather/now`,
          method: 'GET',
          data: {
            location: locationId,
            key: CONFIG.weather.qweatherKey,
          },
          success: (res) => {
            // 即使HTTP状态码不是200，也resolve，让后续代码处理
            resolve(res)
          },
          fail: (err) => {
            console.error('loadWeather: 网络请求失败', err)
            reject(err)
          },
        })
      })
      
      // 检查HTTP状态码
      if (response.statusCode !== 200) {
        console.error('loadWeather: HTTP错误', response.statusCode, response.data)
        throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`)
      }

      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        // 检查API返回的错误码
        if (data.code && data.code !== '200') {
          console.error('loadWeather: API返回错误码', data.code, data)
          throw new Error(`天气API错误: ${data.code} - ${data.refer?.license || data.msg || '未知错误'}`)
        }
        if (data.code === '200' && data.now) {
          // 空气质量：暂时禁用API调用，直接使用默认值
          // 原因：/v7/air/now 接口已被弃用（2026年6月1日停止服务），返回403错误
          // 空气质量不是核心功能，暂时使用默认值"良"
          const airQuality = '良'

          return {
            temp: parseInt(data.now.temp) || 0,
            weather: data.now.text || '晴',
            humidity: parseInt(data.now.humidity) || 0,
            windSpeed: parseFloat(data.now.windSpeed) || 0,
            airQuality,
          }
        }
      }
    }

    throw new Error('天气API返回数据格式错误')
  } catch (error) {
    console.error('loadWeather error', error)
    // 如果API调用失败，返回模拟数据作为后备
    return {
      temp: Math.floor(Math.random() * 15) + 15,
      weather: ['晴', '多云', '小雨', '阴'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 30) + 50,
      windSpeed: Math.floor(Math.random() * 10) + 5,
      airQuality: ['优', '良', '轻度污染'][Math.floor(Math.random() * 3)],
    }
  }
}

// 加载天气预报（支持城市名或“lon,lat”坐标）
export async function loadWeatherForecast(cityNameOrCoord: string): Promise<WeatherForecastItem[]> {
  try {
    const normalized = normalizeLocationInput(cityNameOrCoord)

    // 如果使用模拟数据，返回模拟预报
    if (CONFIG.weather.useMockData) {
      const forecast: WeatherForecastItem[] = []
      const today = new Date()
      const weathers = ['晴', '多云', '小雨', '阴', '晴转多云']
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        forecast.push({
          date: date.toISOString(),
          weather: weathers[Math.floor(Math.random() * weathers.length)],
          high: Math.floor(Math.random() * 10) + 20,
          low: Math.floor(Math.random() * 10) + 10,
        })
      }
      return forecast
    }

    // 如果通过代理调用
    if (CONFIG.weather.apiProxy && !CONFIG.weather.directCall) {
      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${CONFIG.weather.apiProxy}/forecast`,
          method: 'GET',
          data: {
            city: normalized,
            days: 7,
          },
          success: resolve,
          fail: reject,
        })
      })

      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        if (Array.isArray(data.forecast)) {
          return data.forecast.map((item: any) => ({
            date: item.date,
            weather: item.weather,
            high: item.high,
            low: item.low,
          }))
        }
      }
    }

    // 直接调用和风天气API
    if (CONFIG.weather.directCall && CONFIG.weather.qweatherKey) {
      const locationId = await getCityLocationId(normalized)
      // 使用配置的专属域名
      const domain = CONFIG.weather.qweatherDomain || 'https://api.qweather.com'
      
      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${domain}/v7/weather/7d`,
          method: 'GET',
          data: {
            location: locationId,
            key: CONFIG.weather.qweatherKey,
          },
          success: (res) => {
            // 即使HTTP状态码不是200，也resolve，让后续代码处理
            resolve(res)
          },
          fail: (err) => {
            console.error('loadWeatherForecast: 网络请求失败', err)
            reject(err)
          },
        })
      })
      
      // 检查HTTP状态码
      if (response.statusCode !== 200) {
        console.error('loadWeatherForecast: HTTP错误', response.statusCode, response.data)
        throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`)
      }

      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        // 检查API返回的错误码
        if (data.code && data.code !== '200') {
          console.error('loadWeatherForecast: API返回错误码', data.code, data)
          throw new Error(`天气预报API错误: ${data.code} - ${data.refer?.license || data.msg || '未知错误'}`)
        }
        if (data.code === '200' && data.daily && Array.isArray(data.daily)) {
          return data.daily.map((item: any) => ({
            date: item.fxDate,
            weather: item.textDay || item.text,
            high: parseInt(item.tempMax) || 0,
            low: parseInt(item.tempMin) || 0,
          }))
        }
      }
    }

    throw new Error('天气预报API返回数据格式错误')
  } catch (error) {
    console.error('loadWeatherForecast error', error)
    // 如果API调用失败，返回模拟数据作为后备
    const forecast: WeatherForecastItem[] = []
    const today = new Date()
    const weathers = ['晴', '多云', '小雨', '阴', '晴转多云']
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      forecast.push({
        date: date.toISOString(),
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        high: Math.floor(Math.random() * 10) + 20,
        low: Math.floor(Math.random() * 10) + 10,
      })
    }
    return forecast
  }
}

// 加载城市列表
export async function loadCityList(): Promise<CityInfo[]> {
  try {
    return await dbWeather.loadCityList()
  } catch (error) {
    console.error('loadCityList error', error)
    return []
  }
}

// 添加城市
export async function addCity(city: { name: string; isDefault?: boolean }): Promise<CityInfo> {
  try {
    return await dbWeather.addCity(city)
  } catch (error) {
    console.error('addCity error', error)
    throw error
  }
}

// 删除城市
export async function deleteCity(cityId: string): Promise<void> {
  try {
    await dbWeather.deleteCity(cityId)
  } catch (error) {
    console.error('deleteCity error', error)
    throw error
  }
}

// 设置默认城市
export async function setDefaultCity(cityId: string): Promise<void> {
  try {
    await dbWeather.setDefaultCity(cityId)
  } catch (error) {
    console.error('setDefaultCity error', error)
    throw error
  }
}

