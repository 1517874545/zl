# 天气API问题排查说明

## 🔍 发现的问题

从控制台错误来看，天气API调用出现了以下问题：

1. **404错误** - `geoapi.qweather.com/v2/city/lookup` 返回404
2. **403错误** - `devapi.qweather.com/v7/weather/now` 和 `/v7/weather/7d` 返回403

## 📊 错误分析

### 403 Forbidden（禁止访问）
可能的原因：
- **API Key无效或过期**
- **API Key没有权限访问这些接口**
- **API Key类型不匹配**（免费版/付费版）
- **请求频率超限**

### 404 Not Found（资源不存在）
可能的原因：
- **API路径错误**
- **城市名称格式不正确**
- **location参数格式错误**

## ✅ 解决方案

### 方案1：检查API Key（推荐）

1. **登录和风天气控制台**
   - 访问 [和风天气开发者平台](https://dev.qweather.com/)
   - 登录你的账号

2. **检查API Key状态**
   - 进入 **控制台** → **API密钥**
   - 确认API Key：`5157c47b70ae4e2ca6517bb8ec621512`
   - 检查：
     - ✅ Key是否有效
     - ✅ Key是否过期
     - ✅ Key是否有权限访问所需接口
     - ✅ 免费额度是否用完

3. **检查API类型**
   - 确认你的Key支持：
     - 城市查询API（geoapi.qweather.com）
     - 天气数据API（devapi.qweather.com）
   - 免费版可能有限制

### 方案2：验证API Key

可以在浏览器中直接测试API：

**测试城市查询：**
```
https://geoapi.qweather.com/v2/city/lookup?location=北京&key=5157c47b70ae4e2ca6517bb8ec621512&number=1
```

**测试当前天气：**
```
https://devapi.qweather.com/v7/weather/now?location=101010100&key=5157c47b70ae4e2ca6517bb8ec621512
```

如果浏览器中返回403或404，说明API Key有问题。

### 方案3：使用模拟数据（临时方案）

如果API Key确实有问题，可以临时使用模拟数据：

在 `miniprogram/utils/config.ts` 中修改：

```typescript
weather: {
  // ... 其他配置
  useMockData: true,  // 改为 true，使用模拟数据
  directCall: false,  // 改为 false
}
```

## 🔧 代码改进

我已经改进了错误处理逻辑：

1. **更详细的错误日志**
   - 记录HTTP状态码
   - 记录API返回的错误码和错误信息
   - 便于排查问题

2. **更好的错误提示**
   - 区分HTTP错误和API业务错误
   - 显示具体的错误信息

## 📝 检查清单

请按以下步骤排查：

- [ ] 检查API Key是否有效
- [ ] 检查API Key是否过期
- [ ] 检查API Key是否有权限
- [ ] 检查免费额度是否用完
- [ ] 在浏览器中测试API是否正常
- [ ] 检查控制台的具体错误信息
- [ ] 确认域名已正确配置

## ⚠️ 常见问题

### 问题1：API Key无效
**症状：** 返回403错误  
**解决：** 重新生成API Key，更新到 `config.ts`

### 问题2：免费额度用完
**症状：** 返回403或429错误  
**解决：** 等待额度恢复或升级套餐

### 问题3：API路径错误
**症状：** 返回404错误  
**解决：** 检查API文档，确认路径正确

### 问题4：城市名称格式错误
**症状：** 城市查询返回404  
**解决：** 确保城市名称正确，或使用location ID

## 🎯 下一步

1. **先检查API Key**
   - 登录和风天气控制台
   - 确认Key状态和权限

2. **测试API**
   - 在浏览器中测试API调用
   - 确认返回数据格式

3. **查看详细错误**
   - 打开控制台
   - 查看具体的错误信息
   - 告诉我具体的错误码和错误信息

---

**修复日期：** 2025-01-13  
**相关文件：** `miniprogram/utils/features/weather.ts`
