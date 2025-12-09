// Supabase 客户端适配器（微信小程序版本）
// 由于微信小程序无法直接使用 npm 的 Supabase 客户端，我们使用微信的网络请求 API 实现

const SUPABASE_URL = 'https://mvzpegvtiafzzznzvdqx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enBlZ3Z0aWFmenp6bnp2ZHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTc5MzksImV4cCI6MjA4MDQzMzkzOX0.QbQ7aMEye7dcit-e_y8UuTcZ-H6qCGLbXQl-5RRWPko'
const SUPABASE_STORAGE_UPLOAD_URL = `${SUPABASE_URL}/storage/v1/object`

interface SupabaseRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  query?: Record<string, string>
}

class SupabaseClient {
  private url: string
  private key: string

  constructor(url: string, key: string) {
    this.url = url
    this.key = key
  }

  private async request<T>(
    path: string,
    options: SupabaseRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, query } = options

    // 构建 URL
    let url = `${this.url}/rest/v1${path}`
    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
      url += `?${queryString}`
    }

    // 设置请求头
    const requestHeaders: Record<string, string> = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers,
    }

    return new Promise<T>((resolve, reject) => {
      wx.request({
        url,
        method: method as any,
        header: requestHeaders,
        data: body,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data as T)
          } else {
            const errorMsg = res.data ? JSON.stringify(res.data) : `Status ${res.statusCode}`
            console.error('Supabase request error:', errorMsg, { url, method })
            reject(new Error(`Request failed with status ${res.statusCode}: ${errorMsg}`))
          }
        },
        fail: (err) => {
          console.error('Supabase request fail:', {
            errMsg: err.errMsg,
            url,
            method,
            error: err
          })
          // 提供更友好的错误信息
          if (err.errMsg && err.errMsg.includes('proxy')) {
            console.warn('网络连接失败，请检查：1. 网络连接是否正常 2. 微信开发者工具的网络设置 3. 是否配置了代理')
          }
          reject(new Error(`Request failed: ${err.errMsg || JSON.stringify(err)}`))
        },
      })
    })
  }

  // 查询所有数据
  async selectAll<T>(table: string, options?: {
    order?: string
    limit?: number
    filter?: Record<string, any>
  }): Promise<T[]> {
    const query: Record<string, string> = {}
    
    // Supabase PostgREST API 的 order 参数格式: column.direction
    if (options?.order) {
      query.order = options.order
    }
    
    if (options?.limit) {
      query.limit = options.limit.toString()
    }
    
    // Supabase PostgREST API 的 filter 参数格式: column=operator.value
    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query[key] = `eq.${value}`
      })
    }

    try {
      return await this.request<T[]>(`/${table}`, { method: 'GET', query })
    } catch (error) {
      console.error(`Error selecting from ${table}:`, error)
      return []
    }
  }

  // 查询单条数据
  async selectOne<T>(table: string, filter: Record<string, any>): Promise<T | null> {
    const query: Record<string, string> = {}
    Object.entries(filter).forEach(([key, value]) => {
      query[key] = `eq.${value}`
    })

    try {
      const results = await this.request<T[]>(`/${table}`, { 
        method: 'GET', 
        query,
        headers: { 'Prefer': 'return=representation' }
      })
      return results && results.length > 0 ? results[0] : null
    } catch (error) {
      console.error(`Error selecting one from ${table}:`, error)
      return null
    }
  }

  // 插入数据（单条或多条）
  async insert<T>(table: string, data: any | any[]): Promise<T[]> {
    const body = Array.isArray(data) ? data : [data]
    try {
      return await this.request<T[]>(`/${table}`, {
        method: 'POST',
        body,
      })
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error)
      throw error
    }
  }

  // 更新数据
  async update<T>(
    table: string,
    data: Partial<T>,
    filter: Record<string, any>
  ): Promise<T[]> {
    const query: Record<string, string> = {}
    Object.entries(filter).forEach(([key, value]) => {
      query[key] = `eq.${value}`
    })

    try {
      return await this.request<T[]>(`/${table}`, {
        method: 'PATCH',
        body: data,
        query,
      })
    } catch (error) {
      console.error(`Error updating ${table}:`, error)
      throw error
    }
  }

  // 删除数据
  async delete(
    table: string,
    filter: Record<string, any>
  ): Promise<void> {
    const query: Record<string, string> = {}
    Object.entries(filter).forEach(([key, value]) => {
      query[key] = `eq.${value}`
    })

    try {
      await this.request(`/${table}`, {
        method: 'DELETE',
        query,
      })
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error)
      throw error
    }
  }

  // 使用 upsert（插入或更新）
  async upsert<T>(table: string, data: any | any[]): Promise<T[]> {
    const body = Array.isArray(data) ? data : [data]
    try {
      return await this.request<T[]>(`/${table}`, {
        method: 'POST',
        body,
        headers: { 'Prefer': 'resolution=merge-duplicates' },
      })
    } catch (error) {
      console.error(`Error upserting into ${table}:`, error)
      throw error
    }
  }
}

// 创建并导出 Supabase 客户端实例
export const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 上传文件到 Supabase Storage（默认 public bucket）
export async function uploadToSupabaseStorage(
  filePath: string,
  options?: { bucket?: string; prefix?: string }
): Promise<string> {
  const bucket = options?.bucket || 'public'
  const prefix = options?.prefix || 'avatars'
  const ext = filePath.split('.').pop() || 'jpg'
  const objectKey = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  return new Promise<string>((resolve, reject) => {
    wx.uploadFile({
      url: `${SUPABASE_STORAGE_UPLOAD_URL}/${bucket}/${objectKey}`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 公网可访问地址（bucket 需设为 public）
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectKey}`
          resolve(publicUrl)
        } else {
          reject(new Error(`upload failed: ${res.statusCode} ${res.data}`))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

