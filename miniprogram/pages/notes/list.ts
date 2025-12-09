import {
  loadNotes,
  deriveNoteTitle,
  formatNoteTime,
  updateNotePinned,
  removeNote,
  loadNoteCategories,
  addNoteCategory,
  type NoteCategory,
} from '../../utils/features/notes'

interface NoteCard {
  id: string
  title: string
  createdAtText: string
  content: string
  tag?: string
  tags?: string[]
  cover?: string
}

interface NotesListData {
  notes: NoteEntry[]
  cards: NoteCard[]
  searchKeyword: string
  selectedCategory: string
  categories: NoteCategory[]
  actionSheet: {
    visible: boolean
    noteId: string
    preview: string
    pinned: boolean
  }
  showCreateModal: boolean
  newNoteName: string
  selectedTags: string[]
  selectedCover: string
  selectedTemplate: string
  coverTab: 'cover' | 'template'
  scrollIntoView: string
}

Page<NotesListData, WechatMiniprogram.Page.CustomOption>({
  data: {
    notes: [],
    cards: [],
    searchKeyword: '',
    selectedCategory: '',
    categories: [],
    actionSheet: {
      visible: false,
      noteId: '',
      preview: '',
      pinned: false,
    },
    showCreateModal: false,
    newNoteName: '',
    selectedTags: [],
    selectedCover: 'summer',
    selectedTemplate: 'blank',
    coverTab: 'cover',
    scrollIntoView: '',
  },

  onShow() {
    this.loadCategories()
    this.refreshNotes()
  },

  async loadCategories() {
    try {
      const categories = await loadNoteCategories()
      this.setData({ categories })
    } catch (error) {
      console.error('loadCategories error', error)
    }
  },

  onPullDownRefresh() {
    this.refreshNotes(() => {
      wx.stopPullDownRefresh()
    })
  },

  async refreshNotes(done?: () => void) {
    try {
      const notes = await loadNotes()
      this.applyNotes(notes, this.data.searchKeyword)
    } catch (error) {
      console.error('refreshNotes error', error)
      // 如果加载失败，使用全局数据作为后备
      const app = getApp<IAppOption>()
      this.applyNotes(app.globalData.notes || [], this.data.searchKeyword)
    }
    if (done) {
      done()
    }
  },

  applyNotes(notes: NoteEntry[], keyword: string) {
    const cards = this.buildCards(notes, keyword)
    this.setData({
      notes,
      cards,
    })
  },

  buildCards(list: NoteEntry[], keyword: string, selectedCategory?: string): NoteCard[] {
    const lower = keyword.trim().toLowerCase()
    // 确保 selectedCategory 是字符串类型
    const category = selectedCategory !== undefined 
      ? String(selectedCategory || '') 
      : String(this.data.selectedCategory || '')
    
    console.log('[buildCards] category filter:', category, 'notes count:', list.length)
    
    return list
      .filter((item) => {
        // 1. 分类筛选逻辑
        if (category !== '') {
          // 如果选中了具体分类（不是"全部"），只显示匹配的笔记
          const itemCategoryId = String(item.category_id || '')
          const categoryStr = String(category)
          
          console.log('[buildCards] comparing itemCategoryId:', itemCategoryId, 'with category:', categoryStr, 'match:', itemCategoryId === categoryStr)
          
          if (itemCategoryId !== categoryStr) {
            return false // 不匹配的笔记将被过滤掉
          }
        }
        // 如果 category 是空字符串（"全部"），则此处不进行分类过滤，显示所有笔记
        
        // 2. 关键词搜索筛选（在分类筛选通过后进行）
        if (lower) {
          // 如果有搜索关键词，只显示包含关键词的笔记
          return item.content.toLowerCase().includes(lower)
        }
        
        return true // 如果分类筛选通过且没有关键词，则保留该笔记
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((item) => {
        // 获取分类名称作为标签
        const itemCategoryId = String(item.category_id || '')
        const noteCategory = this.data.categories.find(c => String(c.id) === itemCategoryId)
        const tags = item.tags || []
        return {
          id: item.id,
          title: deriveNoteTitle(item.content),
          createdAtText: formatNoteTime(item.createdAt),
          content: item.content,
          tag: noteCategory?.name,
          tags: tags,
          cover: (item as any).cover || 'summer',
        }
      })
  },

  onSearchInput(event: WechatMiniprogram.Input) {
    const keyword = event.detail.value || ''
    this.setData({
      searchKeyword: keyword,
      cards: this.buildCards(this.data.notes, keyword),
    })
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      cards: this.buildCards(this.data.notes, ''),
    })
  },

  onCategoryChange(event: WechatMiniprogram.TouchEvent) {
    // 确保 categoryId 始终是字符串，将 null/undefined 转换为空字符串
    const rawCategory = event.currentTarget.dataset.category
    const categoryId = rawCategory === null || rawCategory === undefined ? '' : String(rawCategory)
    
    console.log('[onCategoryChange] rawCategory:', rawCategory, 'categoryId:', categoryId)
    console.log('[onCategoryChange] notes count:', this.data.notes.length)
    
    // 直接传入新的 categoryId，避免依赖可能尚未更新的 this.data.selectedCategory
    const cards = this.buildCards(this.data.notes, this.data.searchKeyword, categoryId)
    
    console.log('[onCategoryChange] filtered cards count:', cards.length)
    
    this.setData({
      selectedCategory: categoryId,
      cards: cards,
    })
  },

  onCardTap(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id as string
    wx.navigateTo({
      url: `/pages/notes/edit?id=${id}`,
    })
  },

  onCardLongPress(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id as string
    const note = this.data.notes.find((item) => item.id === id)
    if (!note) return
    const preview = note.content || '暂无内容'
    this.setData({
      actionSheet: {
        visible: true,
        noteId: id,
        preview: preview.length > 120 ? `${preview.slice(0, 120)}...` : preview,
        pinned: !!note.pinned,
      },
    })
  },

  onAddTap() {
    this.setData({
      showCreateModal: true,
      newNoteName: '',
      selectedTags: [],
      selectedCover: 'summer',
      selectedTemplate: 'blank',
      coverTab: 'cover',
    })
  },

  onCloseCreateModal() {
    this.setData({
      showCreateModal: false,
      newNoteName: '',
      selectedTags: [],
    })
  },

  onNoteNameInput(event: WechatMiniprogram.Input) {
    this.setData({
      newNoteName: event.detail.value || '',
    })
  },

  onInputFocus() {
    // 输入框聚焦时，滚动到输入框位置
    setTimeout(() => {
      this.setData({
        scrollIntoView: 'name-input',
      })
      // 延迟一下确保滚动生效后再清除
      setTimeout(() => {
        this.setData({
          scrollIntoView: '',
        })
      }, 500)
    }, 100)
  },

  onInputBlur() {
    // 输入框失焦时，清除滚动目标
    this.setData({
      scrollIntoView: '',
    })
  },

  onShowTagSelector() {
    // 显示标签输入弹窗
    wx.showModal({
      title: '添加标签',
      editable: true,
      placeholderText: '输入标签名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const tag = res.content.trim()
          if (tag && !this.data.selectedTags.includes(tag)) {
            if (this.data.selectedTags.length >= 5) {
              wx.showToast({
                title: '最多添加5个标签',
                icon: 'none',
              })
              return
            }
            this.setData({
              selectedTags: [...this.data.selectedTags, tag],
            })
          } else if (this.data.selectedTags.includes(tag)) {
            wx.showToast({
              title: '标签已存在',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  onRemoveTag(event: WechatMiniprogram.TouchEvent) {
    const tag = event.currentTarget.dataset.tag as string
    const tags = this.data.selectedTags.filter(t => t !== tag)
    this.setData({
      selectedTags: tags,
    })
  },

  onSelectCover(event: WechatMiniprogram.TouchEvent) {
    const cover = event.currentTarget.dataset.cover as string
    this.setData({
      selectedCover: cover,
    })
  },

  onSelectTemplate(event: WechatMiniprogram.TouchEvent) {
    const template = event.currentTarget.dataset.template as string
    this.setData({
      selectedTemplate: template,
    })
  },

  onSwitchTab(event: WechatMiniprogram.TouchEvent) {
    const tab = event.currentTarget.dataset.tab as 'cover' | 'template'
    this.setData({
      coverTab: tab,
    })
  },

  onCreateNote() {
    const name = this.data.newNoteName.trim() || '未命名记事本'
    // 创建笔记并跳转到编辑页面
    const tagsParam = this.data.selectedTags.length > 0 
      ? `&tags=${encodeURIComponent(JSON.stringify(this.data.selectedTags))}` 
      : ''
    wx.navigateTo({
      url: `/pages/notes/edit?name=${encodeURIComponent(name)}&cover=${this.data.selectedCover}&template=${this.data.selectedTemplate}${tagsParam}`,
    })
    this.onCloseCreateModal()
  },

  async onAddCategory() {
    wx.showModal({
      title: '添加分类',
      editable: true,
      placeholderText: '输入分类名称',
      success: async (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim()
          if (name) {
            try {
              await addNoteCategory({ name })
              // 重新加载分类列表
              this.loadCategories()
              wx.showToast({
                title: '添加成功',
                icon: 'success',
              })
            } catch (error) {
              console.error('addCategory error', error)
              wx.showToast({
                title: '添加失败',
                icon: 'none',
              })
            }
          }
        }
      },
    })
  },

  onActionMaskTap() {
    this.closeActionSheet()
  },

  closeActionSheet() {
    this.setData({
      actionSheet: {
        visible: false,
        noteId: '',
        preview: '',
        pinned: false,
      },
    })
  },

  async onActionPin(event: WechatMiniprogram.TouchEvent) {
    const { noteId, pinned } = this.data.actionSheet
    if (!noteId) return
    try {
      const nextList = await updateNotePinned(noteId, !pinned)
      this.applyNotes(nextList, this.data.searchKeyword)
      this.closeActionSheet()
      wx.showToast({
        title: !pinned ? '已置顶' : '已取消置顶',
        icon: 'success',
        duration: 600,
      })
    } catch (error) {
      console.error('onActionPin error', error)
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
      })
    }
  },

  onActionDelete() {
    const { noteId } = this.data.actionSheet
    if (!noteId) return
    wx.showModal({
      title: '删除笔记',
      content: '确定删除该笔记吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const next = await removeNote(noteId)
          this.applyNotes(next, this.data.searchKeyword)
          this.closeActionSheet()
          wx.showToast({
            title: '已删除',
            icon: 'success',
          })
        } catch (error) {
          console.error('onActionDelete error', error)
          wx.showToast({
            title: '删除失败，请重试',
            icon: 'none',
          })
        }
      },
    })
  },

  noop() {},
})


