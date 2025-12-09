// 存钱罐页面（增强版）
import {
  calculateBalance,
  loadFinancialRecords,
  addFinancialRecord,
  deleteFinancialRecord,
  getStatistics,
  loadBudgets,
  upsertBudget,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  type FinancialRecord,
  type Statistics,
} from '../../utils/features/saving'

interface SavingPageData {
  balance: number
  records: FinancialRecord[]
  groupedRecords: Array<{
    monthKey: string
    monthLabel: string
    records: FinancialRecord[]
  }>
  statistics: Statistics
  showRecordModal: boolean
  recordType: 'income' | 'expense'
  recordForm: {
    category: string
    amount: string
    source: string
    note: string
    recordDate: string
  }
  showStatistics: boolean
  showBudget: boolean
  budgets: Array<{
    id: string
    category: string
    month: string // 月份，格式：YYYY-MM
    monthlyLimit: number
    currentMonthSpent: number
    monthlyLimitText: string
    currentMonthSpentText: string
    statusColor: string
    statusText: string
    percentage: number
  }>
  currentTab: 'records' | 'statistics' | 'budget'
  budgetStatusColor: string
  showMonthPicker: boolean
  monthPickerRange: string[]
  monthPickerLabels: string[]
  selectedMonthIndex: number
  showCategoryPicker: boolean
  categoryPickerList: Array<{ id: string; name: string; icon: string }>
  selectedCategoryIndex: number
  pendingMonthForCategory: string // 保存待选择分类的月份
}

Page<SavingPageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    balance: 0,
    balanceText: '0.00',
    records: [],
    groupedRecords: [],
    statistics: {
      totalIncome: 0,
      totalIncomeText: '0.00',
      totalExpense: 0,
      totalExpenseText: '0.00',
      balance: 0,
      expenseByCategory: {},
      incomeByCategory: {},
    },
    incomeCategories: INCOME_CATEGORIES,
    expenseCategories: EXPENSE_CATEGORIES,
    categoryPickerValue: 0,
    showRecordModal: false,
    recordType: 'income',
    recordForm: {
      category: '',
      amount: '',
      source: '',
      note: '',
      recordDate: '',
    },
    showStatistics: false,
    showBudget: false,
    budgets: [],
    currentTab: 'records',
    budgetStatusColor: 'normal',
    incomeCategories: INCOME_CATEGORIES,
    expenseCategories: EXPENSE_CATEGORIES,
    categoryPickerValue: 0,
    showMonthPicker: false,
    monthPickerRange: [],
    monthPickerLabels: [],
    selectedMonthIndex: 0,
    showCategoryPicker: false,
    categoryPickerList: [],
    selectedCategoryIndex: 0,
    pendingMonthForCategory: '',
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData(done?: () => void) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const [balance, records, statistics, budgets] = await Promise.all([
        calculateBalance(),
        loadFinancialRecords({}),
        getStatistics({}),
        loadBudgets(),
      ])
      
      // 格式化金额的辅助函数
      const formatAmount = (amount: number | string | undefined | null): string => {
        if (amount === undefined || amount === null || amount === '') {
          return '0.00'
        }
        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(num)) {
          return '0.00'
        }
        return num.toFixed(2)
      }

      // 处理记录数据
      const processedRecords = (records || [])
        .map(r => {
          // 确保时间字段正确传递
          const recordDate = r.recordDate || r.record_date || ''
          const createdAt = r.created_at || r.createdAt || ''
          
          return {
            ...r,
            recordDate,
            record_date: recordDate, // 保留原始字段名
            created_at: createdAt,
            createdAt: createdAt, // 同时保留驼峰命名
          }
        })
        .sort((a, b) => {
          // 按时间排序，最新的在前（时间顺序，降序）
          // 优先使用创建时间，如果没有则使用记录日期
          const timeA = a.created_at 
            ? new Date(a.created_at).getTime() 
            : new Date(a.recordDate || '').getTime()
          const timeB = b.created_at 
            ? new Date(b.created_at).getTime() 
            : new Date(b.recordDate || '').getTime()
          
          // 如果时间相同，再按记录日期排序
          if (timeA === timeB) {
            const dateA = new Date(a.recordDate || '').getTime()
            const dateB = new Date(b.recordDate || '').getTime()
            return dateB - dateA
          }
          
          return timeB - timeA // 时间降序（从新到旧）
        })
        .map(r => {
          const amount = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount || 0))
          return {
            ...r,
            amount,
            amountText: formatAmount(amount),
          }
        })

      // 按月份分组
      const groupedRecordsMap: Record<string, FinancialRecord[]> = {}
      processedRecords.forEach(r => {
        const dateStr = r.recordDate || r.record_date || ''
        let monthKey = '未知'
        let monthLabel = '未知'
        
        if (dateStr) {
          try {
            const date = new Date(dateStr + 'T00:00:00')
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear()
              const month = date.getMonth() + 1
              monthKey = `${year}-${month.toString().padStart(2, '0')}`
              monthLabel = `${year}年${month}月`
            }
          } catch (e) {
            // 忽略错误
          }
        }
        
        if (!groupedRecordsMap[monthKey]) {
          groupedRecordsMap[monthKey] = []
        }
        // 确保所有字段都被正确传递，包括时间字段
        groupedRecordsMap[monthKey].push({
          ...r,
          recordDate: r.recordDate || r.record_date || '',
          record_date: r.recordDate || r.record_date || '',
          created_at: r.created_at || r.createdAt || '',
          createdAt: r.created_at || r.createdAt || '',
        })
      })

      // 转换为数组并按月份排序（最新的在前）
      const groupedRecords = Object.keys(groupedRecordsMap)
        .sort((a, b) => b.localeCompare(a)) // 降序排序
        .map(monthKey => ({
          monthKey,
          monthLabel: groupedRecordsMap[monthKey][0]?.recordDate 
            ? (() => {
                try {
                  const date = new Date(groupedRecordsMap[monthKey][0].recordDate + 'T00:00:00')
                  if (!isNaN(date.getTime())) {
                    const year = date.getFullYear()
                    const month = date.getMonth() + 1
                    return `${year}年${month}月`
                  }
                } catch (e) {}
                return monthKey
              })()
            : monthKey,
          records: groupedRecordsMap[monthKey],
        }))

      this.setData({
        balance: balance || 0,
        balanceText: formatAmount(balance || 0),
        records: processedRecords,
        groupedRecords,
        statistics: {
          totalIncome: statistics?.totalIncome || 0,
          totalIncomeText: formatAmount(statistics?.totalIncome || 0),
          totalExpense: statistics?.totalExpense || 0,
          totalExpenseText: formatAmount(statistics?.totalExpense || 0),
          balance: statistics?.balance || 0,
          expenseByCategory: (() => {
            const category = statistics?.expenseByCategory || {}
            const result: Record<string, { amount: number; text: string }> = {}
            Object.keys(category).forEach(key => {
              result[key] = {
                amount: category[key],
                text: formatAmount(category[key]),
              }
            })
            return result
          })(),
          incomeByCategory: (() => {
            const category = statistics?.incomeByCategory || {}
            const result: Record<string, { amount: number; text: string }> = {}
            Object.keys(category).forEach(key => {
              result[key] = {
                amount: category[key],
                text: formatAmount(category[key]),
              }
            })
            return result
          })(),
        },
        budgets: (budgets || []).map(b => {
          const spent = typeof b.currentMonthSpent === 'number' ? b.currentMonthSpent : parseFloat(String(b.currentMonthSpent || 0))
          const limit = typeof b.monthlyLimit === 'number' ? b.monthlyLimit : parseFloat(String(b.monthlyLimit || 0))
          const percentage = limit > 0 ? (spent / limit) * 100 : 0
          
          // 计算预算状态颜色
          let statusColor = 'normal' // 正常（绿色）
          let statusText = '正常'
          
          if (percentage >= 100) {
            statusColor = 'exceeded' // 超预算（红色）
            statusText = '超预算'
          } else if (percentage >= 90) {
            statusColor = 'warning' // 接近预算（橙色）
            statusText = '接近预算'
          } else if (percentage >= 50) {
            statusColor = 'caution' // 超一半（黄色）
            statusText = '超一半'
          }
          
          // 格式化月份显示
          let monthLabel = ''
          if (b.month) {
            const [year, month] = b.month.split('-')
            if (year && month) {
              monthLabel = `${year}年${parseInt(month)}月`
            }
          }
          
          return {
            ...b,
            month: b.month || '',
            monthLabel,
            currentMonthSpent: spent,
            monthlyLimit: limit,
            currentMonthSpentText: formatAmount(spent),
            monthlyLimitText: formatAmount(limit),
            statusColor,
            statusText,
            percentage,
          }
        }),
      })
      
      // 计算预算标签的颜色（取最严重的状态）
      const budgetStatus = this.calculateBudgetStatus(budgets || [])
      this.setData({ budgetStatusColor: budgetStatus })
    } catch (error) {
      console.error('loadData error', error)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      })
    } finally {
      wx.hideLoading()
      if (done) done()
    }
  },

  // 切换标签
  onTabChange(event: WechatMiniprogram.TouchEvent) {
    const tab = event.currentTarget.dataset.tab as 'records' | 'statistics' | 'budget'
    this.setData({ currentTab: tab })
    if (tab === 'budget') {
      this.loadBudgets()
    }
  },

  // 打开添加记录弹窗
  onAddRecord(event: WechatMiniprogram.TouchEvent) {
    const type = event.currentTarget.dataset.type as 'income' | 'expense'
    const today = new Date().toISOString().split('T')[0]
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    this.setData({
      showRecordModal: true,
      recordType: type,
      recordForm: {
        category: categories[0].id,
        amount: '',
        source: '',
        note: '',
        recordDate: today,
      },
      categoryPickerValue: 0,
    })
  },

  // 关闭记录弹窗
  onCloseRecordModal() {
    this.setData({ showRecordModal: false })
  },

  // 记录表单输入
  onRecordFormInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field
    const value = event.detail.value
    this.setData({
      [`recordForm.${field}`]: value,
    })
  },

  // 选择分类
  onCategoryChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value)
    const categories = this.data.recordType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    this.setData({
      'recordForm.category': categories[index].id,
      categoryPickerValue: index,
    })
  },

  // 选择日期
  onDateChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      'recordForm.recordDate': event.detail.value,
    })
  },

  // 确认添加记录
  async onConfirmRecord() {
    const { recordForm, recordType } = this.data
    const amount = parseFloat(recordForm.amount)
    
    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入正确金额',
        icon: 'none',
      })
      return
    }
    
    if (!recordForm.category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none',
      })
      return
    }
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      await addFinancialRecord({
        type: recordType,
        category: recordForm.category,
        amount,
        source: recordForm.source || undefined,
        note: recordForm.note || undefined,
        recordDate: recordForm.recordDate,
      })
      
      wx.hideLoading()
      this.setData({ showRecordModal: false })
      wx.showToast({
        title: '添加成功',
        icon: 'success',
      })
      
      // 重新加载所有数据
      await this.loadData()
      
      // 如果是支出，确保预算数据也更新（loadData已经加载了预算，但为了确保数据同步，再次加载）
      if (recordType === 'expense') {
        // 等待一小段时间确保数据库已更新
        await new Promise(resolve => setTimeout(resolve, 100))
        await this.loadBudgets()
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none',
      })
    }
  },

  // 删除记录
  async onDeleteRecord(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteFinancialRecord(id)
            wx.showToast({
              title: '删除成功',
              icon: 'success',
            })
            await this.loadData()
            
            // 重新加载预算以更新状态
            if (this.data.currentTab === 'budget') {
              await this.loadBudgets()
            }
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  // 查看全部记录
  onViewAllRecords() {
    wx.navigateTo({
      url: '/pages/saving/records',
    })
  },

  // 加载预算
  async loadBudgets() {
    try {
      const budgets = await loadBudgets()
      
      // 格式化金额的辅助函数
      const formatAmount = (amount: number | string | undefined | null): string => {
        if (amount === undefined || amount === null || amount === '') {
          return '0.00'
        }
        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(num)) {
          return '0.00'
        }
        return num.toFixed(2)
      }
      
      const formattedBudgets = (budgets || []).map(b => {
        const spent = typeof b.currentMonthSpent === 'number' ? b.currentMonthSpent : parseFloat(String(b.currentMonthSpent || 0))
        const limit = typeof b.monthlyLimit === 'number' ? b.monthlyLimit : parseFloat(String(b.monthlyLimit || 0))
        const percentage = limit > 0 ? (spent / limit) * 100 : 0
        
        // 计算预算状态颜色
        let statusColor = 'normal' // 正常（绿色）
        let statusText = '正常'
        
        if (percentage >= 100) {
          statusColor = 'exceeded' // 超预算（红色）
          statusText = '超预算'
        } else if (percentage >= 90) {
          statusColor = 'warning' // 接近预算（橙色）
          statusText = '接近预算'
        } else if (percentage >= 50) {
          statusColor = 'caution' // 超一半（黄色）
          statusText = '超一半'
        }
        
          // 格式化月份显示
          let monthLabel = ''
          if (b.month) {
            const [year, month] = b.month.split('-')
            if (year && month) {
              monthLabel = `${year}年${parseInt(month)}月`
            }
          }
          
          return {
            ...b,
            month: b.month || '',
            monthLabel,
            currentMonthSpent: spent,
            monthlyLimit: limit,
            currentMonthSpentText: formatAmount(spent),
            monthlyLimitText: formatAmount(limit),
            statusColor,
            statusText,
            percentage,
          }
        })
      
      // 计算预算标签的颜色（取最严重的状态）
      const budgetStatus = this.calculateBudgetStatus(budgets || [])
      
      this.setData({
        budgets: formattedBudgets,
        budgetStatusColor: budgetStatus,
      })
      
      // 调试日志
      console.log('loadBudgets result:', {
        budgets: formattedBudgets,
        budgetStatus,
        budgetsCount: formattedBudgets.length,
      })
      
      // 如果预算数据为空，输出警告
      if (formattedBudgets.length === 0) {
        console.warn('loadBudgets: 没有找到预算数据')
      } else {
        formattedBudgets.forEach(b => {
          console.log(`预算 [${b.category}]: 已支出 ${b.currentMonthSpentText} / 预算 ${b.monthlyLimitText}`)
        })
      }
    } catch (error) {
      console.error('loadBudgets error', error)
    }
  },

  // 设置预算（修改已有预算）
  onSetBudget(event: WechatMiniprogram.TouchEvent) {
    const category = event.currentTarget.dataset.category !== undefined 
      ? String(event.currentTarget.dataset.category) 
      : ''
    const month = event.currentTarget.dataset.month || ''
    
    // category 可以为空字符串（总预算），但 month 必须存在
    if (!month) {
      console.warn('onSetBudget: 缺少必要参数 month', { category, month })
      return
    }
    
    // 查找当前预算的金额
    const currentBudget = this.data.budgets.find(b => b.category === category && b.month === month)
    const currentLimit = currentBudget ? currentBudget.monthlyLimit : 0
    
    this.showBudgetAmountInput(category, month, currentLimit)
  },

  // 添加预算（新建预算）
  onAddBudget(event?: WechatMiniprogram.TouchEvent) {
    console.log('onAddBudget called')
    // 先选择月份
    this.selectMonthForBudget()
  },

  // 选择月份（使用picker组件）
  selectMonthForBudget() {
    console.log('selectMonthForBudget called')
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // 生成未来12个月的选项
    const monthOptions: string[] = []
    const monthLabels: string[] = []
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, currentMonth + i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`
      const monthLabel = `${year}年${month}月`
      
      monthOptions.push(monthKey)
      monthLabels.push(monthLabel)
    }
    
    console.log('准备显示月份选择器', { monthLabels })
    
    // 使用picker组件而不是showActionSheet（因为showActionSheet最多只支持6项）
    this.setData({
      showMonthPicker: true,
      monthPickerRange: monthOptions,
      monthPickerLabels: monthLabels,
      selectedMonthIndex: 0,
    })
  },

  // 选择月份项
  onSelectMonthItem(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({
      selectedMonthIndex: index,
    })
  },

  // 确认选择月份
  onConfirmMonthPicker() {
    const index = this.data.selectedMonthIndex
    const selectedMonth = this.data.monthPickerRange[index]
    
    console.log('用户选择了月份', index, selectedMonth)
    
    this.setData({
      showMonthPicker: false,
    })
    
    // 选择分类
    this.selectCategoryForBudget(selectedMonth)
  },

  // 取消选择月份
  onCancelMonthPicker() {
    this.setData({
      showMonthPicker: false,
    })
  },

  // 选择分类（使用自定义弹窗）
  selectCategoryForBudget(month: string) {
    console.log('selectCategoryForBudget called', { month })
    
    // 使用自定义弹窗选择分类
    this.setData({
      showCategoryPicker: true,
      categoryPickerList: EXPENSE_CATEGORIES,
      selectedCategoryIndex: 0,
      pendingMonthForCategory: month,
    })
  },

  // 选择分类项
  onSelectCategoryItem(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({
      selectedCategoryIndex: index,
    })
  },

  // 确认选择分类
  onConfirmCategoryPicker() {
    const index = this.data.selectedCategoryIndex
    const selectedCategory = this.data.categoryPickerList[index]
    const month = this.data.pendingMonthForCategory
    
    console.log('用户选择了分类', selectedCategory.id, '月份', month)
    
    // 检查该月份该分类是否已有预算
    const existingBudget = this.data.budgets.find(
      b => b.category === selectedCategory.id && b.month === month
    )
    if (existingBudget) {
      wx.showToast({
        title: '该月份该分类已有预算',
        icon: 'none',
      })
      this.setData({
        showCategoryPicker: false,
      })
      return
    }
    
    this.setData({
      showCategoryPicker: false,
    })
    
    // 显示预算金额输入框
    this.showBudgetAmountInput(selectedCategory.id, month, 0)
  },

  // 取消选择分类
  onCancelCategoryPicker() {
    this.setData({
      showCategoryPicker: false,
      pendingMonthForCategory: '',
    })
  },

  // 显示预算金额输入框
  showBudgetAmountInput(category: string, month: string, currentLimit: number = 0) {
    const title = currentLimit > 0 ? '修改预算' : '设置预算'
    const placeholder = currentLimit > 0 ? `当前预算：¥${currentLimit.toFixed(2)}` : '请输入月度预算金额'
    
    wx.showModal({
      title,
      editable: true,
      placeholderText: placeholder,
      success: async (res) => {
        if (res.confirm && res.content) {
          const limit = parseFloat(res.content)
          if (limit > 0) {
            try {
              wx.showLoading({ title: '设置中...' })
              await upsertBudget({ category, month, monthlyLimit: limit })
              wx.hideLoading()
              wx.showToast({
                title: '设置成功',
                icon: 'success',
              })
              // 重新加载所有数据，确保预算数据更新
              await this.loadData()
              await this.loadBudgets()
            } catch (error) {
              wx.hideLoading()
              wx.showToast({
                title: '设置失败，请重试',
                icon: 'none',
              })
            }
          } else {
            wx.showToast({
              title: '请输入有效金额',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  // 获取分类名称
  getCategoryName(categoryId: string, type: 'income' | 'expense'): string {
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const category = categories.find(c => c.id === categoryId)
    return category?.name || categoryId
  },

  // 格式化金额
  formatAmount(amount: number | string | undefined | null): string {
    if (amount === undefined || amount === null || amount === '') {
      return '0.00'
    }
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) {
      return '0.00'
    }
    return num.toFixed(2)
  },

  // 格式化日期时间（显示月日 时:分，类似截图格式：12月7日 00:57）
  formatDateTime(dateStr: string, createdAt?: string): string {
    try {
      // 优先使用创建时间（包含完整的时间信息）
      if (createdAt && createdAt.trim()) {
        try {
          // 处理各种日期格式
          let dateTime: Date
          if (createdAt.includes('T')) {
            dateTime = new Date(createdAt)
          } else if (createdAt.includes(' ')) {
            dateTime = new Date(createdAt.replace(' ', 'T'))
          } else {
            dateTime = new Date(createdAt)
          }
          
          if (!isNaN(dateTime.getTime())) {
            const month = (dateTime.getMonth() + 1).toString()
            const day = dateTime.getDate().toString()
            const hours = dateTime.getHours().toString().padStart(2, '0')
            const minutes = dateTime.getMinutes().toString().padStart(2, '0')
            return `${month}月${day}日 ${hours}:${minutes}`
          }
        } catch (e) {
          console.warn('formatDateTime: failed to parse createdAt', createdAt, e)
        }
      }
      
      // 如果没有创建时间，使用记录日期（默认显示00:00）
      if (dateStr && dateStr.trim()) {
        try {
          // 处理日期格式，确保能正确解析
          let dateStrFormatted = dateStr
          if (!dateStrFormatted.includes('T') && !dateStrFormatted.includes(' ')) {
            dateStrFormatted = dateStrFormatted + 'T00:00:00'
          }
          
          const dateTime = new Date(dateStrFormatted)
          if (!isNaN(dateTime.getTime())) {
            const month = (dateTime.getMonth() + 1).toString()
            const day = dateTime.getDate().toString()
            return `${month}月${day}日 00:00`
          }
        } catch (e) {
          console.warn('formatDateTime: failed to parse dateStr', dateStr, e)
        }
      }
      
      // 如果都没有，返回空字符串（不显示）
      return ''
    } catch (error) {
      console.error('formatDateTime error', error, { dateStr, createdAt })
      return ''
    }
  },

  // 计算预算状态（用于标签颜色）
  calculateBudgetStatus(budgets: Array<{ currentMonthSpent: number; monthlyLimit: number }>): string {
    if (!budgets || budgets.length === 0) {
      return 'normal'
    }
    
    // 找到最严重的状态
    let maxStatus = 'normal'
    
    budgets.forEach(b => {
      const spent = typeof b.currentMonthSpent === 'number' ? b.currentMonthSpent : parseFloat(String(b.currentMonthSpent || 0))
      const limit = typeof b.monthlyLimit === 'number' ? b.monthlyLimit : parseFloat(String(b.monthlyLimit || 0))
      const percentage = limit > 0 ? (spent / limit) * 100 : 0
      
      if (percentage >= 100 && maxStatus !== 'exceeded') {
        maxStatus = 'exceeded'
      } else if (percentage >= 90 && maxStatus === 'normal') {
        maxStatus = 'warning'
      } else if (percentage >= 50 && maxStatus === 'normal') {
        maxStatus = 'caution'
      }
    })
    
    return maxStatus
  },

  noop() {
    // 空函数，阻止事件冒泡
  },
})

