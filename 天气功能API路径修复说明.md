# 天气功能API路径修复说明

## 🔍 发现的问题

从控制台错误信息分析，发现了两个关键问题：

### 1. 404错误 - API路径错误
- **错误：** `/v2/city/lookup` 返回404
- **原因：** 城市查询API的正确路径应该是 `/geo/v2/city/lookup`，而不是 `/v2/city/lookup`
- **影响：** 城市查询失败，无法获取location ID

### 2. 400错误 - location参数无效
- **错误：** `/v7/weather/now` 和 `/v7/weather/7d` 返回400，错误信息：`invalidParams: ["location"]`
- **原因：** 当城市查询失败时，代码返回城市名（如"北京"），但天气API需要的是location ID（如"101010100"）
- **影响：** 天气数据无法正常获取

---

## ✅ 已完成的修复

### 1. 修正API路径

**修改的文件：**
- `miniprogram/utils/features/weather.ts` - `getCityLocationId` 函数
- `miniprogram/pages/weather/weather.ts` - `resolveCityName` 函数

**修正内容：**
```typescript
// 修正前（错误）
url: `${domain}/v2/city/lookup`

// 修正后（正确）
url: `${domain}/geo/v2/city/lookup`
```

### 2. 改进错误处理

**改进内容：**
- 当城市查询失败时，不再返回城市名，而是抛出错误
- 如果输入已经是location ID格式（纯数字），直接返回，不进行查询
- 错误会被外层catch捕获，返回模拟数据作为后备

**代码逻辑：**
```typescript
// 如果已经是location ID格式（纯数字），直接返回
if (/^\d+$/.test(normalized)) {
  return normalized
}

// 如果API返回错误，抛出错误而不是返回城市名
if (data.code !== '200' || !data.location || data.location.length === 0) {
  throw new Error(`城市查询失败: ${data.code} - ${data.msg || '未知错误'}`)
}
```

---

## 📋 正确的API路径

使用专属域名 `https://nw78kyu3nx.re.qweatherapi.com` 后，正确的API路径：

1. **城市查询：**
   ```
   GET https://nw78kyu3nx.re.qweatherapi.com/geo/v2/city/lookup
   ```

2. **当前天气：**
   ```
   GET https://nw78kyu3nx.re.qweatherapi.com/v7/weather/now
   ```

3. **空气质量：**
   ```
   GET https://nw78kyu3nx.re.qweatherapi.com/v7/air/now
   ```

4. **7天预报：**
   ```
   GET https://nw78kyu3nx.re.qweatherapi.com/v7/weather/7d
   ```

---

## 🔧 需要你执行的操作

### 步骤1：重新编译小程序

1. **清除缓存**
   - 在微信开发者工具中点击「编译」→「清除缓存」
   - 或者关闭项目后重新打开

2. **重新编译**
   - 点击「编译」按钮
   - 等待编译完成

### 步骤2：测试天气功能

1. **打开天气页面**
   - 进入小程序
   - 打开天气页面

2. **查看控制台**
   - 打开调试器 → Console
   - 应该不再有404错误
   - 应该不再有400错误（location参数无效）

3. **验证功能**
   - ✅ 当前天气数据正常显示
   - ✅ 7天天气预报正常显示
   - ✅ 城市切换功能正常
   - ✅ 定位功能正常

---

## 📊 预期结果

修复后，应该看到：

1. **成功的API请求：**
   - `GET .../geo/v2/city/lookup` → 200 OK
   - `GET .../v7/weather/now` → 200 OK
   - `GET .../v7/weather/7d` → 200 OK

2. **正确的数据流：**
   - 城市名"北京" → 查询location ID → 获取到"101010100" → 使用location ID查询天气 → 成功获取天气数据

3. **控制台无错误：**
   - 不再有404错误
   - 不再有400错误
   - 只有成功的请求日志

---

## 🔍 如果仍然有问题

### 如果仍然出现404错误

1. **检查域名配置**
   - 确认 `config.ts` 中的 `qweatherDomain` 为：`https://nw78kyu3nx.re.qweatherapi.com`
   - 确认微信小程序后台已添加该域名

2. **检查API路径**
   - 确认代码中使用的是 `/geo/v2/city/lookup`（不是 `/v2/city/lookup`）
   - 查看控制台中的实际请求URL

### 如果仍然出现400错误

1. **检查location参数**
   - 确认传递给天气API的是location ID（纯数字），不是城市名
   - 查看控制台中的请求参数

2. **检查城市查询结果**
   - 确认城市查询API返回了正确的location ID
   - 查看控制台中的API响应

---

## 🎯 修复总结

**修复的问题：**
- ✅ API路径错误：`/v2/city/lookup` → `/geo/v2/city/lookup`
- ✅ 错误处理改进：城市查询失败时抛出错误，不再返回城市名
- ✅ 支持location ID直接输入：如果输入已经是location ID，直接使用

**相关文件：**
- `miniprogram/utils/features/weather.ts`
- `miniprogram/pages/weather/weather.ts`

---

**修复日期：** 2025-01-13  
**问题类型：** API路径错误 + location参数无效  
**状态：** 已修复，等待测试验证
