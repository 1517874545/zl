// 存钱罐模块（增强版）
import * as dbSaving from '../db/saving'

export interface FinancialRecord {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  source?: string
  note?: string
  recordDate: string
}

export interface Budget {
  id: string
  category: string
  month: string // 月份，格式：YYYY-MM
  monthlyLimit: number
  currentMonthSpent: number
}

export interface Statistics {
  totalIncome: number
  totalExpense: number
  balance: number
  expenseByCategory: Record<string, number>
  incomeByCategory: Record<string, number>
}

// 收入类型
export const INCOME_CATEGORIES = dbSaving.INCOME_CATEGORIES

// 支出分类
export const EXPENSE_CATEGORIES = dbSaving.EXPENSE_CATEGORIES

// 加载财务记录
export async function loadFinancialRecords(options?: {
  type?: 'income' | 'expense'
  startDate?: string
  endDate?: string
}): Promise<FinancialRecord[]> {
  try {
    const records = await dbSaving.loadFinancialRecords(options)
    return records.map(r => ({
      id: r.id,
      type: r.type,
      category: r.category,
      amount: typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount || 0)),
      source: r.source,
      note: r.note,
      recordDate: r.record_date || r.recordDate || '',
      created_at: r.created_at || r.createdAt || '',
      record_date: r.record_date || r.recordDate || '',
    }))
  } catch (error) {
    console.error('loadFinancialRecords error', error)
    return []
  }
}

// 计算余额
export async function calculateBalance(): Promise<number> {
  try {
    return await dbSaving.calculateBalance()
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
  try {
    const result = await dbSaving.addFinancialRecord(record)
    return {
      id: result.id,
      type: result.type,
      category: result.category,
      amount: result.amount,
      source: result.source,
      note: result.note,
      recordDate: result.record_date,
    }
  } catch (error) {
    console.error('addFinancialRecord error', error)
    throw error
  }
}

// 删除财务记录
export async function deleteFinancialRecord(id: string): Promise<void> {
  try {
    await dbSaving.deleteFinancialRecord(id)
  } catch (error) {
    console.error('deleteFinancialRecord error', error)
    throw error
  }
}

// 加载预算
export async function loadBudgets(): Promise<Budget[]> {
  try {
    const budgets = await dbSaving.loadBudgets()
    return budgets.map(b => ({
      id: b.id,
      category: b.category,
      month: b.month || '',
      monthlyLimit: b.monthly_limit,
      currentMonthSpent: b.current_month_spent,
    }))
  } catch (error) {
    console.error('loadBudgets error', error)
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
    const result = await dbSaving.upsertBudget(budget)
    return {
      id: result.id,
      category: result.category,
      month: result.month || '',
      monthlyLimit: result.monthly_limit,
      currentMonthSpent: result.current_month_spent,
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
}): Promise<Statistics> {
  try {
    return await dbSaving.getStatistics(options)
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
