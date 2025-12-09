import {
  Course,
  DaySchedule,
  SchedulePageData,
  WEEKDAY_CONFIG,
  loadWeeklySchedule,
  parseExternalSchedule,
  createEmptyCourseForm,
  assignCourseColor,
  upsertCourseToWeek,
  replaceWeekSchedule,
  deleteCourseFromWeek,
} from '../../utils/features/schedule'

const PICKER_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

Page<SchedulePageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    weekdays: [],
    currentWeekday: 0,
    daySchedule: null,
    showAddMenu: false,
    showImportModal: false,
    showCourseModal: false,
    importText: '',
    importError: '',
    courseForm: createEmptyCourseForm(new Date().getDay()),
    editingCourseId: '',
    weeklySchedule: [],
    weekdayLabels: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    pickerWeekLabels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },

  async onLoad() {
    try {
      const weeklySchedule = await loadWeeklySchedule()
      this.setData({ weeklySchedule })
      this.initWeekdayButtons()
      this.setCurrentWeekday()
    } catch (error) {
      console.error('onLoad error', error)
    }
  },

  async onShow() {
    // 每次显示页面时重新设置当前星期，确保显示当天课程
    try {
      const weeklySchedule = await loadWeeklySchedule()
      this.setData({ weeklySchedule })
      this.setCurrentWeekday()
    } catch (error) {
      console.error('onShow error', error)
    }
  },

  // 初始化星期按钮
  initWeekdayButtons() {
    const now = new Date()
    const today = now.getDay()
    
    const weekdays = PICKER_WEEKDAY_ORDER.map(weekday => {
      const config = WEEKDAY_CONFIG[weekday]
      const date = this.getDateForWeekday(weekday, now)
      return {
        weekday,
        shortName: config.shortName,
        fullName: config.fullName,
        date: date.getDate().toString().padStart(2, '0'),
        isActive: weekday === today // 默认高亮当天
      }
    })
    this.setData({ weekdays })
  },

  // 获取指定星期几的日期
  getDateForWeekday(weekday: number, referenceDate: Date): Date {
    const currentDay = referenceDate.getDay()
    const diff = weekday - currentDay
    const targetDate = new Date(referenceDate)
    targetDate.setDate(referenceDate.getDate() + diff)
    return targetDate
  },

  // 设置当前星期
  setCurrentWeekday() {
    const today = new Date().getDay()
    // 更新当前选中的星期几并加载对应的课程
    this.setData({ currentWeekday: today })
    this.loadDaySchedule(today)
  },

  // 更新星期按钮状态
  updateWeekdayButtons(activeWeekday: number) {
    const weekdays = this.data.weekdays.map(day => ({
      ...day,
      isActive: day.weekday === activeWeekday
    }))
    this.setData({ weekdays })
  },

  // 加载指定日期的课程
  loadDaySchedule(weekday: number) {
    const daySchedule = this.data.weeklySchedule.find(schedule => schedule.weekday === weekday) || null
    // 更新星期按钮的激活状态
    this.updateWeekdayButtons(weekday)
    this.setData({ 
      daySchedule,
      currentWeekday: weekday
    })
  },

  // 切换星期
  onWeekdayTap(event: WechatMiniprogram.TouchEvent) {
    const weekday = event.currentTarget.dataset.weekday
    this.loadDaySchedule(weekday)
  },

  // 显示添加菜单
  onAddTap() {
    this.setData({ showAddMenu: true })
  },

  // 隐藏添加菜单
  hideAddMenu() {
    this.setData({ showAddMenu: false })
  },

  // 导入课表
  onImportSchedule() {
    this.setData({
      showImportModal: true,
      importText: '',
      importError: '',
      showAddMenu: false,
    })
  },

  // 添加课程
  onAddCourse() {
    this.setData({
      showCourseModal: true,
      courseForm: createEmptyCourseForm(this.data.currentWeekday),
      editingCourseId: '',
      showAddMenu: false,
    })
  },

  // 选择其他APP导入示例
  onUseImportSample() {
    const sample = JSON.stringify([
      {
        weekday: 1,
        name: '心理学导论',
        location: '南区302',
        teacher: '苏老师',
        startLesson: 1,
        endLesson: 2,
        startTime: '08:00',
        endTime: '09:40',
      },
      {
        weekday: 3,
        name: '数据结构',
        location: '信息楼508',
        teacher: '林教授',
        startLesson: 3,
        endLesson: 4,
        startTime: '10:00',
        endTime: '11:40',
      }
    ], null, 2)
    this.setData({
      importText: sample,
      importError: '',
    })
  },

  onImportTextInput(event: WechatMiniprogram.TextareaInput) {
    const value = (event.detail.value !== undefined && event.detail.value !== null) ? event.detail.value : ''
    this.setData({
      importText: value,
      importError: '',
    })
  },

  async onConfirmImport() {
    const text = this.data.importText.trim()
    if (!text) {
      this.setData({ importError: '请粘贴从其他APP导出的课程JSON数据' })
      return
    }
    const parsed = parseExternalSchedule(text)
    if (!parsed) {
      this.setData({ importError: '解析失败，请确认数据格式是否正确' })
      return
    }
    try {
      const nextWeek = await replaceWeekSchedule(parsed)
      this.setData({
        weeklySchedule: nextWeek,
        showImportModal: false,
        importText: '',
        importError: '',
      })
      this.loadDaySchedule(this.data.currentWeekday)
      wx.showToast({
        title: '已导入课表',
        icon: 'success',
      })
    } catch (error) {
      console.error('onConfirmImport error', error)
      this.setData({ importError: '导入失败，请重试' })
      wx.showToast({
        title: '导入失败，请重试',
        icon: 'none',
      })
    }
  },

  onCancelImport() {
    this.setData({
      showImportModal: false,
      importText: '',
      importError: '',
    })
  },

  onCourseCardTap(event: WechatMiniprogram.TouchEvent) {
    const courseId = event.currentTarget.dataset.id as string
    const weekday = Number(event.currentTarget.dataset.weekday)
    const daySchedule = this.data.weeklySchedule.find((day) => day.weekday === weekday)
    if (!daySchedule) return
    const target = daySchedule.courses.find((course) => course.id === courseId)
    if (!target) return
    this.setData({
      showCourseModal: true,
      editingCourseId: courseId,
      courseForm: {
        weekday,
        name: target.name,
        location: target.location,
        teacher: target.teacher,
        startLesson: target.startLesson,
        endLesson: target.endLesson,
        startTime: target.startTime,
        endTime: target.endTime,
      },
    })
  },

  onCourseFormInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field
    const value = event.detail.value
    this.setData({
      courseForm: {
        ...this.data.courseForm,
        [field]: value,
      },
    })
  },

  onCourseFormNumberInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field
    const value = parseInt(event.detail.value, 10) || 1
    this.setData({
      courseForm: {
        ...this.data.courseForm,
        [field]: value,
      },
    })
  },

  onCourseWeekdayChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value) || 0
    const weekday = PICKER_WEEKDAY_ORDER[index] || 1
    this.setData({
      courseForm: {
        ...this.data.courseForm,
        weekday,
      },
    })
  },

  onCourseModalCancel() {
    this.setData({
      showCourseModal: false,
      editingCourseId: '',
      courseForm: createEmptyCourseForm(this.data.currentWeekday),
    })
  },

  async onCourseModalSubmit() {
    const form = this.data.courseForm
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入课程名称', icon: 'none' })
      return
    }
    const newCourse: Course = {
      id: this.data.editingCourseId || `course-${Date.now()}`,
      name: form.name.trim(),
      location: form.location.trim() || '未填写',
      teacher: form.teacher.trim() || '未填写',
      startLesson: Math.min(form.startLesson, form.endLesson),
      endLesson: Math.max(form.startLesson, form.endLesson),
      startTime: form.startTime,
      endTime: form.endTime,
      color: this.getCourseColor(this.data.editingCourseId),
    }
    try {
      const week = await this.ensureWeekData(this.data.weeklySchedule)
      const nextWeek = await upsertCourseToWeek(
        week,
        form.weekday,
        newCourse,
      )
      this.setData({
        weeklySchedule: nextWeek,
        showCourseModal: false,
        editingCourseId: '',
        courseForm: createEmptyCourseForm(this.data.currentWeekday),
      })
      this.loadDaySchedule(this.data.currentWeekday)
      wx.showToast({
        title: this.data.editingCourseId ? '已更新课程' : '已添加课程',
        icon: 'success',
      })
    } catch (error) {
      console.error('onSaveCourse error', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      })
    }
  },

  // 删除课程
  async onCourseDelete() {
    const courseId = this.data.editingCourseId
    if (!courseId) {
      return
    }
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这门课程吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const week = await this.ensureWeekData(this.data.weeklySchedule)
          const nextWeek = await deleteCourseFromWeek(week, this.data.currentWeekday, courseId)
          this.setData({
            weeklySchedule: nextWeek,
            showCourseModal: false,
            editingCourseId: '',
            courseForm: createEmptyCourseForm(this.data.currentWeekday),
          })
          this.loadDaySchedule(this.data.currentWeekday)
          wx.showToast({
            title: '已删除',
            icon: 'success',
          })
        } catch (error) {
          console.error('onCourseDelete error', error)
          wx.showToast({
            title: '删除失败，请重试',
            icon: 'none',
          })
        }
      },
    })
  },

  getCourseColor(courseId: string) {
    if (courseId) {
      const day = this.data.weeklySchedule.find((d) =>
        d.courses.some((course) => course.id === courseId),
      )
      if (day) {
        const course = day.courses.find((item) => item.id === courseId)
        if (course) return course.color
      }
    }
    const totalCourses = this.data.weeklySchedule.reduce((sum, day) => sum + day.courses.length, 0)
    return assignCourseColor(totalCourses)
  },

  async ensureWeekData(week: DaySchedule[]) {
    if (!week || !week.length) {
      return loadWeeklySchedule()
    }
    return week
  },

  // 防止冒泡
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },
})