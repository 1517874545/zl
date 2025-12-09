// 存钱罐数据库服务（增强版）
import { supabase } from '../supabase'

export interface FinancialRecord {
  id: string
  user_id?: string
  type: 'income' | 'expense'
  category: string // 收入类型或支出分类
  amount: number
  source?: string // 收入来源或支出商家
  note?: string
  record_date: string
  created_at?: string
  updated_at?: string
}

export interface Budget {
  id: string
  user_id?: string
  category: string
  month: string // 月份，格式：YYYY-MM，如 "2025-12"
  monthly_limit: number
  current_month_spent: number
  created_at?: string
  updated_at?: string
}

const DEFAULT_USER_ID = 'default_user'

// 收入类型
export const INCOME_CATEGORIES = [
  { id: 'redpacket', name: '红包' },
  { id: 'transfer', name: '转账' },
  { id: 'parttime', name: '兼职收入' },
  { id: 'allowance', name: '生活费' },
  { id: 'other', name: '其他' },
]

// 支出分类
export const EXPENSE_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: '🍔' },
  { id: 'transport', name: '交通', icon: '🚗' },
  { id: 'shopping', name: '购物', icon: '🛍️' },
  { id: 'study', name: '学习用品', icon: '📚' },
  { id: 'entertainment', name: '娱乐', icon: '🎮' },
  { id: 'medical', name: '医疗', icon: '💊' },
  { id: 'other', name: '其他', icon: '📦' },
]

// 加载财务记录
export async function loadFinancialRecords(options?: {
  type?: 'income' | 'expense'
  startDate?: string
  endDate?: string
}): Promise<FinancialRecord[]> {
  try {
    let data = await supabase.selectAll<any>('financial_records', {
      order: 'record_date.desc,created_at.desc',
    })
    
    // 确保数据类型正确
    data = data.map(item => ({
      ...item,
      amount: typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0),
      type: item.type || 'expense',
      category: item.category || '',
      record_date: item.record_date || item.recordDate || '',
    }))
    
    // 过滤
    if (options?.type) {
      data = data.filter(item => item.type === options.type)
    }
    if (options?.startDate) {
      data = data.filter(item => {
        const recordDate = item.record_date || ''
        if (!recordDate) return false
        // 确保日期格式一致（YYYY-MM-DD）
        const dateStr = recordDate.split('T')[0].split(' ')[0]
        const result = dateStr >= options.startDate!
        if (!result) {
          console.log('日期过滤 - 记录被过滤（小于startDate）:', {
            recordDate,
            dateStr,
            startDate: options.startDate,
          })
        }
        return result
      })
    }
    if (options?.endDate) {
      data = data.filter(item => {
        const recordDate = item.record_date || ''
        if (!recordDate) return false
        // 确保日期格式一致（YYYY-MM-DD）
        const dateStr = recordDate.split('T')[0].split(' ')[0]
        const result = dateStr <= options.endDate!
        if (!result) {
          console.log('日期过滤 - 记录被过滤（大于endDate）:', {
            recordDate,
            dateStr,
            endDate: options.endDate,
          })
        }
        return result
      })
    }
    
    return data as FinancialRecord[]
  } catch (error) {
    console.warn('loadFinancialRecords error', error)
    return []
  }
}

// 计算余额
export async function calculateBalance(): Promise<number> {
  try {
    const records = await loadFinancialRecords()
    return records.reduce((balance, record) => {
      if (record.type === 'income') {
        return balance + record.amount
      } else {
        return balance - record.amount
      }
    }, 0)
  } catch (error) {
    console.error('calculateBalance error', error)
    return 0
  }
}

// 添加财务记录
export async function addFinancialRecord(record: {
  type: 'income' | 'expense'
  category: string
  amount: number
  source?: string
  note?: string
  recordDate: string
}): Promise<FinancialRecord> {
  const now = new Date().toISOString()
  const recordData: any = {
    id: `record-${Date.now()}`,
    user_id: DEFAULT_USER_ID,
    type: record.type,
    category: record.category,
    amount: record.amount,
    source: record.source || '',
    note: record.note || '',
    record_date: record.recordDate,
    created_at: now, // 设置创建时间
  }

  try {
    const result = await supabase.insert<FinancialRecord>('financial_records', recordData)
    
    // 如果是支出，更新预算
    if (record.type === 'expense') {
      await updateBudgetSpent(record.category, record.amount)
    }
    
    return result[0]
  } catch (error) {
    console.error('addFinancialRecord error', error)
    throw error
  }
}

// 删除财务记录
export async function deleteFinancialRecord(id: string): Promise<void> {
  try {
    const record = await supabase.selectOne<FinancialRecord>('financial_records', { id })
    const category = record?.category || ''
    const isExpense = record?.type === 'expense'
    
    await supabase.delete('financial_records', { id })
    
    // 如果是支出，重新计算预算（删除后再计算，确保不包含已删除的记录）
    if (isExpense && category) {
      await updateBudgetSpent(category, 0) // amount参数在这里不使用，函数内部会重新计算
    }
  } catch (error) {
    console.error('deleteFinancialRecord error', error)
    throw error
  }
}

// 更新预算支出（重新计算当月该分类的总支出）
async function updateBudgetSpent(category: string, amount: number): Promise<void> {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    
    // 重新加载所有本月支出记录（确保包含刚添加的记录）
    const allRecords = await supabase.selectAll<any>('financial_records', {
      order: 'record_date.desc,created_at.desc',
    })
    
    // 过滤出本月的支出记录
    const monthRecords = allRecords.filter((item: any) => {
      const recordDate = item.record_date || item.recordDate || ''
      if (!recordDate) return false
      // 确保日期格式一致（YYYY-MM-DD）
      const dateStr = recordDate.split('T')[0].split(' ')[0]
      return item.type === 'expense' && 
             dateStr >= monthStart && 
             dateStr <= monthEnd
    })
    
    // 计算该分类的总支出
    const categoryRecords = monthRecords.filter((r: any) => r.category === category)
    const totalSpent = categoryRecords.reduce((sum: number, r: any) => {
      const amount = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount || 0))
      return sum + amount
    }, 0)
    
    // 更新或创建预算
    const existing = await supabase.selectOne<Budget>('budgets', { category })
    if (existing) {
      await supabase.update<Budget>('budgets', {
        current_month_spent: totalSpent,
        updated_at: new Date().toISOString(),
      }, { id: existing.id })
    }
  } catch (error) {
    console.warn('updateBudgetSpent error', error)
  }
}

// 加载预算
export async function loadBudgets(): Promise<Budget[]> {
  try {
    const data = await supabase.selectAll<any>('budgets', {
      order: 'month.desc,created_at',
    })
    
    // 加载所有支出记录（用于按月份计算）
    const allRecords = await loadFinancialRecords({
      type: 'expense',
    })
    
    // 按月份和分类统计支出
    const spentByMonthAndCategory: Record<string, Record<string, number>> = {}
    
    allRecords.forEach(r => {
      const recordDate = r.record_date || r.recordDate || ''
      if (!recordDate) return
      
      // 解析日期，获取年月
      const dateStr = recordDate.split('T')[0].split(' ')[0]
      const dateParts = dateStr.split('-')
      if (dateParts.length < 2) return
      
      const year = dateParts[0]
      const month = dateParts[1]
      if (!year || !month) return
      
      const monthKey = `${year}-${month}`
      const category = r.category || ''
      const amount = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount || 0))
      
      if (!isNaN(amount) && amount > 0) {
        if (!spentByMonthAndCategory[monthKey]) {
          spentByMonthAndCategory[monthKey] = {}
        }
        if (category) {
          spentByMonthAndCategory[monthKey][category] = (spentByMonthAndCategory[monthKey][category] || 0) + amount
        }
      }
    })
    
    // 确保数据类型正确并映射字段，同时更新当月支出
    const budgets = data.map(item => {
      const category = item.category || ''
      const month = item.month || ''
      
      // 获取该月份该分类的支出
      const monthSpent = spentByMonthAndCategory[month] || {}
      const currentMonthSpent = category 
        ? (monthSpent[category] || 0)
        : Object.values(monthSpent).reduce((sum: number, amount: number) => sum + amount, 0)
      
      // 调试日志
      console.log('loadBudgets - 预算项:', {
        category: category || '(总预算)',
        month,
        currentMonthSpent,
        monthlyLimit: item.monthly_limit,
        dbSpent: item.current_month_spent,
      })
      
      // 如果数据库中的值与计算值不一致，更新数据库
      const dbSpent = typeof item.current_month_spent === 'number' 
        ? item.current_month_spent 
        : parseFloat(String(item.current_month_spent || 0))
      
      if (Math.abs(dbSpent - currentMonthSpent) > 0.01) { // 允许0.01的误差
        console.log(`更新预算 ${category || '(总预算)'} [${month}]: ${dbSpent} -> ${currentMonthSpent}`)
        supabase.update<Budget>('budgets', {
          current_month_spent: currentMonthSpent,
          updated_at: new Date().toISOString(),
        }, { id: item.id }).catch(err => {
          console.warn('update budget spent error', err)
        })
      }
      
      return {
        id: item.id,
        user_id: item.user_id,
        category,
        month: month || '',
        monthly_limit: typeof item.monthly_limit === 'number' ? item.monthly_limit : parseFloat(String(item.monthly_limit || 0)),
        current_month_spent: currentMonthSpent,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
    })
    
    return budgets
  } catch (error) {
    console.warn('loadBudgets error', error)
    return []
  }
}

// 保存或更新预算
export async function upsertBudget(budget: {
  category: string
  month: string
  monthlyLimit: number
}): Promise<Budget> {
  try {
    // 查找该月份该分类的预算（月份+分类唯一）
    const existing = await supabase.selectOne<Budget>('budgets', { 
      category: budget.category,
      month: budget.month,
    })
    
    const budgetData: any = {
      user_id: DEFAULT_USER_ID,
      category: budget.category,
      month: budget.month,
      monthly_limit: budget.monthlyLimit,
      updated_at: new Date().toISOString(),
    }
    
    if (existing) {
      await supabase.update<Budget>('budgets', budgetData, { id: existing.id })
      return { ...existing, ...budgetData }
    } else {
      budgetData.id = `budget-${Date.now()}`
      budgetData.current_month_spent = 0
      budgetData.created_at = new Date().toISOString()
      const result = await supabase.insert<Budget>('budgets', budgetData)
      return result[0]
    }
  } catch (error) {
    console.error('upsertBudget error', error)
    throw error
  }
}

// 获取统计信息
export async function getStatistics(options?: {
  startDate?: string
  endDate?: string
}): Promise<{
  totalIncome: number
  totalExpense: number
  balance: number
  expenseByCategory: Record<string, number>
  incomeByCategory: Record<string, number>
}> {
  try {
    const records = await loadFinancialRecords(options)
    
    const totalIncome = records
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    
    const totalExpense = records
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
    
    const balance = totalIncome - totalExpense
    
    const expenseByCategory: Record<string, number> = {}
    const incomeByCategory: Record<string, number> = {}
    
    records.forEach(record => {
      if (record.type === 'expense') {
        expenseByCategory[record.category] = (expenseByCategory[record.category] || 0) + record.amount
      } else {
        incomeByCategory[record.category] = (incomeByCategory[record.category] || 0) + record.amount
      }
    })
    
    return {
      totalIncome,
      totalExpense,
      balance,
      expenseByCategory,
      incomeByCategory,
    }
  } catch (error) {
    console.error('getStatistics error', error)
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expenseByCategory: {},
      incomeByCategory: {},
    }
  }
}
