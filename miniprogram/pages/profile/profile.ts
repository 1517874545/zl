import { loadUserProfile, updateUserProfile } from '../../utils/db/profile'
import { uploadToSupabaseStorage } from '../../utils/supabase'

const app = getApp<IAppOption>()

interface UserProfile {
  avatar: string
  username: string
  bio: string
}

const defaultProfile: UserProfile = {
  avatar: '../../assets/avatar-b.png',
  username: '生活记录者',
  bio: '点击编辑个人简介，让朋友更了解你。',
}

app.globalData.userProfile = app.globalData.userProfile || { ...defaultProfile }

interface SettingItem {
  id: string
  name: string
  desc: string
  type: 'switch' | 'link'
  enabled?: boolean
}

interface ProfilePageData {
  profile: {
    avatar: string
    username: string
    bio: string
  }
  settings: SettingItem[]
  appVersion: string
  showEditModal: boolean
  editForm: {
    username: string
    bio: string
  }
  canIUseChooseAvatar: boolean // 检测是否支持chooseAvatar
}

Page<ProfilePageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    profile: { ...app.globalData.userProfile },
    settings: [
      { id: 'notification', name: '通知提醒', desc: '每日提醒与重要事项', type: 'switch', enabled: true },
      { id: 'privacy', name: '权限设置', desc: '控制动态与提醒权限', type: 'link' },
    ],
    appVersion: 'v1.0.0',
    showEditModal: false,
    editForm: {
      username: '',
      bio: '',
    },
    canIUseChooseAvatar: wx.canIUse('button.open-type.chooseAvatar'), // 检测新版头像组件支持
  },

  async onShow() {
    try {
      // 从数据库加载用户资料
      const latest = await loadUserProfile(app.globalData.userProfile || defaultProfile)
      this.setData({
        profile: { ...latest },
      })
      app.globalData.userProfile = latest
    } catch (error) {
      console.error('onShow: loadUserProfile error', error)
      const latest = app.globalData.userProfile || defaultProfile
      this.setData({
        profile: { ...latest },
      })
    }
  },

  async updateProfile(updates: Partial<UserProfile>) {
    const nextProfile = {
      ...this.data.profile,
      ...updates,
    }
    this.setData({ profile: nextProfile })
    app.globalData.userProfile = nextProfile
    
    // 保存到数据库
    try {
      const savedProfile = await updateUserProfile(nextProfile)
      app.globalData.userProfile = savedProfile
      this.setData({ profile: { ...savedProfile } })
    } catch (error) {
      console.error('updateProfile error', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      })
    }
    
    // 同时保存到本地存储供首页使用（作为后备）
    this.saveUserProfileToStorage(nextProfile)
  },

  // 保存用户资料到本地存储
  saveUserProfileToStorage(profile: UserProfile) {
    try {
      wx.setStorageSync('userProfile', {
        avatar: profile.avatar,
        username: profile.username,
        bio: profile.bio
      })
    } catch (e) {
      console.warn('saveUserProfileToStorage error', e)
    }
  },

  // 使用微信官方chooseAvatar API
  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      this.updateProfile({ avatar: avatarUrl })
      wx.showToast({ 
        title: '已更新微信头像', 
        icon: 'success' 
      })
    }
  },

  onAvatarAction() {
    wx.showActionSheet({
      itemList: ['使用微信头像', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.useWeChatAvatar()
        } else if (res.tapIndex === 1) {
          this.chooseAvatarFromAlbum()
        }
      },
    })
  },

  chooseAvatarFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = (res.tempFilePaths && res.tempFilePaths.length > 0) ? res.tempFilePaths[0] : undefined
        if (path) {
          this.uploadAndSaveAvatar(path)
        }
      },
    })
  },

  async uploadAndSaveAvatar(filePath: string) {
    wx.showLoading({ title: '上传中...', mask: true })
    try {
      // 上传到 avatars 公共 bucket，下方 prefix 保持按功能分目录
      const url = await uploadToSupabaseStorage(filePath, { bucket: 'avatars', prefix: 'avatars' })
      await this.updateProfile({ avatar: url })
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (error) {
      console.error('upload avatar error', error)
      wx.showToast({ title: '上传失败，请重试', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  useWeChatAvatar() {
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于更新个人头像',
        success: (res) => {
          const avatar = res.userInfo && res.userInfo.avatarUrl
          const nickName = res.userInfo && res.userInfo.nickName
          if (avatar) {
            const updates: Partial<UserProfile> = {
              avatar,
            }
            if (nickName && (!this.data.profile.username || this.data.profile.username === '生活记录者')) {
              updates.username = nickName
            }
            this.updateProfile(updates)
            wx.showToast({ title: '已更新头像', icon: 'success' })
          } else {
            wx.showToast({
              title: '未获取到头像',
              icon: 'none',
            })
          }
        },
        fail: () => {
          wx.showToast({
            title: '获取失败，请重试',
            icon: 'none',
          })
        },
      })
    } else {
      wx.showToast({
        title: '当前版本不支持获取微信头像',
        icon: 'none',
      })
    }
  },

  onEditProfile() {
    this.setData({
      showEditModal: true,
      editForm: {
        username: this.data.profile.username,
        bio: this.data.profile.bio,
      },
    })
  },

  onEditFormInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as 'username' | 'bio'
    this.setData({
      editForm: {
        ...this.data.editForm,
        [field]: event.detail.value,
      },
    })
  },

  onCancelEdit() {
    this.setData({
      showEditModal: false,
    })
  },

  onSaveProfile() {
    const { username, bio } = this.data.editForm
    if (!username.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none',
      })
      return
    }
    this.updateProfile({
      username: username.trim(),
      bio: bio.trim() || '保持热爱，奔赴山海。',
    })
    this.setData({
      showEditModal: false,
    })
    wx.showToast({
      title: '已更新资料',
      icon: 'success',
    })
  },

  onSettingSwitch(event: WechatMiniprogram.SwitchChange) {
    const id = event.currentTarget.dataset.id as string
    const value = event.detail.value
    const updated = this.data.settings.map((item) =>
      item.id === id ? { ...item, enabled: value } : item
    )
    this.setData({ settings: updated })
  },

  onSettingTap(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id as string
    if (id === 'privacy') {
      this.showPrivacySettings()
      return
    }
    wx.showToast({
      title: '即将支持更多设置',
      icon: 'none',
    })
  },

  // 显示权限设置
  showPrivacySettings() {
    wx.showActionSheet({
      itemList: ['通知权限', '位置权限', '相册权限'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.checkNotificationPermission()
        } else if (res.tapIndex === 1) {
          this.checkLocationPermission()
        } else if (res.tapIndex === 2) {
          this.checkAlbumPermission()
        }
      },
    })
  },

  // 检查通知权限
  checkNotificationPermission() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.notification'] === false) {
          wx.showModal({
            title: '通知权限',
            content: '需要开启通知权限才能接收提醒，是否前往设置？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            },
          })
        } else if (res.authSetting['scope.notification'] === undefined) {
          wx.showModal({
            title: '通知权限',
            content: '通知权限未设置，是否前往开启？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            },
          })
        } else {
          wx.showToast({
            title: '通知权限已开启',
            icon: 'success',
          })
        }
      },
    })
  },

  // 检查位置权限
  checkLocationPermission() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === false) {
          wx.showModal({
            title: '位置权限',
            content: '需要开启位置权限才能使用定位功能，是否前往设置？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            },
          })
        } else if (res.authSetting['scope.userLocation'] === undefined) {
          // 尝试获取位置
          wx.getLocation({
            type: 'gcj02',
            success: () => {
              wx.showToast({
                title: '位置权限已开启',
                icon: 'success',
              })
            },
            fail: () => {
              wx.showModal({
                title: '位置权限',
                content: '需要开启位置权限才能使用定位功能，是否前往设置？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting()
                  }
                },
              })
            },
          })
        } else {
          wx.showToast({
            title: '位置权限已开启',
            icon: 'success',
          })
        }
      },
    })
  },

  // 检查相册权限
  checkAlbumPermission() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.album'] === false) {
          wx.showModal({
            title: '相册权限',
            content: '需要开启相册权限才能上传图片，是否前往设置？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            },
          })
        } else if (res.authSetting['scope.album'] === undefined) {
          // 尝试选择图片
          wx.chooseImage({
            count: 1,
            success: () => {
              wx.showToast({
                title: '相册权限已开启',
                icon: 'success',
              })
            },
            fail: () => {
              wx.showModal({
                title: '相册权限',
                content: '需要开启相册权限才能上传图片，是否前往设置？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting()
                  }
                },
              })
            },
          })
        } else {
          wx.showToast({
            title: '相册权限已开启',
            icon: 'success',
          })
        }
      },
    })
  },

  onRateApp() {
    wx.showToast({
      title: '感谢你的好评支持～',
      icon: 'none',
    })
  },

  onViewAbout() {
    wx.showModal({
      title: '关于我们',
      content: '生活管理小程序\n版本：' + this.data.appVersion + '\n联系方式：hi@life-manager.app',
      showCancel: false,
    })
  },

  noop() {},
})

