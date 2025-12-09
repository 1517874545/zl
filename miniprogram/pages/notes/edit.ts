import {
  getNoteById,
  upsertNote,
  deriveNoteTitle,
  loadNoteCategories,
  removeNote,
  addNoteCategory,
  type NoteCategory,
} from '../../utils/features/notes'

interface NoteEditData {
  id: string
  content: string
  attachments: string[]
  hasDirty: boolean
  navTitle: string
  categoryId: string
  categoryName: string // 直接存储分类名称，避免方法调用问题
  tags: string[]
  showCategoryPicker: boolean
  showTagInput: boolean
  tagInputValue: string
  categories: NoteCategory[]
  templateType: string
  cover?: string
}

Page<NoteEditData, WechatMiniprogram.Page.CustomOption>({
  data: {
    id: '',
    content: '',
    attachments: [],
    hasDirty: false,
    navTitle: '新建笔记',
    categoryId: '',
    categoryName: '', // 分类名称
    tags: [],
    showCategoryPicker: false,
    showTagInput: false,
    tagInputValue: '',
    categories: [],
    templateType: 'blank',
    cover: 'summer',
    _backHandled: false, // 标记返回是否已处理
  },

  async onLoad(query: Record<string, string | undefined>) {
    // 加载分类列表
    let categories: NoteCategory[] = []
    try {
      categories = await loadNoteCategories()
      this.setData({ categories })
    } catch (error) {
      console.error('loadNoteCategories error', error)
    }

    const { id, name, cover, template } = query
    if (id) {
      try {
        const note = await getNoteById(id)
        if (note) {
          const categoryId = (note as any).category_id || note.category_id || ''
          const category = categories.find(c => c.id === categoryId)
          this.setData({
            id: note.id,
            content: note.content,
            attachments: note.attachments || [],
            navTitle: deriveNoteTitle(note.content),
            categoryId: categoryId,
            categoryName: category?.name || '',
            tags: (note as any).tags || note.tags || [],
            templateType: (note as any).template_type || note.template_type || 'blank',
            cover: (note as any).cover || 'summer',
          })
          return
        }
      } catch (error) {
        console.error('onLoad getNoteById error', error)
      }
    }
    
    // 新建笔记，如果有传入名称，只设置标题，不设置内容
    if (name) {
      const decodedName = decodeURIComponent(name)
      this.setData({
        navTitle: decodedName,
        // 不设置content，让用户自己输入内容
      })
    } else {
      this.setData({
        navTitle: '新建笔记',
      })
    }
    
    // 处理标签、模板和封面参数
    const tagsParam = query.tags
    if (tagsParam) {
      try {
        const tags = JSON.parse(decodeURIComponent(tagsParam))
        this.setData({ tags })
      } catch (e) {
        console.error('parse tags error', e)
      }
    }
    
    const templateParam = query.template
    if (templateParam) {
      this.setData({ templateType: templateParam })
    }
    
    const coverParam = query.cover
    if (coverParam) {
      this.setData({ cover: coverParam })
    }
    
    // 如果是从数据库加载的笔记，尝试获取封面信息
    if (id) {
      try {
        const note = await getNoteById(id)
        if (note && (note as any).cover) {
          this.setData({ cover: (note as any).cover })
        }
      } catch (error) {
        console.error('load cover error', error)
      }
    }
  },

  onUnload() {
    // 不再自动保存，由用户点击保存按钮或返回时提示保存
  },

  onBackPress() {
    // 处理返回按钮（Android）
    if (this.data.hasDirty) {
      wx.showModal({
        title: '提示',
        content: '内容已修改，是否保存？',
        success: (res) => {
          if (res.confirm) {
            this.saveIfNeeded(true).then(() => {
              wx.navigateBack()
            })
          } else {
            wx.navigateBack()
          }
        },
      })
      return true // 阻止默认返回
    }
    return false // 允许返回
  },

  onBackTap(event?: any) {
    // 返回按钮点击事件
    // 阻止导航栏组件的默认返回行为
    if (event && event.detail && typeof event.detail.preventDefault === 'function') {
      event.detail.preventDefault()
    }
    
    // 如果已经处理过，不再重复处理（防止重复点击）
    if (this.data._backHandled) {
      return
    }
    
    if (this.data.hasDirty) {
      // 有未保存内容，标记为已处理（阻止导航栏的默认返回）
      this.setData({ _backHandled: true })
      
      // 显示确认对话框
      wx.showModal({
        title: '提示',
        content: '内容已修改，是否保存？',
        showCancel: true,
        cancelText: '不保存',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            // 点击确定，保存后返回
            this.saveIfNeeded(true).then(() => {
              wx.navigateBack()
            }).catch(() => {
              // 保存失败，重置标志，允许再次返回
              this.setData({ _backHandled: false })
            })
          } else {
            // 点击取消，直接返回不保存
            wx.navigateBack()
          }
        },
        fail: () => {
          // 如果modal显示失败，重置标志并返回
          this.setData({ _backHandled: false })
          wx.navigateBack()
        }
      })
    } else {
      // 没有修改，立即返回（阻止导航栏的默认返回）
      wx.navigateBack()
    }
  },

  async onSaveTap() {
    const saved = await this.saveIfNeeded(true)
    if (saved) {
      // 保存成功后直接跳转到首页
      wx.navigateBack()
    }
  },

  onContentInput(event: WechatMiniprogram.TextareaInput) {
    const value = (event.detail.value !== undefined && event.detail.value !== null) ? event.detail.value : ''
    this.setData({
      content: value,
      hasDirty: true,
      navTitle: deriveNoteTitle(value),
    })
  },

  onAddAttachment() {
    wx.chooseImage({
      count: 6,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (!res.tempFilePaths || !res.tempFilePaths.length) return
        const attachments = [...this.data.attachments, ...res.tempFilePaths]
        this.setData({
          attachments,
          hasDirty: true,
        })
      },
    })
  },

  onPreviewAttachment(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    wx.previewImage({
      current: this.data.attachments[index],
      urls: this.data.attachments,
    })
  },

  onRemoveAttachment(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const attachments = [...this.data.attachments]
    attachments.splice(index, 1)
    this.setData({
      attachments,
      hasDirty: true,
    })
  },

  async saveIfNeeded(showToast = false): Promise<boolean> {
    if (!this.data.hasDirty && this.data.id) {
      return false
    }
    const trimmed = this.data.content.trim()
    const hasAttachments = this.data.attachments.length > 0
    if (!trimmed && !hasAttachments) {
      return false
    }
    try {
      const note = await upsertNote({
        id: this.data.id || undefined,
        content: this.data.content,
        attachments: this.data.attachments,
        category_id: this.data.categoryId || undefined,
        tags: this.data.tags.length > 0 ? this.data.tags : undefined,
        template_type: this.data.templateType || undefined,
        cover: this.data.cover || undefined,
      })
      this.setData({
        id: note.id,
        hasDirty: false,
        navTitle: deriveNoteTitle(note.content),
      })
      if (showToast) {
        wx.showToast({
          title: '已保存',
          icon: 'success',
        })
      }
      return true
    } catch (error) {
      console.error('saveIfNeeded error', error)
      if (showToast) {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none',
        })
      }
      return false
    }
  },
  
  // 删除笔记
  async onDeleteTap() {
    if (!this.data.id) {
      wx.showToast({
        title: '无法删除未保存的笔记',
        icon: 'none',
      })
      return
    }
    
    wx.showModal({
      title: '删除笔记',
      content: '确定要删除这条笔记吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            await removeNote(this.data.id)
            wx.showToast({
              title: '已删除',
              icon: 'success',
            })
            // 延迟跳转，让toast显示
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (error) {
            console.error('delete note error', error)
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none',
            })
          }
        }
      },
    })
  },

  // 显示分类选择器
  onShowCategoryPicker() {
    this.setData({ showCategoryPicker: true })
  },

  // 关闭分类选择器
  onCloseCategoryPicker() {
    this.setData({ showCategoryPicker: false })
  },

  // 选择分类
  onCategorySelect(event: WechatMiniprogram.TouchEvent) {
    const categoryId = event.currentTarget.dataset.id || ''
    // 如果选择的是"添加分类"，则显示添加分类对话框
    if (categoryId === '__add__') {
      this.onAddCategoryInPicker()
      return
    }
    // 获取分类名称
    const category = this.data.categories.find(c => c.id === categoryId)
    const categoryName = categoryId ? (category?.name || '') : ''
    this.setData({
      categoryId,
      categoryName,
      showCategoryPicker: false,
      hasDirty: true,
    })
  },
  
  // 在分类选择器中添加分类
  async onAddCategoryInPicker() {
    wx.showModal({
      title: '添加分类',
      editable: true,
      placeholderText: '输入分类名称',
      success: async (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim()
          if (name) {
            try {
              // 添加分类并获取新创建的分类
              const newCategory = await addNoteCategory({ name })
              
              // 重新加载分类列表，确保获取最新的分类数据（包括新创建的）
              const categories = await loadNoteCategories()
              
              // 在列表中找到新创建的分类（确保ID匹配）
              const targetCategory = categories.find(c => c.id === newCategory.id) || newCategory
              
              // 确保新分类在列表中（如果不在，添加到列表）
              if (!categories.find(c => c.id === targetCategory.id)) {
                categories.push(targetCategory)
              }
              
              // 自动选择新创建的分类并更新UI
              // 使用setData的回调确保UI更新完成
              this.setData({ 
                categories: categories, // 更新完整列表
                categoryId: targetCategory.id, // 设置新分类ID
                categoryName: targetCategory.name, // 设置分类名称
                hasDirty: true,
              }, () => {
                // setData完成后显示成功提示
                wx.showToast({
                  title: '添加成功',
                  icon: 'success',
                })
                // 再次确保分类数据已设置（双重保险）
                if (!this.data.categoryId || this.data.categoryId !== targetCategory.id) {
                  this.setData({ 
                    categoryId: targetCategory.id,
                    categoryName: targetCategory.name
                  })
                }
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

  // 移除分类
  onRemoveCategory() {
    this.setData({
      categoryId: '',
      categoryName: '',
      hasDirty: true,
    })
  },

  // 显示标签输入
  onShowTagInput() {
    this.setData({ showTagInput: true })
  },

  // 关闭标签输入
  onCloseTagInput() {
    this.setData({
      showTagInput: false,
      tagInputValue: '',
    })
  },

  // 标签输入
  onTagInput(event: WechatMiniprogram.Input) {
    this.setData({
      tagInputValue: event.detail.value || '',
    })
  },

  // 添加标签
  onAddTag() {
    const tag = this.data.tagInputValue.trim()
    if (!tag) return
    if (this.data.tags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none',
      })
      return
    }
    if (this.data.tags.length >= 5) {
      wx.showToast({
        title: '最多添加5个标签',
        icon: 'none',
      })
      return
    }
    this.setData({
      tags: [...this.data.tags, tag],
      tagInputValue: '',
      showTagInput: false,
      hasDirty: true,
    })
  },

  // 删除标签
  onRemoveTag(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const tags = [...this.data.tags]
    tags.splice(index, 1)
    this.setData({
      tags,
      hasDirty: true,
    })
  },

  // 获取分类名称
  getCategoryName(categoryId: string): string {
    if (!categoryId) {
      return '未分类'
    }
    const category = this.data.categories.find(c => c.id === categoryId)
    return category?.name || '未分类'
  },

  noop() {},
})


