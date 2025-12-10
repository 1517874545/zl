// 天气数据库服务
import { supabase } from '../supabase'

export interface CityInfo {
  id: string
  user_id?: string
  name?: string  // 用于代码中的映射
  city_name?: string  // 数据库字段
  city_code?: string
  is_default: boolean
  created_at?: string
}

const DEFAULT_USER_ID = 'default_user'

// 加载城市列表
export async function loadCityList(): Promise<Array<{ id: string; name: string; isDefault: boolean }>> {
  try {
    const data = await supabase.selectAll<CityInfo>('weather_settings', {
      order: 'is_default.desc,created_at.asc',
    })
    
    return data.map(item => ({
      id: item.id,
      name: item.city_name || item.name || '',  // 使用数据库字段 city_name
      isDefault: item.is_default || false,
    }))
  } catch (error) {
    console.warn('loadCityList error', error)
    // 如果没有数据，返回默认城市
    return [{
      id: 'default-1',
      name: '北京',
      isDefault: true,
    }]
  }
}

// 添加城市
export async function addCity(city: { name: string; isDefault?: boolean }): Promise<{ id: string; name: string; isDefault: boolean }> {
  try {
    // 如果设置为默认，先取消其他默认
    if (city.isDefault) {
      const existing = await supabase.selectAll<CityInfo>('weather_settings', {
        filter: { is_default: 'true' },
      })
      for (const item of existing) {
        await supabase.update<CityInfo>('weather_settings', {
          is_default: false,
        }, { id: item.id })
      }
    }
    
    const cityData: any = {
      id: `city-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      city_name: city.name,  // 使用数据库字段名 city_name
      is_default: city.isDefault || false,
    }
    
    await supabase.insert<CityInfo>('weather_settings', cityData)
    
    return {
      id: cityData.id,
      name: city.name,
      isDefault: city.isDefault || false,
    }
  } catch (error) {
    console.error('addCity error', error)
    throw error
  }
}

// 删除城市
export async function deleteCity(cityId: string): Promise<void> {
  try {
    await supabase.delete('weather_settings', { id: cityId })
  } catch (error) {
    console.error('deleteCity error', error)
    throw error
  }
}

// 设置默认城市
export async function setDefaultCity(cityId: string): Promise<void> {
  try {
    // 先取消所有默认
    const existing = await supabase.selectAll<CityInfo>('weather_settings', {
      filter: { is_default: 'true' },
    })
    for (const item of existing) {
      await supabase.update<CityInfo>('weather_settings', {
        is_default: false,
      }, { id: item.id })
    }
    
    // 设置新的默认
    await supabase.update<CityInfo>('weather_settings', {
      is_default: true,
    }, { id: cityId })
  } catch (error) {
    console.error('setDefaultCity error', error)
    throw error
  }
}

