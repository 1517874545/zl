import { loadAnniversaries } from '../../utils/features/anniversary'

const DAY = 24 * 60 * 60 * 1000

interface AnniversaryCard extends AnniversaryMeta {
  daysLeft: number
}

interface AnniversaryListData {
  list: AnniversaryCard[]
}

Page<AnniversaryListData, WechatMiniprogram.Page.CustomOption>({
  data: {
    list: [],
  },

  onShow() {
    this.refreshList()
  },

  onPullDownRefresh() {
    this.refreshList(() => {
      wx.stopPullDownRefresh()
    })
  },

  async refreshList(done?: () => void) {
    const app = getApp<IAppOption>()
    const now = new Date()
    try {
      const rawList = await loadAnniversaries(app.globalData.anniversaries || [])
      const list: AnniversaryCard[] = rawList.map((item) => {
        const targetDate = this.computeNextTargetDate(item, now)
        const daysLeft = Math.max(
          0,
          Math.round(
            (targetDate.getTime() - now.getTime()) / DAY,
          ),
        )
        return {
          ...item,
          daysLeft,
        }
      })

      this.setData({ list })
    } catch (error) {
      console.warn('refreshList error', error)
      const fallback = app.globalData.anniversaries || []
      const list: AnniversaryCard[] = fallback.map((item) => {
        const targetDate = this.computeNextTargetDate(item, now)
        const daysLeft = Math.max(
          0,
          Math.round(
            (targetDate.getTime() - now.getTime()) / DAY,
          ),
        )
        return {
          ...item,
          daysLeft,
        }
      })
      this.setData({ list })
    } finally {
      if (done) {
        done()
      }
    }
  },

  computeNextTargetDate(item: AnniversaryMeta, base: Date): Date {
    const target = new Date(item.target.replace(/-/g, '/'))
    const repeat = (item.repeat !== undefined && item.repeat !== null) ? item.repeat : 'none'

    if (repeat === 'none') {
      return target
    }

    const next = new Date(target.getTime())

    if (repeat === 'year') {
      while (next.getTime() < base.getTime()) {
        next.setFullYear(next.getFullYear() + 1)
      }
    } else if (repeat === 'month') {
      while (next.getTime() < base.getTime()) {
        next.setMonth(next.getMonth() + 1)
      }
    } else if (repeat === 'day') {
      while (next.getTime() < base.getTime()) {
        next.setDate(next.getDate() + 1)
      }
    }

    return next
  },

  onAddTap() {
    wx.navigateTo({
      url: '/pages/anniversary/edit',
    })
  },

  onCardTap(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id as string
    wx.navigateTo({
      url: `/pages/anniversary/edit?id=${id}`,
    })
  },
})







