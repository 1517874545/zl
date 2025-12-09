// 应用配置
// 注意：API密钥应该存储在服务器端，小程序端通过服务器代理调用
// 这里仅用于开发测试，生产环境请使用服务器代理

export const CONFIG = {
  // Supabase配置（已在supabase.ts中配置）
  supabase: {
    url: 'https://mvzpegvtiafzzznzvdqx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enBlZ3Z0aWFmenp6bnp2ZHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTc5MzksImV4cCI6MjA4MDQzMzkzOX0.QbQ7aMEye7dcit-e_y8UuTcZ-H6qCGLbXQl-5RRWPko',
  },

  // 天气API配置
  // 推荐使用和风天气：https://dev.qweather.com/
  // 或高德天气：https://lbs.amap.com/api/webservice/summary
  weather: {
    // 服务器代理地址（需要自己搭建）
    // 格式：https://your-server.com/api/weather
    apiProxy: '',
    // 和风天气API Key（直接调用，仅用于开发测试）
    qweatherKey: '5157c47b70ae4e2ca6517bb8ec621512',
    // 和风天气API域名（专属API Host，从和风天气控制台获取）
    // 专属域名格式：https://你的专属域名.re.qweatherapi.com
    // 注意：devapi.qweather.com 和 geoapi.qweather.com 将在2026年1月1日停止服务
    qweatherDomain: 'https://nw78kyu3nx.re.qweatherapi.com', // 专属API Host
    // 如果使用高德天气，需要API Key
    amapKey: '',
    // 是否使用模拟数据（开发阶段）
    useMockData: false, // 已配置真实API，使用真实数据
    // 是否直接调用API（不通过代理，仅开发测试用）
    directCall: true, // 开发阶段可以直接调用，生产环境应设为false
  },

  // AI API配置
  // 推荐使用：豆包、DeepSeek、OpenAI等
  ai: {
    // 服务器代理地址（生产环境必须，保护API Key）
    // 格式：https://your-server.com/api/ai
    apiProxy: '',
    // AI服务提供商：'doubao' | 'deepseek' | 'openai' | 'custom'
    provider: 'doubao' as 'doubao' | 'deepseek' | 'openai' | 'custom',
    // 豆包（火山引擎）API Key（直接调用，仅用于开发测试）
    apiKey: '2def65ad-06c6-4a41-87ee-fe1c99763d92',
    // 豆包模型ID
    modelId: 'deepseek-v3-2-251201',
    // 豆包API地址
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    // 是否使用模拟回复（开发阶段）
    useMockData: false, // 已配置真实API，使用真实回复
    // 是否直接调用API（不通过代理，仅开发测试用）
    directCall: true, // 开发阶段可以直接调用，生产环境应设为false
  },

  // 应用配置
  app: {
    // 应用版本
    version: '1.0.0',
    // 是否启用调试模式
    debug: false,
  },
}

// 检查配置是否完整
export function checkConfig(): {
  weatherReady: boolean
  aiReady: boolean
  message: string
} {
  const issues: string[] = []
  let weatherReady = true
  let aiReady = true

  // 检查天气API配置
  if (!CONFIG.weather.useMockData) {
    if (!CONFIG.weather.apiProxy) {
      weatherReady = false
      issues.push('天气API代理地址未配置')
    }
  }

  // 检查AI API配置
  if (!CONFIG.ai.useMockData) {
    if (!CONFIG.ai.apiProxy && !CONFIG.ai.directCall) {
      aiReady = false
      issues.push('AI API代理地址未配置')
    }
  }

  return {
    weatherReady,
    aiReady,
    message: issues.length > 0 ? issues.join('；') : '配置正常',
  }
}

