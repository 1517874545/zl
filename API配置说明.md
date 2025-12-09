# API配置说明

## 概述

小程序需要配置以下API才能完整使用所有功能：

1. **天气API** - 用于天气功能
2. **AI API** - 用于AI助手功能
3. **Supabase** - 数据库（已配置）

## 配置方式

### 1. 修改配置文件

编辑 `miniprogram/utils/config.ts` 文件，填入你的API配置。

### 2. 开发阶段（使用模拟数据）

当前配置默认使用模拟数据，可以直接测试功能，无需配置API密钥。

```typescript
weather: {
  useMockData: true,  // 使用模拟数据
},
ai: {
  useMockData: true,  // 使用模拟回复
},
```

### 3. 生产环境（使用真实API）

需要搭建服务器代理来保护API密钥，然后修改配置：

```typescript
weather: {
  useMockData: false,
  apiProxy: 'https://your-server.com/api/weather',  // 你的服务器代理地址
},
ai: {
  useMockData: false,
  apiProxy: 'https://your-server.com/api/ai',  // 你的服务器代理地址
  provider: 'doubao',  // 或 'deepseek', 'openai'
},
```

## 天气API配置

### 推荐方案1：和风天气（QWeather）

1. 注册账号：https://dev.qweather.com/
2. 创建应用，获取API Key
3. 在服务器端搭建代理接口

**服务器端示例（Node.js）：**

```javascript
// /api/weather/current
app.get('/api/weather/current', async (req, res) => {
  const { city } = req.query
  const response = await fetch(
    `https://devapi.qweather.com/v7/weather/now?location=${city}&key=YOUR_API_KEY`
  )
  const data = await response.json()
  res.json({
    temp: data.now.temp,
    weather: data.now.text,
    humidity: data.now.humidity,
    windSpeed: data.now.windSpeed,
    airQuality: data.now.category,
  })
})
```

### 推荐方案2：高德天气

1. 注册账号：https://lbs.amap.com/
2. 创建应用，获取API Key
3. 在服务器端搭建代理接口

## AI API配置

### 推荐方案1：豆包（字节跳动）

1. 注册账号：https://www.volcengine.com/product/doubao
2. 获取API Key
3. 在服务器端搭建代理接口

**服务器端示例（Node.js）：**

```javascript
// /api/ai
app.post('/api/ai', async (req, res) => {
  const { messages, provider } = req.body
  
  if (provider === 'doubao') {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_API_KEY`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'ep-xxx',  // 你的模型ID
        messages: messages,
      }),
    })
    const data = await response.json()
    res.json({ reply: data.choices[0].message.content })
  }
})
```

### 推荐方案2：DeepSeek

1. 注册账号：https://www.deepseek.com/
2. 获取API Key
3. 在服务器端搭建代理接口

### 推荐方案3：OpenAI

1. 注册账号：https://platform.openai.com/
2. 获取API Key
3. 在服务器端搭建代理接口

## 服务器代理搭建

### 为什么需要服务器代理？

1. **保护API密钥**：小程序代码是公开的，不能直接存储API密钥
2. **请求限流**：防止API被滥用
3. **数据转换**：统一不同API的返回格式

### 快速搭建方案

可以使用以下方式快速搭建：

1. **Vercel/Netlify** - 无服务器函数
2. **云函数** - 腾讯云、阿里云等
3. **自建服务器** - Node.js、Python等

### 示例：Vercel Serverless Function

```javascript
// api/weather.js
export default async function handler(req, res) {
  const { city } = req.query
  const apiKey = process.env.WEATHER_API_KEY
  
  const response = await fetch(
    `https://devapi.qweather.com/v7/weather/now?location=${city}&key=${apiKey}`
  )
  const data = await response.json()
  
  res.json({
    temp: data.now.temp,
    weather: data.now.text,
    humidity: data.now.humidity,
    windSpeed: data.now.windSpeed,
    airQuality: data.now.category,
  })
}
```

## 测试

### 1. 使用模拟数据测试

当前配置已启用模拟数据，可以直接测试所有功能。

### 2. 测试真实API

1. 搭建服务器代理
2. 修改 `config.ts` 中的 `apiProxy` 地址
3. 设置 `useMockData: false`
4. 重新编译小程序测试

## 注意事项

1. **API密钥安全**：永远不要在小程序代码中直接存储API密钥
2. **请求限流**：在服务器端实现请求频率限制
3. **错误处理**：API调用失败时，代码会自动回退到模拟数据
4. **成本控制**：注意API调用费用，合理设置缓存

## 当前状态

- ✅ Supabase数据库：已配置
- ⚠️ 天气API：使用模拟数据（可配置真实API）
- ⚠️ AI API：使用模拟回复（可配置真实API）

## 下一步

1. 如需使用真实API，先搭建服务器代理
2. 获取API密钥并配置到服务器端
3. 修改 `config.ts` 中的 `apiProxy` 地址
4. 设置 `useMockData: false`
5. 测试功能

