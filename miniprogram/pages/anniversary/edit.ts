import { upsertAnniversary, findAnniversaryById, deleteAnniversary } from '../../utils/features/anniversary'

interface AnniversaryEditData {
  id?: string
  title: string
  targetDate: string
  pinned: boolean
  repeatIndex: number
  repeatOptions: string[]
  pageTitle: string
}

const REPEAT_MAP: Array<AnniversaryMeta['repeat']> = ['none', 'year', 'month', 'day']

Page<AnniversaryEditData, WechatMiniprogram.Page.CustomOption>({
  data: {
    id: '',
    title: '',
    targetDate: '',
    pinned: false,
    repeatIndex: 0,
    repeatOptions: ['不重复', '按年重复', '按月重复', '按日重复'],
    pageTitle: '编辑纪念日',
  },

  async onLoad(query: Record<string, string | undefined>) {
    const id = query.id
    if (id) {
      try {
        const item = await findAnniversaryById(id)
        if (item) {
          this.setData({
            id: item.id,
            title: item.title,
            targetDate: item.target,
            pinned: !!item.pinned,
            repeatIndex: REPEAT_MAP.indexOf((item.repeat !== undefined && item.repeat !== null) ? item.repeat : 'none'),
            pageTitle: '编辑纪念日',
          })
        }
      } catch (error) {
        console.error('onLoad findAnniversaryById error', error)
      }
    } else {
      const today = this.formatDate(new Date())
      this.setData({
        targetDate: today,
        pageTitle: '添加纪念日',
      })
    }
  },

  onTitleInput(e: WechatMiniprogram.Input) {
    this.setData({
      title: e.detail.value,
    })
  },

  onDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({
      targetDate: e.detail.value,
    })
  },

  onPinnedChange(e: WechatMiniprogram.SwitchChange) {
    this.setData({
      pinned: e.detail.value,
    })
  },

  onRepeatChange(e: WechatMiniprogram.PickerChange) {
    const index = Number(e.detail.value || 0)
    this.setData({
      repeatIndex: index,
    })
  },

  async onSubmit() {
    const { id, title, targetDate, pinned, repeatIndex } = this.data
    if (!title.trim()) {
      wx.showToast({
        title: '请填写事件名称',
        icon: 'none',
      })
      return
    }
    if (!targetDate) {
      wx.showToast({
        title: '请选择目标日期',
        icon: 'none',
      })
      return
    }

    const repeat = (REPEAT_MAP[repeatIndex] !== undefined) ? REPEAT_MAP[repeatIndex] : 'none'
    
    // 如果是编辑，保持原有的 from 日期；如果是新建，使用当前日期
    let from: string
    if (id) {
      try {
        const existing = await findAnniversaryById(id)
        from = (existing && existing.from) ? existing.from : this.formatDate(new Date())
      } catch (error) {
        console.error('onSubmit findAnniversaryById error', error)
        from = this.formatDate(new Date())
      }
    } else {
      from = this.formatDate(new Date())
    }

    try {
      await upsertAnniversary({
        id,
        title: title.trim(),
        from,
        target: targetDate,
        pinned: pinned === true, // 明确处理 false 值
        repeat,
      })

      wx.showToast({
        title: '已保存',
        icon: 'success',
        duration: 600,
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (error) {
      console.error('onSubmit upsertAnniversary error', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      })
    }
  },

  onDelete() {
    const { id } = this.data
    if (!id) return

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个纪念日吗？此操作不可恢复。',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteAnniversary(id)
            wx.showToast({
              title: '已删除',
              icon: 'success',
              duration: 600,
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 600)
          } catch (error) {
            console.error('onDelete error', error)
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  formatDate(d: Date) {
    const y = d.getFullYear()
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${day}`
  },
})







