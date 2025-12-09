// app.ts
import { loadMoments } from './utils/features/moment'
import { loadAnniversaries } from './utils/features/anniversary'
import { loadNotes } from './utils/features/notes'
import { loadUserProfile } from './utils/db/profile'

const anniversaries: AnniversaryMeta[] = [
  {
    id: 'anniversary-001',
    title: '结婚十周年',
    from: '2015-10-01',
    target: '2025-10-01',
    avatars: {
      left: '../../assets/avatar-a.png',
      right: '../../assets/avatar-b.png',
    },
    pinned: true,
    repeat: 'year',
  },
]

const featureShortcuts: FeatureShortcut[] = [
  {
    id: 'anniversary',
    name: '纪念日',
    description: '记录每个心动时刻',
    bgColor: '#FFF0F4',
    textColor: '#FF6B8B',
    iconPath: '../../assets/feature-anniversary.png',
  },
  {
    id: 'schedule',
    name: '课程表',
    description: '课务提醒不错过',
    bgColor: '#ECFAFD',
    textColor: '#4BC0C0',
    iconPath: '../../assets/feature-schedule.png',
  },
  {
    id: 'saving',
    name: '存钱罐',
    description: '家庭预算好帮手',
    bgColor: '#FFF4FA',
    textColor: '#FF9FDC',
    iconPath: '../../assets/feature-saving.png',
  },
  {
    id: 'notes',
    name: '记事本',
    description: '灵感随手记',
    bgColor: '#FFFBEA',
    textColor: '#FFC045',
    iconPath: '../../assets/feature-notes.png',
  },
  {
    id: 'weather',
    name: '天气',
    description: '查看天气信息',
    bgColor: '#E3F2FD',
    textColor: '#2196F3',
    iconPath: '../../assets/feature-schedule.png', // 临时使用课程表图标，需要替换为feature-weather.png
  },
  {
    id: 'pomodoro',
    name: '番茄钟',
    description: '专注学习计时器',
    bgColor: '#FFF3E0',
    textColor: '#FF9800',
    iconPath: '../../assets/feature-pomodoro.png',
  },
]

const moments: MomentItem[] = [
  {
    id: 'moment-001',
    avatar: '../../assets/avatar-a.png',
    nickname: 'Mia',
    time: '09:12',
    location: '客厅·深圳',
    content: '今天把阳台的多肉重新换了土，顺便做了杯冰美式，慢生活也可以很有序。',
    images: [
      '../../assets/photo-1.png',
      '../../assets/photo-2.png',
      '../../assets/photo-3.png',
    ],
    comments: [
      {
        id: 'comment-001',
        nickname: 'Leo',
        content: '好松弛的周末氛围！',
        time: '09:30',
      },
      {
        id: 'comment-002',
        nickname: 'Mia',
        content: '感谢，等花开啦请你喝咖啡！',
        time: '09:45',
      },
    ],
    likes: 12,
    likedByMe: false,
  },
  {
    id: 'moment-002',
    avatar: '../../assets/avatar-b.png',
    nickname: 'Leo',
    time: '07:35',
    location: '健身房·深圳',
    content: '打卡30分钟晨练，准备开启元气工作日，打卡记录一下。',
    images: [
      '../../assets/photo-2.png',
    ],
    comments: [
      {
        id: 'comment-003',
        nickname: 'Mia',
        content: '辛苦啦，记得补充蛋白质！',
        time: '07:50',
      },
    ],
    likes: 6,
    likedByMe: false,
  },
]

const notes: NoteEntry[] = [
  {
    id: 'note-001',
    content: '周末菜谱灵感\n- 烤南瓜沙拉\n- 番茄牛肉意面\n- 芒果椰奶冻',
    createdAt: '2025-11-15T09:20:00.000Z',
    updatedAt: '2025-11-15T09:20:00.000Z',
    attachments: [],
    pinned: true,
  },
  {
    id: 'note-002',
    content: '阅读摘录\n“保持热爱，奔赴下一场山海。”\n\n下周分享会素材准备一下。',
    createdAt: '2025-11-13T15:10:00.000Z',
    updatedAt: '2025-11-13T15:10:00.000Z',
    attachments: [],
    pinned: false,
  },
]

const userProfile: UserProfile = {
  avatar: '../../assets/avatar-b.png',
  username: '生活记录者',
  bio: '点击编辑个人简介，让朋友更了解你。',
}

App<IAppOption>({
  globalData: {
    anniversaries,
    featureShortcuts,
    moments,
    notes,
    userProfile,
  },
  async onLaunch() {
    if (wx.setBackgroundFetchToken) {
      wx.setBackgroundFetchToken({
        token: 'life-manager-demo',
      })
    }
    
    // 从数据库加载初始数据
    // 并行加载初始数据（静态引入，避免动态 import 404）
    try {
      const [momentsData, anniversariesData, notesData, userProfileData] = await Promise.all([
        loadMoments().catch(() => moments),
        loadAnniversaries(anniversaries).catch(() => anniversaries),
        loadNotes(notes).catch(() => notes),
        loadUserProfile(userProfile).catch(() => userProfile),
      ])
      
      // 更新全局数据（确保类型兼容）
      this.globalData.moments = momentsData as MomentItem[]
      this.globalData.anniversaries = anniversariesData as AnniversaryMeta[]
      this.globalData.notes = notesData as NoteEntry[]
      this.globalData.userProfile = userProfileData as UserProfile
    } catch (error) {
      console.error('onLaunch: load data error', error)
      // 如果加载失败，使用默认数据
    }
  },
})