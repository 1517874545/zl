// AI助手功能模块
import * as dbAI from '../db/ai-assistant'
import { CONFIG } from '../config'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

// 生成智能问候语
export async function generateGreeting(): Promise<string> {
  try {
    const hour = new Date().getHours()
    const app = getApp<IAppOption>()
    
    // 基础问候
    let greeting = '你好！'
    if (hour < 6) {
      greeting = '清晨好！'
    } else if (hour < 11) {
      greeting = '早上好！'
    } else if (hour < 14) {
      greeting = '中午好！'
    } else if (hour < 18) {
      greeting = '下午好！'
    } else if (hour < 22) {
      greeting = '晚上好！'
    } else {
      greeting = '夜深了，'
    }
    
    // 根据时间提供建议
    if (hour >= 22) {
      greeting += '早点休息，明天继续加油！'
    } else if (hour < 6) {
      greeting += '收获宁静时光~'
    } else {
      greeting += '继续元气满满~'
    }
    
    // 检查纪念日
    const anniversaries = app.globalData.anniversaries || []
    const today = new Date()
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`
    
    for (const ann of anniversaries) {
      const targetDate = new Date(ann.target.replace(/-/g, '/'))
      const targetStr = `${targetDate.getMonth() + 1}-${targetDate.getDate()}`
      const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      
      if (daysDiff === 3) {
        greeting += ` 还有3天就是${ann.title}了，准备一下惊喜吧！`
      } else if (daysDiff === 0) {
        greeting += ` 今天是${ann.title}，祝你们幸福！`
      }
    }
    
    return greeting
  } catch (error) {
    console.error('generateGreeting error', error)
    return '你好，开始舒心的一天~'
  }
}

// 发送消息给AI
export async function sendMessageToAI(message: string, conversationId?: string): Promise<string> {
  try {
    // 保存用户消息（忽略落库失败）
    try {
      await dbAI.saveMessage({ role: 'user', content: message, conversation_id: conversationId })
    } catch (e) {
      console.warn('save user message skipped', e)
    }
    
    // 如果使用模拟数据，返回模拟回复
    if (CONFIG.ai.useMockData) {
      let reply = '我理解你的问题。'
      
      if (message.includes('天气')) {
        reply = '今天天气不错，适合外出。记得查看天气页面获取详细信息。'
      } else if (message.includes('学习') || message.includes('课程')) {
        reply = '学习需要专注和坚持。可以使用番茄钟功能来提升学习效率。'
      } else if (message.includes('存钱') || message.includes('理财')) {
        reply = '理财需要记录和规划。建议在存钱罐中记录每笔收支，设置预算。'
      } else if (message.includes('纪念日')) {
        reply = '纪念日是美好的回忆。可以在纪念日页面查看和管理你的纪念日。'
      } else if (message.includes('你好') || message.includes('hello')) {
        reply = '你好！我是你的AI助手，有什么可以帮助你的吗？'
      } else {
        reply = '感谢你的提问。我会尽力帮助你。如果需要具体功能，可以告诉我。'
      }
      
      // 保存AI回复
      await dbAI.saveMessage({ role: 'assistant', content: reply, conversation_id: conversationId })
      
      return reply
    }

    // 如果通过代理调用
    if (CONFIG.ai.apiProxy && !CONFIG.ai.directCall) {
      // 加载对话历史作为上下文
      const history = await loadConversationHistory(conversationId, 10)
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))
      messages.push({ role: 'user', content: message })

      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: CONFIG.ai.apiProxy,
          method: 'POST',
          data: {
            messages,
            provider: CONFIG.ai.provider,
          },
          header: {
            'Content-Type': 'application/json',
          },
          success: resolve,
          fail: reject,
        })
      })

      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        const reply = data.reply || data.content || '抱歉，我无法理解这个问题。'
        
        // 保存AI回复
        try {
          await dbAI.saveMessage({ role: 'assistant', content: reply })
        } catch (e) {
          console.warn('save ai message skipped', e)
        }
        
        return reply
      }
    }

    // 直接调用豆包（火山引擎）API
    if (CONFIG.ai.directCall && CONFIG.ai.apiKey && CONFIG.ai.apiUrl) {
      // 加载对话历史作为上下文（转换为豆包格式）
      const history = await loadConversationHistory(conversationId, 5) // 限制历史长度
      
      // 构建输入消息（豆包API格式）
      const inputMessages: any[] = []
      
      // 添加历史消息
      history.forEach(msg => {
        inputMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: [{
            type: 'input_text',
            text: msg.content,
          }],
        })
      })
      
      // 添加当前消息
      inputMessages.push({
        role: 'user',
        content: [{
          type: 'input_text',
          text: message,
        }],
      })

      const requestData = {
        model: CONFIG.ai.modelId,
        stream: false, // 非流式返回，简化处理
        input: inputMessages,
      }
      
      console.log('AI API请求:', {
        url: CONFIG.ai.apiUrl,
        model: CONFIG.ai.modelId,
        inputLength: inputMessages.length,
      })

      const response = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: CONFIG.ai.apiUrl,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${CONFIG.ai.apiKey}`,
            'Content-Type': 'application/json',
          },
          data: requestData,
          success: (res) => {
            console.log('AI API响应:', res.statusCode, res.data)
            resolve(res)
          },
          fail: (err) => {
            console.error('AI API网络错误:', err)
            reject(err)
          },
        })
      })

      if (response.statusCode === 200 && response.data) {
        const data = response.data as any
        
        // 添加详细的调试日志
        console.log('AI API完整响应数据:', JSON.stringify(data, null, 2))
        
        // 解析火山引擎（豆包）API返回格式
        let reply = '抱歉，我无法理解这个问题。'
        
        // 格式1: data.output[0].content[0].text (火山引擎标准格式)
        if (data.output && Array.isArray(data.output) && data.output.length > 0) {
          const outputItem = data.output[0]
          console.log('解析格式1 - output[0]:', outputItem)
          if (outputItem.content && Array.isArray(outputItem.content)) {
            reply = outputItem.content
              .map((item: any) => item.text || item.content || '')
              .join('')
          } else if (outputItem.text) {
            reply = outputItem.text
          } else if (typeof outputItem.content === 'string') {
            reply = outputItem.content
          } else if (outputItem.message && outputItem.message.content) {
            // 检查是否有message.content字段
            if (Array.isArray(outputItem.message.content)) {
              reply = outputItem.message.content
                .map((item: any) => item.text || item.content || '')
                .join('')
            } else if (typeof outputItem.message.content === 'string') {
              reply = outputItem.message.content
            }
          }
        }
        // 格式2: data.output.choices[0].message.content (兼容格式)
        else if (data.output && data.output.choices && data.output.choices.length > 0) {
          const choice = data.output.choices[0]
          console.log('解析格式2 - output.choices[0]:', choice)
          if (choice.message && choice.message.content) {
            if (Array.isArray(choice.message.content)) {
              reply = choice.message.content
                .map((item: any) => item.text || item.content || '')
                .join('')
            } else if (typeof choice.message.content === 'string') {
              reply = choice.message.content
            }
          } else if (choice.text) {
            reply = choice.text
          }
        }
        // 格式3: data.choices[0] (OpenAI兼容格式)
        else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
          const choice = data.choices[0]
          console.log('解析格式3 - choices[0]:', choice)
          if (choice.message && choice.message.content) {
            reply = choice.message.content
          } else if (choice.text) {
            reply = choice.text
          }
        }
        // 格式4: data.content (简单格式)
        else if (data.content) {
          console.log('解析格式4 - content:', data.content)
          reply = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
        }
        // 格式5: 直接检查data.output（可能是对象而非数组）
        else if (data.output && typeof data.output === 'object' && !Array.isArray(data.output)) {
          console.log('解析格式5 - output对象:', data.output)
          if (data.output.content) {
            if (Array.isArray(data.output.content)) {
              reply = data.output.content
                .map((item: any) => item.text || item.content || '')
                .join('')
            } else if (typeof data.output.content === 'string') {
              reply = data.output.content
            }
          } else if (data.output.text) {
            reply = data.output.text
          }
        }
        
        if (reply === '抱歉，我无法理解这个问题。') {
          console.error('AI API返回格式异常，无法解析回复内容')
          console.error('原始响应数据:', JSON.stringify(data, null, 2))
          // 尝试提取任何可能的文本内容
          const dataStr = JSON.stringify(data)
          const textMatch = dataStr.match(/"text"\s*:\s*"([^"]+)"/)
          if (textMatch && textMatch[1]) {
            reply = textMatch[1]
            console.log('从JSON字符串中提取到文本:', reply)
          }
        } else {
          console.log('AI回复解析成功:', reply.substring(0, 100) + (reply.length > 100 ? '...' : ''))
        }
        
        // 保存AI回复
        try {
          await dbAI.saveMessage({ role: 'assistant', content: reply, conversation_id: conversationId })
        } catch (e) {
          console.warn('save ai message skipped', e)
        }
        
        return reply
      } else {
        const errorMsg = `API调用失败: ${response.statusCode}`
        const errorData = response.data ? JSON.stringify(response.data) : '无响应数据'
        console.error('AI API错误:', errorMsg, errorData)
        throw new Error(`${errorMsg} - ${errorData}`)
      }
    }

    throw new Error('AI API配置不完整')
  } catch (error: any) {
    console.error('sendMessageToAI error', error)
    
    // 提取错误信息
    let errorMsg = '网络请求失败'
    if (error?.errMsg) {
      errorMsg = error.errMsg
    } else if (error?.message) {
      errorMsg = error.message
    }
    
    console.error('AI调用失败详情:', {
      errorMsg,
      url: CONFIG.ai.apiUrl,
      hasApiKey: !!CONFIG.ai.apiKey,
      directCall: CONFIG.ai.directCall,
    })
    
    // 如果API调用失败，返回友好的错误提示
    const fallbackReply = '抱歉，我现在无法回答这个问题。请检查网络连接或稍后再试。'
    try {
      await dbAI.saveMessage({ role: 'assistant', content: fallbackReply, conversation_id: conversationId })
    } catch (e) {
      console.warn('save fallback message skipped', e)
    }
    
    return fallbackReply
  }
}

// 加载对话历史
export async function loadConversationHistory(conversationId?: string, limit: number = 20): Promise<AIMessage[]> {
  try {
    return await dbAI.loadMessages(conversationId, limit)
  } catch (error) {
    console.error('loadConversationHistory error', error)
    return []
  }
}

// 清空对话历史
export async function clearConversationHistory(): Promise<void> {
  try {
    await dbAI.clearMessages()
  } catch (error) {
    console.error('clearConversationHistory error', error)
  }
}

